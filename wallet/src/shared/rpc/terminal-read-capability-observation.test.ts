// Copyright (c) LinkU Labs, Inc.
// SPDX-License-Identifier: Apache-2.0
// Actual SDK/protocol and cleanup ordering; in-memory store is control-flow evidence only.
import { describe, expect, it, vi } from "vitest";
import { MemoryNetworkAdmission } from "../../../tests/unit/rpc/network-admission-fixture";
import { networkCapabilitiesFixture } from "./network-capabilities-fixture";
import { observeReadCapabilities } from "./read-capability-observation";
import {
  consumeCapabilityTerminalFailure,
  type CapabilityTerminalFailure,
} from "./capability-observation-lifetime";
import { networkBindingKey, type ValidatedNetworkProfile } from "./profile";
import type { NetworkAdmissionTicket } from "./network-admission-state";
import { CapabilityObservationLifetime } from "./capability-observation-lifetime";
class Store extends MemoryNetworkAdmission {
  capture = async (p: ValidatedNetworkProfile) =>
    this.records.get(networkBindingKey(p));
  finishFailed = vi.fn(
    async (
      p: ValidatedNetworkProfile,
      ticket: NetworkAdmissionTicket,
      receipt: CapabilityTerminalFailure,
    ) =>
      this.complete(
        p,
        ticket,
        consumeCapabilityTerminalFailure(receipt, networkBindingKey(p), ticket),
      ),
  );
}
describe("已结束失败观察与未结束工作区分", () => {
  it.each(["schema", "abi"] as const)(
    "%s 已确认后 session 取消不能丢掉 Fault 或空收尾",
    async (kind) => {
      const f = await networkCapabilitiesFixture(),
        store = new Store();
      if (kind === "abi") {
        const coin = [...f.packages.values()]
          .flatMap((p) => p.modules)
          .find((m) => m.name === "coin")!
          .datatypes.find((d) => d.name === "Coin")!;
        coin.fields[1].name = "controlled_incompatible";
      }
      const original = CapabilityObservationLifetime.prototype.noteFault;
      const spy = vi
        .spyOn(CapabilityObservationLifetime.prototype, "noteFault")
        .mockImplementation(function (this: CapabilityObservationLifetime, fault) {
          original.call(this, fault);
          if (
            (kind === "schema" && fault.kind === "graphql-domain") ||
            (kind === "abi" && fault.kind === "move-group")
          )
            f.session.close();
        });
      try {
        const view = await observeReadCapabilities(
          f.session,
          {
            fetch: async (url, init) => {
              const response = await f.fetch(url, init);
              if (
                kind === "schema" &&
                String(init?.body).includes("__schema")
              ) {
                const payload = await response.json();
                const type = payload.data.__schema.types.find(
                  (t: { name: string }) => t.name === "MoveValue",
                );
                type.fields = type.fields.filter(
                  (x: { name: string }) => x.name !== "display",
                );
                return Response.json(payload);
              }
              return response;
            },
          },
          store,
        );
        expect(view.phase).toBe("unavailable");
        await vi.waitFor(() =>
          expect(store.finishFailed).toHaveBeenCalledTimes(1),
        );
        const row = store.records.get(f.session.bindingKey)!;
        expect(row.pending).toEqual([]);
        expect(row.faults).toContainEqual(
          kind === "schema"
            ? { kind: "graphql-domain", domain: "assets", reason: "schema" }
            : { kind: "move-group", group: "coins", reason: "abi" },
        );
      } finally {
        spy.mockRestore();
      }
    },
  );
  it("session close 后忽略取消的 fetch / body cancel 未结束不释放，结束才允许新观察", async () => {
    const f = await networkCapabilitiesFixture(),
      store = new Store();
    const entered = Promise.withResolvers<void>(),
      fetchHeld = Promise.withResolvers<void>(),
      cancelHeld = Promise.withResolvers<void>();
    const run = observeReadCapabilities(
      f.session,
      {
        fetch: async () => {
          entered.resolve();
          await fetchHeld.promise;
          return new Response(
            new ReadableStream({ cancel: () => cancelHeld.promise }),
          );
        },
      },
      store,
    );
    await entered.promise;
    f.session.close();
    expect((await run).phase).toBe("unavailable");
    expect(store.records.get(f.session.bindingKey)?.pending).toHaveLength(1);
    expect(store.finishFailed).not.toHaveBeenCalled();
    fetchHeld.resolve();
    await new Promise((r) => setTimeout(r, 10));
    expect(store.finishFailed).not.toHaveBeenCalled();
    cancelHeld.resolve();
    await vi.waitFor(() => expect(store.finishFailed).toHaveBeenCalledTimes(1));
    expect(store.records.get(f.session.bindingKey)).toMatchObject({
      pending: [],
      faults: [],
    });
    const next = await networkCapabilitiesFixture();
    expect(networkBindingKey(next.profile)).toBe(f.session.bindingKey);
    expect(
      (
        await observeReadCapabilities(
          next.session,
          { fetch: next.fetch },
          store,
        )
      ).phase,
    ).toBe("read-contracts-assessed");
  });
  it("begin 提交后尚未 probe 就取消，零 IO 的原拥有者可收尾", async () => {
    const f = await networkCapabilitiesFixture(),
      store = new Store();
    const begin = store.begin.bind(store);
    store.begin = async (...args: Parameters<typeof begin>) => {
      const t = await begin(...args);
      f.session.close();
      return t;
    };
    expect(
      (await observeReadCapabilities(f.session, { fetch: f.fetch }, store))
        .phase,
    ).toBe("unavailable");
    await vi.waitFor(() => expect(store.finishFailed).toHaveBeenCalledTimes(1));
    expect(f.requests).toHaveLength(0);
    expect(store.records.get(f.session.bindingKey)?.pending).toEqual([]);
  });
  it("未知旧 pending 无本次 ticket 所有权，失败不清它", async () => {
    const f = await networkCapabilitiesFixture(),
      store = new Store();
    const old = await store.begin(f.profile, [
      { kind: "identity", role: "fullnode" },
    ]);
    expect(
      (await observeReadCapabilities(f.session, { fetch: f.fetch }, store))
        .phase,
    ).toBe("unavailable");
    expect(store.finishFailed).not.toHaveBeenCalled();
    expect(store.records.get(f.session.bindingKey)?.pending).toEqual([old]);
  });
  it("收尾存储 abort 不第二次空决策，也不发布正面", async () => {
    const f = await networkCapabilitiesFixture(),
      store = new Store(),
      entered = Promise.withResolvers<void>(),
      held = Promise.withResolvers<void>();
    store.finishFailed.mockRejectedValue(new Error("controlled storage abort"));
    const signal = new AbortController();
    const run = observeReadCapabilities(
      f.session,
      {
        signal: signal.signal,
        fetch: async () => {
          entered.resolve();
          await held.promise;
          throw new Error("transport");
        },
      },
      store,
    );
    await entered.promise;
    signal.abort();
    expect((await run).phase).toBe("unavailable");
    held.resolve();
    await vi.waitFor(() => expect(store.finishFailed).toHaveBeenCalledTimes(1));
    expect(store.records.get(f.session.bindingKey)?.pending).toHaveLength(1);
  });
});
