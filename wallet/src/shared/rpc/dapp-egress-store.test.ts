// Copyright (c) LinkU Labs, Inc.
// SPDX-License-Identifier: Apache-2.0
import { describe, it, expect, vi } from "vitest";
import { WalletDappEgressStore } from "./dapp-egress-store";
import { validateNetworkProfile } from "./profile";
import { profileFixture } from "./profile-fixture";
const source = {
  origin: "https://example.com",
  tabId: 1,
  frameId: 0,
  documentId: "browser-document",
  requestId: "request",
  account: "0x" + "a".repeat(64),
  gateOwner: "b".repeat(64),
};
describe("正式出口的存储IO前拒绝", () => {
  it.each([0, -1, 5001, 1.5, NaN, Infinity])("期限%s不得回退", (timeoutMs) => {
    expect(() => new WalletDappEgressStore({ timeoutMs })).toThrow(RangeError);
  });
  it.each([
    "RtdWallet ExecutionJournal",
    "",
    "RtdWallet NetworkAdmission:test:" + "界".repeat(100),
  ])("拒绝共享/超限namespace%s", (databaseName) => {
    expect(() => new WalletDappEgressStore({ databaseName })).toThrow(
      RangeError,
    );
  });
  it("伪造lease/receipt/mutation对象不得产生任何原生IO", async () => {
    const open = vi.fn(() => {
      throw new Error("private diagnostic must not escape");
    });
    const s = new WalletDappEgressStore({
      indexedDB: { open } as unknown as IDBFactory,
    });
    await expect(s.issue({}, "dummy")).rejects.toMatchObject({
      reason: "stale",
    });
    await expect(s.finishMutation({})).rejects.toMatchObject({
      reason: "stale",
    });
    await expect(
      s.deliver(
        validateNetworkProfile(profileFixture()),
        {},
        { ...source, profileBinding: "invented" },
        () => {},
      ),
    ).rejects.toMatchObject({ reason: "corrupt" });
    expect(open).not.toHaveBeenCalled();
  });
  it.each([
    { ...source, profileBinding: "dapp-chosen-binding" },
    { ...source, origin: "https://example.com/path" },
    { ...source, account: "0x1" },
    { ...source, documentId: "bad\nidentity" },
    { ...source, tabId: -1 },
  ])("网页字段不能冒充正式profile/浏览器binding %#", async (input) => {
    const open = vi.fn();
    const s = new WalletDappEgressStore({
      indexedDB: { open } as unknown as IDBFactory,
    });
    await expect(
      s.capture(validateNetworkProfile(profileFixture()), input),
    ).rejects.toMatchObject({ reason: "corrupt" });
    expect(open).not.toHaveBeenCalled();
  });
  it("拒绝getter来源字段，不运行该getter", async () => {
    let called = false;
    const input = { ...source };
    Object.defineProperty(input, "documentId", {
      enumerable: true,
      get: () => {
        called = true;
        throw new Error();
      },
    });
    await expect(
      new WalletDappEgressStore().capture(
        validateNetworkProfile(profileFixture()),
        input,
      ),
    ).rejects.toMatchObject({ reason: "corrupt" });
    expect(called).toBe(false);
  });
});
