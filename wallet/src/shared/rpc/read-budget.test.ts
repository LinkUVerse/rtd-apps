// Copyright (c) LinkU Labs, Inc.
// SPDX-License-Identifier: Apache-2.0
import { describe, expect, it, vi } from "vitest";
import { WalletReadSession, WalletReadBudgetError } from "./session";
import { validateNetworkProfile } from "./profile";
import { profileFixture } from "./profile-fixture";
import { GraphQLSnapshot } from "./graphql-snapshot";
import { snapshotFixture } from "../../../tests/unit/rpc/fixtures";
import { WalletFullnodeReader } from "./fullnode-reader";
import { GrpcTypes } from "rtd-typescript/grpc";

const session = () =>
  new WalletReadSession(validateNetworkProfile(profileFixture()));
function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((done) => {
    resolve = done;
  });
  return { promise, resolve };
}

describe("会话共享读取并发预算", () => {
  it("四个运行名额、FIFO等待，完成或失败均释放", async () => {
    const s = session();
    const order: number[] = [];
    const gates = Array.from({ length: 6 }, () => deferred<number>());
    const pending = gates.map((gate, index) =>
      s.request(s.signal, async () => {
        order.push(index);
        const value = await gate.promise;
        if (index === 0) throw new Error("failed");
        return value;
      }),
    );
    const all = Promise.allSettled(pending);
    await vi.waitFor(() => expect(order).toEqual([0, 1, 2, 3]));
    gates[0].resolve(0);
    await vi.waitFor(() => expect(order).toEqual([0, 1, 2, 3, 4]));
    gates[1].resolve(1);
    await vi.waitFor(() => expect(order).toEqual([0, 1, 2, 3, 4, 5]));
    gates.forEach((gate, index) => gate.resolve(index));
    expect((await all).map((r) => r.status)).toEqual([
      "rejected",
      ...Array(5).fill("fulfilled"),
    ]);
  });
  it("排队取消立即退出，不执行操作，也不阻挡下一位", async () => {
    const s = session(),
      gate = deferred<number>();
    const active = Array.from({ length: 4 }, () =>
      s.request(s.signal, () => gate.promise),
    );
    const controller = new AbortController(),
      operation = vi.fn();
    const cancelled = s.request(controller.signal, operation);
    const rejected = expect(cancelled).rejects.toBe("deadline");
    const next = s.request(s.signal, async () => 7);
    controller.abort("deadline");
    await rejected;
    gate.resolve(1);
    await Promise.all(active);
    await expect(next).resolves.toBe(7);
    expect(operation).not.toHaveBeenCalled();
  });
  it("最多64个等待者，关闭会话清除队列并拒绝活动操作的迟到结果", async () => {
    const s = session(),
      gate = deferred<number>();
    const operation = vi.fn(() => gate.promise);
    const pending = Array.from({ length: 68 }, () =>
      s.request(s.signal, operation),
    );
    const all = Promise.allSettled(pending);
    await expect(s.request(s.signal, operation)).rejects.toBeInstanceOf(
      WalletReadBudgetError,
    );
    await vi.waitFor(() => expect(operation).toHaveBeenCalledTimes(4));
    s.close();
    gate.resolve(1);
    expect((await all).every((r) => r.status === "rejected")).toBe(true);
    expect(operation).toHaveBeenCalledTimes(4);
  });
  it("忽略取消的底层操作未结束前不提前释放物理名额", async () => {
    const s = session(),
      gate = deferred<number>(),
      controller = new AbortController();
    const running = vi.fn(() => gate.promise);
    const active = Array.from({ length: 4 }, () =>
      s.request(controller.signal, running),
    );
    const all = Promise.allSettled(active);
    await vi.waitFor(() => expect(running).toHaveBeenCalledTimes(4));
    const operation = vi.fn(async () => 9);
    const queued = s.request(s.signal, operation);
    controller.abort("cancelled");
    await Promise.resolve();
    expect(operation).not.toHaveBeenCalled();
    gate.resolve(1);
    await all;
    await expect(queued).resolves.toBe(9);
  });
  it("真实GraphQL与gRPC SDK共用名额，响应头到达后仍等待正文结束", async () => {
    const f = snapshotFixture();
    const held: { release: () => void }[] = [];
    let active = 0,
      peak = 0;
    const track = (bytes: Uint8Array, headers: HeadersInit) => {
      active++;
      peak = Math.max(peak, active);
      return new Response(
        new ReadableStream({
          start(controller) {
            held.push({
              release: () => {
                controller.enqueue(bytes);
                controller.close();
                active--;
              },
            });
          },
        }),
        { headers },
      );
    };
    const fetch: typeof globalThis.fetch = async (input, init) => {
      if (String(input).endsWith("/GetServiceInfo")) {
        const body = GrpcTypes.GetServiceInfoResponse.toBinary({
          chainId: f.profile.expectedGenesisDigest,
          checkpointHeight: 10n,
        });
        const trailer = new TextEncoder().encode("grpc-status: 0\r\n");
        const bytes = new Uint8Array(10 + body.length + trailer.length);
        new DataView(bytes.buffer).setUint32(1, body.length, false);
        bytes.set(body, 5);
        bytes[5 + body.length] = 128;
        new DataView(bytes.buffer).setUint32(
          6 + body.length,
          trailer.length,
          false,
        );
        bytes.set(trailer, 10 + body.length);
        return track(bytes, { "content-type": "application/grpc-web+proto" });
      }
      const response = await f.fetch(input, init);
      return track(new Uint8Array(await response.arrayBuffer()), {
        "content-type": "application/json",
      });
    };
    // Separate sessions retain nine distinct physical requests. Identical
    // same-session queries are intentionally coalesced (query-reuse.test.ts).
    const sessions = Array.from(
      { length: 3 },
      () => new WalletReadSession(f.profile),
    );
    const pending = Promise.all([
      ...sessions.map((s) =>
        new WalletFullnodeReader(s, { fetch }).checkpoint(),
      ),
      ...sessions.map((s) =>
        GraphQLSnapshot.open(s, [{ type: "Address", field: "balances" }], {
          fetch,
        }),
      ),
    ]);
    await vi.waitFor(() => expect(held).toHaveLength(4));
    expect(active).toBe(4);
    // Initial queries and pinning queries are separate permits; no outer permit can deadlock them.
    for (let released = 0; released < 9; released++) {
      await vi.waitFor(() => expect(held.length).toBeGreaterThan(0));
      held.shift()!.release();
    }
    expect(await pending).toHaveLength(6);
    expect(peak).toBe(4);
    expect(active).toBe(0);
    sessions.forEach((s) => s.close());
  });
});
