// Copyright (c) LinkU Labs, Inc.
// SPDX-License-Identifier: Apache-2.0
import {
  createSnapshotQuerySend,
  type SnapshotQuerySend,
} from "./snapshot-query-queue";
import { createReadDeadline } from "./read-deadline";

import { RtdGraphQLClient } from "rtd-typescript/graphql";
import type { WalletDisplayHistoryCapability } from "rtd-apps-core/src/rpc/display-types";

import {
  DISPLAY_HISTORY_SELECTION,
  displayHistoryCapability,
} from "./display-history";
import { NetworkIdentityError } from "./identity";
import { fetchSnapshotRead } from "./snapshot-read-retry";
import { assertGenesisDigest } from "./profile";
import { WalletReadSession } from "./session";

export interface CoverageDependency {
  readonly type: string;
  readonly field: string;
  readonly filters?: readonly string[];
}

export interface GraphQLSnapshotProof {
  readonly bindingKey: string;
  readonly checkpoint: string;
  readonly digest: string;
  readonly dependencies: readonly CoverageDependency[];
  readonly cacheKey: string;
  readonly displayHistory?: WalletDisplayHistoryCapability;
}

export class SnapshotReadError extends Error {
  constructor(
    readonly reason: "incompatible" | "partial" | "coverage" | "changed",
  ) {
    super(
      {
        incompatible: "资产查询响应不兼容，未接纳数据",
        partial: "资产查询未完整成功，未接纳数据",
        coverage: "资产查询字段未覆盖同一快照，请等待索引同步",
        changed: "资产快照事实已改变，请重新查询",
      }[reason],
    );
    this.name = "SnapshotReadError";
  }
}

export function responseRecord(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value))
    throw new SnapshotReadError("incompatible");
  return value as Record<string, unknown>;
}

/** GraphQL UInt53 is narrower than Ledger u64. Never round a checkpoint selector. */
export function checkpointNumber(value: unknown): number {
  const n =
    typeof value === "number"
      ? value
      : typeof value === "string" && /^(0|[1-9]\d*)$/.test(value)
        ? Number(value)
        : NaN;
  if (!Number.isSafeInteger(n) || n < 0)
    throw new SnapshotReadError("incompatible");
  return n;
}

function checkedDigest(value: unknown): string {
  try {
    return assertGenesisDigest(value);
  } catch {
    throw new SnapshotReadError("incompatible");
  }
}

function freezeDependencies(input: readonly CoverageDependency[]) {
  if (!input.length || input.length > 32)
    throw new SnapshotReadError("incompatible");
  const identifier = /^[_A-Za-z][_0-9A-Za-z]*$/;
  const unique = new Map<string, CoverageDependency>();
  for (const dependency of input) {
    if (
      !identifier.test(dependency.type) ||
      !identifier.test(dependency.field) ||
      dependency.filters?.some((filter) => !identifier.test(filter))
    )
      throw new SnapshotReadError("incompatible");
    const value = Object.freeze({
      type: dependency.type,
      field: dependency.field,
      ...(dependency.filters
        ? { filters: Object.freeze([...new Set(dependency.filters)].sort()) }
        : {}),
    });
    unique.set(JSON.stringify(value), value);
  }
  return Object.freeze(
    [...unique]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([, value]) => value),
  );
}

function coverageSelection(dependencies: readonly CoverageDependency[]) {
  return `serviceConfig { ${dependencies
    .map(
      (dependency, i) =>
        `range${i}: availableRange(type: ${JSON.stringify(dependency.type)}, field: ${JSON.stringify(dependency.field)}${
          dependency.filters
            ? `, filters: ${JSON.stringify(dependency.filters)}`
            : ""
        }) { first { sequenceNumber } last { sequenceNumber } }`,
    )
    .join("\n")} }`;
}

function coverageInterval(data: Record<string, unknown>, count: number) {
  const config = responseRecord(data.serviceConfig);
  let lower = 0;
  let upper = Number.MAX_SAFE_INTEGER;
  for (let i = 0; i < count; i++) {
    const range = responseRecord(config[`range${i}`]);
    const first = checkpointNumber(responseRecord(range.first).sequenceNumber);
    const last = checkpointNumber(responseRecord(range.last).sequenceNumber);
    if (first > last) throw new SnapshotReadError("coverage");
    lower = Math.max(lower, first);
    upper = Math.min(upper, last);
  }
  if (lower > upper) throw new SnapshotReadError("coverage");
  return { lower, upper };
}

export interface SnapshotQuery {
  /** Authored root selection for Checkpoint.query; caller input belongs in variables. */
  readonly selection: string;
  readonly variableDefinitions?: string;
  readonly variables?: Record<string, unknown>;
  readonly fragments?: string;
  readonly signal?: AbortSignal;
}

/** Native GraphQL reader. It does not adapt old RPC DTOs or expose execution methods. */
export class GraphQLSnapshot {
  readonly proof: GraphQLSnapshotProof;
  readonly #send: SnapshotQuerySend;
  readonly #coverage: string;

