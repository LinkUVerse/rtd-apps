// Copyright (c) LinkU Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { fromBase64, toBase64 } from "rtd-typescript/utils";
import { boundedGrpcFetch } from "./grpc-response-budget";
import { queuedServiceInfo } from "./service-info-queue";

import {
  GrpcStatusCode,
  GrpcTypes,
  RpcError,
  RtdGrpcClient,
  parseGrpcTransactionResponse,
} from "rtd-typescript/grpc";
import type { WalletTransactionDetails } from "rtd-apps-core/src/rpc/WalletRpcContext";
import {
  receiptObjectEffects,
  receiptStakeEvents,
} from "rtd-apps-core/src/rpc/transaction-view";
import type { WalletExecutionReceipt } from "./execution-journal";
import { assertEventEnvelope } from "./event-envelope";
import { NetworkIdentityError } from "./identity";
import { assertGenesisDigest } from "./profile";
import { walletAddress } from "./asset-address";
import { dynamicType } from "./dynamic-fields";
import {
  validateTransactionReceipt,
  RECEIPT_READ_MASK,
} from "./receipt-validation";
import { WalletReadSession } from "./session";

type Role = "fullnode" | "archive";
interface Range {
  height: bigint;
  lower: bigint | null;
}
interface LedgerRead {
  readonly raw: GrpcTypes.ExecutedTransaction;
  readonly source: Role;
}
export interface WalletLedgerHistoryPage {
  readonly bindingKey: string;
  readonly readSessionKey: string;
  readonly address: string;
  readonly source: "archive";
  readonly checkpointHeight: number;
  readonly lowestAvailableCheckpoint: number | null;
  readonly transactions: readonly GrpcTypes.ExecutedTransaction[];
  readonly hasNextPage: boolean;
  readonly nextCursor: string | null;
}
type ReadClient = Pick<RtdGrpcClient, "ledgerService">;
const HISTORY_READ_MASK = [
  ...RECEIPT_READ_MASK,
  "events",
  "timestamp",
  "transaction_index",
];
export class WalletLedgerReadError extends Error {
  constructor(
    readonly role: Role,
    readonly reason:
      | "unconfigured"
      | "coverage"
      | "incompatible"
      | "unsupported",
  ) {
    super(
      reason === "coverage"
        ? "交易详情不在当前服务的已验证覆盖内"
        : reason === "unconfigured"
          ? "当前网络未配置归档查询入口"
          : reason === "unsupported"
            ? "该交易没有可解析的调用数据"
            : "交易详情返回事实不兼容",
    );
    this.name = "WalletLedgerReadError";
  }
}
function u64(value: unknown): bigint {
  if (typeof value !== "bigint" || value < 0n || value > 0xffffffffffffffffn)
    throw new Error("u64");
  return value;
}
/** Private read-only clients: no State/Execution/Name method can be dispatched by this reader. */
export class WalletLedgerReader {
  readonly #timeout: number;
  constructor(
    readonly session: WalletReadSession,
    readonly options: { fetch?: typeof fetch; timeoutMs?: number } = {},
  ) {
    this.#timeout = options.timeoutMs ?? 20_000;
    if (
      !Number.isSafeInteger(this.#timeout) ||
      this.#timeout < 1 ||
      this.#timeout > 60_000
    )
      throw new RangeError("交易查询预算无效");
  }
  #client(
    role: Role,
    methods: readonly string[],
    signal: AbortSignal,
  ): { endpoint: string; client: ReadClient } {
    const endpoint =
      role === "fullnode"
        ? this.session.profile.endpoints.fullnodeGrpcWeb
        : this.session.profile.endpoints.archiveGrpcWeb;
    if (!endpoint) throw new WalletLedgerReadError(role, "unconfigured");
    const fetch = boundedGrpcFetch(this.options.fetch ?? globalThis.fetch);
    return {
      endpoint,
      client: this.createClient(role, endpoint, methods, fetch, signal),
    };
  }
  protected createClient(
    role: Role,
    endpoint: string,
    methods: readonly string[],
    fetch: typeof globalThis.fetch,
    signal: AbortSignal,
  ): ReadClient {
    const approved = new Set(methods);
    return new RtdGrpcClient({
      network: this.session.profile.sdkNetwork,
      baseUrl: endpoint,
      format: "binary",
      mvr: { url: "" },
      fetch: async (input, init) => {
        signal.throwIfAborted();
        this.session.assertActive();
        const url = String(input);
        const permitted = [...approved].some(
          (method) =>
            url ===
            `${endpoint.replace(/\/$/, "")}/rtd.rpc.v2.LedgerService/${method}`,
        );
        if (!permitted) throw new WalletLedgerReadError(role, "incompatible");
        const response = await fetch(input, {
          ...init,
          redirect: "error",
          credentials: "omit",
          signal: AbortSignal.any([
            signal,
            ...(init?.signal ? [init.signal] : []),
          ]),
        });
        signal.throwIfAborted();
        this.session.assertActive();
        return response;
      },
    });
  }
  async #range(
    role: Role,
    endpoint: string,
    signal: AbortSignal,
  ): Promise<Range> {
    const response = await queuedServiceInfo(
      this.session,
      endpoint,
      this.options.fetch ?? globalThis.fetch,
      this.#timeout,
      signal,
    );
    let chain: string, height: bigint, lower: bigint | null;
    try {
      chain = assertGenesisDigest(response.chainId);
      height = u64(response.checkpointHeight);
      lower =
        response.lowestAvailableCheckpoint === undefined
          ? null
          : u64(response.lowestAvailableCheckpoint);
      if (lower !== null && lower > height) throw new Error("watermark");
      if (
        response.lowestAvailableCheckpointObjects !== undefined &&
        u64(response.lowestAvailableCheckpointObjects) > height
      )
        throw new Error("watermark");
    } catch {
      throw new NetworkIdentityError(role, "incompatible");
    }
    if (chain !== this.session.profile.expectedGenesisDigest)
      throw new NetworkIdentityError(role, "chain-mismatch");
    // An archive identity without a retention bound is not a coverage claim.
    if (role === "archive" && lower === null)
      throw new WalletLedgerReadError(role, "coverage");
    signal.throwIfAborted();
    this.session.assertActive();
    return { height, lower };
  }
  async #role(
    role: Role,
    digest: string,
    paths: string[],
    signal: AbortSignal,
  ): Promise<{ value: LedgerRead | null; pruned: boolean }> {
    const { endpoint, client } = this.#client(
      role,
      ["GetServiceInfo", "GetTransaction"],
      signal,
    );
    const before = await this.#range(role, endpoint, signal);
    let raw: GrpcTypes.ExecutedTransaction | undefined;
    let notFound = false;
    try {
      const { response } = await this.session.request(signal, () =>
        client.ledgerService.getTransaction(
          { digest, readMask: { paths } },
          { abort: signal, timeout: this.#timeout },
        ),
      );
      raw = response.transaction;
    } catch (error) {
      if (
        error instanceof RpcError &&
        error.code === GrpcStatusCode[GrpcStatusCode.NOT_FOUND]
      )
        notFound = true;
      else throw error;
    }
    if (!notFound && !raw)
      throw new WalletLedgerReadError(role, "incompatible");
    const after = await this.#range(role, endpoint, signal);
    if (after.height < before.height)
      throw new WalletLedgerReadError(role, "coverage");
    if (raw) {
      if (raw.digest !== digest)
        throw new WalletLedgerReadError(role, "incompatible");
      if (role === "archive" && raw.checkpoint === undefined)
        throw new WalletLedgerReadError(role, "coverage");
      if (raw.checkpoint !== undefined) {
        let checkpoint: bigint;
        try {
          checkpoint = u64(raw.checkpoint);
        } catch {
          throw new WalletLedgerReadError(role, "incompatible");
        }
        if (
          checkpoint > after.height ||
          (after.lower !== null && checkpoint < after.lower)
        )
          throw new WalletLedgerReadError(role, "coverage");
      }
    }
    signal.throwIfAborted();
    this.session.assertActive();
    return {
      value: raw ? { raw, source: role } : null,
      pruned: role === "fullnode" && after.lower !== null && after.lower > 0n,
    };
  }
  async #read<T>(
    digest: string,
    paths: string[],
    callerSignal: AbortSignal | undefined,
    parse: (found: LedgerRead) => Promise<T>,
  ): Promise<T | null> {
    assertGenesisDigest(digest);
    return this.session.read(async (sessionSignal) => {
      const signal = AbortSignal.any([
        sessionSignal,
        AbortSignal.timeout(this.#timeout),
        ...(callerSignal ? [callerSignal] : []),
      ]);
      signal.throwIfAborted();
      const recent = await this.#role("fullnode", digest, paths, signal);
      let found = recent.value;
      // NotFound alone is not evidence of pruning. No fallback for errors, malformed data or a mismatched chain.
      if (
        !found &&
        recent.pruned &&
        this.session.profile.endpoints.archiveGrpcWeb
      ) {
        // Digest height is unknown: do not invent min-checkpoint or forward a trusted visible/identity header.
        found = (await this.#role("archive", digest, paths, signal)).value;
      }
      if (!found) return null;
      const result = await parse(found);
      signal.throwIfAborted();
      this.session.assertActive();
      return result;
    });
  }
  lookup(
    digest: string,
    signal?: AbortSignal,
  ): Promise<WalletExecutionReceipt | null> {
    return this.#read(digest, RECEIPT_READ_MASK, signal, async (found) =>
      validateTransactionReceipt(
        found.raw,
        digest,
        undefined,
        undefined,
        found.source,
      ),
    );
  }
  /** Historical Ledger page. Only the archive reader can serve account history. */
  async historyPage(
    address: string,
    cursor: string | null = null,
    options: { limit?: number; signal?: AbortSignal } = {},
  ): Promise<WalletLedgerHistoryPage> {
    const owner = walletAddress(address);
    const limit = options.limit ?? 20;
    if (!Number.isInteger(limit) || limit < 1 || limit > 50)
      throw new RangeError("历史查询分页预算无效");
    let before: Uint8Array | undefined;
    if (cursor !== null) {
      try {
        if (cursor.length === 0 || cursor.length > 2048) throw new Error();
        before = fromBase64(cursor);
        if (before.length === 0 || toBase64(before) !== cursor)
          throw new Error();
      } catch {
        throw new WalletLedgerReadError("archive", "incompatible");
      }
    }
    return this.session.read(async (sessionSignal) => {
      const signal = AbortSignal.any([
        sessionSignal,
        AbortSignal.timeout(this.#timeout),
        ...(options.signal ? [options.signal] : []),
      ]);
      signal.throwIfAborted();
      const { endpoint, client } = this.#client(
        "archive",
        ["GetServiceInfo", "ListTransactions"],
        signal,
      );
      const beforeRange = await this.#range("archive", endpoint, signal);
      const call = client.ledgerService.listTransactions(
        {
          readMask: { paths: HISTORY_READ_MASK },
          filter: {
            terms: [
              {
                literals: [
                  {
                    negated: false,
                    predicate: {
                      oneofKind: "affectedAddress",
                      affectedAddress: { address: owner },
                    },
                  },
                ],
              },
            ],
          },
          options: {
            // Lookahead distinguishes a full page from a terminal page.
            limit: limit + 1,
            ordering: GrpcTypes.Ordering.DESCENDING,
            ...(before ? { before } : {}),
          },
        },
        { abort: signal, timeout: this.#timeout },
      );
      const rows: GrpcTypes.ExecutedTransaction[] = [];
      let frontier: Uint8Array | undefined;
      let itemCursor: Uint8Array | undefined;
      let sawLookahead = false;
      let end: GrpcTypes.QueryEnd | undefined;
      for await (const frame of call.responses) {
        signal.throwIfAborted();
        this.session.assertActive();
        if (frame.watermark?.cursor) {
          if (frame.watermark.cursor.length === 0)
            throw new WalletLedgerReadError("archive", "incompatible");
          frontier = frame.watermark.cursor;
        }
        if (frame.transaction) {
          if (rows.length >= limit) {
            sawLookahead = true;
          } else {
            if (!frontier)
              throw new WalletLedgerReadError("archive", "incompatible");
            rows.push(frame.transaction);
            itemCursor = frontier;
          }
        }
        if (frame.end) end = frame.end;
      }
      const hasNextPage =
        sawLookahead ||
        end?.reason === GrpcTypes.QueryEndReason.ITEM_LIMIT ||
        end?.reason === GrpcTypes.QueryEndReason.SCAN_LIMIT;
      const afterRange = await this.#range("archive", endpoint, signal);
      if (afterRange.height < beforeRange.height)
        throw new WalletLedgerReadError("archive", "coverage");
      const seen = new Set<string>();
      for (const raw of rows) {
        let digest: string;
        try {
          digest = assertGenesisDigest(raw.digest);
        } catch {
          throw new WalletLedgerReadError("archive", "incompatible");
        }
        if (seen.has(digest))
          throw new WalletLedgerReadError("archive", "incompatible");
        seen.add(digest);
        if (raw.checkpoint === undefined)
          throw new WalletLedgerReadError("archive", "incompatible");
        let checkpoint: bigint;
        try {
          checkpoint = u64(raw.checkpoint);
        } catch {
          throw new WalletLedgerReadError("archive", "incompatible");
        }
        if (
          checkpoint > afterRange.height ||
          (afterRange.lower !== null && checkpoint < afterRange.lower)
        )
          throw new WalletLedgerReadError("archive", "coverage");
        try {
          await validateTransactionReceipt(
            raw,
            digest,
            undefined,
            undefined,
            "archive",
          );
        } catch {
          throw new WalletLedgerReadError("archive", "incompatible");
        }
      }
      const next = hasNextPage
        ? sawLookahead
          ? itemCursor
          : (frontier ?? itemCursor)
        : undefined;
      if (hasNextPage && !next)
        throw new WalletLedgerReadError("archive", "coverage");
      const safe = (value: bigint): number => {
        if (value > BigInt(Number.MAX_SAFE_INTEGER))
          throw new WalletLedgerReadError("archive", "incompatible");
        return Number(value);
      };
      signal.throwIfAborted();
      this.session.assertActive();
      return Object.freeze({
        bindingKey: this.session.bindingKey,
        readSessionKey: this.session.cacheKey,
        address: owner,
        source: "archive" as const,
        checkpointHeight: safe(afterRange.height),
        lowestAvailableCheckpoint:
          afterRange.lower === null ? null : safe(afterRange.lower),
        transactions: Object.freeze(rows),
        hasNextPage,
        nextCursor: next ? toBase64(next) : null,
      });
    });
  }
  async details(
    digest: string,
    signal?: AbortSignal,
  ): Promise<WalletTransactionDetails | null> {
    return this.#read(
      digest,
      [...RECEIPT_READ_MASK, "events", "timestamp"],
      signal,
      async (found) => {
        const raw = found.raw;
        await validateTransactionReceipt(
          raw,
          digest,
          undefined,
          undefined,
          found.source,
        );
        if (raw.timestamp) {
          const { seconds, nanos } = raw.timestamp;
          if (
            seconds < 0n ||
            !Number.isInteger(nanos) ||
            nanos < 0 ||
            nanos >= 1_000_000_000 ||
            seconds * 1000n + BigInt(Math.floor(nanos / 1_000_000)) >
              BigInt(Number.MAX_SAFE_INTEGER) ||
            raw.checkpoint === undefined
          )
            throw new WalletLedgerReadError(found.source, "incompatible");
        }
        assertEventEnvelope(raw.events, raw.effects!.eventsDigest);
        // System transactions (genesis, epoch change, consensus prologue) carry
        // no programmable body to decode, so the parsed-detail view cannot
        // represent them. That is a property of the transaction, not a failed
        // read: report it distinctly so the page can say so instead of
        // offering a refresh that can never succeed.
        if (
          raw.transaction?.kind?.data?.oneofKind !== "programmableTransaction"
        )
          throw new WalletLedgerReadError(found.source, "unsupported");
        const result = parseGrpcTransactionResponse(raw, {
          include: {
            effects: true,
            transaction: true,
            bcs: true,
            balanceChanges: true,
            objectTypes: true,
            events: true,
          },
        });
        const transaction = result.Transaction ?? result.FailedTransaction!;
        transaction.objectTypes = Object.fromEntries(
          Object.entries(transaction.objectTypes).map(([id, type]) => [
            walletAddress(id),
            // The native protocol uses this literal for package objects, not a Move TypeTag.
            type === "package" ? type : dynamicType(type),
          ]),
        );
        receiptStakeEvents(transaction, transaction.transaction.sender!);
        receiptObjectEffects(transaction);
        return Object.freeze({
          bindingKey: this.session.bindingKey,
          readSessionKey: this.session.cacheKey,
          source: found.source,
          transaction,
        });
      },
    );
  }
}
