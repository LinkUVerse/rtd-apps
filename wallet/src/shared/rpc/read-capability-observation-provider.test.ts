// Copyright (c) LinkU Labs, Inc.
// SPDX-License-Identifier: Apache-2.0
// React + real NC5 SDK protocols. Native IDB is separately tested in Chromium.
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, createElement as h, StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { beforeEach, afterEach, describe, it, expect, vi } from "vitest";
import {
  useWalletRpc,
  type WalletRpc,
} from "rtd-apps-core/src/rpc/WalletRpcContext";
import { WalletRpcProvider } from "./WalletRpcProvider";
import { WalletNetworkAdmissionStore } from "./network-admission-store";
import {
  WalletNetworkAdmissionStateError,
  type NetworkAdmissionFault,
} from "./network-admission-state";
import { notifyNetworkAdmission } from "./network-admission-notifications";
import { networkCapabilitiesFixture } from "./network-capabilities-fixture";
import { MemoryNetworkAdmission } from "../../../tests/unit/rpc/network-admission-fixture";
import {
  snapshotFixture,
  balanceNode,
  connection,
} from "../../../tests/unit/rpc/fixtures";
import { networkBindingKey, type ValidatedNetworkProfile } from "./profile";
import type { ProfileSelection } from "./profile-registry";
import * as observationModule from "./read-capability-observation";
import type { WalletReadCapabilities } from "rtd-apps-core/src/rpc/capability-types";
import { WalletReadAdmission } from "./read-admission";

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
let memory: MemoryNetworkAdmission,
  unavailable = false;
let observations: WalletReadCapabilities[] = [];
let gateStates: { phase: string; blocked: number }[] = [];
let captures: { pending: number; faults: number }[] = [];
const cleanup: (() => Promise<void>)[] = [];
beforeEach(() => {
  memory = new MemoryNetworkAdmission();
  observations = [];
  gateStates = [];
  captures = [];
  unavailable = false;
  const observe = observationModule.observeReadCapabilities;
  vi.spyOn(observationModule, "observeReadCapabilities").mockImplementation(
    async (...args) => {
      const result = await observe(...args);
      observations.push(result);
      return result;
    },
  );
  vi.spyOn(WalletNetworkAdmissionStore.prototype, "capture").mockImplementation(
    async (p) => {
      if (unavailable)
        throw new WalletNetworkAdmissionStateError("unavailable");
      const row = memory.records.get(networkBindingKey(p));
      captures.push({
        pending: row?.pending.length ?? 0,
        faults: row?.faults.length ?? 0,
      });
      return row;
    },
  );
  const start = WalletReadAdmission.prototype.start;
  vi.spyOn(WalletReadAdmission.prototype, "start").mockImplementation(function (
    this: WalletReadAdmission,
  ) {
    const remove = this.subscribe(() => {
      const view = this.getSnapshot().view;
      gateStates.push({ phase: view.phase, blocked: view.blocked.length });
    });
    const stop = start.call(this);
    return () => {
      remove();
      stop();
    };
  });
  vi.spyOn(WalletNetworkAdmissionStore.prototype, "begin").mockImplementation(
    async (...args) => {
      const result = await memory.begin(...args);
      notifyNetworkAdmission("RtdWallet NetworkAdmission");
      return result;
    },
  );
  // This fixture models existing admission/SDK/React behavior, not native lock recovery.
  // The recoverable production entry has separate real Chromium ownership tests.
  vi.spyOn(
    WalletNetworkAdmissionStore.prototype,
    "beginRecoverable",
  ).mockImplementation(function (this: WalletNetworkAdmissionStore, ...args) {
    return this.begin(...args);
  });
  vi.spyOn(
    WalletNetworkAdmissionStore.prototype,
    "complete",
  ).mockImplementation(async (...args) => {
    const result = await memory.complete(...args);
    notifyNetworkAdmission("RtdWallet NetworkAdmission");
    return result;
  });
});
afterEach(async () => {
  for (const stop of cleanup.splice(0)) await stop();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});
