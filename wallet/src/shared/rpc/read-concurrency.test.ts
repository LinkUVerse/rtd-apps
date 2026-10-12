// Copyright (c) LinkU Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { describe, expect, it, vi } from "vitest";
import { validateNetworkProfile } from "./profile";
import { profileFixture } from "./profile-fixture";
import {
  WalletReadConcurrency,
  WalletReadBudgetUnavailableError,
} from "./read-concurrency";
import { WalletReadSession, WalletReadBudgetError } from "./session";

function gate() {
  let release!: () => void;
  const promise = new Promise<void>((resolve) => {
    release = resolve;
  });
  return { promise, release };
}
const session = () =>
  new WalletReadSession(validateNetworkProfile(profileFixture()));

describe("跨会话与上下文的读取物理预算", () => {
  it("多个独立会话合计四个读取，关闭一个会话只移除它的等待", async () => {
    const a = session(),
      b = session(),
      held = gate();
    const operations = Array.from({ length: 8 }, () =>
      vi.fn(() => held.promise),
    );
    const pending = operations.map((operation, index) => {
      const s = index % 2 ? b : a;
      return s.request(s.signal, operation);
    });
    const all = Promise.allSettled(pending);
    await vi.waitFor(() =>
      expect(operations.filter((op) => op.mock.calls.length)).toHaveLength(4),
    );
    a.close();
    held.release();
    expect((await all).map((result) => result.status)).toEqual([
      "rejected",
      "fulfilled",
      "rejected",
      "fulfilled",
      "rejected",
      "fulfilled",
      "rejected",
      "fulfilled",
    ]);
    expect(operations[4]).not.toHaveBeenCalled();
    expect(operations[6]).not.toHaveBeenCalled();
    expect(operations[5]).toHaveBeenCalledTimes(1);
    expect(operations[7]).toHaveBeenCalledTimes(1);
  });

  it("独立上下文队列共用原生锁，全部操作恰好一次且合计不超过四个", async () => {
    const queues = Array.from({ length: 6 }, () => new WalletReadConcurrency());
    const held = gate();
    let active = 0,
      peak = 0,
      calls = 0;
    const all = Promise.all(
      Array.from({ length: 24 }, (_, index) =>
        queues[index % queues.length].run(
          new AbortController().signal,
          async () => {
            calls++;
            peak = Math.max(peak, ++active);
            await held.promise;
            active--;
            return index;
          },
        ),
      ),
    );
    await vi.waitFor(() => expect(active).toBe(4));
    expect(calls).toBe(4);
    held.release();
    expect(await all).toEqual(Array.from({ length: 24 }, (_, index) => index));
    expect(calls).toBe(24);
    expect(peak).toBe(4);
    expect(active).toBe(0);
  });

  it("取消已获锁且忽略abort的操作，另一上下文要等其真实结束", async () => {
    const a = new WalletReadConcurrency(),
      b = new WalletReadConcurrency();
    const controller = new AbortController(),
      held = gate();
    const running = vi.fn(() => held.promise);
    const active = Array.from({ length: 4 }, () =>
      a.run(controller.signal, running),
    );
    await vi.waitFor(() => expect(running).toHaveBeenCalledTimes(4));
    const operation = vi.fn(async () => 7);
    const queued = b.run(new AbortController().signal, operation);
    controller.abort("cancelled");
    await Promise.resolve();
    expect(operation).not.toHaveBeenCalled();
    held.release();
    await Promise.all(active);
    await expect(queued).resolves.toBe(7);
    expect(operation).toHaveBeenCalledTimes(1);
  });

  it("原生锁等待取消立即拒绝，后继不被取消的四个申请阻挡", async () => {
    const a = new WalletReadConcurrency(),
      b = new WalletReadConcurrency(),
      held = gate();
    const running = vi.fn(() => held.promise);
    const active = Array.from({ length: 4 }, () =>
      a.run(new AbortController().signal, running),
    );
    await vi.waitFor(() => expect(running).toHaveBeenCalledTimes(4));
    const controller = new AbortController(),
      operation = vi.fn(async () => 9);
    const cancelled = b.run(controller.signal, operation);
    const rejected = expect(cancelled).rejects.toBe("deadline");
    const next = b.run(new AbortController().signal, operation);
    controller.abort("deadline");
    await rejected;
    expect(operation).not.toHaveBeenCalled();
    held.release();
    await Promise.all(active);
    await expect(next).resolves.toBe(9);
    expect(operation).toHaveBeenCalledTimes(1);
  });

  it("64等待上限跨会话共享，不通过创建会话扩大本上下文队列", async () => {
    const sessions = Array.from({ length: 69 }, session),
      held = gate();
    const operation = vi.fn(() => held.promise);
    const all = Promise.allSettled(
      sessions.slice(0, 68).map((s) => s.request(s.signal, operation)),
    );
    await expect(
      sessions[68].request(sessions[68].signal, operation),
    ).rejects.toBeInstanceOf(WalletReadBudgetError);
    await vi.waitFor(() => expect(operation).toHaveBeenCalledTimes(4));
    sessions.forEach((s) => s.close());
    held.release();
    expect((await all).every((result) => result.status === "rejected")).toBe(
      true,
    );
    expect(operation).toHaveBeenCalledTimes(4);
    const fresh = session();
    await expect(fresh.request(fresh.signal, async () => 3)).resolves.toBe(3);
  });

  it("失败保留原异常并回收物理名额，undefined也能作为成功值", async () => {
    const queues = Array.from({ length: 8 }, () => new WalletReadConcurrency());
    const error = new Error("read failed");
    const all = await Promise.allSettled(
      queues.map((queue, index) =>
        queue.run(new AbortController().signal, async () => {
          if (index % 2 === 0) throw error;
          return undefined;
        }),
      ),
    );
    all.forEach((result, index) =>
      expect(result).toEqual(
        index % 2
          ? { status: "fulfilled", value: undefined }
          : { status: "rejected", reason: error },
      ),
    );
  });

  it.each([
    undefined,
    {
      request: async () => {
        throw new Error("private browser error");
      },
    },
  ])("原生API缺失或失败拒绝读取，不回退无预算 %#", async (locks) => {
    const original = Object.getOwnPropertyDescriptor(navigator, "locks")!;
    Object.defineProperty(navigator, "locks", {
      configurable: true,
      value: locks,
    });
    try {
      const operation = vi.fn(async () => 1),
        queue = new WalletReadConcurrency();
      await expect(
        queue.run(new AbortController().signal, operation),
      ).rejects.toBeInstanceOf(WalletReadBudgetUnavailableError);
      expect(operation).not.toHaveBeenCalled();
    } finally {
      Object.defineProperty(navigator, "locks", original);
    }
  });
});
