import { withCurrentBalances } from "../../../tests/unit/rpc/current-balances-fixture";
// Copyright (c) LinkU Labs, Inc.
// SPDX-License-Identifier: Apache-2.0
import { beforeEach as beforeAdmissionFixture } from "vitest";
import { WalletNetworkAdmissionStore } from "./network-admission-store";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, createElement } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";
import { normalizeRtdAddress, normalizeStructTag } from "rtd-typescript/utils";
import {
  useGetOwnedObjects,
  useMultiGetObjects,
  filterOwnedAssets,
} from "rtd-apps-core/src/rpc/asset-hooks";
import {
  CoinFormat,
  useCoinMetadata,
  useFormatCoin,
} from "rtd-apps-core/src/rpc/coin";
import { displayString } from "rtd-apps-core/src/rpc/display";
import {
  useWalletRpc,
  type WalletRpc,
} from "rtd-apps-core/src/rpc/WalletRpcContext";

import {
  balanceNode,
  connection,
  objectNode,
  snapshotFixture,
} from "../../../tests/unit/rpc/fixtures";
import { useGetAllBalances } from "../../ui/app/hooks/useGetAllBalances";
import { useGetNFTMeta } from "../../ui/app/hooks/useGetNFTMeta";
import { WalletRpcProvider } from "./WalletRpcProvider";
import { WalletAssetReader } from "./asset-reader";

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });

