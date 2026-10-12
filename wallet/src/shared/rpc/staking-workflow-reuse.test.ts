// Copyright (c) LinkU Labs, Inc.
// SPDX-License-Identifier: Apache-2.0
import { act, createElement as h } from "react";
import { createRoot } from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { WalletStakingViewProvider, useStakingView } from "rtd-apps-core/src/rpc/staking-hooks";

const f = vi.hoisted(() => ({ rpc: {} as any }));
vi.mock("rtd-apps-core/src/rpc/WalletRpcContext", () => ({ useWalletRpc: () => f.rpc }));
Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
const ownerA = "0x" + "1".repeat(64), ownerB = "0x" + "2".repeat(64);
let host: HTMLDivElement, root: ReturnType<typeof createRoot>, client: QueryClient;
let owner: string, requested: string | undefined, enabled: boolean;
let latest: ReturnType<typeof useStakingView>;
const requests: { owner: string; signal: AbortSignal; resolve: (v: any) => void; reject: (e: Error) => void }[] = [];
function Child() {
  latest = useStakingView(requested, { enabled });
  return h("output", {}, latest.data?.epoch ?? (latest.isError ? "error" : "pending"));
}
async function render(route: string | null, scoped = true) {
  const child = route === null ? null : h(Child, { key: route });
  await act(async () => root.render(h(QueryClientProvider, { client }, route === null
    ? null : scoped ? h(WalletStakingViewProvider, { owner, children: child }) : child)));
  await act(async () => { await new Promise(r => setTimeout(r, 5)); });
}
async function settle(index: number, epoch = "1") {
  await act(async () => {
    requests[index].resolve({ snapshot: { cacheKey: epoch }, value: { epoch, validators: [], positions: [] } });
    await new Promise(r => setTimeout(r, 5));
  });
}
beforeEach(() => {
  requests.length = 0;
  owner = requested = ownerA;
  enabled = true;
  f.rpc = { state: "configured", bindingKey: "binding", readSessionKey: "session", hasFullnodeSession: true,
    readStakingView: vi.fn((owner: string, signal: AbortSignal) => new Promise((resolve, reject) => {
      requests.push({ owner, signal, resolve, reject });
      signal.addEventListener("abort", () => reject(new DOMException("Retired", "AbortError")), { once: true });
    })) };
  client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  host = document.createElement("div"); document.body.append(host); root = createRoot(host);
});
afterEach(async () => {
  await act(async () => root.unmount()); client.clear(); host.remove(); vi.restoreAllMocks();
});

it("keeps an actual pending query alive across child route replacement, then aborts on workflow exit", async () => {
  await render("validators"); expect(requests).toHaveLength(1);
  await render("amount"); expect(requests).toHaveLength(1); expect(requests[0].signal.aborted).toBe(false);
  await render(null); expect(requests[0].signal.aborted).toBe(true);
});
it("reuses a fresh successful result without a second query when the child changes", async () => {
  await render("validators"); await settle(0);
  await render("amount"); expect(requests).toHaveLength(1); expect(latest.data?.epoch).toBe("1");
});
it("still refreshes stale data on a new child mount and shares an existing refresh", async () => {
  await render("validators"); await settle(0);
  const now = Date.now(); vi.spyOn(Date, "now").mockReturnValue(now + 6000);
  // Drive the observer's stale result without invalidating the query or starting a fetch.
  await render("validators");
  await render("amount"); expect(requests).toHaveLength(2);
  await render("detail"); expect(requests).toHaveLength(2); expect(requests[1].signal.aborted).toBe(false);
});
it.each(["owner", "bindingKey", "readSessionKey", "admission"])("retires pending scope on %s changes and rejects its late value", async key => {
  await render("validators");
  if (key === "owner") owner = requested = ownerB;
  else if (key === "admission") f.rpc = { ...f.rpc, readAdmission: { phase: "observed", blocked: [], keys: { staking: "next" } } };
  else f.rpc = { ...f.rpc, [key]: "next" };
  await render("amount"); expect(requests).toHaveLength(2); expect(requests[0].signal.aborted).toBe(true);
  await settle(0, "old"); expect(latest.data).toBeUndefined();
  await settle(1, "new"); expect(latest.data?.epoch).toBe("new");
});
it("withdraws shared data when admission is blocked and never fetches through the disabled child", async () => {
  await render("validators"); await settle(0);
  f.rpc = { ...f.rpc, readAdmission: { phase: "observed", blocked: ["staking"], keys: { staking: "blocked" } } };
  await render("amount"); expect(latest.data).toBeUndefined(); expect(requests).toHaveLength(1);
});
it("propagates a shared refresh error instead of keeping the earlier successful view", async () => {
  await render("validators"); await settle(0);
  let refresh: Promise<unknown>;
  await act(async () => { refresh = latest.refetch(); });
  await act(async () => { requests[1].reject(new Error("coverage lost")); await refresh!; await new Promise(r => setTimeout(r, 5)); });
  expect(latest.isError).toBe(true); expect(latest.data).toBeUndefined();
});
it("global child reads reuse the owner's complete view, while another owner stays separate", async () => {
  requested = undefined; await render("global"); expect(requests).toHaveLength(1); expect(requests[0].owner).toBe(ownerA);
  requested = ownerB; await render("other"); expect(requests).toHaveLength(2); expect(requests[1].owner).toBe(ownerB);
});
it("a disabled child cannot expose the provider's data", async () => {
  await render("validators"); await settle(0);
  enabled = false; await render("disabled"); expect(latest.data).toBeUndefined(); expect(requests).toHaveLength(1);
});
it("standalone consumers keep their original cancellation behavior", async () => {
  await render("standalone", false); expect(requests).toHaveLength(1);
  await render(null, false); expect(requests[0].signal.aborted).toBe(true);
});
