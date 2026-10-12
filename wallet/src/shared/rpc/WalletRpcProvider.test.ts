// Copyright (c) LinkU Labs, Inc.
// SPDX-License-Identifier: Apache-2.0
import { WalletNetworkAdmissionStore } from "./network-admission-store";

import {
  QueryClient,
  QueryClientProvider,
  useQuery,
} from "@tanstack/react-query";
import { act, createElement, StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { beforeEach, afterEach, describe, expect, it, vi } from "vitest";

import { useWalletRpc } from "rtd-apps-core/src/rpc/WalletRpcContext";
import {
  balanceNode,
  connection,
  snapshotFixture,
} from "../../../tests/unit/rpc/fixtures";
import { validateNetworkProfile } from "./profile";
import { profileFixture } from "./profile-fixture";
import { type ProfileSelection } from "./profile-registry";
import { WalletRpcProvider } from "./WalletRpcProvider";
import { walletAddress } from "./asset-address";

vi.mock("../../ui/app/hooks/useCoinsReFetchingConfig", () => ({
  useCoinsReFetchingConfig: () => ({ staleTime: 5000, refetchInterval: false }),
}));

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });

function Balances({ address }: { address: string }) {
  const rpc = useWalletRpc();
  // Preserve the full asset Provider proof and slow-collection scheduling regression.
  const query = useQuery({
    queryKey: [
      "wallet-assets",
      rpc.bindingKey,
      rpc.readSessionKey,
      rpc.assetSnapshotKey,
      "balances",
      walletAddress(address),
    ],
    queryFn: async ({ signal }) =>
      (await rpc.openAssetSnapshot(signal)).balances(address, signal),
    select: (result) => result.value,
    enabled: rpc.state !== "initializing",
    retry: false,
    staleTime: Infinity,
    gcTime: 0,
    meta: { skipPersistedCache: true },
  });
  return createElement(
    "div",
    null,
    query.isError
      ? `error:${query.error.message}`
      : query.data
        ? `balance:${query.data.map((balance) => balance.balance).join(",")}`
        : "loading",
  );
}

