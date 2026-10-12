import { withCurrentBalances } from "../../../tests/unit/rpc/current-balances-fixture";
// Copyright (c) LinkU Labs, Inc.
// SPDX-License-Identifier: Apache-2.0
// React + actual balance SDK protocol; native storage is independently verified by Chromium.
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, createElement as h, StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { beforeEach, afterEach, describe, it, expect, vi } from "vitest";
import {
  useWalletRpc,
  type WalletRpc,
} from "rtd-apps-core/src/rpc/WalletRpcContext";
import { useWalletAccountHistory } from "rtd-apps-core/src/rpc/history-hooks";
import { useWalletTransactionDetails } from "rtd-apps-core/src/rpc/receipt-hooks";
import { useAssetQuery } from "rtd-apps-core/src/rpc/asset-hooks";
import { useGetAllBalances } from "../../ui/app/hooks/useGetAllBalances";
import { WalletRpcProvider } from "./WalletRpcProvider";
import { WalletNetworkAdmissionStore } from "./network-admission-store";
import {
  WalletNetworkAdmissionStateError,
  type NetworkAdmissionFault,
} from "./network-admission-state";
import { WalletAccountHistoryReader } from "./account-history-reader";
import { WalletLedgerReader } from "./ledger-reader";
import { notifyNetworkAdmission } from "./network-admission-notifications";
import { validateNetworkProfile, networkBindingKey } from "./profile";
import type { ProfileSelection } from "./profile-registry";
import { MemoryNetworkAdmission } from "../../../tests/unit/rpc/network-admission-fixture";
import {
  snapshotFixture,
  balanceNode,
  connection,
  snapshotDigest,
} from "../../../tests/unit/rpc/fixtures";

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
const cleanups: (() => Promise<void>)[] = [];
let admission: MemoryNetworkAdmission,
  unavailable = false;
beforeEach(() => {
  admission = new MemoryNetworkAdmission();
  unavailable = false;
  vi.spyOn(WalletNetworkAdmissionStore.prototype, "capture").mockImplementation(
    async (p) => {
      if (unavailable)
        throw new WalletNetworkAdmissionStateError("unavailable");
      return admission.records.get(networkBindingKey(p));
    },
  );
  vi.spyOn(WalletAccountHistoryReader.prototype, "read").mockImplementation(
    async function (this: WalletAccountHistoryReader, address) {
      return {
        bindingKey: this.session.bindingKey,
        readSessionKey: this.session.cacheKey,
        address,
        checkpointLo: 0,
        checkpointHi: 10,
        checkpointDigest: snapshotDigest,
        snapshot: "public-snapshot",
        coverage: {
          registrationComplete: true,
          completeForRegisteredKiosks: true,
          completeForDiscoveredOwnerTokens: null,
          completeForDiscoveredCapabilities: null,
          allAccountActivityCertified: false,
          allAccountTransfersCertified: false,
        },
        transactions: [],
        totalTransactions: 0,
      };
    },
  );
  vi.spyOn(WalletLedgerReader.prototype, "details").mockResolvedValue(null);
});
afterEach(async () => {
  for (const stop of cleanups.splice(0)) await stop();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});
