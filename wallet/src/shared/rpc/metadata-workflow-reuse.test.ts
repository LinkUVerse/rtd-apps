// Copyright (c) LinkU Labs, Inc.
// SPDX-License-Identifier: Apache-2.0
import { act, createElement as h } from "react";
import { createRoot } from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { useCoinMetadata } from "rtd-apps-core/src/rpc/coin";
const f = vi.hoisted(() => ({ rpc: {} as any }));
vi.mock("rtd-apps-core/src/rpc/WalletRpcContext", () => ({
  useWalletRpc: () => f.rpc,
}));
Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
const type = "0x2::rtd::RTD";
let host: HTMLDivElement,
  root: ReturnType<typeof createRoot>,
  client: QueryClient;
let latest: ReturnType<typeof useCoinMetadata>,
  passive: ReturnType<typeof useCoinMetadata>;
const calls: {
  signal: AbortSignal;
  resolve: (v: any) => void;
  reject: (e: Error) => void;
}[] = [];
function Child() {
  latest = useCoinMetadata(type);
  return null;
}
function Workflow({ child }: { child: boolean }) {
  passive = useCoinMetadata(type, { enabled: false });
  return child ? h(Child) : null;
}
async function render(child = false, workflow = true) {
  await act(async () =>
    root.render(
      h(
        QueryClientProvider,
        { client },
        workflow ? h(Workflow, { child }) : null,
      ),
    ),
  );
  await act(async () => {
    await new Promise((r) => setTimeout(r, 5));
  });
}
async function settle(index = 0) {
  await act(async () => {
    calls[index].resolve({
      snapshot: { checkpoint: "10" },
      value: { decimals: 9, name: "RTD", symbol: "RTD" },
    });
    await new Promise((r) => setTimeout(r, 5));
  });
}
beforeEach(() => {
  calls.length = 0;
  f.rpc = {
    state: "configured",
    bindingKey: "binding",
    readSessionKey: "session",
    hasFullnodeSession: true,
    readCoinMetadata: vi.fn(
      (_type: string, signal: AbortSignal) =>
        new Promise((resolve, reject) => {
          calls.push({ signal, resolve, reject });
          signal.addEventListener(
            "abort",
            () => reject(new DOMException("retired", "AbortError")),
            { once: true },
          );
        }),
    ),
  };
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
it("does not preload, invalidate-fetch, or expose metadata through the passive observer", async () => {
  await render();
  expect(calls).toHaveLength(0);
  await act(async () => {
    await client.invalidateQueries();
  });
  expect(calls).toHaveLength(0);
  await render(true);
  await settle();
  expect(latest.data?.decimals).toBe(9);
  expect(passive.data).toBeUndefined();
  expect(passive.snapshot).toBeUndefined();
});
it("retains a child-initiated pending read across route replacement and joins it on return", async () => {
  await render(true);
  await render(false);
  expect(calls[0].signal.aborted).toBe(false);
  await render(true);
  expect(calls).toHaveLength(1);
  await settle();
  expect(latest.data?.decimals).toBe(9);
});
it("cancels the pending child read when the entire workflow exits", async () => {
  await render(true);
  await render(false);
  await render(false, false);
  expect(calls[0].signal.aborted).toBe(true);
});
it("still refreshes stale metadata on child remount and shares that pending refresh", async () => {
  await render(true);
  await settle();
  await render(false);
  vi.spyOn(Date, "now").mockReturnValue(Date.now() + 6000);
  await render(true);
  expect(calls).toHaveLength(2);
  await render(false);
  await render(true);
  expect(calls).toHaveLength(2);
  expect(calls[1].signal.aborted).toBe(false);
});
it.each(["bindingKey", "readSessionKey", "admission"])(
  "retires a retained read after %s changes",
  async (key) => {
    await render(true);
    await render(false);
    if (key === "admission")
      f.rpc = {
        ...f.rpc,
        readAdmission: {
          phase: "observed",
          blocked: [],
          keys: { coinMetadata: "next" },
        },
      };
    else f.rpc = { ...f.rpc, [key]: "next" };
    await render(false);
    expect(calls[0].signal.aborted).toBe(true);
    expect(calls).toHaveLength(1);
    await settle();
    await render(true);
    expect(latest.data).toBeUndefined();
    expect(calls).toHaveLength(2);
  },
);
it("does not use an older successful value after a shared refresh fails", async () => {
  await render(true);
  await settle();
  await render(false);
  vi.spyOn(Date, "now").mockReturnValue(Date.now() + 6000);
  await render(true);
  await act(async () => {
    calls[1].reject(new Error("coverage"));
    await new Promise((r) => setTimeout(r, 5));
  });
  expect(latest.isError).toBe(true);
  expect(latest.data).toBeUndefined();
  expect(passive.data).toBeUndefined();
});
