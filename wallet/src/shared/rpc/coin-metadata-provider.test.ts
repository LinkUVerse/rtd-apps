// Copyright (c) LinkU Labs, Inc.
// SPDX-License-Identifier: Apache-2.0
import { beforeEach as beforeAdmissionFixture } from "vitest";
import { WalletNetworkAdmissionStore } from "./network-admission-store";
import { act, createElement as h, StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { afterEach, describe, expect, it, vi } from "vitest";
import { useCoinMetadata } from "rtd-apps-core/src/rpc/coin";
import { useWalletRpc } from "rtd-apps-core/src/rpc/WalletRpcContext";
import { WalletRpcProvider } from "./WalletRpcProvider";
import { validateNetworkProfile } from "./profile";
import type { ProfileSelection } from "./profile-registry";
import { snapshotFixture } from "../../../tests/unit/rpc/fixtures";

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
const cleanups: (() => Promise<void>)[] = [];
afterEach(async () => {
  for (const cleanup of cleanups.splice(0)) await cleanup();
  vi.unstubAllGlobals();
});

function mount(selection: ProfileSelection) {
  const host = document.createElement("div");
  document.body.append(host);
  const root = createRoot(host),
    client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  let latest: ReturnType<typeof useCoinMetadata> | undefined,
    rpc: ReturnType<typeof useWalletRpc> | undefined;
  function View({ type }: { type: string }) {
    rpc = useWalletRpc();
    latest = useCoinMetadata(type);
    return h(
      "div",
      {},
      latest.isError
        ? "error"
        : latest.isSuccess
          ? String(latest.data?.decimals ?? "absent")
          : "loading",
    );
  }
  async function render(next = selection, type = "0x2::rtd::RTD") {
    await act(async () =>
      root.render(
        h(
          StrictMode,
          {},
          h(
            QueryClientProvider,
            { client },
            h(WalletRpcProvider, {
              selection: next,
              children: h(View, { type }),
            }),
          ),
        ),
      ),
    );
  }
  cleanups.push(async () => {
    await act(async () => root.unmount());
    client.clear();
    host.remove();
  });
  return {
    host,
    client,
    render,
    get latest() {
      return latest;
    },
    get rpc() {
      return rpc;
    },
  };
}

function fixture(options: { pending?: boolean; absent?: boolean } = {}) {
  let fault = false;
  const f = snapshotFixture({
    read: () => ({
      coinMetadata: options.absent
        ? null
        : {
            address: "0xc",
            decimals: 9,
            name: "RTD",
            symbol: "RTD",
            description: "",
            iconUrl: null,
          },
    }),
  });
  vi.stubGlobal(
    "fetch",
    async (input: RequestInfo | URL, init?: RequestInit) => {
      const request = JSON.parse(String(init?.body));
      if (options.pending && request.query.includes("walletDisplayService"))
        return new Promise<Response>((_, reject) => {
          init!.signal!.addEventListener(
            "abort",
            () => reject(init!.signal!.reason),
            { once: true },
          );
        });
      const body = await (await f.fetch(input, init)).json();
      if (
        request.query.includes("walletDisplayService") ||
        (fault && request.query.includes("coinMetadata(coinType:"))
      )
        body.errors = [{ message: "domain unavailable" }];
      return Response.json(body);
    },
  );
  return {
    ...f,
    fail: () => {
      fault = true;
    },
  };
}

describe("real metadata Provider and QueryClient isolation", () => {
  it.each([false, true])(
    "Display failure/pending %s does not block metadata",
    async (pending) => {
      const f = fixture({ pending }),
        view = mount({ state: "configured", profile: f.profile });
      await view.render();
      await act(async () =>
        vi.waitFor(() => expect(view.latest?.data?.decimals).toBe(9)),
      );
      expect(view.latest?.snapshot?.checkpoint).toBe("10");
      expect(view.latest?.snapshot).not.toHaveProperty("displayHistory");
      if (pending) {
        expect(view.rpc?.state).toBe("initializing");
        expect(view.rpc?.hasFullnodeSession).toBe(true);
      } else expect(view.rpc?.assetSnapshotKey).toContain("unadmitted");
      const q = view.client
        .getQueryCache()
        .findAll({ queryKey: ["wallet-coin-metadata"] })
        .find((query) => query.getObserversCount() > 0)!;
      expect(q.queryKey).toEqual([
        "wallet-coin-metadata",
        view.rpc!.bindingKey,
        view.rpc!.readSessionKey,
        view.rpc!.readAdmission!.keys.coinMetadata,
        expect.stringContaining("::rtd::RTD"),
      ]);
      expect(q.meta?.skipPersistedCache).toBe(true);
      expect(q.state.data).toMatchObject({
        snapshot: { checkpoint: "10" },
        value: { decimals: 9 },
      });
      f.fail();
      await act(async () => {
        await view.latest!.refetch();
      });
      await act(async () =>
        vi.waitFor(() => expect(view.latest?.isError).toBe(true)),
      );
      expect(view.latest?.data).toBeUndefined();
      expect(view.latest?.snapshot).toBeUndefined();
    },
  );

  it("generation change withdraws old metadata while new admission waits; type change has separate proof", async () => {
    const f = fixture();
    const base = globalThis.fetch;
    let hold = false,
      release: (() => void) | undefined;
    vi.stubGlobal(
      "fetch",
      async (input: RequestInfo | URL, init?: RequestInit) => {
        const query = JSON.parse(String(init?.body)).query;
        if (
          hold &&
          query.includes("WalletSnapshotAdmission") &&
          !query.includes("walletDisplayService")
        ) {
          hold = false;
          await new Promise<void>((resolve) => {
            release = resolve;
          });
        }
        return base(input, init);
      },
    );
    const view = mount({ state: "configured", profile: f.profile });
    await view.render();
    await act(async () =>
      vi.waitFor(() => expect(view.latest?.data?.decimals).toBe(9)),
    );
    const old = view.latest!.snapshot!.cacheKey,
      oldSession = view.rpc!.readSessionKey;
    hold = true;
    const next = {
      state: "configured" as const,
      profile: validateNetworkProfile({
        ...f.profile,
        generation: "next-metadata-generation",
      }),
    };
    await view.render(next);
    await act(async () =>
      vi.waitFor(() => expect(release).toBeTypeOf("function")),
    );
    expect(view.latest?.data).toBeUndefined();
    expect(view.latest?.snapshot).toBeUndefined();
    expect(view.rpc!.readSessionKey).not.toBe(oldSession);
    await act(async () => release!());
    await act(async () =>
      vi.waitFor(() => expect(view.latest?.data?.decimals).toBe(9)),
    );
    expect(view.latest!.snapshot!.cacheKey).not.toBe(old);
    const current = view.latest!.snapshot!.cacheKey;
    await view.render(next, "0x9::coin::TOKEN");
    await act(async () =>
      vi.waitFor(() => expect(view.latest?.data?.decimals).toBe(9)),
    );
    expect(view.latest!.snapshot!.cacheKey).not.toBe(current);
    expect(view.latest!.snapshot!.bindingKey).toBe(view.rpc!.bindingKey);
  });

  it("metadata absence retains successful independent proof", async () => {
    const f = fixture({ absent: true }),
      view = mount({ state: "configured", profile: f.profile });
    await view.render();
    await act(async () =>
      vi.waitFor(() => expect(view.latest?.isSuccess).toBe(true)),
    );
    expect(view.latest!.data).toBeNull();
    expect(view.latest!.snapshot!.checkpoint).toBe("10");
  });

  it("unconfigured profile rejects without transport or legacy fallback", async () => {
    const fetch = vi.fn();
    vi.stubGlobal("fetch", fetch);
    const view = mount({
      state: "unconfigured",
      message: "未配置metadata服务",
    });
    await view.render();
    await act(async () =>
      vi.waitFor(() => expect(view.latest?.isError).toBe(true)),
    );
    expect(view.latest!.error!.message).toBe("未配置metadata服务");
    expect(fetch).not.toHaveBeenCalled();
  });
});

// This existing SDK/React protocol fixture does not claim native-storage proof.
beforeAdmissionFixture(() => {
  vi.spyOn(WalletNetworkAdmissionStore.prototype, "capture").mockResolvedValue(
    undefined,
  );
});
