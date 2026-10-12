// Copyright (c) LinkU Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { GrpcTypes } from "rtd-typescript/grpc";
import { bcs } from "rtd-typescript/bcs";
import { toBase58 } from "rtd-typescript/utils";
import { describe, expect, it, vi } from "vitest";
import {
  executionFixture,
  grpcResponse,
} from "../../../tests/unit/rpc/execution-fixtures";
import { WalletLedgerReader } from "./ledger-reader";
import { WalletExecutionCoordinator } from "./execution-coordinator";
import {
  type WalletExecutionReceipt,
  createPendingRecord,
} from "./execution-journal";
import { WalletReadSession } from "./session";
import { validateNetworkProfile } from "./profile";
import { profileFixture } from "./profile-fixture";

async function fixture(
  options: {
    fullStatus?: number;
    archiveStatus?: number;
    fullLow?: bigint;
    archiveLow?: bigint;
    archiveHeight?: bigint;
    archiveChain?: string;
    alter?: (raw: GrpcTypes.ExecutedTransaction) => void;
    success?: boolean;
    noArchive?: boolean;
    missingTransaction?: boolean;
    afterInfo?: (
      role: string,
      call: number,
    ) => Partial<GrpcTypes.GetServiceInfoResponse>;
  } = {},
) {
  const tx = await executionFixture();
  const config = profileFixture();
  if (options.noArchive) delete config.endpoints.archiveGrpcWeb;
  const profile = validateNetworkProfile(config);
  const session = new WalletReadSession(profile);
  const requests: {
    role: string;
    method: string;
    request: GrpcTypes.GetTransactionRequest | null;
    signal?: AbortSignal | null;
  }[] = [];
  const infos: Record<string, number> = { fullnode: 0, archive: 0 };
  const fetch = vi.fn<typeof globalThis.fetch>(async (url, init) => {
    const role = String(url).startsWith(profile.endpoints.fullnodeGrpcWeb)
      ? "fullnode"
      : "archive";
    const method = String(url).split("/").at(-1)!;
    expect(["GetServiceInfo", "GetTransaction"]).toContain(method);
    expect(init!.redirect).toBe("error");
    expect(init!.credentials).toBe("omit");
    const headers = new Headers(init?.headers);
    for (const name of [
      "x-rtd-visible-checkpoint",
      "x-rtd-min-checkpoint",
      "authorization",
      "cookie",
    ])
      expect(headers.has(name)).toBe(false);
    const request =
      method === "GetTransaction"
        ? GrpcTypes.GetTransactionRequest.fromBinary(
            (init!.body as Uint8Array).subarray(5),
          )
        : null;
    requests.push({ role, method, request, signal: init!.signal });
    if (method === "GetServiceInfo") {
      const info = ++infos[role];
      return grpcResponse(
        GrpcTypes.GetServiceInfoResponse.toBinary({
          chainId:
            role === "archive"
              ? (options.archiveChain ?? profile.expectedGenesisDigest)
              : profile.expectedGenesisDigest,
          checkpointHeight:
            role === "archive" ? (options.archiveHeight ?? 21n) : 30n,
          lowestAvailableCheckpoint:
            role === "archive" ? options.archiveLow : options.fullLow,
          ...options.afterInfo?.(role, info),
        }),
      );
    }
    expect(request!.digest).toBe(tx.digest);
    const raw = tx.result(options.success ?? true);
    options.alter?.(raw);
    return grpcResponse(
      GrpcTypes.GetTransactionResponse.toBinary({
        transaction: options.missingTransaction ? undefined : raw,
      }),
      role === "fullnode"
        ? (options.fullStatus ?? 5)
        : (options.archiveStatus ?? 0),
    );
  });
  const reader = new WalletLedgerReader(session, { fetch });
  return { tx, session, reader, requests, fetch };
}
function packageEffect(raw: GrpcTypes.ExecutedTransaction, objectType: string) {
  const objectId = "0x" + "0".repeat(63) + "f";
  const digest = toBase58(new Uint8Array(32).fill(9));
  const parsed = bcs.TransactionEffects.parse(raw.effects!.bcs!.value!);
  if (parsed.$kind !== "V2") throw new Error("expected effects v2");
  raw.effects!.bcs!.value = bcs.TransactionEffects.serialize({
    V2: {
      ...parsed.V2,
      changedObjects: [
        [
          objectId,
          {
            inputState: { NotExist: true },
            outputState: { PackageWrite: [1, digest] },
            idOperation: { Created: true },
          },
        ],
      ],
    },
  }).toBytes();
  raw.effects!.changedObjects.push({
    objectId,
    objectType,
    inputState: GrpcTypes.ChangedObject_InputObjectState.DOES_NOT_EXIST,
    outputState: GrpcTypes.ChangedObject_OutputObjectState.PACKAGE_WRITE,
    idOperation: GrpcTypes.ChangedObject_IdOperation.CREATED,
  });
}
describe("同摘要的近期／裁剪归档读取", () => {
  it.each([0, 5])(
    "包含包对象的原生／归档交易详情保留package类型 %s",
    async (fullStatus) => {
      const f = await fixture({
        fullStatus,
        fullLow: fullStatus === 0 ? 10n : 22n,
        archiveLow: 0n,
        alter: (raw) => {
          packageEffect(raw, "package");
        },
      });
      const details = await f.reader.details(f.tx.digest);
      expect(details!.transaction.objectTypes).toMatchObject({
        ["0x" + "0".repeat(63) + "f"]: "package",
      });
      expect(details!.transaction.digest).toBe(f.tx.digest);
      expect(details!.source).toBe(fullStatus === 0 ? "fullnode" : "archive");
    },
  );
  it.each([
    "Package",
    "package ",
    "package<0x2::coin::Coin>",
    "0x2::coin::Coin@bad",
  ])("畸形包标记或Move类型仍拒绝 %s", async (objectType) => {
    const f = await fixture({
      fullStatus: 0,
      alter: (raw) => {
        packageEffect(raw, objectType);
      },
    });
    await expect(f.reader.details(f.tx.digest)).rejects.toThrow();
  });
  it.each([true, false])(
    "Fullnode明确裁剪后按原digest取归档成功／链失败 %s",
    async (success) => {
      const f = await fixture({ fullLow: 22n, archiveLow: 0n, success });
      expect(await f.reader.lookup(f.tx.digest)).toEqual({
        ...f.tx.receipt(success),
        source: "archive",
      });
      const details = await f.reader.details(f.tx.digest);
      expect(details).toMatchObject({
        source: "archive",
        transaction: { digest: f.tx.digest, status: { success } },
      });
      const calls = f.requests.filter(
        (call) => call.method === "GetTransaction",
      );
      expect(calls.map((call) => call.role)).toEqual([
        "fullnode",
        "archive",
        "fullnode",
        "archive",
      ]);
      expect(calls[0].request!.readMask!.paths).not.toContain("events");
      expect(calls[3].request!.readMask!.paths).toContain("events");
    },
  );
  it.each([undefined, 0n])(
    "普通NotFound且无已观察裁剪不查询归档 %s",
    async (fullLow) => {
      const f = await fixture({ fullLow, archiveLow: 0n });
      expect(await f.reader.lookup(f.tx.digest)).toBeNull();
      expect(f.requests.every((call) => call.role === "fullnode")).toBe(true);
    },
  );
  it("近期完整回执直接使用Fullnode，不因已裁剪其它历史而访问归档", async () => {
    const f = await fixture({ fullStatus: 0, fullLow: 10n, archiveLow: 0n });
    expect(await f.reader.lookup(f.tx.digest)).toMatchObject({
      source: "fullnode",
    });
    expect(f.requests.every((call) => call.role === "fullnode")).toBe(true);
  });
  it("已裁剪但未配置归档仍未知，不回退旧RPC或公网上游", async () => {
    const f = await fixture({ fullLow: 22n, noArchive: true });
    expect(await f.reader.lookup(f.tx.digest)).toBeNull();
    expect(f.requests).toHaveLength(3);
  });
  it.each([14, 7, 12])(
    "Fullnode服务／权限／协议错误不切换归档 %s",
    async (fullStatus) => {
      const f = await fixture({ fullStatus, fullLow: 22n, archiveLow: 0n });
      await expect(f.reader.lookup(f.tx.digest)).rejects.toThrow();
      expect(f.requests.every((call) => call.role === "fullnode")).toBe(true);
    },
  );
  it("缺交易字段不能当NotFound并启动归档", async () => {
    const f = await fixture({
      fullStatus: 0,
      fullLow: 22n,
      archiveLow: 0n,
      missingTransaction: true,
    });
    await expect(f.reader.lookup(f.tx.digest)).rejects.toThrow();
    expect(f.requests.every((call) => call.role === "fullnode")).toBe(true);
  });
  it.each([
    { archiveLow: undefined },
    { archiveLow: 22n, archiveHeight: 30n },
    { archiveLow: 0n, archiveHeight: 20n },
    {
      archiveLow: 0n,
      alter: (raw: GrpcTypes.ExecutedTransaction) => {
        raw.checkpoint = undefined;
      },
    },
    { archiveLow: 0n, archiveChain: toBase58(new Uint8Array(32).fill(99)) },
    {
      archiveLow: 0n,
      afterInfo: (role: string, call: number) =>
        role === "archive" && call === 2 ? { checkpointHeight: 20n } : {},
    },
    {
      archiveLow: 0n,
      alter: (raw: GrpcTypes.ExecutedTransaction) => {
        raw.digest = toBase58(new Uint8Array(32).fill(99));
      },
    },
  ])("归档覆盖／身份／摘要不成立时拒绝接纳 %#", async (options) => {
    const f = await fixture({ fullLow: 22n, ...options });
    await expect(f.reader.lookup(f.tx.digest)).rejects.toThrow();
  });
  it("两端NotFound保持未知，不能推断未入链", async () => {
    const f = await fixture({ fullLow: 22n, archiveLow: 0n, archiveStatus: 5 });
    expect(await f.reader.lookup(f.tx.digest)).toBeNull();
  });
  it("调用方取消前不发送；中途会话关闭拒绝迟到归档", async () => {
    const f = await fixture({ fullLow: 22n, archiveLow: 0n });
    const cancel = new AbortController();
    cancel.abort();
    await expect(f.reader.lookup(f.tx.digest, cancel.signal)).rejects.toThrow();
    expect(f.requests).toHaveLength(0);
    const g = await fixture({
      fullLow: 22n,
      archiveLow: 0n,
      alter: () => g.session.close(),
    });
    await expect(g.reader.lookup(g.tx.digest)).rejects.toThrow();
  });
  it("总预算耗尽拒绝不遵守取消的迟到输送", async () => {
    const f = await fixture({ fullStatus: 0, fullLow: 0n });
    const fetch: typeof globalThis.fetch = async (...args) => {
      await new Promise((resolve) => setTimeout(resolve, 20));
      return f.fetch(...args);
    };
    const reader = new WalletLedgerReader(f.session, { fetch, timeoutMs: 5 });
    await expect(reader.lookup(f.tx.digest)).rejects.toThrow();
    // Cancellation now rejects subscribers immediately, before the deliberately
    // non-cooperative transport delivers its late response.
    await vi.waitFor(() => expect(f.requests).toHaveLength(1));
    expect(f.requests[0].method).toBe("GetServiceInfo");
  });
  it("实际协调器恢复归档回执，只写终态不签名或再次dispatch", async () => {
    const f = await fixture({ fullLow: 22n, archiveLow: 0n });
    const record = createPendingRecord(f.session.profile, {
      accountId: "account",
      accountAddress: f.tx.result().transaction!.sender!,
      requestId: "request",
      originRef: "wallet-ui",
      digest: f.tx.digest,
      bindingKey: f.session.bindingKey,
    });
    const commit = vi.fn(
      async (_id: string, receipt: WalletExecutionReceipt) => ({
        ...record,
        state: "confirmed-success" as const,
        receipt,
      }),
    );
    const dispatch = vi.fn(),
      verifySignature = vi.fn();
    const coordinator = new WalletExecutionCoordinator(
      f.session,
      {
        pending: vi.fn(async () => record),
        get: vi.fn(async () => record),
        commitPending: vi.fn(),
        commitReceipt: commit,
      },
      { lookup: f.reader.lookup.bind(f.reader), dispatch, verifySignature },
      { run: async (_scope, operation) => operation() },
    );
    const result = await coordinator.recover(
      record.accountAddress,
      async () => {},
    );
    expect(result).toMatchObject({
      state: "confirmed",
      receipt: { digest: f.tx.digest, source: "archive" },
    });
    expect(commit).toHaveBeenCalledOnce();
    expect(dispatch).not.toHaveBeenCalled();
    expect(verifySignature).not.toHaveBeenCalled();
  });
});
