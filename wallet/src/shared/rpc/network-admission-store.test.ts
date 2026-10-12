// Copyright (c) LinkU Labs, Inc.
// SPDX-License-Identifier: Apache-2.0
// Constructor/early failures only. Native commit/restart proof lives in the browser script.
import { describe, expect, it, vi } from "vitest";
import { WalletNetworkAdmissionStore } from "./network-admission-store";
import { createNetworkAdmissionTicket } from "./network-admission-state";
import { validateNetworkProfile } from "./profile";
import { profileFixture } from "./profile-fixture";
const p = () => validateNetworkProfile(profileFixture());
const area = { kind: "graphql-domain", domain: "balances" } as const;
describe("准入存储的前置失败边界", () => {
  it.each([0, -1, 5001, 1.5, NaN, Infinity])("拒绝非法期限%s", (timeoutMs) => {
    expect(() => new WalletNetworkAdmissionStore({ timeoutMs })).toThrow(
      RangeError,
    );
  });
  it.each([
    "RtdWallet ExecutionJournal",
    "RtdWallet NetworkObservations",
    "",
    "RtdWallet NetworkAdmission:test:" + "界".repeat(100),
  ])("拒绝共享／超限命名空间%s", (databaseName) => {
    expect(() => new WalletNetworkAdmissionStore({ databaseName })).toThrow(
      RangeError,
    );
  });
  it("缺原生API不退到内存成功", async () => {
    vi.stubGlobal("indexedDB", undefined);
    try {
      const store = new WalletNetworkAdmissionStore();
      await expect(store.capture(p())).rejects.toMatchObject({
        reason: "unavailable",
      });
      await expect(store.begin(p(), [area])).rejects.toMatchObject({
        reason: "unavailable",
      });
    } finally {
      vi.unstubAllGlobals();
    }
  });
  it("无原对象所有权的完成在任何存储IO前拒绝", async () => {
    const open = vi.fn(() => {
      throw new Error("synthetic secret must not escape");
    });
    const store = new WalletNetworkAdmissionStore({
      indexedDB: { open } as unknown as IDBFactory,
    });
    await expect(
      store.complete(p(), createNetworkAdmissionTicket([area]), []),
    ).rejects.toMatchObject({ reason: "stale" });
    expect(open).not.toHaveBeenCalled();
  });
  it("同步open异常只给固定存储失败，options更改不改既定命名空间", async () => {
    const open = vi.fn(() => {
      throw new Error("synthetic secret must not escape");
    });
    const options = {
      indexedDB: { open } as unknown as IDBFactory,
      databaseName: "RtdWallet NetworkAdmission:test:original",
    };
    const store = new WalletNetworkAdmissionStore(options);
    options.databaseName = "RtdWallet NetworkAdmission:test:changed";
    await expect(store.capture(p())).rejects.toMatchObject({
      reason: "unavailable",
      message: "网络准入记录未通过精确合同，已停止本次操作",
    });
    expect(open).toHaveBeenCalledExactlyOnceWith(
      "RtdWallet NetworkAdmission:test:original",
      3,
    );
  });
});
