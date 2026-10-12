// Copyright (c) LinkU Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { boundedGrpcFetch } from "./grpc-response-budget";
import { queuedServiceInfo } from "./service-info-queue";
import { RtdGrpcClient } from "rtd-typescript/grpc";
import { assertGenesisDigest } from "./profile";
import { NetworkIdentityError } from "./identity";
import { WalletReadSession } from "./session";

export type ArchiveCheckpointSelector =
  | { sequenceNumber: string; digest?: never }
  | { digest: string; sequenceNumber?: never };

function u64(value: unknown): bigint {
  if (typeof value !== "bigint" || value < 0n || value > 0xffffffffffffffffn)
    throw new Error("归档 checkpoint 水位无效");
  return value;
}
function explicitSelector(selector: ArchiveCheckpointSelector) {
  if (!selector || typeof selector !== "object")
    throw new Error("必须指定归档 checkpoint");
  if ("sequenceNumber" in selector && !("digest" in selector)) {
    const value = selector.sequenceNumber;
    if (
      typeof value !== "string" ||
      !/^(0|[1-9]\d*)$/.test(value) ||
      value.length > 20
    )
      throw new Error("checkpoint 高度必须是规范 u64 字符串");
    return {
      oneofKind: "sequenceNumber" as const,
      sequenceNumber: u64(BigInt(value)),
    };
  }
  if ("digest" in selector && !("sequenceNumber" in selector))
    return {
      oneofKind: "digest" as const,
      digest: assertGenesisDigest(selector.digest),
    };
  throw new Error("checkpoint 必须且只能指定高度或摘要");
}

/** Exact service reference only, not a certificate or transaction inclusion proof. */
export class WalletArchiveCheckpointReader {
  constructor(
    readonly session: WalletReadSession,
    readonly options: { fetch?: typeof fetch } = {},
  ) {}

  async checkpoint(
    selector: ArchiveCheckpointSelector,
    callerSignal?: AbortSignal,
  ) {
    const checkpointId = explicitSelector(selector);
    const endpoint = this.session.profile.endpoints.archiveGrpcWeb;
    if (!endpoint) throw new Error("当前网络未配置归档查询入口");
    return this.session.read(async (sessionSignal) => {
      const signal = AbortSignal.any([
        sessionSignal,
        AbortSignal.timeout(20_000),
        ...(callerSignal ? [callerSignal] : []),
      ]);
      const transport = boundedGrpcFetch(
        this.options.fetch ?? globalThis.fetch,
      );
      const client = new RtdGrpcClient({
        network: this.session.profile.sdkNetwork,
        baseUrl: endpoint,
        format: "binary",
        mvr: { url: "" },
        fetch: async (input, init) => {
          signal.throwIfAborted();
          this.session.assertActive();
          const prefix = `${endpoint.replace(/\/$/, "")}/rtd.rpc.v2.LedgerService/`;
          if (
            !["GetServiceInfo", "GetCheckpoint"].some(
              (method) => String(input) === prefix + method,
            )
          )
            throw new Error("归档 checkpoint 拒绝非白名单方法");
          const response = await transport(input, {
            ...init,
            credentials: "omit",
            redirect: "error",
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
        const lower = u64(response.lowestAvailableCheckpoint),
          upper = u64(response.checkpointHeight);
        if (lower > upper) throw new Error("归档 checkpoint 覆盖范围无效");
        return { lower, upper };
      };
      const before = await info();
      if (
        checkpointId.oneofKind === "sequenceNumber" &&
        (checkpointId.sequenceNumber < before.lower ||
          checkpointId.sequenceNumber > before.upper)
      )
        throw new Error("指定 checkpoint 超出归档覆盖范围");
      const { response } = await this.session.request(signal, () =>
        client.ledgerService.getCheckpoint(
          { checkpointId, readMask: { paths: ["sequence_number", "digest"] } },
          { abort: signal },
        ),
      );
      const sequenceNumber = u64(response.checkpoint?.sequenceNumber);
      const digest = assertGenesisDigest(response.checkpoint?.digest);
      if (
        checkpointId.oneofKind === "sequenceNumber"
          ? sequenceNumber !== checkpointId.sequenceNumber
          : digest !== checkpointId.digest
      )
        throw new Error("归档 checkpoint 选择器不匹配");
      if (
        sequenceNumber === 0n &&
        digest !== this.session.profile.expectedGenesisDigest
      )
        throw new NetworkIdentityError("archive", "chain-mismatch");
      const after = await info();
      if (
        after.lower !== before.lower ||
        after.upper < before.upper ||
        sequenceNumber < after.lower ||
        sequenceNumber > before.upper
      )
        throw new Error("归档 checkpoint 覆盖范围在查询期间改变或不含结果");
      signal.throwIfAborted();
      this.session.assertActive();
      return Object.freeze({
        bindingKey: this.session.bindingKey,
        sequenceNumber: sequenceNumber.toString(),
        digest,
        verification: "service-reference" as const,
        coverage: Object.freeze({
          lower: after.lower.toString(),
          upper: after.upper.toString(),
        }),
      });
    });
  }
}
