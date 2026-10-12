import { act, createElement as h, StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { WalletRpcProvider } from "./WalletRpcProvider";
import { WalletNetworkAdmissionStore } from "./network-admission-store";
import { useWalletRpc } from "rtd-apps-core/src/rpc/WalletRpcContext";
import { useReceiptIndexing } from "../../ui/app/hooks/useReceiptIndexing";
import { snapshotFixture } from "../../../tests/unit/rpc/fixtures";

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
const cleanups: (() => Promise<void>)[] = [];
beforeEach(() => {
  vi.useFakeTimers();
  vi.spyOn(WalletNetworkAdmissionStore.prototype, "capture").mockResolvedValue(
    undefined,
  );
});
afterEach(async () => {
  for (const cleanup of cleanups.splice(0)) await cleanup();
  vi.unstubAllGlobals();
  vi.useRealTimers();
});
async function flush() {
  for (let i = 0; i < 30; i++)
    await act(async () => {
      await vi.advanceTimersByTimeAsync(1);
    });
}
async function advance(ms: number) {
  await act(async () => {
    await vi.advanceTimersByTimeAsync(ms);
  });
  await flush();
}

function mount(initialHeight = 10) {
  let height = initialHeight,
    fail = false;
  const fixture = snapshotFixture({
    range: () => ({ first: 0, last: height }),
    alter: (body) =>
      fail ? { ...body, errors: [{ message: "unavailable" }] } : body,
  });
  vi.stubGlobal("fetch", fixture.fetch);
  const host = document.createElement("div");
  document.body.append(host);
  const root = createRoot(host),
    client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  let rpc!: ReturnType<typeof useWalletRpc>,
    latest!: ReturnType<typeof useReceiptIndexing>;
  function View({ checkpoint }: { checkpoint: string }) {
    rpc = useWalletRpc();
    latest = useReceiptIndexing("receipt", checkpoint);
    return h("div", {}, latest.data === true ? "covered" : "pending");
  }
  async function render(checkpoint = "10") {
    await act(async () => {
      root.render(
        h(
          StrictMode,
          {},
          h(
            QueryClientProvider,
            { client },
            h(WalletRpcProvider, {
              selection: { state: "configured", profile: fixture.profile },
              preloadAssets: false,
              observeReadContracts: "recover",
              children: h(View, { checkpoint }),
            }),
          ),
        ),
      );
    });
    await flush();
  }
  cleanups.push(async () => {
    await act(async () => root.unmount());
    client.clear();
    host.remove();
    fixture.session.close();
  });
  return {
    host,
    render,
    fixture,
    advanceHeight: () => (height = 11),
    fail: () => (fail = true),
    admissions: () =>
      fixture.requests.filter((r) =>
        r.query.includes("WalletSnapshotAdmission"),
      ).length,
    get rpc() {
      return rpc;
    },
    get latest() {
      return latest;
    },
  };
}

it("a covered receipt shares one admission and stops full asset polling", async () => {
  const view = mount();
  await view.render();
  expect(view.host.textContent).toBe("covered");
  expect(view.admissions()).toBe(1);
  await advance(65_000);
  expect(view.host.textContent).toBe("covered");
  expect(view.admissions()).toBe(1);
});

it("pending receipt coverage advances on the shared poll, then stops without a refresh loop", async () => {
  const view = mount();
  await view.render("11");
  expect(view.host.textContent).toBe("pending");
  expect(view.admissions()).toBe(1);
  await advance(10_000);
  expect(view.admissions()).toBe(1);
  view.advanceHeight();
  await advance(11_000);
  expect(view.host.textContent).toBe("covered");
  expect(view.admissions()).toBe(2);
  await advance(65_000);
  expect(view.admissions()).toBe(2);
  await view.render("12");
  expect(view.host.textContent).toBe("pending");
  await advance(21_000);
  expect(view.admissions()).toBeGreaterThan(2);
  expect(view.host.textContent).toBe("pending");
});

it("an explicitly refreshed failed snapshot retracts previous receipt coverage", async () => {
  const view = mount();
  await view.render();
  expect(view.host.textContent).toBe("covered");
  view.fail();
  await act(async () => {
    const refresh = view.rpc.refreshAssets().catch(() => {});
    await vi.advanceTimersByTimeAsync(50);
    await refresh;
  });
  await flush();
  expect(view.host.textContent).toBe("pending");
  expect(view.latest.data).toBeUndefined();
});
