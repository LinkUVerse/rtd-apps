import { act, createElement as h } from "react";
import { createRoot } from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { useGetOwnedObjects } from "rtd-apps-core/src/rpc/asset-hooks";
const state = vi.hoisted(() => ({ rpc: {} as any }));
vi.mock("rtd-apps-core/src/rpc/WalletRpcContext", () => ({
  useWalletRpc: () => state.rpc,
}));
Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
let client: QueryClient,
  root: ReturnType<typeof createRoot>,
  host: HTMLDivElement,
  latest: any;
let owner = "0xb";
let owned: ReturnType<typeof vi.fn>;
function Probe() {
  latest = useGetOwnedObjects(owner);
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
  owner = "0xb";
  owned = vi
    .fn()
    .mockResolvedValue({ snapshot: { checkpoint: "10" }, value: [] });
  state.rpc = {
    state: "configured",
    bindingKey: "binding",
    readSessionKey: "session",
    assetSnapshotKey: "snapshot-10",
    openAssetSnapshot: vi.fn().mockResolvedValue({ ownedObjects: owned }),
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
});
it("资产列表短暂卸载后复用同一已准入快照，不增加RPC或保持活跃轮询", async () => {
  await render();
  await render(false);
  expect(
    client
      .getQueryCache()
      .getAll()
      .every((q) => !q.isActive()),
  ).toBe(true);
  await render();
  expect(owned).toHaveBeenCalledTimes(1);
  expect(latest.data).toEqual([]);
  expect(
    client
      .getQueryCache()
      .getAll()
      .every((q) => q.meta?.skipPersistedCache),
  ).toBe(true);
});
it.each([
  "assetSnapshotKey",
  "readSessionKey",
  "bindingKey",
  "owner",
  "admission",
])("%s改变时不复用旧结果", async (field) => {
  await render();
  await render(false);
  if (field === "owner") owner = "0xc";
  else if (field === "admission")
    state.rpc = {
      ...state.rpc,
      readAdmission: {
        phase: "observed",
        blocked: [],
        keys: { assets: "next" },
      },
    };
  else state.rpc = { ...state.rpc, [field]: "next" };
  await render();
  expect(owned).toHaveBeenCalledTimes(2);
});
it("已知负面会立即掩码保留结果", async () => {
  await render();
  await render(false);
  state.rpc = {
    ...state.rpc,
    readAdmission: { phase: "observed", blocked: ["assets"], keys: {} },
  };
  await render();
  expect(latest.data).toBeUndefined();
  expect(owned).toHaveBeenCalledTimes(1);
});
