// Copyright (c) LinkU Labs, Inc.
// SPDX-License-Identifier: Apache-2.0
import { act, createElement as h } from "react";
import { createRoot } from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { useRestrictedGuard } from "./useRestrictedGuard";
const f = vi.hoisted(() => ({
  rpc: {
    bindingKey: "binding",
    readSessionKey: "session",
    hasFullnodeSession: true,
    probeEntryAccess: vi.fn(),
  },
  pathname: "/",
  navigate: vi.fn(),
}));
vi.mock("rtd-apps-core/src/rpc/WalletRpcContext", () => ({
  useWalletRpc: () => f.rpc,
}));
vi.mock("react-router-dom", () => ({
  useLocation: () => ({ pathname: f.pathname }),
  useNavigate: () => f.navigate,
}));
Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
let host: HTMLDivElement,
  root: ReturnType<typeof createRoot>,
  client: QueryClient;
function View() {
  const blocked = useRestrictedGuard();
  return h("div", {}, String(blocked));
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
  vi.clearAllMocks();
  f.rpc = {
    bindingKey: "binding",
    readSessionKey: "session",
    hasFullnodeSession: true,
    probeEntryAccess: vi
      .fn()
      .mockResolvedValue({ state: "accessible", checkpoint: "10" }),
  };
  f.pathname = "/";
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
it("redirects exact restriction and keeps the query out of persisted caches", async () => {
  f.rpc.probeEntryAccess.mockResolvedValue({ state: "restricted" });
  await render();
  expect(f.navigate).toHaveBeenCalledWith("/restricted", { replace: true });
  const query = client.getQueryCache().findAll()[0];
  expect(query.queryKey).toEqual(["wallet-entry-access", "binding", "session"]);
  expect(query.meta).toMatchObject({ skipPersistedCache: true });
  expect(host.textContent).toBe("true");
});
it("only a verified accessible result can clear the restricted page", async () => {
  f.pathname = "/restricted";
  f.rpc.probeEntryAccess.mockRejectedValue(new Error("offline"));
  await render();
  expect(f.navigate).not.toHaveBeenCalled();
  expect(host.textContent).toBe("true");
  f.rpc = {
    ...f.rpc,
    readSessionKey: "fresh",
    probeEntryAccess: vi
      .fn()
      .mockResolvedValue({ state: "accessible", checkpoint: "10" }),
  };
  await render();
  expect(f.navigate).toHaveBeenCalledWith("/", { replace: true });
});
it("new session cannot reuse a delayed old restriction, and unconfigured has no probe", async () => {
  let release!: (x: unknown) => void;
  f.rpc.probeEntryAccess.mockReturnValue(new Promise((r) => (release = r)));
  await render();
  f.rpc = {
    ...f.rpc,
    readSessionKey: "new",
    hasFullnodeSession: false,
    probeEntryAccess: vi.fn(),
  };
  await render();
  await act(async () => release({ state: "restricted" }));
  expect(f.navigate).not.toHaveBeenCalled();
  expect(f.rpc.probeEntryAccess).not.toHaveBeenCalled();
  expect(host.textContent).toBe("false");
});
