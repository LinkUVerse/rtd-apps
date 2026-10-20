// Copyright (c) LinkU Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

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
export class WalletLedgerReadError extends Error {
  constructor(
    readonly role: Role,
    readonly reason: "unconfigured" | "coverage" | "incompatible" | "unsupported",
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
  async #role(
    role: Role,
    digest: string,
    paths: string[],
    signal: AbortSignal,
  ): Promise<{ value: LedgerRead | null; pruned: boolean }> {
    const endpoint =
      role === "fullnode"
        ? this.session.profile.endpoints.fullnodeGrpcWeb
        : this.session.profile.endpoints.archiveGrpcWeb;
    if (!endpoint) throw new WalletLedgerReadError(role, "unconfigured");
    const fetch = boundedGrpcFetch(this.options.fetch ?? globalThis.fetch);
    const approved = new Set(["GetServiceInfo", "GetTransaction"]);
    const client = new RtdGrpcClient({
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
    const info = async (): Promise<Range> => {
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
    };
    const before = await info();
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
    const after = await info();
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
        if (raw.transaction?.kind?.data?.oneofKind !== "programmableTransaction")
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
