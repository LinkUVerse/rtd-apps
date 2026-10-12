// Copyright (c) LinkU Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { describe, expect, it, vi } from "vitest";

import { validateNetworkProfile } from "./profile";
import { profileFixture } from "./profile-fixture";
import { StaleWalletSessionError, WalletReadSession } from "./session";

describe("钱包读取会话取消与迟到响应屏障", () => {
  it("关闭会话后即使底层忽略取消，也拒绝迟到数据", async () => {
    const session = new WalletReadSession(
      validateNetworkProfile(profileFixture()),
    );
    let finish!: (value: number) => void;
    const pending = session.read((signal) => {
      expect(signal).toBe(session.signal);
      return new Promise<number>((resolve) => {
        finish = resolve;
      });
    });
    session.close();
    finish(42);
    await expect(pending).rejects.toBeInstanceOf(StaleWalletSessionError);
    expect(session.signal.aborted).toBe(true);
    const operation = vi.fn();
    await expect(session.read(operation)).rejects.toBeInstanceOf(
      StaleWalletSessionError,
    );
    expect(operation).not.toHaveBeenCalled();
  });

  it("传输失败保留原错误，新会话不接受旧会话的失败", async () => {
    const session = new WalletReadSession(
      validateNetworkProfile(profileFixture()),
    );
    const error = new Error("Unavailable");
    await expect(
      session.read(async () => {
        throw error;
      }),
    ).rejects.toBe(error);
    let reject!: (error: Error) => void;
    const pending = session.read(
      () =>
        new Promise((_, fail) => {
          reject = fail;
        }),
    );
    session.close();
    reject(error);
    await expect(pending).rejects.toBeInstanceOf(StaleWalletSessionError);
    const fresh = new WalletReadSession(
      validateNetworkProfile(profileFixture()),
    );
    await expect(fresh.read(async () => "fresh")).resolves.toBe("fresh");
  });
});