  private constructor(
    readonly session: WalletReadSession,
    send: SnapshotQuerySend,
    dependencies: readonly CoverageDependency[],
    checkpoint: number,
    digest: string,
    readonly timeoutMs: number,
    readonly firstCheckpoint: number = checkpoint,
    displayHistory?: WalletDisplayHistoryCapability,
  ) {
    this.#send = send;
    this.#coverage = coverageSelection(dependencies);
    this.proof = Object.freeze({
      bindingKey: session.bindingKey,
      checkpoint: String(checkpoint),
      digest,
      dependencies,
      ...(displayHistory ? { displayHistory } : {}),
      cacheKey: JSON.stringify([
        session.cacheKey,
        crypto.randomUUID(),
        String(checkpoint),
        digest,
        dependencies,
        displayHistory,
      ]),
    });
  }

  static async open(
    session: WalletReadSession,
    dependencies: readonly CoverageDependency[],
    options: {
      fetch?: typeof fetch;
      timeoutMs?: number;
      minimumCheckpoint?: string;
      signal?: AbortSignal;
      /** Fixed history window; admission and every revalidation must cover its entire interval. */
      window?: { lower: number; upper: number };
    } = {},
  ): Promise<GraphQLSnapshot> {
    const url = session.profile.endpoints.graphqlUrl;
    if (!url) throw new SnapshotReadError("incompatible");
    const timeoutMs = options.timeoutMs ?? 10_000;
    if (!Number.isSafeInteger(timeoutMs) || timeoutMs < 1 || timeoutMs > 60_000)
      throw new RangeError("查询超时必须在 1–60000 ms");
    const requirements = freezeDependencies(dependencies);
    const needsDisplay = requirements.some(
      (dependency) =>
        (dependency.type === "MoveValue" && dependency.field === "display") ||
        (dependency.type === "ServiceConfig" &&
          dependency.field === "displayHistory"),
    );
    const displaySelection = needsDisplay ? DISPLAY_HISTORY_SELECTION : "";
    // A caller-supplied history window already determines S, so admission and
    // its pin can be observed in one request. Latest-window reads still need
    // admission first to derive S from the intersection of all dependencies.
    const fixedWindow = options.window
      ? {
          lower: checkpointNumber(options.window.lower),
          upper: checkpointNumber(options.window.upper),
        }
      : undefined;
    if (fixedWindow && fixedWindow.lower > fixedWindow.upper)
      throw new SnapshotReadError("coverage");
    const fetchFn = options.fetch ?? globalThis.fetch;
    const client = new RtdGraphQLClient({
      network: session.profile.sdkNetwork,
      url,
      mvr: { url: "" },
      fetch: (input, init) =>
        fetchSnapshotRead(fetchFn, input, {
          ...init,
          redirect: "error",
          credentials: "omit",
        }),
    });
    const lightweight = requirements.every(
      ({ type, field }) =>
        (type === "Query" &&
          (field === "checkpoints" || field === "coinMetadata")) ||
        (type === "Address" && field === "balances"),
    );
    const send = createSnapshotQuerySend(
      session,
      client,
      fetchFn,
      timeoutMs,
      lightweight,
      crypto.randomUUID(),
    );
    const data = await GraphQLSnapshot.request(session, send, timeoutMs, {
      query: `query ${fixedWindow ? "WalletSnapshotAdmissionAndPin" : "WalletSnapshotAdmission"} {
        walletGenesis: checkpoint(sequenceNumber: 0) { digest }
        walletHead: checkpoint { sequenceNumber digest }
        ${
          fixedWindow
            ? `walletSnapshot: checkpoint(sequenceNumber: ${fixedWindow.upper}) {
          sequenceNumber digest ${needsDisplay ? `query { ${displaySelection} }` : ""}
        }`
            : ""
        }
        ${coverageSelection(requirements)}
        ${displaySelection}
      }`,
      variables: {},
      signal: options.signal,
    });
    const interval = coverageInterval(data, requirements.length);
    const headValue = responseRecord(data.walletHead);
    const head = checkpointNumber(headValue.sequenceNumber);
    const admittedDisplay = needsDisplay
      ? displayHistoryCapability(
          data.walletDisplayService,
          session.profile.expectedGenesisDigest,
          head,
          checkedDigest(headValue.digest),
        )
      : undefined;
    const checkpoint = fixedWindow
      ? fixedWindow.upper
      : Math.min(interval.upper, head);
    const first = fixedWindow ? fixedWindow.lower : checkpoint;
    const minimum =
      options.minimumCheckpoint === undefined
        ? 0
        : checkpointNumber(options.minimumCheckpoint);
    if (
      first > checkpoint ||
      first < interval.lower ||
      checkpoint > interval.upper ||
      checkpoint > head ||
      checkpoint < minimum
    )
      throw new SnapshotReadError("coverage");
    const pinned = fixedWindow
      ? data
      : await GraphQLSnapshot.request(session, send, timeoutMs, {
          query: `query WalletSnapshotPin {
        walletGenesis: checkpoint(sequenceNumber: 0) { digest }
        walletSnapshot: checkpoint(sequenceNumber: ${checkpoint}) {
          sequenceNumber digest ${needsDisplay ? `query { ${displaySelection} }` : ""}
        }
        ${coverageSelection(requirements)}
      }`,
          variables: {},
          signal: options.signal,
        });
    const pin = responseRecord(pinned.walletSnapshot);
    if (checkpointNumber(pin.sequenceNumber) !== checkpoint)
      throw new SnapshotReadError("changed");
    const confirmed = coverageInterval(pinned, requirements.length);
    if (confirmed.lower > first || confirmed.upper < checkpoint)
      throw new SnapshotReadError("coverage");
    let digest: string;
    try {
      digest = assertGenesisDigest(pin.digest);
    } catch {
      throw new SnapshotReadError("incompatible");
    }
    const pinnedDisplay = needsDisplay
      ? displayHistoryCapability(
          responseRecord(pin.query).walletDisplayService,
          session.profile.expectedGenesisDigest,
          checkpoint,
          digest,
          admittedDisplay,
        )
      : undefined;
    return new GraphQLSnapshot(
      session,
      send,
      requirements,
      checkpoint,
      digest,
      timeoutMs,
      first,
      pinnedDisplay,
    );
  }

