// Copyright (c) LinkU Labs, Inc.
// SPDX-License-Identifier: Apache-2.0
import { createReadDeadline } from "./read-deadline";
import { RtdGraphQLClient } from "rtd-typescript/graphql";
import { RpcError } from "rtd-typescript/grpc";
import type { WalletHistoryCoverage } from "rtd-apps-core/src/rpc/WalletRpcContext";
import {
  GraphQLSnapshot,
  responseRecord,
  type CoverageDependency,
} from "./graphql-snapshot";
import {
  historyCheck,
  historyInteger,
  WalletHistoryError,
} from "./history-facts";
import { NetworkIdentityError } from "./identity";
import { assertGenesisDigest } from "./profile";
import { WalletReadSession } from "./session";

export const HISTORY_NATIVE_COVERAGE: readonly CoverageDependency[] =
  Object.freeze(
    [
      { type: "Query", field: "checkpoint" },
      { type: "Query", field: "transactions", filters: ["affectedAddress"] },
      { type: "Query", field: "transactions", filters: ["affectedObject"] },
      { type: "Query", field: "object" },
      { type: "TransactionEffects", field: "objectChanges" },
    ].map((row) =>
      Object.freeze({
        ...row,
        ...(row.filters ? { filters: Object.freeze(row.filters) } : {}),
      }),
    ),
  );
