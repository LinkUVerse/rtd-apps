// Copyright (c) LinkU Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { boundedGrpcFetch } from "./grpc-response-budget";
import { queuedServiceInfo } from "./service-info-queue";
import { RtdGrpcClient } from "rtd-typescript/grpc";
import type { WalletFreshObject } from "rtd-apps-core/src/rpc/WalletRpcContext";
import { WalletReadSession } from "./session";
import { walletAddress } from "./asset-address";
import { assertGenesisDigest } from "./profile";
import { decodeFreshObject, FRESH_OBJECT_MASK } from "./fresh-object";
import { NetworkIdentityError } from "./identity";

export interface HistoricalObjectSelector {
  readonly objectId: string;
  readonly version: string;
}
export class ArchiveObjectItemError extends Error {
  constructor(
    readonly selector: HistoricalObjectSelector,
    readonly code: number,
  ) {
    super(`归档对象版本查询失败（gRPC ${code}）`);
    this.name = "ArchiveObjectItemError";
  }
}
function version(value: string): bigint {
  if (
    typeof value !== "string" ||
    !/^(0|[1-9]\d*)$/.test(value) ||
    value.length > 20 ||
    BigInt(value) > 0xffffffffffffffffn
  )
    throw new Error("历史对象版本必须是显式u64");
  return BigInt(value);
}
function height(value: unknown): bigint {
  if (typeof value !== "bigint" || value < 0n || value > 0xffffffffffffffffn)
    throw new Error("归档覆盖范围不完整");
  return value;
}

/** Exact historical versions only. Never supplies current transaction inputs or retries at latest. */
export class WalletArchiveObjectReader {
  constructor(
    readonly session: WalletReadSession,
    readonly options: { fetch?: typeof fetch } = {},
  ) {}

  async object(selector: HistoricalObjectSelector, signal?: AbortSignal) {
    const result = await this.objects([selector], signal);
    return Object.freeze({
      bindingKey: result.bindingKey,
      selector: result.selectors[0],
      value: result.values[0],
      coverage: result.coverage,
    });
  }

  async objects(
    selectors: readonly HistoricalObjectSelector[],
    callerSignal?: AbortSignal,
  ) {
    if (selectors.length > 1000) throw new RangeError("历史对象批量预算超限");
    const requested = selectors.map((s) =>
      Object.freeze({
        objectId: walletAddress(s.objectId),
        version: version(s.version).toString(),
      }),
    );
    const endpoint = this.session.profile.endpoints.archiveGrpcWeb;
    if (!endpoint) throw new Error("当前网络未配置归档查询入口");
    return this.session.read(async (sessionSignal) => {
      const signal = AbortSignal.any([
        sessionSignal,
        AbortSignal.timeout(20_000),
        ...(callerSignal ? [callerSignal] : []),
      ]);
      const fetch = boundedGrpcFetch(this.options.fetch ?? globalThis.fetch);
      const client = new RtdGrpcClient({
        network: this.session.profile.sdkNetwork,
        baseUrl: endpoint,
        format: "binary",
        mvr: { url: "" },
        fetch: async (input, init) => {
          signal.throwIfAborted();
          this.session.assertActive();
          const allowed = ["GetServiceInfo", "BatchGetObjects"].some(
            (method) =>
              String(input) ===
              `${endpoint.replace(/\/$/, "")}/rtd.rpc.v2.LedgerService/${method}`,
          );
          if (!allowed) throw new Error("历史对象reader拒绝非白名单方法");
          const result = await fetch(input, {
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
          return result;
        },
      });
      const info = async () => {
        const response = await queuedServiceInfo(
          this.session,
          endpoint,
          this.options.fetch ?? globalThis.fetch,
          20_000,
          signal,
        );
        if (
          assertGenesisDigest(response.chainId) !==
          this.session.profile.expectedGenesisDigest
        )
          throw new NetworkIdentityError("archive", "chain-mismatch");
        const upper = height(response.checkpointHeight),
          lower = height(response.lowestAvailableCheckpointObjects);
        if (lower > upper) throw new Error("归档对象覆盖范围无效");
        return { lower, upper };
      };
      const before = await info();
      const result: (WalletFreshObject | ArchiveObjectItemError)[] = [];
      for (let offset = 0; offset < requested.length; offset += 20) {
        const batch = requested.slice(offset, offset + 20);
        const { response } = await this.session.request(signal, () =>
          client.ledgerService.batchGetObjects(
            {
              requests: batch.map((s) => ({
                objectId: s.objectId,
                version: BigInt(s.version),
              })),
              readMask: { paths: [...FRESH_OBJECT_MASK] },
            },
            { abort: signal },
          ),
        );
        if (response.objects.length !== batch.length)
          throw new Error("归档批量对象缺少槽位");
        response.objects.forEach((entry, index) => {
          const selector = batch[index];
          if (entry.result.oneofKind === "error") {
            const code = entry.result.error.code;
            if (!Number.isInteger(code) || code < 1 || code > 16)
              throw new Error("归档逐项错误状态无效");
            result.push(new ArchiveObjectItemError(selector, code));
          } else if (entry.result.oneofKind === "object") {
            const object = decodeFreshObject(
              entry.result.object,
              selector.objectId,
            );
            if (object.version !== selector.version)
              throw new Error("归档返回版本不匹配");
            result.push(object);
          } else throw new Error("归档对象结果缺失");
        });
      }
      const after = await info();
      if (after.upper < before.upper || after.lower !== before.lower)
        throw new Error("归档对象覆盖范围在读取期间改变");
      signal.throwIfAborted();
      this.session.assertActive();
      return Object.freeze({
        bindingKey: this.session.bindingKey,
        selectors: Object.freeze(requested),
        values: Object.freeze(result),
        coverage: Object.freeze({
          lower: after.lower.toString(),
          upper: after.upper.toString(),
        }),
      });
    });
  }
}