  private static async request(
    session: WalletReadSession,
    send: SnapshotQuerySend,
    timeoutMs: number,
    input: {
      query: string;
      variables: Record<string, unknown>;
      signal?: AbortSignal;
    },
  ): Promise<Record<string, unknown>> {
    let disposeDeadline: (() => void) | undefined;
    return session
      .read(async (sessionSignal) => {
        const deadline = createReadDeadline(timeoutMs);
        disposeDeadline = deadline.dispose;
        const signal = AbortSignal.any([
          sessionSignal,
          deadline.signal,
          ...(input.signal ? [input.signal] : []),
        ]);
        signal.throwIfAborted();
        const response = responseRecord(
          await send(
            { query: input.query, variables: input.variables },
            signal,
          ),
        );
        // A partial response must never be mistaken for absence or an empty portfolio.
        if (
          response.errors !== undefined &&
          (!Array.isArray(response.errors) || response.errors.length)
        )
          throw new SnapshotReadError("partial");
        const data = responseRecord(response.data);
        let digest: string;
        try {
          digest = assertGenesisDigest(
            responseRecord(data.walletGenesis).digest,
          );
        } catch {
          throw new SnapshotReadError("incompatible");
        }
        if (digest !== session.profile.expectedGenesisDigest)
          throw new NetworkIdentityError("graphql", "chain-mismatch");
        signal.throwIfAborted();
        return data;
      })
      .finally(() => disposeDeadline?.());
  }

  async read(query: SnapshotQuery): Promise<Record<string, unknown>> {
    const data = await GraphQLSnapshot.request(
      this.session,
      this.#send,
      this.timeoutMs,
      {
        query: `query WalletSnapshotRead${query.variableDefinitions ? `(${query.variableDefinitions})` : ""} {
        walletGenesis: checkpoint(sequenceNumber: 0) { digest }
        walletSnapshot: checkpoint(sequenceNumber: ${this.proof.checkpoint}) {
          sequenceNumber digest query { ${query.selection} ${this.proof.displayHistory ? DISPLAY_HISTORY_SELECTION : ""} }
        }
        ${this.#coverage}
      } ${query.fragments ?? ""}`,
        variables: query.variables ?? {},
        signal: query.signal,
      },
    );
    this.verifyProof(data);
    return responseRecord(responseRecord(data.walletSnapshot).query);
  }

  /** Validate again before committing a complete multi-page domain result. */
  async revalidate(signal?: AbortSignal): Promise<void> {
    const data = await GraphQLSnapshot.request(
      this.session,
      this.#send,
      this.timeoutMs,
      {
        query: `query WalletSnapshotRevalidate {
        walletGenesis: checkpoint(sequenceNumber: 0) { digest }
        walletSnapshot: checkpoint(sequenceNumber: ${this.proof.checkpoint}) {
          sequenceNumber digest ${this.proof.displayHistory ? `query { ${DISPLAY_HISTORY_SELECTION} }` : ""}
        }
        ${this.#coverage}
      }`,
        variables: {},
        signal,
      },
    );
    this.verifyProof(data);
  }

  private verifyProof(data: Record<string, unknown>) {
    const snapshot = responseRecord(data.walletSnapshot);
    if (
      checkpointNumber(snapshot.sequenceNumber) !==
        Number(this.proof.checkpoint) ||
      snapshot.digest !== this.proof.digest
    )
      throw new SnapshotReadError("changed");
    const interval = coverageInterval(data, this.proof.dependencies.length);
    if (
      interval.lower > this.firstCheckpoint ||
      interval.upper < Number(this.proof.checkpoint)
    )
      throw new SnapshotReadError("coverage");
    if (this.proof.displayHistory) {
      displayHistoryCapability(
        responseRecord(snapshot.query).walletDisplayService,
        this.session.profile.expectedGenesisDigest,
        Number(this.proof.checkpoint),
        this.proof.digest,
        this.proof.displayHistory,
      );
    }
  }
}
