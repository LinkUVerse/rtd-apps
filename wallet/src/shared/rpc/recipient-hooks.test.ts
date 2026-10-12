// Copyright (c) LinkU Labs, Inc.
// SPDX-License-Identifier: Apache-2.0
import { describe, expect, it, vi } from "vitest";
import { normalizeRtdAddress } from "rtd-typescript/utils";
import { inspectRecipient } from "rtd-apps-core/src/rpc/recipient-hooks";
import type {
  WalletAccountHistory,
  WalletRpc,
  WalletFreshObject,
} from "rtd-apps-core/src/rpc/WalletRpcContext";
const address = normalizeRtdAddress("0xb");
function fixture(count = 0, alter: Partial<WalletAccountHistory> = {}) {
  const history: WalletAccountHistory = {
    bindingKey: "profile",
    readSessionKey: "session",
    address,
    checkpointLo: 5,
    checkpointHi: 10,
    checkpointDigest: "digest",
    snapshot: "snapshot",
    coverage: {
      registrationComplete: true,
      completeForRegisteredKiosks: true,
      completeForDiscoveredOwnerTokens: null,
      completeForDiscoveredCapabilities: null,
      allAccountActivityCertified: false,
      allAccountTransfersCertified: false,
    },
    totalTransactions: count,
    transactions: [],
    ...alter,
  };
  const readFreshObject = vi
    .fn<WalletRpc["readFreshObject"]>()
    .mockResolvedValue(null);
  const readAccountHistory = vi
    .fn<WalletRpc["readAccountHistory"]>()
    .mockResolvedValue(history);
  // Only the injected read-only methods are exercised; no signing/dispatch method is available.
  const rpc = {
    bindingKey: "profile",
    readSessionKey: "session",
    readFreshObject,
    readAccountHistory,
  } as unknown as WalletRpc;
  return { rpc, readFreshObject, readAccountHistory };
}
describe("收件人风险提示的覆盖与失败边界", () => {
  it("有效 current object 优先警告，不发历史请求，账户地址不被误认为普通对象 owner", async () => {
    const f = fixture();
    f.readFreshObject.mockResolvedValue({
      objectId: address,
    } as WalletFreshObject);
    expect(await inspectRecipient(f.rpc, address)).toEqual({
      kind: "object",
      address,
    });
    expect(f.readAccountHistory).not.toHaveBeenCalled();
  });
  it("Fullnode 无对象且窗口内无受支持活动，不标记 safe 或全账户空历史", async () => {
    const f = fixture();
    const result = await inspectRecipient(f.rpc, address);
    expect(result).toMatchObject({
      kind: "no-supported-activity",
      checkpointLo: 5,
      checkpointHi: 10,
      coverage: {
        allAccountActivityCertified: false,
        completeForDiscoveredOwnerTokens: null,
      },
    });
    expect(result).not.toHaveProperty("safe");
    expect(result).not.toHaveProperty("emptyAccount");
  });
  it("有历史仅是观察结果，保留窗口和 nullable 覆盖旗标", async () => {
    expect(await inspectRecipient(fixture(1).rpc, address)).toMatchObject({
      kind: "history-observed",
      checkpointLo: 5,
      checkpointHi: 10,
      coverage: { allAccountTransfersCertified: false },
    });
  });
  it.each(["fullnode", "history"])(
    "%s 失败为未知，不能得到空窗口警告",
    async (role) => {
      const f = fixture();
      const error = new Error("unavailable");
      if (role === "fullnode") f.readFreshObject.mockRejectedValue(error);
      else f.readAccountHistory.mockRejectedValue(error);
      await expect(inspectRecipient(f.rpc, address)).rejects.toBe(error);
      if (role === "fullnode")
        expect(f.readAccountHistory).not.toHaveBeenCalled();
    },
  );
  it.each([
    { address: normalizeRtdAddress("0xc") },
    { bindingKey: "other-profile" },
    { readSessionKey: "other-session" },
  ])("错误绑定 %j 不能用于该收件人提示", async (alter) => {
    await expect(
      inspectRecipient(fixture(0, alter).rpc, address),
    ).rejects.toThrow("绑定不匹配");
  });
  it("缺失当前对象后取消不能继续请求历史；调用前取消不能发任何读取", async () => {
    const f = fixture(),
      abort = new AbortController();
    f.readFreshObject.mockImplementation(async () => {
      abort.abort();
      return null;
    });
    await expect(
      inspectRecipient(f.rpc, address, abort.signal),
    ).rejects.toThrow();
    expect(f.readAccountHistory).not.toHaveBeenCalled();
    const before = fixture();
    await expect(
      inspectRecipient(before.rpc, address, abort.signal),
    ).rejects.toThrow();
    expect(before.readFreshObject).not.toHaveBeenCalled();
  });
  it("无效格式或对象 ID 错位不会调用历史并伪造安全", async () => {
    const f = fixture();
    await expect(inspectRecipient(f.rpc, "bad")).rejects.toThrow("地址无效");
    expect(f.readFreshObject).not.toHaveBeenCalled();
    f.readFreshObject.mockResolvedValue({
      objectId: normalizeRtdAddress("0xc"),
    } as WalletFreshObject);
    await expect(inspectRecipient(f.rpc, address)).rejects.toThrow("不匹配");
    expect(f.readAccountHistory).not.toHaveBeenCalled();
  });
});
