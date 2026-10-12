// Copyright (c) LinkU Labs, Inc.
// SPDX-License-Identifier: Apache-2.0
// Synthetic complete TransactionData only; no chain or execution authority.
import { Transaction } from "rtd-typescript/transactions";
import { toBase58, toBase64 } from "rtd-typescript/utils";
import { expect, it } from "vitest";
import { profileFixture } from "./profile-fixture";
import { validateNetworkProfile } from "./profile";
import { transactionMoveDependencies } from "./transaction-move-dependencies";

const sender = "0xa";
function transaction() {
  const t = new Transaction();
  t.setSender(sender);
  t.setGasOwner(sender);
  t.setGasPrice(1);
  t.setGasBudget(100);
  t.setGasPayment([
    {
      objectId: "0xc",
      version: "1",
      digest: toBase58(new Uint8Array(32).fill(2)),
    },
  ]);
  return t;
}
async function dependencies(t: Transaction, p = profileFixture()) {
  return transactionMoveDependencies(
    validateNetworkProfile(p),
    toBase64(await t.build()),
    sender,
  );
}
it("独立SplitCoins／TransferObjects不伪造Move ABI或Display依赖", async () => {
  const t = transaction(),
    [c] = t.splitCoins(t.gas, [1]);
  t.transferObjects([c], "0xb");
  expect(await dependencies(t)).toMatchObject({
    groups: [],
    areas: [],
    nativeCommands: 2,
    reviewedCalls: 0,
    opaqueCommands: 0,
    customMoveTypes: "opaque",
    builtinSemantics: "sdk-pinned",
  });
});
it.each(["request_add_stake", "request_withdraw_stake"])(
  "准确staking函数 %s形成作者目录闭包",
  async (fn) => {
    const t = transaction();
    t.moveCall({
      target: `0x3::rtd_system::${fn}`,
      arguments: [],
      typeArguments: [],
    });
    const r = await dependencies(t);
    expect(r.groups).toEqual([
      "coins",
      "framework",
      "readerSupport",
      "staking",
      "standardLibrary",
    ]);
    expect(r.reviewedCalls).toBe(1);
    expect(r.areas.every((a) => a.kind === "move-group")).toBe(true);
    expect(Object.isFrozen(r)).toBe(true);
    expect(Object.isFrozen(r.groups)).toBe(true);
    expect(Object.isFrozen(r.areas[0])).toBe(true);
  },
);
it.each([
  "0x4::rtd_system::request_add_stake",
  "0x3::rtd_system::unknown",
  "0x3::other::request_add_stake",
])("不同完整target %s保持opaque", async (target) => {
  const t = transaction();
  t.moveCall({ target });
  expect(await dependencies(t)).toMatchObject({
    groups: [],
    reviewedCalls: 0,
    opaqueCommands: 1,
  });
});
it("复制kiosk descriptor的阅读族不扩大take交易依赖", async () => {
  const t = transaction();
  t.moveCall({ target: "0x2::kiosk::take", typeArguments: ["0x8::nft::NFT"] });
  const p = profileFixture();
  p.packages.originByte = { discoveryPackage: "0x7", executionPackage: "0x9" };
  p.packages.personalKiosk = "0x8";
  expect(await dependencies(t, p)).toMatchObject({
    groups: ["framework", "kiosk"],
    reviewedCalls: 1,
    customMoveTypes: "opaque",
  });
});
it("personalKiosk只匹配配置包，保留自身及Kiosk依赖", async () => {
  const p = profileFixture();
  p.packages.personalKiosk = "0x8";
  const t = transaction();
  t.moveCall({ target: "0x8::personal_kiosk::borrow_val" });
  expect(await dependencies(t, p)).toMatchObject({
    groups: ["framework", "kiosk", "personalKiosk", "standardLibrary"],
    reviewedCalls: 1,
  });
});
it("OriginByte execution包独立于discovery包，同名错包不匹配", async () => {
  const p = profileFixture();
  p.packages.originByte = { discoveryPackage: "0x7", executionPackage: "0x9" };
  const t = transaction();
  t.moveCall({
    target: "0x9::ob_kiosk::p2p_transfer",
    typeArguments: ["0x8::nft::NFT"],
  });
  expect(await dependencies(t, p)).toMatchObject({
    groups: ["framework", "originByteDiscovery", "originByteExecution"],
    reviewedCalls: 1,
  });
  const bad = transaction();
  bad.moveCall({ target: "0x7::ob_kiosk::p2p_transfer" });
  expect(await dependencies(bad, p)).toMatchObject({
    groups: [],
    opaqueCommands: 1,
  });
});
it("相同包但未审核函数保持opaque，不推导整包ABI", async () => {
  const t = transaction();
  t.moveCall({
    target: "0x2::coin::transfer",
    typeArguments: ["0x2::rtd::RTD"],
  });
  expect(await dependencies(t)).toMatchObject({
    groups: [],
    opaqueCommands: 1,
  });
});
it("已审核redeem_funds泛型用户类型不成为新审核类型", async () => {
  const t = transaction();
  t.moveCall({
    target: "0x2::coin::redeem_funds",
    typeArguments: ["0x8::custom::Coin"],
  });
  expect(await dependencies(t)).toMatchObject({
    groups: ["coins", "framework"],
    customMoveTypes: "opaque",
    reviewedCalls: 1,
  });
});
it("重复／混合命令计数保持，依赖闭包去重且不含payload", async () => {
  const t = transaction();
  t.moveCall({ target: "0x3::rtd_system::request_add_stake" });
  t.moveCall({ target: "0x3::rtd_system::request_withdraw_stake" });
  t.moveCall({ target: "0x8::custom::call" });
  const r = await dependencies(t);
  expect(r.groups).toHaveLength(5);
  expect(r.reviewedCalls).toBe(2);
  expect(r.opaqueCommands).toBe(1);
  expect(Object.keys(r).sort()).toEqual([
    "areas",
    "builtinSemantics",
    "customMoveTypes",
    "groups",
    "nativeCommands",
    "opaqueCommands",
    "reviewedCalls",
    "scope",
  ]);
});
it("缺配置的可选Kiosk调用不冒称已审核", async () => {
  const t = transaction();
  t.moveCall({ target: "0x2::kiosk::take" });
  const p = profileFixture();
  delete p.packages.kiosk;
  expect(await dependencies(t, p)).toMatchObject({
    groups: [],
    opaqueCommands: 1,
  });
});
it("发布命令保持opaque，不以dependency包列表签认新模块", async () => {
  const t = transaction();
  t.publish({
    modules: [toBase64(new Uint8Array([1, 2]))],
    dependencies: ["0x1", "0x2"],
  });
  expect(await dependencies(t)).toMatchObject({
    groups: [],
    opaqueCommands: 1,
  });
});
it("固定bytes sender错配和非canonical base64拒绝，无IO", async () => {
  const t = transaction(),
    p = validateNetworkProfile(profileFixture()),
    bytes = toBase64(await t.build());
  expect(() => transactionMoveDependencies(p, bytes, "0xb")).toThrow();
  expect(() => transactionMoveDependencies(p, bytes + "\n", sender)).toThrow();
});