export const HISTORY_COVERAGE_QUERY = `query WalletHistoryCoverage($chain: String!) {
  accountHistoryCoverage(chainId: $chain) { chainId checkpointLo checkpointHi checkpointDigest allAccountActivityCertified }
}`;
export const HISTORY_PAGE_QUERY = `query WalletAccountHistory($chain: String!, $address: String!, $lo: Checkpoint!, $hi: Checkpoint!, $limit: Int!, $cursor: String) {
  accountHistory(chainId: $chain, address: $address, checkpointLo: $lo, checkpointHi: $hi, limit: $limit, cursor: $cursor) {
    chainId address checkpointLo checkpointHi limit snapshot hasNextPage nextCursor
    registrationComplete completeForRegisteredKiosks completeForDiscoveredOwnerTokens completeForDiscoveredCapabilities
    allAccountActivityCertified allAccountTransfersCertified
    transactions { digest checkpoint sender status origins transaction eventFacts kioskTransfers }
  }
}`;
export function historyCoverageFlags(
  page: Record<string, unknown>,
): WalletHistoryCoverage {
  const required = [
    "registrationComplete",
    "completeForRegisteredKiosks",
    "allAccountActivityCertified",
  ] as const;
  for (const name of required) historyCheck(typeof page[name] === "boolean");
  const optional = [
    "completeForDiscoveredOwnerTokens",
    "completeForDiscoveredCapabilities",
    "allAccountTransfersCertified",
  ] as const;
  for (const name of optional)
    historyCheck(page[name] === null || typeof page[name] === "boolean");
  historyCheck(page.completeForRegisteredKiosks === true);
  return Object.freeze(
    Object.fromEntries(
      [...required, ...optional].map((name) => [name, page[name]]),
    ) as unknown as WalletHistoryCoverage,
  );
}
export class WalletAccountHistoryTransportError extends RpcError {
  constructor() {
    super("账户历史入口未返回可读响应", "UNAVAILABLE");
    this.name = "WalletAccountHistoryTransportError";
  }
}
/** Only reviewed public constants are retained; server messages and response data never enter errors. */
export class WalletAccountHistoryServiceError extends RpcError {
  constructor(
    readonly reason: "busy" | "dependency" | "upstream",
    code: "UNAVAILABLE" | "RESOURCE_EXHAUSTED" | "DEADLINE_EXCEEDED",
    readonly upstreamStatus?: number,
  ) {
    super("账户历史查询服务暂不可用", code);
    this.name = "WalletAccountHistoryServiceError";
  }
}
function rejectServiceErrors(errors: unknown): never {
  // Multiple or unrecognized failures cannot certify a single service diagnosis.
  if (Array.isArray(errors) && errors.length === 1) {
    const error = errors[0];
    if (error && typeof error === "object" && !Array.isArray(error)) {
      const extension = error.extensions;
      if (
        extension &&
        typeof extension === "object" &&
        !Array.isArray(extension)
      ) {
        const { code, reason, upstreamStatus } = extension;
        const keys = Object.keys(extension);
        const publicKeys = keys.every((key) =>
          ["code", "reason", "upstreamStatus"].includes(key),
        );
        if (publicKeys && code === "BUSY" && keys.length === 1)
          throw new WalletAccountHistoryServiceError(
            "busy",
            "RESOURCE_EXHAUSTED",
          );
        if (
          publicKeys &&
          code === "DEPENDENCY_UNAVAILABLE" &&
          keys.length === 1
        )
          throw new WalletAccountHistoryServiceError(
            "dependency",
            "UNAVAILABLE",
          );
        if (publicKeys && code === "HISTORY_UNAVAILABLE") {
          if (
            reason === "UPSTREAM_HTTP_ERROR" &&
            Number.isInteger(upstreamStatus) &&
            upstreamStatus >= 100 &&
            upstreamStatus <= 599
          )
            throw new WalletAccountHistoryServiceError(
              "upstream",
              "UNAVAILABLE",
              upstreamStatus,
            );
          if (upstreamStatus === undefined && keys.length === 2) {
            if (reason === "UPSTREAM_TIMEOUT")
              throw new WalletAccountHistoryServiceError(
                "upstream",
                "DEADLINE_EXCEEDED",
              );
            if (reason === "UPSTREAM_TRANSPORT_ERROR")
              throw new WalletAccountHistoryServiceError(
                "upstream",
                "UNAVAILABLE",
              );
            if (reason === "SNAPSHOT_CHANGED" || reason === "COVERAGE_CHANGED")
              throw new WalletHistoryError("changed");
          }
        }
      }
    }
  }
  throw new WalletHistoryError("partial");
}
export interface HistoryWindowCoverage {
  readonly lower: number;
  readonly upper: number;
  readonly digest: string;
  readonly certified: boolean;
}
interface HistoryWindow {
  readonly coverage: HistoryWindowCoverage;
  readonly native: GraphQLSnapshot;
}
function cancellable<T>(promise: Promise<T>, signal: AbortSignal): Promise<T> {
  return new Promise((resolve, reject) => {
    const abort = () => {
      signal.removeEventListener("abort", abort);
      reject(signal.reason);
    };
    signal.addEventListener("abort", abort, { once: true });
    promise.then(
      (value) => {
        signal.removeEventListener("abort", abort);
        signal.aborted ? reject(signal.reason) : resolve(value);
      },
      (error) => {
        signal.removeEventListener("abort", abort);
        reject(error);
      },
    );
    if (signal.aborted) abort();
  });
}
async function boundedBody(
  response: Response,
  fence: () => void,
): Promise<Response> {
  if (!response.body) throw new WalletAccountHistoryTransportError();
  const reader = response.body.getReader(),
    chunks: Uint8Array[] = [];
  let size = 0,
    complete = false;
  try {
    while (true) {
      const row = await reader.read();
      fence();
      if (row.done) {
        complete = true;
        break;
      }
      size += row.value.length;
      if (size > 2 * 1024 * 1024) throw new WalletHistoryError("budget");
      chunks.push(row.value);
    }
    const bytes = new Uint8Array(size);
    let offset = 0;
    for (const chunk of chunks) {
      bytes.set(chunk, offset);
      offset += chunk.length;
    }
    return new Response(bytes, {
      status: response.status,
      headers: response.headers,
    });
  } finally {
    if (!complete) await reader.cancel().catch(() => {});
    reader.releaseLock();
  }
}

