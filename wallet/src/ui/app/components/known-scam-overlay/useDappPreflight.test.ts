// Copyright (c) LinkU Labs, Inc.
// SPDX-License-Identifier: Apache-2.0
import { act, createElement as h } from "react";
import { createRoot } from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Transaction } from "rtd-typescript/transactions";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { useDappPreflight } from "./useDappPreflight";
import { RequestType } from "./types";
const f = vi.hoisted(() => ({
  request: vi.fn(),
  prepared: undefined as any,
  failed: false,
  binding: "p",
  enabled: true,
  preparationInputs: [] as unknown[][],
}));
vi.mock("_src/shared/external-services", () => ({
  get walletExternalServicesEnabled() { return f.enabled; },
}));
vi.mock("rtd-apps-core/src/hooks/useAppsBackend", () => ({
  useAppsBackend: () => ({ request: f.request }),
}));
vi.mock("rtd-apps-core/src/rpc/WalletRpcContext", () => ({
  useWalletRpc: () => ({ bindingKey: f.binding, readSessionKey: "s" }),
}));
vi.mock("../../hooks/usePreparedTransaction", () => ({
  usePreparedTransaction: (...args: unknown[]) => {
    f.preparationInputs.push(args);
    return { data: f.prepared, isError: f.failed };
  },
}));
Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
let root: ReturnType<typeof createRoot>,
  host: HTMLDivElement,
  client: QueryClient,
  tx: Transaction;
let latest: ReturnType<typeof useDappPreflight>;
let requestType = RequestType.SIGN_TRANSACTION;
function View() {
  latest = useDappPreflight({
    requestType,
    requestId: "r",
    origin: "https://example.com",
    network: "local",
    transaction: tx,
  });
  return null;
}
async function render() {
  await act(async () =>
    root.render(h(QueryClientProvider, { client }, h(View))),
  );
  await act(async () => {
    await new Promise((r) => setTimeout(r, 10));
  });
}
beforeEach(() => {
  vi.resetAllMocks();
  f.prepared = { bytesBase64: "approved-bytes", digest: "digest" };
  f.failed = false;
  f.binding = "p";
  f.enabled = true;
  f.preparationInputs = [];
  f.request.mockResolvedValue({ block: { enabled: false } });
  requestType = RequestType.SIGN_TRANSACTION;
  tx = new Transaction();
  tx.setSender("0x7");
  vi.spyOn(tx, "build");
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
it("preflight uses approved bytes without rebuilding a transaction", async () => {
  await render();
  expect(f.request).toHaveBeenCalledOnce();
  expect(tx.build).not.toHaveBeenCalled();
  expect(JSON.parse(f.request.mock.calls[0][2].body)).toMatchObject({
    transactionBytes: "approved-bytes",
    requestType: RequestType.SIGN_TRANSACTION,
  });
  expect(f.request.mock.calls[0][2].signal).toBeInstanceOf(AbortSignal);
  expect(client.getQueryCache().findAll()[0].meta?.skipPersistedCache).toBe(
    true,
  );
});
it("missing or failed preparation never sends another build or preflight", async () => {
  f.prepared = undefined;
  f.failed = true;
  await render();
  expect(f.request).not.toHaveBeenCalled();
  expect(latest.isError).toBe(true);
  expect(latest.data).toBeUndefined();
});
it("connect preflight works without transaction preparation", async () => {
  requestType = RequestType.CONNECT;
  f.prepared = undefined;
  await render();
  expect(f.request).toHaveBeenCalledOnce();
  expect(JSON.parse(f.request.mock.calls[0][2].body)).not.toHaveProperty(
    "transactionBytes",
  );
});
it("network binding changes isolate preflight cache", async () => {
  await render();
  f.binding = "new-profile";
  await render();
  expect(f.request).toHaveBeenCalledTimes(2);
});
it.each([RequestType.CONNECT, RequestType.SIGN_TRANSACTION, RequestType.SIGN_MESSAGE])(
  "closed external policy blocks automatic and explicit refetch for %s", async (type) => {
    f.enabled = false;
    requestType = type;
    await render();
    expect(f.request).not.toHaveBeenCalled();
    expect(f.preparationInputs.every(args => args[0] === null && args[1] === null)).toBe(true);
    expect(tx.build).not.toHaveBeenCalled();
    expect(latest.isPending).toBe(false);
    expect(latest.isError).toBe(true);
    expect(latest.data).toBeUndefined();
    await act(async () => { await latest.refetch(); });
    expect(f.request).not.toHaveBeenCalled();
    expect(latest.data).toBeUndefined();
  },
);
it("closing policy withdraws a cached safe verdict and does not create another preview", async () => {
  await render();
  expect(latest.data?.block.enabled).toBe(false);
  const calls = f.request.mock.calls.length;
  f.enabled = false;
  f.preparationInputs = [];
  await render();
  expect(latest.data).toBeUndefined();
  expect(latest.isError).toBe(true);
  expect(latest.isPending).toBe(false);
  expect(f.request).toHaveBeenCalledTimes(calls);
  expect(f.preparationInputs.every(args => args[0] === null && args[1] === null)).toBe(true);
  await act(async () => { await latest.refetch(); });
  expect(f.request).toHaveBeenCalledTimes(calls);
});
it("enabled service transport failure keeps the verdict unavailable", async () => {
  f.request.mockRejectedValue(new Error("offline"));
  await render();
  expect(f.request).toHaveBeenCalledOnce();
  expect(latest.isError).toBe(true);
  expect(latest.data).toBeUndefined();
});