function source() {
  const f = snapshotFixture({
    read: (request) => ({
      address: {
        address: request.variables.owner,
        balances: connection([balanceNode()]),
      },
    }),
  });
  const transport = vi.fn(
    withCurrentBalances(
      f.fetch,
      () => f.profile.expectedGenesisDigest,
      () => ({
        balances: [
          { coinType: "0x2::rtd::RTD", balance: 17n, coinBalance: 17n },
        ],
      }),
    ),
  );
  vi.stubGlobal("fetch", transport);
  return { ...f, transport };
}
function mount(profile: ReturnType<typeof validateNetworkProfile>) {
  const host = document.createElement("div");
  document.body.append(host);
  const root = createRoot(host),
    client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  let rpc!: WalletRpc,
    balances!: ReturnType<typeof useGetAllBalances>,
    history!: ReturnType<typeof useWalletAccountHistory>,
    receipt!: ReturnType<typeof useWalletTransactionDetails>,
    assets!: ReturnType<typeof useAssetQuery<unknown>>;
  function View({ enabled }: { enabled: boolean }) {
    rpc = useWalletRpc();
    balances = useGetAllBalances("0xb");
    history = useWalletAccountHistory("0xb");
    receipt = useWalletTransactionDetails(snapshotDigest);
    assets = useAssetQuery("public-view", null, enabled, async () => ({
      snapshot: {
        bindingKey: rpc.bindingKey,
        cacheKey: rpc.assetSnapshotKey,
        checkpoint: "10",
        digest: snapshotDigest,
      },
      value: "public-asset",
    }));
    return h(
      "div",
      {},
      JSON.stringify({
        balance: !!balances.data,
        balanceProof: "snapshot" in balances,
        history: history.data !== undefined,
        receipt: receipt.data !== undefined,
        asset: assets.data !== undefined,
      }),
    );
  }
  const render = async (
    selection: ProfileSelection = { state: "configured", profile },
    enabled = true,
  ) => {
    await act(async () =>
      root.render(
        h(
          StrictMode,
          {},
          h(
            QueryClientProvider,
            { client },
            h(WalletRpcProvider, { selection, children: h(View, { enabled }) }),
          ),
        ),
      ),
    );
  };
  cleanups.push(async () => {
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
    get balances() {
      return balances;
    },
    get history() {
      return history;
    },
    get receipt() {
      return receipt;
    },
    get assets() {
      return assets;
    },
  };
}
async function add(
  profile: ReturnType<typeof validateNetworkProfile>,
  fault: NetworkAdmissionFault,
) {
  const { reason: _reason, ...area } = fault;
  const ticket = await admission.begin(profile, [area]);
  await admission.complete(profile, ticket, [fault]);
  await act(async () => {
    notifyNetworkAdmission("RtdWallet NetworkAdmission");
  });
}
const wait = (run: () => void) =>
  act(async () => {
    await vi.waitFor(run);
  });
describe("actual Provider durable negative consumption and current UI values", () => {
  it.each(["fullnode", "graphql", "archive", "accountHistory"] as const)(
    "preexisting %s fault disables all new reads with zero SDK calls",
    async (role) => {
      const f = source();
      await add(f.profile, {
        kind: "identity",
        role,
        reason: "chain-mismatch",
      });
      const view = mount(f.profile);
      await view.render();
      await wait(() =>
        expect(view.rpc.readAdmission?.blocked).toContain("balances"),
      );
      expect(f.transport.mock.calls).toHaveLength(0);
      expect(view.balances.data).toBeUndefined();
      expect(view.history.data).toBeUndefined();
      expect(view.receipt.data).toBeUndefined();
      await expect(view.rpc.readBalances!("0xb")).rejects.toMatchObject({
        reason: "quarantined",
      });
      expect(f.transport.mock.calls).toHaveLength(0);
    },
  );
  it("background durable identity negative withdraws values/proofs and removes only this session's wallet queries", async () => {
    const f = source(),
      view = mount(f.profile);
    await view.render();
    await wait(() => expect(view.balances.data?.length).toBe(1));
    await wait(() => expect(view.history.data).toBeDefined());
    await wait(() => expect(view.receipt.data).toBeNull());
    const old = view.rpc,
      other = ["wallet-balances", "other-binding", "other-session"],
      catalog = ["apps-catalog"];
    view.client.setQueryData(other, "unrelated");
    view.client.setQueryData(catalog, "unrelated");
    await add(f.profile, {
      kind: "identity",
      role: "accountHistory",
      reason: "incompatible",
    });
    await wait(() => expect(view.rpc.hasFullnodeSession).toBe(false));
    expect(view.balances.data).toBeUndefined();
    expect(view.balances).not.toHaveProperty("snapshot");
    expect(view.history.data).toBeUndefined();
    expect(view.receipt.data).toBeUndefined();
    expect(view.client.getQueryData(other)).toBe("unrelated");
    expect(view.client.getQueryData(catalog)).toBe("unrelated");
    expect(
      view.client
        .getQueryCache()
        .getAll()
        .some(
          (q) =>
            q.queryKey[1] === old.bindingKey &&
            q.queryKey[2] === old.readSessionKey &&
            q.state.data !== undefined,
        ),
    ).toBe(false);
    const requests = f.transport.mock.calls.length;
    await expect(old.readBalances!("0xb")).rejects.toMatchObject({
      reason: "quarantined",
    });
    expect(f.transport.mock.calls.length).toBe(requests);
  });
  it("stored Display ABI fault removes asset proof but real independent current funds, GraphQL balance and history remain available", async () => {
    const f = source(),
      view = mount(f.profile);
    await view.render();
    await wait(() => expect(view.assets.data).toBe("public-asset"));
    const retained = await view.rpc.openAssetSnapshot();
    await add(f.profile, {
      kind: "move-group",
      group: "display",
      reason: "abi",
    });
    await wait(() =>
      expect(view.rpc.readAdmission?.blocked).toContain("assets"),
    );
    await wait(() => expect(view.balances.data?.length).toBe(1));
    expect(view.balances).not.toHaveProperty("snapshot");
    expect(view.assets.data).toBeUndefined();
    expect(view.rpc.hasFullnodeSession).toBe(true);
    await expect(retained.objects([])).rejects.toMatchObject({
      reason: "quarantined",
    });
    await expect(view.rpc.readBalances!("0xb")).resolves.toMatchObject({
      snapshot: { checkpoint: "10" },
    });
    expect(
      view.client
        .getQueryCache()
        .getAll()
        .some(
          (q) =>
            q.queryKey[0] === "wallet-assets" && q.state.data !== undefined,
        ),
    ).toBe(false);
  });
  it("identity pending masks old data, does not close the session, and real completion re-admits fresh keys", async () => {
    const f = source(),
      view = mount(f.profile);
    await view.render();
    await wait(() => expect(view.balances.data?.length).toBe(1));
    const oldKey = view.rpc.readAdmission!.keys.freshBalance,
      oldSession = view.rpc.readSessionKey;
    const ticket = await admission.begin(f.profile, [
      { kind: "identity", role: "archive" },
    ]);
    await act(async () => notifyNetworkAdmission("RtdWallet NetworkAdmission"));
    await wait(() => expect(view.rpc.hasFullnodeSession).toBe(false));
    expect(view.balances.data).toBeUndefined();
    await expect(view.rpc.readBalances!("0xb")).rejects.toMatchObject({
      reason: "reviewing",
    });
    await admission.complete(f.profile, ticket, []);
    await act(async () => notifyNetworkAdmission("RtdWallet NetworkAdmission"));
    await wait(() => expect(view.balances.data?.length).toBe(1));
    expect(view.rpc.readSessionKey).toBe(oldSession);
    expect(view.rpc.readAdmission!.keys.freshBalance).not.toBe(oldKey);
  });
  it("current history and receipt query errors hide prior successful values even when React Query retains them", async () => {
    const f = source(),
      view = mount(f.profile);
    await view.render();
    await wait(() => expect(view.history.data).toBeDefined());
    await wait(() => expect(view.receipt.data).toBeNull());
    vi.mocked(WalletAccountHistoryReader.prototype.read).mockRejectedValue(
      new Error("public history failure"),
    );
    vi.mocked(WalletLedgerReader.prototype.details).mockRejectedValue(
      new Error("public receipt failure"),
    );
    await act(async () => {
      await view.client.refetchQueries({
        predicate: (q) =>
          q.queryKey[0] === "wallet-account-history" ||
          q.queryKey[0] === "wallet-transaction-details",
      });
    });
    await wait(() => expect(view.history.isError).toBe(true));
    expect(view.history.data).toBeUndefined();
    expect(view.receipt.isError).toBe(true);
    expect(view.receipt.data).toBeUndefined();
  });
  it("disabled asset query hides its successful data; returning to same profile uses a new session", async () => {
    const f = source(),
      view = mount(f.profile);
    await view.render();
    await wait(() => expect(view.assets.data).toBe("public-asset"));
    const old = view.rpc.readSessionKey;
    await view.render({ state: "configured", profile: f.profile }, false);
    expect(view.assets.data).toBeUndefined();
    await view.render({
      state: "unconfigured",
      message: "public unconfigured",
    });
    await view.render();
    await wait(() => expect(view.balances.data?.length).toBe(1));
    expect(view.rpc.readSessionKey).not.toBe(old);
    expect(
      view.client
        .getQueryCache()
        .getAll()
        .some((q) => q.queryKey[2] === old),
    ).toBe(false);
  });
  it("storage failure withdraws successful values and blocks the held reader; recovery performs new reads", async () => {
    const f = source(),
      view = mount(f.profile);
    await view.render();
    await wait(() => expect(view.balances.data?.length).toBe(1));
    const old = view.rpc,
      priorKey = view.rpc.readAdmission!.keys.freshBalance;
    unavailable = true;
    await act(async () => notifyNetworkAdmission("RtdWallet NetworkAdmission"));
    await wait(() => expect(view.rpc.readAdmission?.phase).toBe("unavailable"));
    expect(view.balances.data).toBeUndefined();
    expect(view.balances).not.toHaveProperty("snapshot");
    const requests = f.transport.mock.calls.length;
    await expect(old.readBalances!("0xb")).rejects.toMatchObject({
      reason: "unavailable",
    });
    expect(f.transport.mock.calls.length).toBe(requests);
    unavailable = false;
    await act(async () => notifyNetworkAdmission("RtdWallet NetworkAdmission"));
    await wait(() => expect(view.balances.data?.length).toBe(1));
    expect(view.rpc.readAdmission!.keys.freshBalance).not.toBe(priorKey);
    expect(f.transport.mock.calls.length).toBeGreaterThan(requests);
  });
});