/** Private two-root custom protocol; no introspection, mutations, MVR or execution client. */
export class WalletAccountHistoryProtocol {
  readonly #client: RtdGraphQLClient;
  readonly #fetch: typeof fetch;
  constructor(
    readonly session: WalletReadSession,
    readonly signal: AbortSignal,
    readonly timeoutMs: number,
    fetchFn: typeof fetch,
  ) {
    const url = session.profile.endpoints.accountHistoryUrl,
      nativeUrl = session.profile.endpoints.graphqlUrl;
    if (!url || !nativeUrl) throw new WalletHistoryError("unconfigured");
    this.#fetch = async (input, init) => {
      this.fence();
      const endpoint = String(input);
      if (
        init?.method !== "POST" ||
        (endpoint !== url && endpoint !== nativeUrl)
      )
        throw new WalletHistoryError("incompatible");
      if (endpoint === url) {
        if (
          typeof init.body !== "string" ||
          new TextEncoder().encode(init.body).length > 16_384
        )
          throw new WalletHistoryError("budget");
        const payload = JSON.parse(init.body) as { query?: unknown };
        if (
          payload.query !== HISTORY_COVERAGE_QUERY &&
          payload.query !== HISTORY_PAGE_QUERY
        )
          throw new WalletHistoryError("incompatible");
      }
      const response = await fetchFn(input, {
        ...init,
        signal: AbortSignal.any([
          signal,
          ...(init.signal ? [init.signal] : []),
        ]),
        redirect: "error",
        credentials: "omit",
      });
      try {
        this.fence();
      } catch (error) {
        await response.body?.cancel().catch(() => {});
        throw error;
      }
      // Preserve the native authored snapshot reader's explicit HTTP backoff policy.
      if (endpoint === url && !response.ok) {
        await response.body?.cancel().catch(() => {});
        throw new WalletAccountHistoryTransportError();
      }
      if (endpoint === nativeUrl && !response.ok && !response.body)
        return response;
      if (
        endpoint === url &&
        response.headers
          .get("content-type")
          ?.split(";", 1)[0]
          .trim()
          .toLowerCase() !== "application/json"
      ) {
        await response.body?.cancel().catch(() => {});
        throw new WalletHistoryError("incompatible");
      }
      return boundedBody(response, () => this.fence());
    };
    this.#client = new RtdGraphQLClient({
      url,
      network: session.profile.sdkNetwork,
      mvr: { url: "" },
      fetch: this.#fetch,
    });
  }
  fence(): void {
    this.signal.throwIfAborted();
    this.session.assertActive();
  }
  verifyChain(value: unknown): void {
    let digest: string;
    try {
      digest = assertGenesisDigest(value);
    } catch {
      throw new NetworkIdentityError("accountHistory", "incompatible");
    }
    if (digest !== this.session.profile.expectedGenesisDigest)
      throw new NetworkIdentityError("accountHistory", "chain-mismatch");
  }
  async #query(
    root: "accountHistoryCoverage" | "accountHistory",
    variables: Record<string, unknown>,
  ): Promise<Record<string, unknown>> {
    let response: Record<string, unknown>;
    try {
      response = responseRecord(
        await this.session.request(this.signal, () =>
          this.#client.query<unknown>({
            query:
              root === "accountHistoryCoverage"
                ? HISTORY_COVERAGE_QUERY
                : HISTORY_PAGE_QUERY,
            variables,
            signal: this.signal,
          }),
        ),
      );
    } catch (error) {
      this.fence();
      if (error instanceof SyntaxError)
        throw new WalletHistoryError("incompatible");
      throw error;
    }
    this.fence();
    if (
      response.errors !== undefined &&
      (!Array.isArray(response.errors) || response.errors.length)
    )
      rejectServiceErrors(response.errors);
    const data = responseRecord(response.data);
    historyCheck(Object.keys(data).length === 1 && Object.hasOwn(data, root));
    const value = responseRecord(data[root]);
    this.verifyChain(value.chainId);
    return value;
  }
  async coverage(): Promise<HistoryWindowCoverage> {
    const value = await this.#query("accountHistoryCoverage", {
      chain: this.session.profile.expectedGenesisDigest,
    });
    historyCheck(typeof value.allAccountActivityCertified === "boolean");
    const lower = historyInteger(value.checkpointLo),
      upper = historyInteger(value.checkpointHi);
    let digest: string;
    try {
      digest = assertGenesisDigest(value.checkpointDigest);
    } catch {
      throw new WalletHistoryError("incompatible");
    }
    if (lower > upper) throw new WalletHistoryError("coverage");
    return Object.freeze({
      lower,
      upper,
      digest,
      certified: value.allAccountActivityCertified,
    });
  }
  async page(
    variables: Record<string, unknown>,
  ): Promise<Record<string, unknown>> {
    return this.#query("accountHistory", variables);
  }
  async #finishWindow(window: HistoryWindow): Promise<void> {
    const before = window.coverage;
    // The account index and the public GraphQL window are independent proofs,
    // and each is a full round trip (two index reads plus two GraphQL queries
    // for coverage alone). Running them in sequence doubled the trailing cost
    // of every page for no ordering guarantee: both must hold the same window,
    // and either failing rejects the page.
    const [after] = await Promise.all([
      this.coverage(),
      window.native.revalidate(this.signal),
    ]);
    if (
      after.lower !== before.lower ||
      after.upper < before.upper ||
      after.certified !== before.certified ||
      (after.upper === before.upper && after.digest !== before.digest)
    )
      throw new WalletHistoryError("changed");
    this.fence();
  }
  /**
   * Run `read` inside one admitted window. `fixed` continues the window a
   * previous page was bound to: the current coverage must still contain it
   * (same lower bound and certification, upper not behind, same digest at the
   * same upper), and the native snapshot is opened at the fixed upper bound.
   */
  async inWindow<T>(
    read: (window: HistoryWindow) => Promise<T>,
    minimumCheckpoint?: number,
    fixed?: HistoryWindowCoverage,
  ): Promise<T> {
    const current = await this.coverage();
    if (
      fixed &&
      (current.lower !== fixed.lower ||
        current.upper < fixed.upper ||
        current.certified !== fixed.certified ||
        (current.upper === fixed.upper && current.digest !== fixed.digest))
    )
      throw new WalletHistoryError("changed");
    const coverage = fixed ?? current;
    if (minimumCheckpoint !== undefined && coverage.upper < minimumCheckpoint)
      throw new WalletHistoryError("coverage");
    const native = await GraphQLSnapshot.open(
      this.session,
      HISTORY_NATIVE_COVERAGE,
      {
        fetch: this.#fetch,
        timeoutMs: this.timeoutMs,
        signal: this.signal,
        window: { lower: coverage.lower, upper: coverage.upper },
      },
    );
    if (native.proof.digest !== coverage.digest)
      throw new WalletHistoryError("changed");
    const window = { coverage, native };
    let value: T;
    try {
      value = await read(window);
    } catch (error) {
      this.fence();
      if (error instanceof NetworkIdentityError) throw error;
      try {
        await this.#finishWindow(window);
      } catch (last) {
        this.fence();
        if (last instanceof NetworkIdentityError) throw last;
      }
      throw error;
    }
    await this.#finishWindow(window);
    return value;
  }
}
/** Outer cancellation never releases the leaf's physical request permit before actual body settlement. */
export function runAccountHistoryRead<T>(
  session: WalletReadSession,
  options: { fetch?: typeof fetch; timeoutMs: number; signal?: AbortSignal },
  work: (protocol: WalletAccountHistoryProtocol) => Promise<T>,
): Promise<T> {
  if (
    !Number.isSafeInteger(options.timeoutMs) ||
    options.timeoutMs < 1 ||
    options.timeoutMs > 60_000
  )
    throw new RangeError("账户历史总期限必须在1–60000ms");
  let disposeDeadline: (() => void) | undefined;
  return session
    .read(async (sessionSignal) => {
      const deadline = createReadDeadline(options.timeoutMs);
      disposeDeadline = deadline.dispose;
      const signal = AbortSignal.any([
        sessionSignal,
        deadline.signal,
        ...(options.signal ? [options.signal] : []),
      ]);
      signal.throwIfAborted();
      const protocol = new WalletAccountHistoryProtocol(
        session,
        signal,
        options.timeoutMs,
        options.fetch ?? globalThis.fetch,
      );
      return cancellable(work(protocol), signal);
    })
    .finally(() => disposeDeadline?.());
}