function mount(
  profile: ValidatedNetworkProfile,
  observeReadContracts: boolean | "recover" = true,
) {
  const host = document.createElement("div");
  document.body.append(host);
  const root = createRoot(host),
    client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  let rpc!: WalletRpc;
  function View() {
    rpc = useWalletRpc();
    return h("div", {}, rpc.readCapabilities?.phase ?? "unconfigured");
  }
  const render = async (
    selection: ProfileSelection = { state: "configured", profile },
    observing = observeReadContracts,
  ) => {
    await act(async () =>
      root.render(
        h(
          StrictMode,
          {},
          h(
            QueryClientProvider,
            { client },
            h(WalletRpcProvider, {
              selection,
              observeReadContracts: observing,
              children: h(View),
            }),
          ),
        ),
      ),
    );
  };
  cleanup.push(async () => {
    await act(async () => root.unmount());
    client.clear();
    host.remove();
  });
  return {
    host,
    client,
    render,
    get rpc() {
      return rpc;
    },
  };
}
async function fault(
  profile: ValidatedNetworkProfile,
  negative: NetworkAdmissionFault,
) {
  const { reason: _reason, ...area } = negative;
  const ticket = await memory.begin(profile, [area]);
  await memory.complete(profile, ticket, [negative]);
  notifyNetworkAdmission("RtdWallet NetworkAdmission");
}
async function expectPhase(view: ReturnType<typeof mount>, phase: string) {
  try {
    await vi.waitFor(async () => {
      // Finish each act before checking: awaiting the desired state inside act
      // would prevent React from flushing the very update this test awaits.
      await act(async () => {});
      expect(view.rpc.readCapabilities?.phase).toBe(phase);
    });
  } catch (error) {
    console.info(
      "PUBLIC_OBSERVATION_DIAGNOSTIC " +
        JSON.stringify({
          observations: observations.map((x) => ({
            phase: x.phase,
            reason: "reason" in x ? x.reason : undefined,
          })),
          current: view.rpc.readCapabilities?.phase,
          gatePhase: view.rpc.readAdmission?.phase,
          blocked: view.rpc.readAdmission?.blocked.length,
          pending: memory.records.get(view.rpc.bindingKey)?.pending.length,
          begin: vi.mocked(WalletNetworkAdmissionStore.prototype.begin).mock
            .calls.length,
          complete: vi.mocked(WalletNetworkAdmissionStore.prototype.complete)
            .mock.calls.length,
          gateStates: gateStates.slice(-12),
          captures: captures.slice(-12),
        }),
    );
    throw error;
  }
}
describe("真实Provider独立NC5观察生命周期", () => {
  it("瞬时窗口仍捕获native负面但StrictMode不启动被动NC5或制造ticket", async () => {
    const f = await networkCapabilitiesFixture();
    vi.stubGlobal("fetch", f.fetch);
    const view = mount(f.profile, false);
    await view.render();
    await expectPhase(view, "unavailable");
    await vi.waitFor(() =>
      expect(view.rpc.readAdmission?.phase).toBe("observed"),
    );
    expect(view.rpc.readCapabilities).toMatchObject({
      reason: "policy",
      readiness: "not-assessed",
      execution: "not-probed",
    });
    expect(captures.length).toBeGreaterThan(0);
    expect(observationModule.observeReadCapabilities).not.toHaveBeenCalled();
    expect(WalletNetworkAdmissionStore.prototype.begin).not.toHaveBeenCalled();
    // Ordinary asset snapshot admission still owns its independent reads.
    // Deferring passive NC5 must not disable those reader checks.
    await view.render({ state: "unconfigured", message: "closed-surface" });
    expect(memory.records.size).toBe(0);
  });
  it("瞬时窗口保留旧pending并拒绝业务读取，不把关闭当empty完成", async () => {
    const f = await networkCapabilitiesFixture();
    const ticket = await memory.begin(f.profile, [
      { kind: "identity", role: "fullnode" },
    ]);
    vi.stubGlobal("fetch", f.fetch);
    const view = mount(f.profile, false);
    await view.render();
    await expectPhase(view, "unavailable");
    await vi.waitFor(() =>
      expect(view.rpc.readAdmission?.blocked.length).toBeGreaterThan(0),
    );
    await expect(view.rpc.readBalances!("0xb")).rejects.toMatchObject({
      reason: "reviewing",
    });
    expect(memory.records.get(view.rpc.bindingKey)?.pending).toEqual([ticket]);
    expect(
      WalletNetworkAdmissionStore.prototype.complete,
    ).not.toHaveBeenCalled();
    expect(f.requests).toHaveLength(0);
  });
  it.each(["archive", "accountHistory"] as const)(
    "瞬时窗口仍按native %s已知错链隔离",
    async (role) => {
      const f = await networkCapabilitiesFixture();
      await fault(f.profile, {
        kind: "identity",
        role,
        reason: "chain-mismatch",
      });
      vi.stubGlobal("fetch", f.fetch);
      const view = mount(f.profile, false);
      await view.render();
      await expectPhase(view, "quarantined");
      expect(view.rpc.readCapabilities).toMatchObject({
        role,
        reason: "chain-mismatch",
      });
      await expect(view.rpc.readBalances!("0xb")).rejects.toBeDefined();
      expect(f.requests).toHaveLength(0);
      expect(
        WalletNetworkAdmissionStore.prototype.begin,
      ).not.toHaveBeenCalled();
      expect(memory.records.get(view.rpc.bindingKey)?.faults).toHaveLength(1);
    },
  );
  it.each([false, "recover"] as const)(
    "窗口模式%s保留Display负面，独立余额由真实reader验证同S",
    async (mode) => {
      const f = await networkCapabilitiesFixture(),
        balances = snapshotFixture({
          range: () => ({ first: 0, last: 30 }),
          read: (request) => ({
            address: {
              address: request.variables.owner,
              balances: connection([balanceNode()]),
            },
          }),
        });
      await fault(f.profile, {
        kind: "move-group",
        group: "display",
        reason: "abi",
      });
      vi.stubGlobal("fetch", async (...args: Parameters<typeof fetch>) =>
        String(args[0]) === f.profile.endpoints.graphqlUrl &&
        String(args[1]?.body).includes("WalletSnapshotRead")
          ? balances.fetch(...args)
          : f.fetch(...args),
      );
      const view = mount(f.profile, mode);
      await view.render();
      await expectPhase(view, "unavailable");
      await vi.waitFor(() =>
        expect(view.rpc.readAdmission?.phase).toBe("observed"),
      );
      const result = await view.rpc.readBalances!("0xb");
      expect(result.value[0].balance).toBe(balanceNode().totalBalance);
      expect(result.snapshot.checkpoint).toBe("30");
      expect(
        WalletNetworkAdmissionStore.prototype.begin,
      ).not.toHaveBeenCalled();
      expect(memory.records.get(view.rpc.bindingKey)?.faults).toHaveLength(1);
      expect(view.rpc.readCapabilities).not.toHaveProperty("graphql");
    },
  );
  it("进入持续页面开启fresh owned观察，不复用瞬时窗口报告", async () => {
    const f = await networkCapabilitiesFixture();
    vi.stubGlobal("fetch", f.fetch);
    const view = mount(f.profile, false);
    await view.render();
    await expectPhase(view, "unavailable");
    const old = view.rpc.readSessionKey;
    await view.render({ state: "configured", profile: f.profile }, true);
    await expectPhase(view, "read-contracts-assessed");
    expect(view.rpc.readSessionKey).not.toBe(old);
    expect(WalletNetworkAdmissionStore.prototype.begin).toHaveBeenCalledTimes(
      1,
    );
    expect(
      WalletNetworkAdmissionStore.prototype.complete,
    ).toHaveBeenCalledTimes(1);
    expect(memory.records.get(view.rpc.bindingKey)?.pending).toEqual([]);
  });
  it("StrictMode只一个原ticket，begin通知撤普通缓存而不取消自身SDK观察", async () => {
    const f = await networkCapabilitiesFixture(),
      entered = Promise.withResolvers<void>(),
      held = Promise.withResolvers<void>();
    vi.stubGlobal("fetch", async (...args: Parameters<typeof fetch>) => {
      if (
        String(args[0]) === f.profile.endpoints.graphqlUrl &&
        String(args[1]?.body).includes("__schema")
      ) {
        entered.resolve();
        await held.promise;
      }
      return f.fetch(...args);
    });
    const view = mount(f.profile);
    await view.render();
    try {
      await entered.promise;
      await expectPhase(view, "unavailable");
      expect(WalletNetworkAdmissionStore.prototype.begin).toHaveBeenCalledTimes(
        1,
      );
      const key = [
        "wallet-balances",
        view.rpc.bindingKey,
        view.rpc.readSessionKey,
        "public-old",
      ];
      view.client.setQueryData(key, "public-old");
      await act(async () =>
        notifyNetworkAdmission("RtdWallet NetworkAdmission"),
      );
      await act(async () =>
        vi.waitFor(() => expect(view.client.getQueryData(key)).toBeUndefined()),
      );
      await expect(view.rpc.readBalances!("0xb")).rejects.toMatchObject({
        reason: "reviewing",
      });
      held.resolve();
      await expectPhase(view, "read-contracts-assessed");
      expect(
        WalletNetworkAdmissionStore.prototype.complete,
      ).toHaveBeenCalledTimes(1);
      expect(memory.records.get(view.rpc.bindingKey)?.pending).toEqual([]);
      expect(
        f.requests.filter((r) => r.query?.includes("WalletGenesisIdentity")),
      ).toHaveLength(2);
      expect(view.rpc.readCapabilities).toMatchObject({
        readSessionKey: view.rpc.readSessionKey,
        readiness: "not-assessed",
        crossDomainSnapshot: "not-verified",
        execution: "not-probed",
      });
      expect(
        view.client
          .getQueryCache()
          .getAll()
          .some((q) => q.queryKey[0] === "wallet-network-capabilities"),
      ).toBe(false);
    } finally {
      held.resolve();
    }
  });
  it.each(["graphql", "accountHistory"] as const)(
    "本轮正面之后%s持久负面，关闭会话且视图无残留四族正面字段",
    async (role) => {
      const f = await networkCapabilitiesFixture();
      vi.stubGlobal("fetch", f.fetch);
      const view = mount(f.profile);
      await view.render();
      await expectPhase(view, "read-contracts-assessed");
      const old = view.rpc.readCapabilities;
      await act(async () =>
        fault(f.profile, { kind: "identity", role, reason: "chain-mismatch" }),
      );
      await expectPhase(view, "quarantined");
      expect(view.rpc.readCapabilities).toMatchObject({
        role,
        reason: "chain-mismatch",
      });
      for (const field of [
        "graphql",
        "native",
        "deployment",
        "accountHistory",
        "observedAt",
      ])
        expect(view.rpc.readCapabilities).not.toHaveProperty(field);
      expect(old?.phase).toBe("read-contracts-assessed");
      await expect(view.rpc.readBalances!("0xb")).rejects.toBeDefined();
      memory.clear();
      await act(async () =>
        notifyNetworkAdmission("RtdWallet NetworkAdmission"),
      );
      await expectPhase(view, "quarantined");
    },
  );
  it("Display组负面撤报告但保留余额独立读取与原session／独立S", async () => {
    const f = await networkCapabilitiesFixture(),
      balances = snapshotFixture({
        range: () => ({ first: 0, last: 30 }),
        read: (request) => ({
          address: {
            address: request.variables.owner,
            balances: connection([balanceNode()]),
          },
        }),
      });
    vi.stubGlobal("fetch", async (...args: Parameters<typeof fetch>) =>
      String(args[0]) === f.profile.endpoints.graphqlUrl &&
      String(args[1]?.body).includes("WalletSnapshotRead")
        ? balances.fetch(...args)
        : f.fetch(...args),
    );
    const view = mount(f.profile);
    await view.render();
    await expectPhase(view, "read-contracts-assessed");
    const key = view.rpc.readSessionKey;
    await act(async () =>
      fault(f.profile, { kind: "move-group", group: "display", reason: "abi" }),
    );
    await expectPhase(view, "unavailable");
    expect(view.rpc.readCapabilities).toMatchObject({ reason: "policy" });
    expect(view.rpc.readSessionKey).toBe(key);
    expect(view.rpc.readAdmission?.blocked).not.toContain("balances");
    const result = await view.rpc.readBalances!("0xb");
    expect(result.value[0].balance).toBe(balanceNode().totalBalance);
    expect(result.snapshot.checkpoint).toBe("30");
    expect(view.rpc.readCapabilities).not.toHaveProperty("graphql");
  });
  it("storage失败撤旧报告，恢复普通读取不能复活旧NC5正面", async () => {
    const f = await networkCapabilitiesFixture();
    vi.stubGlobal("fetch", f.fetch);
    const view = mount(f.profile);
    await view.render();
    await expectPhase(view, "read-contracts-assessed");
    unavailable = true;
    await act(async () => notifyNetworkAdmission("RtdWallet NetworkAdmission"));
    await expectPhase(view, "unavailable");
    expect(view.rpc.readCapabilities).not.toHaveProperty("native");
    unavailable = false;
    await act(async () => notifyNetworkAdmission("RtdWallet NetworkAdmission"));
    await act(async () =>
      vi.waitFor(() => expect(view.rpc.readAdmission?.phase).toBe("observed")),
    );
    expect(view.rpc.readCapabilities?.phase).toBe("unavailable");
    expect(WalletNetworkAdmissionStore.prototype.begin).toHaveBeenCalledTimes(
      1,
    );
  });
  it("离开会话取消实际held SDK，回同profile新session不继承原ticket或旧报告", async () => {
    const f = await networkCapabilitiesFixture(),
      entered = Promise.withResolvers<void>(),
      held = Promise.withResolvers<void>();
    vi.stubGlobal("fetch", async (...args: Parameters<typeof fetch>) => {
      if (
        String(args[0]) === f.profile.endpoints.graphqlUrl &&
        String(args[1]?.body).includes("__schema")
      ) {
        entered.resolve();
        await held.promise;
      }
      return f.fetch(...args);
    });
    const view = mount(f.profile);
    await view.render();
    try {
      await entered.promise;
      const old = view.rpc.readSessionKey;
      await view.render({
        state: "unconfigured",
        message: "public-unconfigured",
      });
      expect(view.rpc.readCapabilities).toBeUndefined();
      await view.render();
      await expectPhase(view, "unavailable");
      expect(view.rpc.readSessionKey).not.toBe(old);
      expect(view.rpc.readCapabilities).not.toHaveProperty("graphql");
      expect(memory.records.get(view.rpc.bindingKey)?.pending).toHaveLength(1);
      expect(
        WalletNetworkAdmissionStore.prototype.complete,
      ).not.toHaveBeenCalled();
      held.resolve();
      await new Promise((r) => setTimeout(r, 10));
      expect(
        WalletNetworkAdmissionStore.prototype.complete,
      ).not.toHaveBeenCalled();
      await expect(view.rpc.readBalances!("0xb")).rejects.toMatchObject({
        reason: "reviewing",
      });
    } finally {
      held.resolve();
    }
  });
});
