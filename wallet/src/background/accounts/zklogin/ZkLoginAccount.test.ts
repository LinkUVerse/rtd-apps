// Copyright (c) LinkU Labs, Inc.
// SPDX-License-Identifier: Apache-2.0
import { beforeEach, expect, it, vi } from "vitest";
import {
  ZkLoginAccount,
  type ZkLoginAccountSerialized,
} from "./ZkLoginAccount";
import { isSigningAccount } from "../Account";
const m = vi.hoisted(() => ({
  get: vi.fn(),
  update: vi.fn(),
  remove: vi.fn(),
}));
vi.mock("../../db", () => ({
  getDB: async () => ({
    accounts: { get: m.get, update: m.update, delete: m.remove },
  }),
}));
vi.mock("../../auto-lock-accounts", () => ({ setupAutoLockAlarm: vi.fn() }));
vi.mock("../../session-ephemeral-values", () => ({
  clearEphemeralValue: vi.fn(),
  getEphemeralValue: vi.fn(),
  setEphemeralValue: vi.fn(),
}));
vi.mock("_src/shared/cryptography/keystore", () => ({
  deobfuscate: async () => ({ email: "fixture@example.com", picture: null }),
}));
const stored = {
  id: "legacy-zk",
  type: "zkLogin",
  address: "0x7",
  publicKey: null,
  provider: "google",
  claims: "preserved-claims",
  salt: "preserved-salt",
  addressSeed: "preserved-seed",
  claimName: "sub",
  selected: true,
  nickname: "Existing",
  createdAt: 1,
  lastUnlockedOn: 123,
  warningAcknowledged: false,
} as ZkLoginAccountSerialized;
beforeEach(() => {
  vi.resetAllMocks();
  m.get.mockResolvedValue(structuredClone(stored));
});
it("creation is disabled without changing stored accounts", async () => {
  await expect(
    ZkLoginAccount.createNew({ provider: "google" }),
  ).rejects.toThrow("不支持");
  expect(m.get).not.toHaveBeenCalled();
  expect(m.update).not.toHaveBeenCalled();
  expect(m.remove).not.toHaveBeenCalled();
});
it("existing records remain visible but cannot unlock or sign even with old credentials", async () => {
  const account = new ZkLoginAccount({ id: stored.id, cachedData: stored });
  expect(isSigningAccount(account)).toBe(false);
  expect(await account.isLocked()).toBe(true);
  await expect(account.unlock()).rejects.toThrow("已有账户记录已保留");
  await expect(account.signData(new Uint8Array([1]))).rejects.toThrow("不支持");
  expect(m.update).not.toHaveBeenCalled();
  expect(m.remove).not.toHaveBeenCalled();
});
it("legacy account identity, labels and metadata are preserved for display", async () => {
  const account = new ZkLoginAccount({ id: stored.id, cachedData: stored });
  expect(await account.toUISerialized()).toMatchObject({
    id: stored.id,
    type: "zkLogin",
    address: stored.address,
    nickname: "Existing",
    provider: "google",
    email: "fixture@example.com",
    selected: true,
    isLocked: true,
    isPasswordUnlockable: false,
    isKeyPairExportable: false,
  });
  expect(m.update).not.toHaveBeenCalled();
  expect(m.remove).not.toHaveBeenCalled();
});
