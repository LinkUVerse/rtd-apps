import { withCurrentBalances } from "../../../tests/unit/rpc/current-balances-fixture";
// Copyright (c) LinkU Labs, Inc.
// SPDX-License-Identifier: Apache-2.0
import { beforeEach as beforeAdmissionFixture } from "vitest";
import { WalletNetworkAdmissionStore } from "./network-admission-store";
import { act, createElement as h, StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { afterEach, describe, expect, it, vi } from "vitest";
import { useGetAllBalances } from "../../ui/app/hooks/useGetAllBalances";
import { useWalletRpc } from "rtd-apps-core/src/rpc/WalletRpcContext";
import { WalletRpcProvider } from "./WalletRpcProvider";
import {
  balanceNode,
  connection,
  snapshotFixture,
} from "../../../tests/unit/rpc/fixtures";
import type { ProfileSelection } from "./profile-registry";

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
  let latest: ReturnType<typeof useGetAllBalances> | undefined,
    rpc: ReturnType<typeof useWalletRpc> | undefined;
  function View({ owner }: { owner: string }) {
    rpc = useWalletRpc();
    latest = useGetAllBalances(owner);
    return h(
      "div",
      {},
      latest.isError
        ? "error"
        : latest.data
          ? latest.data.map((b) => b.balance).join(",")
          : "loading",
    );
  }
  async function render(next = selection, owner = "0xb", preloadAssets = true) {
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
              preloadAssets,
              observeReadContracts: "recover",
              children: h(View, { owner }),
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

function fixture(
  options: { pending?: boolean; empty?: boolean; displayFault?: boolean } = {},
) {
  let fault = false;
  const f = snapshotFixture({
    read: (request) => ({
      address: {
        address: request.variables.owner,
        balances: connection(options.empty ? [] : [balanceNode()]),
      },
    }),
  });
  vi.stubGlobal(
    "fetch",
    withCurrentBalances(
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
          (options.displayFault !== false &&
            request.query.includes("walletDisplayService")) ||
          (fault && request.query.includes("balances(first:"))
        )
          body.errors = [{ message: "domain unavailable" }];
        return Response.json(body);
      },
      () => f.profile.expectedGenesisDigest,
      () => {
        if (fault) throw new Error("native balance unavailable");
        return {
          balances: options.empty
            ? []
            : [
                {
                  coinType: "0x2::rtd::RTD",
                  balance: 9007199254740993n,
                  coinBalance: 9007199254740993n,
                },
              ],
        };
      },
    ),
  );
  return {
    ...f,
    fail: () => {
      fault = true;
    },
  };
}

describe("real Provider independent complete balance domain", () => {
  it("navigation from balance home obtains a fully admitted asset snapshot", async () => {
    const f = fixture({ displayFault: false });
    const selection = { state: "configured" as const, profile: f.profile };
    const view = mount(selection);
    await view.render(selection, "0xb", false);
    await act(async () =>
      vi.waitFor(() => expect(view.latest?.data).toHaveLength(1)),
    );
    expect(
      f.requests.every((r) => !r.query.includes("walletDisplayService")),
    ).toBe(true);
    await view.render(selection, "0xb", true);
    await act(async () =>
      vi.waitFor(async () =>
        expect((await view.rpc!.openAssetSnapshot()).proof.checkpoint).toBe(
          "10",
        ),
      ),
    );
    expect(view.latest?.data).toHaveLength(1);
  });
  it("balance-only surface skips Display admission, then enables it on asset navigation without losing balances", async () => {
    const f = fixture();
    const selection = { state: "configured" as const, profile: f.profile };
    const view = mount(selection);
    await view.render(selection, "0xb", false);
    await act(async () =>
      vi.waitFor(() => expect(view.latest?.data).toHaveLength(1)),
    );
    expect(
      f.requests.every((r) => !r.query.includes("walletDisplayService")),
    ).toBe(true);
    const sessionKey = view.rpc!.readSessionKey;
    await view.render(selection, "0xb", true);
    await act(async () =>
      vi.waitFor(() =>
        expect(
          f.requests.some((r) => r.query.includes("walletDisplayService")),
        ).toBe(true),
      ),
    );
    expect(view.rpc!.readSessionKey).toBe(sessionKey);
    expect(view.latest?.data).toHaveLength(1);
    // This fixture deliberately fails Display; it must not revoke a balance proof.
    await view.render(selection, "0xb", false);
    expect(view.latest?.data).toHaveLength(1);
  });
  it.each([false, true])(
    "Display failure or pending=%s does not block complete balances",
    async (pending) => {
      const f = fixture({ pending }),
        view = mount({ state: "configured", profile: f.profile });
      await view.render();
      await act(async () =>
        vi.waitFor(() =>
          expect(view.latest?.data?.[0].balance).toBe("9007199254740993"),
        ),
      );
      const q = view.client
        .getQueryCache()
        .findAll({ queryKey: ["wallet-current-balances"] })
        .find((query) => query.getObserversCount() > 0)!;
      expect(q.state.data).toMatchObject([{ balance: "9007199254740993" }]);
      expect(q.state.data).not.toHaveProperty("snapshot");
      expect(q.meta?.skipPersistedCache).toBe(true);
      expect(q.queryKey).toEqual([
        "wallet-current-balances",
        view.rpc!.bindingKey,
        view.rpc!.readSessionKey,
        view.rpc!.readAdmission!.keys.freshBalance,
        "0x" + "0".repeat(63) + "b",
      ]);
      f.fail();
      await act(async () => {
        await view.latest!.refetch();
      });
      await act(async () =>
        vi.waitFor(() => expect(view.latest?.isError).toBe(true)),
      );
      expect(view.latest?.data).toBeUndefined();
    },
  );
  it("an unrelated NFT re-admission failure does not withdraw independently admitted balances", async () => {
    const f = fixture(),
      view = mount({ state: "configured", profile: f.profile });
    await view.render();
    await act(async () =>
      vi.waitFor(() => expect(view.latest?.data).toHaveLength(1)),
    );
    const count = f.requests.filter((r) =>
      r.query.includes("balances(first:"),
    ).length;
    await act(async () => {
      await view.rpc!.refreshAssets().catch(() => {});
    });
    expect(view.latest?.data).toHaveLength(1);
    expect(
      f.requests.filter((r) => r.query.includes("balances(first:")).length,
    ).toBe(count);
  });
  it("complete empty set is valid, distinct from missing coverage", async () => {
    const f = fixture({ empty: true }),
      view = mount({ state: "configured", profile: f.profile });
    await view.render();
    await act(async () =>
      vi.waitFor(() => expect(view.latest?.isSuccess).toBe(true)),
    );
    expect(view.latest?.data).toEqual([]);
  });
  it("unconfigured profile rejects without transport", async () => {
    const fetch = vi.fn();
    vi.stubGlobal("fetch", fetch);
    const view = mount({ state: "unconfigured", message: "余额服务未配置" });
    await view.render();
    await act(async () =>
      vi.waitFor(() => expect(view.latest?.readBlocked).toBe(true)),
    );
    expect(fetch).not.toHaveBeenCalled();
  });
});

// This existing SDK/React protocol fixture does not claim native-storage proof.
beforeAdmissionFixture(() => {
  vi.spyOn(WalletNetworkAdmissionStore.prototype, "capture").mockResolvedValue(
    undefined,
  );
});
