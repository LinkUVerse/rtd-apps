// Copyright (c) LinkU Labs, Inc.
// SPDX-License-Identifier: Apache-2.0
import { afterEach, expect, it, vi } from "vitest";
import { acquireCapabilityOwnerLock } from "./capability-owner-lock";

const database = "RtdWallet NetworkAdmission:test:owner-lock";
const id = "11111111-1111-4111-8111-111111111111";
const original = Object.getOwnPropertyDescriptor(navigator, "locks")!;
afterEach(() => {
  Object.defineProperty(navigator, "locks", original);
  vi.useRealTimers();
});
it("a live owner cannot be acquired until its explicit terminal release; release is idempotent", async () => {
  const owner = await acquireCapabilityOwnerLock(database, id);
  expect(owner).not.toBeNull();
  expect(await acquireCapabilityOwnerLock(database, id)).toBeNull();
  owner!.assertActive();
  owner!.release();
  owner!.release();
  expect(() => owner!.assertActive()).toThrowError(
    expect.objectContaining({ reason: "stale" }),
  );
  await Promise.resolve();
  await Promise.resolve();
  const successor = await acquireCapabilityOwnerLock(database, id);
  expect(successor).not.toBeNull();
  successor!.release();
});
it.each([
  undefined,
  {
    request: () => {
      throw new Error("private error");
    },
  },
  { request: () => Promise.reject(new Error("private error")) },
])(
  "missing or failed native ownership never falls back to a granted lease",
  async (locks) => {
    Object.defineProperty(navigator, "locks", {
      configurable: true,
      value: locks,
    });
    await expect(
      acquireCapabilityOwnerLock(database, id),
    ).rejects.toMatchObject({
      reason: "unavailable",
      message: "网络准入记录未通过精确合同，已停止本次操作",
    });
  },
);
it("a late grant after acquisition failure is immediately released and cannot create a lease", async () => {
  vi.useFakeTimers();
  let granted!: (lock: Lock) => unknown;
  Object.defineProperty(navigator, "locks", {
    configurable: true,
    value: {
      request: (
        _name: string,
        options: LockOptions,
        callback: typeof granted,
      ) => {
        expect(options).toEqual({ mode: "exclusive", ifAvailable: true });
        granted = callback;
        return new Promise(() => {});
      },
    },
  });
  const failure = expect(
    acquireCapabilityOwnerLock(database, id),
  ).rejects.toMatchObject({ reason: "unavailable" });
  await vi.advanceTimersByTimeAsync(5000);
  await failure;
  expect(granted({} as Lock)).toBeUndefined();
});
