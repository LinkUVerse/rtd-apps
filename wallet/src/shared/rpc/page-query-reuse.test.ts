// Copyright (c) LinkU Labs, Inc.
// SPDX-License-Identifier: Apache-2.0
import { act, createElement as h } from "react";
import { createRoot } from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { afterEach, beforeEach, it, expect, vi } from "vitest";
import { useGetAllBalances } from "../../ui/app/hooks/useGetAllBalances";
import { useCoinMetadata } from "rtd-apps-core/src/rpc/coin";
import { useStakingView } from "rtd-apps-core/src/rpc/staking-hooks";
import { useWalletAccountHistory } from "rtd-apps-core/src/rpc/history-hooks";
const state = vi.hoisted(() => ({ rpc: {} as any }));
vi.mock("rtd-apps-core/src/rpc/WalletRpcContext", () => ({
  useWalletRpc: () => state.rpc,
}));
Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
let client: QueryClient,
  root: ReturnType<typeof createRoot>,
  host: HTMLDivElement;
let address = "0x" + "1".repeat(64),
  latest: any;
function Probe() {
  latest = {
    balances: useGetAllBalances(address),
    metadata: useCoinMetadata("0x2::rtd::RTD"),
    staking: useStakingView(address),
    history: useWalletAccountHistory(address),
  };
  return null;
}
async function render(show = true) {
  await act(async () =>
    root.render(h(QueryClientProvider, { client }, show ? h(Probe) : null)),
  );
  await act(async () => {
    await new Promise((r) => setTimeout(r, 15));
  });
}
beforeEach(() => {
  const snapshot = { checkpoint: "10", cacheKey: "fixed" };
  state.rpc = {
    state: "configured",
    bindingKey: "binding",
    readSessionKey: "session",
    hasFullnodeSession: true,
    readFreshBalances: vi.fn().mockResolvedValue([]),
    readCoinMetadata: vi.fn().mockResolvedValue({
      snapshot,
      value: { name: "RTD", symbol: "RTD", decimals: 9 },
    }),
    readStakingView: vi
      .fn()
      .mockResolvedValue({ snapshot, value: { epoch: "1", positions: [] } }),
    readAccountHistory: vi
      .fn()
      .mockResolvedValue({ snapshot, transactions: [] }),
  };
  address = "0x" + "1".repeat(64);
  client = new QueryClient();
  host = document.createElement("div");
  document.body.append(host);
  root = createRoot(host);
});
afterEach(async () => {
  await act(async () => root.unmount());
  client.clear();
  host.remove();
  vi.restoreAllMocks();
});
const methods = [
  "readFreshBalances",
  "readCoinMetadata",
  "readStakingView",
  "readAccountHistory",
];
it("brief navigation reuses all four fresh queries without a new RPC or persisted cache", async () => {
  await render();
  await render(false);
  await render();
  for (const method of methods)
    expect(state.rpc[method]).toHaveBeenCalledTimes(1);
  expect(latest.balances.data).toEqual([]);
  for (const q of client.getQueryCache().getAll())
    expect(q.meta?.skipPersistedCache).toBe(true);
});
it.each(["bindingKey", "readSessionKey", "admission"])(
  "changing %s cannot reuse old page data",
  async (field) => {
    await render();
    await render(false);
    if (field === "admission")
      state.rpc = {
        ...state.rpc,
        readAdmission: {
          phase: "observed",
          blocked: [],
          keys: {
            freshBalance: "new",
            coinMetadata: "new",
            staking: "new",
            history: "new",
          },
        },
      };
    else state.rpc = { ...state.rpc, [field]: "changed" };
    await render();
    for (const method of methods)
      expect(state.rpc[method]).toHaveBeenCalledTimes(2);
  },
);
it("expired data is refetched at the existing freshness deadline, not extended by navigation", async () => {
  await render();
  await render(false);
  const now = Date.now();
  vi.spyOn(Date, "now").mockReturnValue(now + 11_000);
  await render();
  for (const method of methods)
    expect(state.rpc[method]).toHaveBeenCalledTimes(2);
});
it("account switch rereads account data but reuses account-independent metadata", async () => {
  await render();
  await render(false);
  address = "0x" + "2".repeat(64);
  await render();
  for (const method of [
    "readFreshBalances",
    "readStakingView",
    "readAccountHistory",
  ])
    expect(state.rpc[method]).toHaveBeenCalledTimes(2);
  expect(state.rpc.readCoinMetadata).toHaveBeenCalledTimes(1);
});
it("stored negative masks a retained result on remount", async () => {
  await render();
  await render(false);
  state.rpc = {
    ...state.rpc,
    readAdmission: {
      phase: "observed",
      blocked: ["freshBalance", "coinMetadata", "staking", "history"],
      keys: {},
    },
  };
  await render();
  for (const query of Object.values(latest) as any[])
    expect(query.data).toBeUndefined();
});
