// Copyright (c) LinkU Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { describe, expect, it, vi } from "vitest";
import type {
  WalletRpc,
  WalletPreparedTransaction,
} from "rtd-apps-core/src/rpc/WalletRpcContext";
import {
  normalizeRtdAddress,
  normalizeStructTag,
  toBase58,
} from "rtd-typescript/utils";
import {
  assertCoinTransferDraft,
  prepareCoinTransfer,
  revalidateCoinTransfer,
} from "./coin-transfer-preparation";

function fixture() {
  const sender = normalizeRtdAddress("0xb");
  const prepared = {
    bindingKey: "binding",
    readSessionKey: "session",
    sender,
    gasOwner: sender,
    gasBudget: "100",
    gasPrice: "1",
    gasPaymentKind: "coins",
    bytesBase64: "fixedBytes",
    digest: "fixedDigest",
  } as WalletPreparedTransaction;
  const rpc = {
    bindingKey: "binding",
    readSessionKey: "session",
    readFreshCoins: vi.fn().mockResolvedValue([
      {
        objectId: normalizeRtdAddress("0xc"),
        version: "11",
        digest: toBase58(new Uint8Array(32).fill(9)),
        balance: "9007199254740993",
        owner: { $kind: "AddressOwner", AddressOwner: sender },
        type: normalizeStructTag("0x2::coin::Coin<0x2::rtd::RTD>"),
      },
    ]),
    readFreshBalance: vi
      .fn()
      .mockResolvedValue({
        coinType: normalizeStructTag("0x2::rtd::RTD"),
        balance: "9007199254740993",
        coinBalance: "9007199254740993",
        addressBalance: "0",
      }),
    prepareTransaction: vi.fn().mockResolvedValue(prepared),
    simulateTransaction: vi.fn().mockResolvedValue({
      $kind: "Transaction",
      Transaction: { digest: "fixedDigest" },
    }),
  } as unknown as WalletRpc;
  const input = {
    sender: "0xb",
    to: "0xa",
    coinType: "0x2::rtd::RTD",
    amount: "1",
    coinDecimals: 9,
    isPayAllRtd: false,
  };
  return { prepared, rpc, input };
}
describe("转账预览与批准内容边界", () => {
  it.each([
    { amount: "9007199.254740992", isPayAllRtd: true },
    { amount: "9007199.254740994", isPayAllRtd: true },
    { amount: "9007199.254740994", isPayAllRtd: false },
    { amount: "0", isPayAllRtd: true },
  ])("Coin资金的旧全额、超额或零额 %j 在构建前拒绝", async (change) => {
    const f = fixture();
    await expect(prepareCoinTransfer(f.rpc, {...f.input, ...change})).rejects.toThrow();
    expect(f.rpc.prepareTransaction).not.toHaveBeenCalled();
  });
  it("Coin全额与新鲜余额精确一致才进入正式准备", async () => {
    const f = fixture();
    const prepared = await prepareCoinTransfer(f.rpc, {
      ...f.input, amount: "9007199.254740993", isPayAllRtd: true,
    });
    expect(prepared.input.amount).toBe("9007199.254740993");
    expect(f.rpc.prepareTransaction).toHaveBeenCalledTimes(1);
  });
  it("使用新鲜coin构建一次，将绑定与原输入冻结为批准记录", async () => {
    const f = fixture();
    const signal = new AbortController().signal;
    const result = await prepareCoinTransfer(f.rpc, f.input, signal);
    expect(f.rpc.readFreshCoins).toHaveBeenCalledWith(
      normalizeRtdAddress("0xb"),
      result.input.coinType,
      signal,
    );
    expect(f.rpc.prepareTransaction).toHaveBeenCalledTimes(1);
    expect(result.input.to).toBe(normalizeRtdAddress("0xa"));
    expect(Object.isFrozen(result)).toBe(true);
    expect(Object.isFrozen(result.input)).toBe(true);
    assertCoinTransferDraft(f.rpc, result, f.input);
  });
  it.each([
    { to: "0xd" },
    { amount: "2" },
    { coinDecimals: 8 },
    { coinType: "0x3::other::OTHER" },
    { isPayAllRtd: true },
    { sender: "0xe" },
  ])("表单改变%j不能沿用旧批准bytes", async (change) => {
    const f = fixture();
    const result = await prepareCoinTransfer(f.rpc, f.input);
    expect(() =>
      assertCoinTransferDraft(f.rpc, result, { ...f.input, ...change }),
    ).toThrow("重新预览");
  });
  it("签名前仅模拟批准bytes，不重新查询coin或重建，不替换digest", async () => {
    const f = fixture();
    const result = await prepareCoinTransfer(f.rpc, f.input);
    vi.mocked(f.rpc.readFreshCoins).mockClear();
    vi.mocked(f.rpc.prepareTransaction).mockClear();
    expect(await revalidateCoinTransfer(f.rpc, result, f.input.sender)).toBe(
      result,
    );
    expect(f.rpc.simulateTransaction).toHaveBeenCalledWith(
      "fixedBytes",
      normalizeRtdAddress("0xb"),
      undefined,
    );
    expect(f.rpc.readFreshCoins).not.toHaveBeenCalled();
    expect(f.rpc.prepareTransaction).not.toHaveBeenCalled();
  });
  it.each([
    {
      $kind: "FailedTransaction",
      FailedTransaction: { digest: "fixedDigest" },
    },
    { $kind: "Transaction", Transaction: { digest: "otherDigest" } },
  ])("批准后的失败或不同摘要禁止推进签名", async (result) => {
    const f = fixture();
    const prepared = await prepareCoinTransfer(f.rpc, f.input);
    vi.mocked(f.rpc.simulateTransaction).mockResolvedValue(result as never);
    await expect(
      revalidateCoinTransfer(f.rpc, prepared, f.input.sender),
    ).rejects.toThrow("重新预览并授权");
  });
  it("换网或重新进入同绑定的新读会话，旧批准立即失效", async () => {
    const f = fixture();
    const prepared = await prepareCoinTransfer(f.rpc, f.input);
    for (const next of [
      { ...f.rpc, bindingKey: "other" },
      { ...f.rpc, readSessionKey: "other" },
    ]) {
      await expect(
        revalidateCoinTransfer(next, prepared, f.input.sender),
      ).rejects.toThrow("重新预览");
      expect(() => assertCoinTransferDraft(next, prepared, f.input)).toThrow(
        "重新预览",
      );
    }
  });
  it("领域返回不属于当前会话的准备结果，不生成批准记录", async () => {
    const f = fixture();
    vi.mocked(f.rpc.prepareTransaction).mockResolvedValue({
      ...f.prepared,
      readSessionKey: "wrong",
    });
    await expect(prepareCoinTransfer(f.rpc, f.input)).rejects.toThrow(
      "不同钱包会话",
    );
  });
});

