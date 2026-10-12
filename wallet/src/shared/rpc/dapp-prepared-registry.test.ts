// Copyright (c) LinkU Labs, Inc.
// SPDX-License-Identifier: Apache-2.0
import { describe, expect, it } from "vitest";
import type { WalletPreparedTransaction } from "rtd-apps-core/src/rpc/WalletRpcContext";
import {
  DappPreparedRegistry,
  type DappPreparedClaim,
} from "./dapp-prepared-registry";
import type { DappRequestBinding } from "./dapp-request-binding";
const binding: DappRequestBinding = {
  schemaVersion: 1,
  requestId: "r",
  account: "sender",
  bindingKey: "profile",
  origin: "https://example.com",
  chain: "rtd:localnet",
  sourceHash: "hash",
  mode: "execute",
};
const prepared = {
  bindingKey: "profile",
  sender: "sender",
  bytesBase64: "original-bytes",
  digest: "original-digest",
} as WalletPreparedTransaction;
const claim: DappPreparedClaim = {
  accountId: "a",
  requestId: "r",
  bindingKey: "profile",
  origin: binding.origin,
  sourceHash: "hash",
  mode: "execute",
};
function fixture(cap = 32) {
  let now = 100;
  let seq = 0;
  return {
    store: new DappPreparedRegistry(
      () => now,
      () => `token-${++seq}`,
      cap,
      1000,
    ),
    time: (value: number) => {
      now = value;
    },
  };
}
describe("dApp固定批准bytes内存登记", () => {
  it("复制固定bytes与digest，不能经原对象更改", () => {
    const { store } = fixture();
    const source = { ...prepared };
    const { approvalToken } = store.register("a", binding, source);
    Object.assign(source, { bytesBase64: "changed", digest: "changed" });
    const entry = store.consume(approvalToken, claim);
    expect(entry).toMatchObject({
      bytesBase64: "original-bytes",
      digest: "original-digest",
      expiresAt: 1100,
    });
    expect(Object.isFrozen(entry)).toBe(true);
    expect(() => store.consume(approvalToken, claim)).toThrow("失效");
  });
  it.each([
    "accountId",
    "requestId",
    "bindingKey",
    "origin",
    "sourceHash",
    "mode",
  ] as const)("错误%s不可消费，错误尝试使凭据失效", (key) => {
    const { store } = fixture();
    const { approvalToken } = store.register("a", binding, prepared);
    expect(() =>
      store.consume(approvalToken, { ...claim, [key]: "wrong" }),
    ).toThrow("不匹配");
    expect(() => store.consume(approvalToken, claim)).toThrow("失效");
  });
  it("到期边界拒绝，过期条目释放容量", () => {
    const { store, time } = fixture(1);
    const { approvalToken } = store.register("a", binding, prepared);
    time(1100);
    expect(() => store.consume(approvalToken, claim)).toThrow("失效");
    expect(() =>
      store.register("a", { ...binding, requestId: "r2" }, prepared),
    ).not.toThrow();
  });
  it("同请求新预览撤销旧批准bytes", () => {
    const { store } = fixture(1);
    const old = store.register("a", binding, prepared);
    const fresh = store.register("a", binding, {
      ...prepared,
      bytesBase64: "new",
      digest: "new-digest",
    });
    expect(() => store.consume(old.approvalToken, claim)).toThrow("失效");
    expect(store.consume(fresh.approvalToken, claim).bytesBase64).toBe("new");
  });
  it("容量满时拒绝其他请求，不驱逐有效预览", () => {
    const { store } = fixture(1);
    const first = store.register("a", binding, prepared);
    expect(() =>
      store.register("a", { ...binding, requestId: "r2" }, prepared),
    ).toThrow("过多");
    expect(store.consume(first.approvalToken, claim).digest).toBe(
      prepared.digest,
    );
  });
  it("错账户或profile的准备结果不能登记", () => {
    const { store } = fixture();
    expect(() =>
      store.register("a", binding, { ...prepared, sender: "other" }),
    ).toThrow("不匹配");
    expect(() =>
      store.register("a", binding, { ...prepared, bindingKey: "other" }),
    ).toThrow("不匹配");
  });
  it("请求取消及worker重启后原凭据均不可用", () => {
    const { store } = fixture();
    const first = store.register("a", binding, prepared);
    store.revokeRequest("r");
    expect(() => store.consume(first.approvalToken, claim)).toThrow("失效");
    const next = store.register("a", binding, prepared);
    expect(() => fixture().store.consume(next.approvalToken, claim)).toThrow(
      "失效",
    );
    store.clear();
    expect(() => store.consume(next.approvalToken, claim)).toThrow("失效");
  });
});
