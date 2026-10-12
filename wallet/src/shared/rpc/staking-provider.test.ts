// Copyright (c) LinkU Labs, Inc.
// SPDX-License-Identifier: Apache-2.0
import { WalletNetworkAdmissionStore } from "./network-admission-store";
import { act, createElement as h, StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { beforeEach, afterEach, describe, expect, it, vi } from "vitest";
import { useWalletRpc } from "rtd-apps-core/src/rpc/WalletRpcContext";
import { useStakingView } from "rtd-apps-core/src/rpc/staking-hooks";
import { WalletRpcProvider } from "./WalletRpcProvider";
import { validateNetworkProfile } from "./profile";
import { type ProfileSelection } from "./profile-registry";
import { stakingFixture } from "../../../tests/unit/rpc/staking-fixture";

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
const cleanups: (() => Promise<void>)[] = [];
afterEach(async () => {
  for (const cleanup of cleanups.splice(0)) await cleanup();
  vi.unstubAllGlobals();
});

function mount(selection: ProfileSelection, owner?: string) {
  const host = document.createElement("div");
  document.body.append(host);
  const root = createRoot(host),
    client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  let latest: ReturnType<typeof useStakingView> | undefined;
  let rpc: ReturnType<typeof useWalletRpc> | undefined;
  function View({ address }: { address?: string }) {
    rpc = useWalletRpc();
    latest = useStakingView(address);
    return h(
      "div",
      {},
      latest.data
        ? `epoch:${latest.data.epoch}`
        : latest.isError
          ? "error"
          : "loading",
    );
  }
  async function render(next = selection, address = owner) {
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
              children: h(View, { address }),
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

describe("real Provider independently injects staking snapshots", () => {
  it("generation rotation withdraws the old portfolio before the new session completes; system-only uses a separate owner key", async () => {
    const f = stakingFixture();
    let hold = false;
    let release: (() => void) | undefined;
    vi.stubGlobal(
      "fetch",
      async (input: RequestInfo | URL, init?: RequestInit) => {
        const request = JSON.parse(String(init?.body));
        if (
          hold &&
          request.query.includes("WalletSnapshotAdmission") &&
          !request.query.includes("walletDisplayService")
        ) {
          hold = false;
          await new Promise<void>((resolve) => {
            release = resolve;
          });
        }
        return f.fetch(input, init);
      },
    );
    const view = mount({ state: "configured", profile: f.profile }, f.owner);
    await view.render();
    await act(async () =>
      vi.waitFor(() => expect(view.latest?.data?.positions).toHaveLength(3)),
    );
    const before = view.rpc!.readSessionKey;
    hold = true;
    await view.render({
      state: "configured",
      profile: validateNetworkProfile({
        ...f.profile,
        generation: "next-staking-generation",
      }),
    });
    await act(async () =>
      vi.waitFor(() => expect(release).toBeTypeOf("function")),
    );
    expect(view.latest?.data).toBeUndefined();
    expect(view.latest?.snapshot).toBeUndefined();
    expect(view.rpc!.readSessionKey).not.toBe(before);
    await act(async () => release!());
    await act(async () =>
      vi.waitFor(() => expect(view.latest?.data?.positions).toHaveLength(3)),
    );
    expect(view.latest!.snapshot!.bindingKey).toBe(view.rpc!.bindingKey);
    await view.render({ state: "configured", profile: f.profile }, "");
    await act(async () =>
      vi.waitFor(() => expect(view.latest?.data?.positions).toBeNull()),
    );
    const query = view.client
      .getQueryCache()
      .findAll({ queryKey: ["wallet-staking"] })
      .find((query) => query.getObserversCount() > 0)!;
    expect(query.queryKey.at(-1)).toBeNull();
  });
  it("a failed Display admission does not block complete staking; errors remove both view and proof", async () => {
    const f = stakingFixture();
    let stakingFault = false;
    vi.stubGlobal(
      "fetch",
      async (input: RequestInfo | URL, init?: RequestInit) => {
        const request = JSON.parse(String(init?.body));
        const body = await (await f.fetch(input, init)).json();
        if (body.data.walletDisplayService)
          body.data.walletDisplayService = null;
        if (stakingFault && request.query.includes("WalletSnapshotRead"))
          body.errors = [{ message: "partial staking" }];
        return Response.json(body);
      },
    );
    const view = mount({ state: "configured", profile: f.profile }, f.owner);
    await view.render();
    await act(async () =>
      vi.waitFor(() => expect(view.latest?.data?.positions).toHaveLength(3)),
    );
    expect(view.rpc?.assetSnapshotKey).toContain("unadmitted");
    expect(view.latest?.snapshot).not.toHaveProperty("displayHistory");
    expect(view.latest?.snapshot?.checkpoint).toBe("10");
    const query = view.client
      .getQueryCache()
      .findAll({ queryKey: ["wallet-staking"] })
      .find((query) => query.getObserversCount() > 0)!;
    expect(query.queryKey).toEqual([
      "wallet-staking",
      view.rpc!.bindingKey,
      view.rpc!.readSessionKey,
      view.rpc!.readAdmission!.keys.staking,
      f.owner,
    ]);
    expect(query.meta?.skipPersistedCache).toBe(true);
    expect(query.state.data).toMatchObject({
      snapshot: { checkpoint: "10" },
      value: { positions: expect.any(Array) },
    });
    stakingFault = true;
    await act(async () => {
      await view.latest!.refetch();
    });
    await act(async () =>
      vi.waitFor(() => expect(view.latest?.isError).toBe(true)),
    );
    expect(view.latest?.data).toBeUndefined();
    expect(view.latest?.snapshot).toBeUndefined();
  });

  it("can finish staking while unrelated asset admission is still pending", async () => {
    const f = stakingFixture();
    vi.stubGlobal(
      "fetch",
      async (input: RequestInfo | URL, init?: RequestInit) => {
        const request = JSON.parse(String(init?.body));
        if (request.query.includes("walletDisplayService"))
          return new Promise<Response>((_resolve, reject) => {
            init!.signal!.addEventListener(
              "abort",
              () => reject(init!.signal!.reason),
              { once: true },
            );
          });
        return f.fetch(input, init);
      },
    );
    const view = mount({ state: "configured", profile: f.profile }, f.owner);
    await view.render();
    await act(async () =>
      vi.waitFor(() => expect(view.latest?.data?.positions).toHaveLength(3)),
    );
    expect(view.rpc?.state).toBe("initializing");
    expect(view.rpc?.hasFullnodeSession).toBe(true);
    expect(view.latest?.snapshot?.checkpoint).toBe("10");
  });

  it("unconfigured selection rejects without fetch or legacy fallback", async () => {
    const fetch = vi.fn();
    vi.stubGlobal("fetch", fetch);
    const view = mount({ state: "unconfigured", message: "未配置质押服务" });
    await view.render();
    await act(async () =>
      vi.waitFor(() => expect(view.latest?.isError).toBe(true)),
    );
    expect(view.latest?.error?.message).toBe("未配置质押服务");
    expect(fetch).not.toHaveBeenCalled();
  });
});

// Existing reader/Provider protocol fixtures do not claim native storage proof.
beforeEach(() => {
  vi.spyOn(WalletNetworkAdmissionStore.prototype, "capture").mockResolvedValue(
    undefined,
  );
});