describe("名称收款授权固定最终地址", () => {
  function namedFixture() {
    const f = fixture();
    const input = { ...f.input, recipientName: "test.rtd" };
    const resolution = {
      address: normalizeRtdAddress(f.input.to),
      snapshot: { bindingKey: f.rpc.bindingKey },
      readSessionKey: f.rpc.readSessionKey,
      validUntilMonotonicMs: performance.now() + 20_000,
    };
    f.rpc.resolveRecipientName = vi.fn().mockResolvedValue(resolution);
    return { ...f, input, resolution };
  }
  it("模拟期间名称期限耗尽时拒绝继续签名", async () => {
    const f = namedFixture();
    const prepared = await prepareCoinTransfer(f.rpc, f.input);
    const original = vi.mocked(f.rpc.simulateTransaction).getMockImplementation()!;
    vi.mocked(f.rpc.simulateTransaction).mockImplementation(async (...args) => {
      const result = await original(...args);
      vi.spyOn(performance, "now").mockReturnValue(f.resolution.validUntilMonotonicMs);
      return result;
    });
    try {
      await expect(revalidateCoinTransfer(f.rpc, prepared, f.input.sender)).rejects.toThrow("校验已过期");
    } finally { vi.restoreAllMocks(); }
  });
  it("构建前确认名称目标，签名前再次查新名称，只模拟批准bytes", async () => {
    const f = namedFixture();
    const prepared = await prepareCoinTransfer(f.rpc, f.input);
    expect(prepared.input.recipientName).toBe("test.rtd");
    await revalidateCoinTransfer(f.rpc, prepared, f.input.sender);
    expect(f.rpc.resolveRecipientName).toHaveBeenCalledTimes(2);
    expect(f.rpc.readFreshCoins).toHaveBeenCalledTimes(1);
    expect(f.rpc.prepareTransaction).toHaveBeenCalledTimes(1);
    expect(f.rpc.simulateTransaction).toHaveBeenCalledWith(
      "fixedBytes",
      prepared.sender,
      undefined,
    );
  });
  it.each([
    null,
    {
      address: normalizeRtdAddress("0xd"),
      snapshot: { bindingKey: "binding" },
      readSessionKey: "session",
    },
    {
      address: normalizeRtdAddress("0xa"),
      snapshot: { bindingKey: "other" },
      readSessionKey: "session",
    },
  ])("名称缺失、目标改变或绑定改变拒绝批准交易", async (resolution) => {
    const f = namedFixture();
    const prepared = await prepareCoinTransfer(f.rpc, f.input);
    vi.mocked(f.rpc.resolveRecipientName).mockResolvedValue(resolution as any);
    await expect(
      revalidateCoinTransfer(f.rpc, prepared, f.input.sender),
    ).rejects.toThrow("收款名称");
    expect(f.rpc.simulateTransaction).not.toHaveBeenCalled();
    expect(f.rpc.readFreshCoins).toHaveBeenCalledTimes(1);
  });
  it("名称网络失败不重建、不签发、不回退旧RPC", async () => {
    const f = namedFixture();
    const prepared = await prepareCoinTransfer(f.rpc, f.input);
    vi.mocked(f.rpc.resolveRecipientName).mockRejectedValue(
      new Error("index lag"),
    );
    await expect(
      revalidateCoinTransfer(f.rpc, prepared, f.input.sender),
    ).rejects.toThrow("index lag");
    expect(f.rpc.prepareTransaction).toHaveBeenCalledTimes(1);
    expect(f.rpc.simulateTransaction).not.toHaveBeenCalled();
  });
});