describe("Provider 到余额 Hook 的实际集成", () => {
  const cleanups: (() => Promise<void>)[] = [];
  afterEach(async () => {
    for (const cleanup of cleanups.splice(0)) await cleanup();
    vi.unstubAllGlobals();
    vi.useRealTimers();
  });

  function mount(selection: ProfileSelection, address = "0xb") {
    const element = document.createElement("div");
    document.body.append(element);
    const root = createRoot(element);
    const client = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    cleanups.push(async () => {
      await act(async () => root.unmount());
      client.clear();
      element.remove();
    });
    const render = async (next: ProfileSelection, owner = address) => {
      await act(async () =>
        root.render(
          createElement(
            StrictMode,
            null,
            createElement(
              QueryClientProvider,
              { client },
              createElement(WalletRpcProvider, {
                selection: next,
                children: createElement(Balances, { address: owner }),
              }),
            ),
          ),
        ),
      );
    };
    return { element, client, render: () => render(selection), update: render };
  }

  it("未配置显示错误，完全不触发 Fetch", async () => {
    const fetch = vi.fn();
    vi.stubGlobal("fetch", fetch);
    const view = mount({
      state: "unconfigured",
      message: "当前网络尚未配置钱包数据服务",
    });
    await view.render();
    await act(async () =>
      vi.waitFor(() =>
        expect(view.element.textContent).toContain("error:当前网络尚未配置"),
      ),
    );
    expect(fetch).not.toHaveBeenCalled();
  });

  it("StrictMode 完成新快照与全分页，只缓存带 proof 的结果并禁止持久化", async () => {
    const fixture = snapshotFixture({
      read: (request) => ({
        address: {
          address: request.variables.owner,
          balances: connection([balanceNode()]),
        },
      }),
    });
    vi.stubGlobal("fetch", fixture.fetch);
    const view = mount({ state: "configured", profile: fixture.profile });
    await view.render();
    await act(async () =>
      vi.waitFor(() =>
        expect(view.element.textContent).toBe("balance:900719925474099312345"),
      ),
    );
    expect(fixture.requests.at(-1)?.query).toContain(
      "WalletSnapshotRevalidate",
    );
    const query = view.client
      .getQueryCache()
      .getAll()
      .find(
        (query) =>
          query.queryKey[0] === "wallet-assets" &&
          query.state.status === "success",
      );
    expect(query?.meta?.skipPersistedCache).toBe(true);
    expect(query?.state.data).toMatchObject({
      snapshot: { checkpoint: "10" },
      value: [{ balance: "900719925474099312345" }],
    });
    expect(query?.queryKey[1]).toContain(fixture.profile.expectedGenesisDigest);
  });

  it("部分成功显示错误，不显示 0，也不将已有缓存数据当成新成功", async () => {
    const fixture = snapshotFixture({
      read: (request) => ({
        address: {
          address: request.variables.owner,
          balances: connection([balanceNode()]),
        },
      }),
      alter: (response, request) =>
        request.query.includes("WalletSnapshotRead")
          ? { ...response, errors: [{ message: "partial" }] }
          : response,
    });
    vi.stubGlobal("fetch", fixture.fetch);
    const view = mount({ state: "configured", profile: fixture.profile });
    await view.render();
    await act(async () =>
      vi.waitFor(() => expect(view.element.textContent).toContain("error:")),
    );
    expect(view.element.textContent).not.toContain("balance:");
    expect(
      view.client
        .getQueryCache()
        .getAll()
        .some(
          (query) =>
            query.queryKey[0] === "wallet-assets" &&
            query.state.status === "success",
        ),
    ).toBe(false);
  });

  it("切 generation 清除旧会话可达数据，相同 URL 不复用旧账户余额", async () => {
    const fixture = snapshotFixture({
      read: (request) => ({
        address: {
          address: request.variables.owner,
          balances: connection([balanceNode()]),
        },
      }),
    });
    vi.stubGlobal("fetch", fixture.fetch);
    const view = mount({ state: "configured", profile: fixture.profile });
    await view.render();
    await act(async () =>
      vi.waitFor(() => expect(view.element.textContent).toContain("balance:")),
    );
    const firstKey = view.client
      .getQueryCache()
      .getAll()
      .find(
        (query) =>
          query.queryKey[0] === "wallet-assets" &&
          query.state.status === "success",
      )!.queryKey;
    const next = profileFixture();
    next.generation = "dev-2";
    await view.update(
      { state: "configured", profile: validateNetworkProfile(next) },
      "0xc",
    );
    await act(async () =>
      vi.waitFor(() => {
        const successful = view.client
          .getQueryCache()
          .getAll()
          .filter(
            (query) =>
              query.queryKey[0] === "wallet-assets" &&
              query.state.status === "success",
          );
        expect(successful).toHaveLength(1);
        expect(successful[0].queryKey[1]).toContain("dev-2");
      }),
    );
    const query = view.client
      .getQueryCache()
      .getAll()
      .find(
        (query) =>
          query.queryKey[0] === "wallet-assets" &&
          query.state.status === "success",
      )!;
    expect(firstKey[1]).not.toEqual(query.queryKey[1]);
    expect(firstKey.at(-1)).not.toEqual(query.queryKey.at(-1));
  });

  it("重新进入相同 profile 也必须重新准入，不能在等待期间展示旧成功缓存", async () => {
    const fixture = snapshotFixture({
      read: (request) => ({
        address: {
          address: request.variables.owner,
          balances: connection([balanceNode()]),
        },
      }),
    });
    vi.stubGlobal("fetch", fixture.fetch);
    const selection = {
      state: "configured",
      profile: fixture.profile,
    } as const;
    const view = mount(selection);
    await view.render();
    await act(async () =>
      vi.waitFor(() => expect(view.element.textContent).toContain("balance:")),
    );
    const original = view.client
      .getQueryCache()
      .getAll()
      .find(
        (query) =>
          query.queryKey[0] === "wallet-assets" &&
          query.state.status === "success",
      )!.queryKey;
    await view.update({ state: "unconfigured", message: "未配置" });
    let release!: () => void;
    const pending = new Promise<void>((resolve) => {
      release = resolve;
    });
    const fetch: typeof globalThis.fetch = async (...args) => {
      await pending;
      return fixture.fetch(...args);
    };
    vi.stubGlobal("fetch", fetch);
    await view.update(selection);
    expect(view.element.textContent).toBe("loading");
    await act(async () => {
      release();
    });
    await act(async () =>
      vi.waitFor(() => expect(view.element.textContent).toContain("balance:")),
    );
    const fresh = view.client
      .getQueryCache()
      .getAll()
      .find(
        (query) =>
          query.queryKey[0] === "wallet-assets" &&
          query.state.status === "success",
      )!.queryKey;
    expect(original[1]).toBe(fresh[1]);
    expect(original[2]).not.toBe(fresh[2]);
  });

  it("后台快照轮换等待当前资产读取完成，不使慢查询反复取消；空闲后继续刷新", async () => {
    vi.useFakeTimers();
    const fixture = snapshotFixture({
      read: (request) => {
        const cursor = request.variables.cursor;
        const index = cursor === "page1" ? 1 : cursor === "page2" ? 2 : 0;
        return {
          address: {
            address: request.variables.owner,
            balances: connection(
              [balanceNode(`0x2::fixture::COIN${index}`)],
              index < 2 ? `page${index + 1}` : null,
              index < 2,
            ),
          },
        };
      },
    });
    let reads = 0,
      aborted = false;
    vi.stubGlobal("fetch", async (...args: Parameters<typeof fetch>) => {
      const body = JSON.parse(String(args[1]?.body));
      // Each page finishes within the production HTTP deadline; the full list takes 21s.
      if (body.query.includes("WalletSnapshotRead") && reads++ < 3) {
        const signal = args[1]?.signal;
        await new Promise<void>((resolve, reject) => {
          const cancelled = () => {
            aborted = true;
            clearTimeout(timer);
            reject(signal!.reason);
          };
          const timer = setTimeout(() => {
            signal?.removeEventListener("abort", cancelled);
            resolve();
          }, 7_000);
          signal?.addEventListener("abort", cancelled, { once: true });
        });
      }
      return fixture.fetch(...args);
    });
    const view = mount({ state: "configured", profile: fixture.profile });
    const flush = async () => {
      for (let i = 0; i < 15; i++)
        await act(async () => {
          await vi.advanceTimersByTimeAsync(1);
        });
    };
    await view.render();
    await flush();
    expect(reads).toBe(1);
    const admissions = () =>
      fixture.requests.filter((request) =>
        request.query.includes("WalletSnapshotAdmission"),
      ).length;
    expect(admissions()).toBe(1);
    await act(async () => {
      await vi.advanceTimersByTimeAsync(22_000);
    });
    await flush();
    expect(admissions()).toBe(1);
    expect(aborted).toBe(false);
    expect(view.element.textContent).toBe(
      "balance:900719925474099312345,900719925474099312345,900719925474099312345",
    );
    await act(async () => {
      await vi.advanceTimersByTimeAsync(20_000);
    });
    await flush();
    expect(admissions()).toBe(2);
    expect(view.element.textContent).toBe(
      "balance:900719925474099312345,900719925474099312345,900719925474099312345",
    );
  });

  it("资产读取未结束时切换 generation 仍立即取消旧请求并读取新会话", async () => {
    const fixture = snapshotFixture({
      read: (request) => ({
        address: {
          address: request.variables.owner,
          balances: connection([balanceNode()]),
        },
      }),
    });
    let started = false,
      aborted = false;
    vi.stubGlobal("fetch", async (...args: Parameters<typeof fetch>) => {
      const body = JSON.parse(String(args[1]?.body));
      if (body.query.includes("WalletSnapshotRead") && !started) {
        started = true;
        const signal = args[1]?.signal;
        await new Promise<void>((_, reject) => {
          signal?.addEventListener(
            "abort",
            () => {
              aborted = true;
              reject(signal.reason);
            },
            { once: true },
          );
        });
      }
      return fixture.fetch(...args);
    });
    const view = mount({ state: "configured", profile: fixture.profile });
    await view.render();
    await act(async () => {
      await vi.waitFor(() => expect(started).toBe(true));
    });
    const profile = validateNetworkProfile({
      ...fixture.profile,
      generation: "next-generation",
    });
    await view.update({ state: "configured", profile }, "0xc");
    expect(aborted).toBe(true);
    await act(async () => {
      await vi.waitFor(() =>
        expect(view.element.textContent).toContain("balance:"),
      );
    });
    const successes = view.client
      .getQueryCache()
      .getAll()
      .filter(
        (query) =>
          query.queryKey[0] === "wallet-assets" &&
          query.state.status === "success",
      );
    expect(successes).toHaveLength(1);
    expect(successes[0].queryKey[1]).toContain("next-generation");
    expect(successes[0].queryKey.at(-1)).toBe("0x" + "0".repeat(63) + "c");
  });
});

// Existing reader/Provider protocol fixtures do not claim native storage proof.
beforeEach(() => {
  vi.spyOn(WalletNetworkAdmissionStore.prototype, "capture").mockResolvedValue(
    undefined,
  );
});