describe("共同资产快照与原生 Hook 的实际集成", () => {
  const cleanups: (() => Promise<void>)[] = [];
  afterEach(async () => {
    for (const cleanup of cleanups.splice(0)) await cleanup();
    vi.unstubAllGlobals();
  });

  function fixture(
    options: { decimals?: number; absent?: boolean; partial?: boolean } = {},
  ) {
    let generation = 1;
    let failAdmission = false;
    let failObjects = false;
    let failBalances = false;
    let failMetadata = !!options.partial;
    const result = snapshotFixture({
      read: (request) => {
        if (request.query.includes("coinMetadata(coinType:"))
          return {
            coinMetadata: options.absent
              ? null
              : {
                  address: "0xc",
                  decimals: options.decimals ?? 9,
                  name: `RTD-${generation}`,
                  symbol: "RTD",
                  description: "",
                  iconUrl: null,
                },
          };
        if (request.query.includes("multiGetObjects(keys:"))
          return {
            multiGetObjects: (
              request.variables.keys as { address: string }[]
            ).map(({ address }) => {
              if (address === normalizeRtdAddress("0xf")) return null;
              const object = objectNode(address);
              object.contents.display.output = {
                name: `NFT-${generation}`,
                attributes: { rarity: 1 },
              };
              return { address, asMoveObject: object };
            }),
          };
        if (request.query.includes("objects(first:"))
          return {
            address: {
              address: request.variables.owner,
              objects: connection([objectNode()]),
            },
          };
        return {
          address: {
            address: request.variables.owner,
            balances: connection([balanceNode()]),
          },
        };
      },
      alter: (response, request) =>
        (failAdmission && request.query.includes("WalletSnapshotAdmission")) ||
        (failMetadata && request.query.includes("coinMetadata(coinType:")) ||
        (failObjects && request.query.includes("multiGetObjects(keys:")) ||
        (failBalances && request.query.includes("balances(first:"))
          ? { ...response, errors: [{ message: "partial" }] }
          : response,
    });
    return {
      ...result,
      fetch: withCurrentBalances(
        result.fetch,
        () => result.profile.expectedGenesisDigest,
        () => {
          if (failBalances) throw new Error("native current funds unavailable");
          return {
            balances: [
              {
                coinType: "0x2::rtd::RTD",
                balance: 9007199254740993n,
                coinBalance: 9007199254740993n,
              },
            ],
          };
        },
      ),
      refresh: () => generation++,
      failAdmission: () => (failAdmission = true),
      failObjects: () => (failObjects = true),
      failBalances: () => (failBalances = true),
      failMetadata: () => (failMetadata = true),
    };
  }

  function mount(source: ReturnType<typeof fixture>, preloadAssets = true) {
    vi.stubGlobal("fetch", source.fetch);
    const element = document.createElement("div");
    document.body.append(element);
    const root = createRoot(element);
    const client = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    let rpc!: WalletRpc;
    function Domains() {
      rpc = useWalletRpc();
      const balance = useGetAllBalances("0xb");
      const metadata = useCoinMetadata("0x2::rtd::RTD");
      const [amount, symbol] = useFormatCoin(
        1234567890n,
        "0x2::rtd::RTD",
        CoinFormat.FULL,
      );
      const nft = useGetNFTMeta("0xa");
      const owned = useGetOwnedObjects("0xb");
      const batch = useMultiGetObjects(["0xa", "0xf"]);
      return createElement(
        "pre",
        null,
        JSON.stringify({
          balance: balance.isError
            ? "error"
            : (balance.data?.[0]?.balance ?? null),
          balanceData: balance.data?.[0]?.balance ?? null,
          metadata: metadata.isError ? "error" : (metadata.data?.name ?? null),
          metadataDecimals: metadata.data?.decimals ?? null,
          amount,
          symbol,
          nft: nft.isError ? "error" : (nft.data?.name ?? null),
          owned: owned.data?.length ?? null,
          missing: batch.data?.[1] instanceof Error,
          batchError: batch.isError,
          batchSize: batch.data?.length ?? null,
        }),
      );
    }
    cleanups.push(async () => {
      await act(async () => root.unmount());
      client.clear();
      element.remove();
    });
    const render = async () =>
      act(async () =>
        root.render(
          createElement(QueryClientProvider, {
            client,
            children: createElement(WalletRpcProvider, {
              selection: { state: "configured", profile: source.profile },
              preloadAssets,
              children: createElement(Domains),
            }),
          }),
        ),
      );
    const wait = (expected: Record<string, unknown>) =>
      act(async () =>
        vi.waitFor(() =>
          expect(JSON.parse(element.textContent!)).toMatchObject(expected),
        ),
      );
    return {
      client,
      element,
      render,
      wait,
      refresh: async () => {
        await act(async () => rpc.refreshAssets());
      },
    };
  }

  it("无路由预加载时，可选NFT组件按需共享完整资产准入", async () => {
    const source = fixture();
    const view = mount(source, false);
    await view.render();
    await view.wait({
      metadata: "RTD-1",
      nft: "NFT-1",
      owned: 1,
      batchSize: 2,
    });
    expect(
      source.requests.filter(
        (r) =>
          r.query.includes("WalletSnapshotAdmission") &&
          r.query.includes("walletDisplayService"),
      ),
    ).toHaveLength(1);
  });

  it("余额刷新失败不继续暴露上次成功余额或把错误当零", async () => {
    const source = fixture();
    const view = mount(source);
    await view.render();
    await view.wait({ balanceData: "9007199254740993" });
    source.failBalances();
    await act(async () => {
      await view.client.invalidateQueries({
        predicate: (query) => query.queryKey[0] === "wallet-current-balances",
      });
    });
    await view.wait({ balance: "error", balanceData: null });
  });

  it("元数据刷新失败撤下旧decimals，不能供表单继续解析金额", async () => {
    const source = fixture();
    const view = mount(source);
    await view.render();
    await view.wait({ metadataDecimals: 9 });
    source.failMetadata();
    await act(async () => {
      await view.client.invalidateQueries({
        predicate: (query) => query.queryKey[0] === "wallet-coin-metadata",
      });
    });
    await view.wait({
      metadata: "error",
      metadataDecimals: null,
      amount: "—",
      symbol: "",
    });
  });

  it("批量刷新失败不继续暴露上次成功的对象和逐项missing结果", async () => {
    const source = fixture();
    const view = mount(source);
    await view.render();
    await view.wait({ batchError: false, batchSize: 2, missing: true });
    source.failObjects();
    await act(async () => {
      await view.client.invalidateQueries({
        predicate: (query) =>
          query.queryKey[0] === "wallet-assets" &&
          query.queryKey[5] === "objects",
      });
    });
    await view.wait({ batchError: true, batchSize: null, missing: false });
  });

  it("完整资产共享proof，当前余额不冒充快照，元数据保留独立proof，无旧Kit Provider", async () => {
    const source = fixture();
    const view = mount(source);
    await view.render();
    await view.wait({
      balance: "9007199254740993",
      metadata: "RTD-1",
      amount: "1.23456789",
      nft: "NFT-1",
      owned: 1,
      missing: true,
    });
    const queries = view.client
      .getQueryCache()
      .getAll()
      .filter(
        (query) =>
          query.queryKey[0] === "wallet-assets" &&
          query.getObserversCount() > 0,
      );
    expect(queries).toHaveLength(3);
    const balancesQuery = view.client
      .getQueryCache()
      .findAll({ queryKey: ["wallet-current-balances"] })
      .find((query) => query.getObserversCount() > 0)!;
    expect(balancesQuery.state.data).toMatchObject([
      { balance: "9007199254740993" },
    ]);
    expect(balancesQuery.state.data).not.toHaveProperty("snapshot");
    expect(balancesQuery.meta?.skipPersistedCache).toBe(true);
    const metadataQuery = view.client
      .getQueryCache()
      .findAll({ queryKey: ["wallet-coin-metadata"] })
      .find((query) => query.getObserversCount() > 0)!;
    expect(metadataQuery.state.data).toMatchObject({
      snapshot: { checkpoint: "10" },
      value: { decimals: 9 },
    });
    expect(metadataQuery.meta?.skipPersistedCache).toBe(true);
    expect(
      (metadataQuery.state.data as { snapshot: { cacheKey: string } }).snapshot
        .cacheKey,
    ).not.toBe(queries[0].queryKey[4]);
    expect(new Set(queries.map((query) => query.queryKey[4])).size).toBe(1);
    expect(queries.every((query) => query.meta?.skipPersistedCache)).toBe(true);
    expect(
      queries.every(
        (query) =>
          (query.state.data as { snapshot: { checkpoint: string } }).snapshot
            .checkpoint === "10",
      ),
    ).toBe(true);
    expect(
      source.requests
        .filter((request) => request.query.includes("WalletSnapshotRead"))
        .every((request) =>
          request.query.includes("checkpoint(sequenceNumber: 10)"),
        ),
    ).toBe(true);
  });

  it("同S资产重新准入只轮换资产，metadata按自己准入刷新", async () => {
    const source = fixture();
    const view = mount(source);
    await view.render();
    await view.wait({ metadata: "RTD-1", nft: "NFT-1" });
    const key = view.client
      .getQueryCache()
      .getAll()
      .find(
        (query) =>
          query.queryKey[0] === "wallet-assets" &&
          query.getObserversCount() > 0,
      )!.queryKey[4];
    source.refresh();
    await view.refresh();
    await view.wait({ metadata: "RTD-1", nft: "NFT-2" });
    await act(async () => {
      await view.client.invalidateQueries({
        queryKey: ["wallet-coin-metadata"],
      });
    });
    await view.wait({ metadata: "RTD-2" });
    const keys = view.client
      .getQueryCache()
      .getAll()
      .filter(
        (query) =>
          query.queryKey[0] === "wallet-assets" &&
          query.getObserversCount() > 0,
      )
      .map((query) => query.queryKey[4]);
    expect(keys).toHaveLength(3);
    expect(keys.every((fresh) => fresh !== key)).toBe(true);
    expect(
      view.client
        .getQueryCache()
        .getAll()
        .filter(
          (query) =>
            query.queryKey[0] === "wallet-assets" && query.queryKey[4] === key,
        )
        .every((query) => query.getObserversCount() === 0 && !query.isActive()),
    ).toBe(true);
    expect(new Set(keys).size).toBe(1);
  });

  it("完整资产准入失败撤下资产，不撤下独立已准入余额与metadata", async () => {
    const source = fixture();
    const view = mount(source);
    await view.render();
    await view.wait({ metadata: "RTD-1", nft: "NFT-1" });
    source.failAdmission();
    await expect(view.refresh()).rejects.toThrow();
    await view.wait({
      balance: "9007199254740993",
      metadata: "RTD-1",
      nft: "error",
      amount: "1.23456789",
    });
    expect(view.element.textContent).toContain("RTD-1");
    expect(view.element.textContent).not.toContain("NFT-1");
  });

  it("原生 RTD 元数据也读链，decimals=0有效，不硬编码9", async () => {
    const view = mount(fixture({ decimals: 0 }));
    await view.render();
    await view.wait({
      metadata: "RTD-1",
      amount: "1,234,567,890",
      symbol: "RTD",
    });
  });

  it("明确 null 元数据展示原子单位，依赖失败展示未知并保持 isError", async () => {
    const absent = mount(fixture({ absent: true }));
    await absent.render();
    await absent.wait({
      metadata: null,
      amount: "1234567890",
      symbol: "RTD (atomic units)",
    });
    const failure = mount(fixture({ partial: true }));
    await failure.render();
    await failure.wait({ metadata: "error", amount: "—", symbol: "" });
  });

  it("Display结构值不作为文本/URL；本地复杂类型筛选使用全集合，不改变原缓存", async () => {
    const source = fixture();
    const reader = await WalletAssetReader.open(source.session, {
      fetch: source.fetch,
    });
    const result = await reader.ownedObjects("0xb");
    const extra = {
      ...result.value[0],
      objectId: normalizeRtdAddress("0xd"),
      type: normalizeStructTag("0x2::coin::Coin<0x2::rtd::RTD>"),
    };
    const input = Object.freeze([...result.value, extra]);
    expect(
      filterOwnedAssets(input, { excludeTypes: ["0x2::coin::Coin"] }),
    ).toEqual(result.value);
    expect(
      filterOwnedAssets(input, {
        includeTypes: ["0x2::coin::Coin<0x2::rtd::RTD>"],
      }),
    ).toEqual([extra]);
    expect(filterOwnedAssets(input, { includeTypes: [] })).toEqual([]);
    expect(input).toHaveLength(2);
    expect(displayString(input[0], "attributes")).toBeNull();
    expect(displayString(input[0], "name")).toBe("资产");
    const failedDisplay = {
      ...input[0],
      display: {
        basis: input[0].display!.basis,
        output: { name: "untrusted" },
        errors: { name: "render failed" },
      },
    };
    expect(displayString(failedDisplay, "name")).toBeNull();
  });
});

// This existing SDK/React protocol fixture does not claim native-storage proof.
beforeAdmissionFixture(() => {
  vi.spyOn(WalletNetworkAdmissionStore.prototype, "capture").mockResolvedValue(
    undefined,
  );
});
