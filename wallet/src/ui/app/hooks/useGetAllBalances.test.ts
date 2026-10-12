// Copyright (c) LinkU Labs, Inc.
// SPDX-License-Identifier: Apache-2.0
import { act, createElement as h } from "react";
import { createRoot } from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { useGetAllBalances } from "./useGetAllBalances";

const f = vi.hoisted(() => ({ rpc: {} as any }));
vi.mock("rtd-apps-core/src/rpc/WalletRpcContext", () => ({
  useWalletRpc: () => f.rpc,
}));
Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
let host: HTMLDivElement,
  root: ReturnType<typeof createRoot>,
  client: QueryClient;
let result: ReturnType<typeof useGetAllBalances>;
const owner = "0x" + "1".repeat(64);
const value = [{ coinType: "0x2::rtd::RTD", balance: "17" }];
function Probe() {
  result = useGetAllBalances(owner);
  return null;
}
async function render() {
  await act(async () =>
    root.render(h(QueryClientProvider, { client }, h(Probe))),
  );
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 10));
  });
}
function block(phase: "checking" | "observed" | "unavailable") {
  f.rpc = {
    ...f.rpc,
    readAdmission: {
      phase,
      blocked: ["freshBalance"],
      keys: { freshBalance: phase },
    },
  };
}
beforeEach(() => {
  f.rpc = {
    state: "configured",
    bindingKey: "binding",
    readSessionKey: "session",
    hasFullnodeSession: true,
    readFreshBalances: vi.fn().mockResolvedValue(value),
  };
  client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  host = document.createElement("div");
  document.body.append(host);
  root = createRoot(host);
});
afterEach(async () => {
  await act(async () => root.unmount());
  client.clear();
  host.remove();
});
it.each(["checking", "observed", "unavailable"] as const)(
  "cold %s admission reports blocked separately from disabled pending and never reads",
  async (phase) => {
    block(phase);
    await render();
    expect(result.readBlocked).toBe(true);
    expect(result.isPending).toBe(true);
    expect(result.fetchStatus).toBe("idle");
    expect(result.data).toBeUndefined();
    expect(f.rpc.readFreshBalances).not.toHaveBeenCalled();
  },
);
it("retracts an existing admitted balance without erasing cache or fabricating zero, then reads the cleared admission afresh", async () => {
  await render();
  expect(result.data).toEqual(value);
  expect(result).not.toHaveProperty("snapshot");
  const original = client.getQueryCache().getAll()[0];
  block("observed");
  await render();
  expect(result.readBlocked).toBe(true);
  expect(result.data).toBeUndefined();
  expect(f.rpc.readFreshBalances).toHaveBeenCalledTimes(1);
  // A new admission cache key, not the old snapshot, drives the resumed read.
  f.rpc = {
    ...f.rpc,
    readAdmission: {
      phase: "observed",
      blocked: [],
      keys: { freshBalance: "cleared-2" },
    },
    readFreshBalances: vi
      .fn()
      .mockResolvedValue([{ ...value[0], balance: "19" }]),
  };
  await render();
  expect(result.readBlocked).toBe(false);
  expect(f.rpc.readFreshBalances).toHaveBeenCalledTimes(1);
  expect(result.data?.[0].balance).toBe("19");
  expect(original.queryKey).not.toEqual(
    client
      .getQueryCache()
      .getAll()
      .find((query) => query.getObserversCount() > 0)?.queryKey,
  );
});
it("keeps a real service failure as an error with no balance or snapshot and no retry", async () => {
  const error = new Error("service unavailable");
  f.rpc.readFreshBalances.mockRejectedValue(error);
  await render();
  expect(result.isError).toBe(true);
  expect(result.error).toBe(error);
  expect(result.readBlocked).toBe(false);
  expect(result.data).toBeUndefined();
  expect(f.rpc.readFreshBalances).toHaveBeenCalledTimes(1);
});
it("an initializing context with a valid independent fullnode session can read; persisted balance snapshots stay disabled", async () => {
  f.rpc.state = "initializing";
  await render();
  expect(result.data).toEqual(value);
  const query = client.getQueryCache().getAll()[0];
  expect(query.meta).toMatchObject({
    skipPersistedCache: true,
    walletReadOperation: "freshBalance",
  });
  expect(f.rpc.readFreshBalances).toHaveBeenCalledWith(
    owner,
    expect.any(AbortSignal),
  );
});

it("a known negative remains a rejection while the durable record is being checked again", async () => {
  block("checking");
  f.rpc.readAdmission.reasons = { freshBalance: "blocked" };
  await render();
  expect(result.readBlocked).toBe(true);
  expect(result.readChecking).toBe(false);
  expect(result.data).toBeUndefined();
  expect(f.rpc.readFreshBalances).not.toHaveBeenCalled();
});

it("an indexed-balance coverage failure cannot replace or block live current funds", async () => {
  f.rpc.readAdmission = {
    phase: "observed",
    blocked: ["balances"],
    keys: { freshBalance: "clear" },
  };
  f.rpc.readBalances = vi
    .fn()
    .mockResolvedValue({ value: [{ ...value[0], balance: "999893960304" }] });
  f.rpc.readFreshBalances.mockResolvedValue([
    { ...value[0], balance: "999869964544" },
  ]);
  await render();
  expect(result.data?.[0].balance).toBe("999869964544");
  expect(f.rpc.readBalances).not.toHaveBeenCalled();
  expect(result).not.toHaveProperty("snapshot");
});
it("write invalidation reads current funds again during the short navigation cache", async () => {
  await render();
  f.rpc.readFreshBalances.mockResolvedValue([{ ...value[0], balance: "9" }]);
  await act(async () => {
    await client.invalidateQueries({ queryKey: ["wallet-current-balances"] });
  });
  await render();
  expect(result.data?.[0].balance).toBe("9");
  expect(f.rpc.readFreshBalances).toHaveBeenCalledTimes(2);
});
