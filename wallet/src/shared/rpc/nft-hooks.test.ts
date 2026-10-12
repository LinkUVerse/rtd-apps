// Copyright (c) LinkU Labs, Inc.
// SPDX-License-Identifier: Apache-2.0
import { WalletNetworkAdmissionStore } from "./network-admission-store";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, createElement } from "react";
import { createRoot } from "react-dom/client";
import { beforeEach, afterEach, describe, expect, it, vi } from "vitest";
import { bcs } from "rtd-typescript/bcs";
import {
  deriveDynamicFieldID,
  normalizeRtdAddress,
  normalizeStructTag,
  toBase64,
} from "rtd-typescript/utils";
import { useGetKioskContents } from "rtd-apps-core/src/rpc/kiosk-hooks";
import {
  useGetOwnedObjects,
  useMultiGetObjects,
} from "rtd-apps-core/src/rpc/asset-hooks";
import { useWalletRpc } from "rtd-apps-core/src/rpc/WalletRpcContext";
import {
  connection,
  objectNode,
  snapshotFixture,
} from "../../../tests/unit/rpc/fixtures";
import { WalletRpcProvider } from "./WalletRpcProvider";
import { KIOSK_CAP_BCS, KIOSK_BCS, KIOSK_ITEM_BCS } from "./kiosk-reader";
import {
  groupCollectibles,
  directlyOwnedAsset,
  assetMediaUrl,
} from "./nft-assets";
import { useOwnedNFT } from "../../ui/app/hooks/useOwnedNFT";
import { useGetNFTMeta } from "../../ui/app/hooks/useGetNFTMeta";

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
const address = normalizeRtdAddress("0xb"),
  capId = normalizeRtdAddress("0xa"),
  kioskId = normalizeRtdAddress("0xc"),
  itemId = normalizeRtdAddress("0xd"),
  directId = normalizeRtdAddress("0xe");
const fieldId = deriveDynamicFieldID(
  kioskId,
  "0x2::dynamic_object_field::Wrapper<0x2::kiosk::Item>",
  KIOSK_ITEM_BCS.serialize({ id: itemId }).toBytes(),
);
function fixture(
  options: { changedPointRead?: boolean; unprovedChild?: boolean } = {},
) {
  let failed = false;
  let itemReads = 0;
  const cap = objectNode(capId, address);
  cap.contents.type.repr = "0x2::kiosk::KioskOwnerCap";
  cap.contents.display.basis.objectType = normalizeStructTag(
    cap.contents.type.repr,
  );
  cap.contents.bcs = toBase64(
    KIOSK_CAP_BCS.serialize({ id: capId, for: kioskId }).toBytes(),
  );
  cap.contents.display.output = { name: "Kiosk", attributes: { rarity: 1 } };
  const kiosk = {
    ...objectNode(kioskId),
    owner: { __typename: "Shared", initialSharedVersion: 1 },
  };
  kiosk.contents.type.repr = "0x2::kiosk::Kiosk";
  kiosk.contents.display.basis.objectType = normalizeStructTag(
    kiosk.contents.type.repr,
  );
  kiosk.contents.bcs = toBase64(
    KIOSK_BCS.serialize({
      id: kioskId,
      owner: address,
      item_count: 1,
      profits: { value: "9007199254740993" },
      allow_extensions: false,
    }).toBytes(),
  );
  const item = {
    ...objectNode(itemId),
    owner: { __typename: "ObjectOwner", address: { address: fieldId } },
  };
  item.contents.bcs = toBase64(bcs.Address.serialize(itemId).toBytes());
  const direct = objectNode(directId, address);
  direct.contents.display.output = {
    name: "Direct",
    attributes: { rarity: 1 },
  };
  const source = snapshotFixture({
    read: (request) => {
      if (request.query.includes("objects(first:"))
        return {
          address: {
            address: request.variables.owner,
            objects:
              request.variables.cursor === null
                ? connection(options.unprovedChild ? [] : [cap], "second", true)
                : connection([direct]),
          },
        };
      if (request.query.includes("multiGetObjects(keys:"))
        return {
          multiGetObjects: (
            request.variables.keys as { address: string }[]
          ).map(({ address }) => {
            const object =
              address === kioskId
                ? kiosk
                : address === capId
                  ? cap
                  : address === itemId
                    ? item
                    : address === directId
                      ? direct
                      : null;
            const point =
              options.changedPointRead &&
              address === itemId &&
              ++itemReads === 1
                ? { ...object, version: 99 }
                : object;
            return point ? { address, asMoveObject: point } : null;
          }),
        };
      if (request.query.includes("dynamicFields(first:"))
        return {
          address: {
            address: kioskId,
            dynamicFields: connection([
              {
                address: fieldId,
                name: {
                  type: { repr: "0x2::kiosk::Item" },
                  bcs: toBase64(
                    KIOSK_ITEM_BCS.serialize({ id: itemId }).toBytes(),
                  ),
                },
                value: {
                  __typename: "MoveObject",
                  address: itemId,
                  contents: {
                    bcs: item.contents.bcs,
                    type: { repr: item.contents.type.repr },
                  },
                },
              },
            ]),
          },
        };
      return {};
    },
    alter: (result, request) =>
      failed && request.query.includes("WalletSnapshotAdmission")
        ? { ...result, errors: [{ message: "partial" }] }
        : result,
  });
  return {
    ...source,
    fail: () => {
      failed = true;
    },
  };
}

describe("NFT/原生 Kiosk 新 Hook 实际 Provider 与固定 S", () => {
  const cleanups: (() => Promise<void>)[] = [];
  afterEach(async () => {
    for (const cleanup of cleanups.splice(0)) await cleanup();
    vi.unstubAllGlobals();
  });
  function mount(
    source: ReturnType<typeof fixture>,
    target: string | null = itemId,
  ) {
    vi.stubGlobal("fetch", source.fetch);
    const node = document.createElement("div");
    document.body.append(node);
    const root = createRoot(node);
    const client = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    let refresh!: () => Promise<void>;
    function Domains({ target }: { target: string | null }) {
      const rpc = useWalletRpc();
      refresh = () => rpc.refreshAssets();
      const kiosks = useGetKioskContents(address);
      const owned = useGetOwnedObjects(address);
      const nft = useOwnedNFT(target, address);
      const meta = useGetNFTMeta(target ?? "");
      const hidden = useMultiGetObjects([directId, normalizeRtdAddress("0xf")]);
      const grouped =
        owned.data && groupCollectibles(owned.data, [directId], rpc.packages);
      return createElement(
        "pre",
        null,
        JSON.stringify({
          kiosks: kiosks.isError
            ? "error"
            : kiosks.data?.list.map((item) => item.objectId),
          nft: nft.isError ? "error" : (nft.data?.objectId ?? null),
          pending: nft.isPending,
          metaPending: meta.isPending,
          visible: grouped?.visual.map((item) => item.objectId),
          hidden: grouped?.hidden.map((item) => item.objectId),
          hiddenError: hidden.data?.[1] instanceof Error,
        }),
      );
    }
    cleanups.push(async () => {
      await act(async () => root.unmount());
      client.clear();
      node.remove();
    });
    const render = (next = target) =>
      act(async () =>
        root.render(
          createElement(QueryClientProvider, {
            client,
            children: createElement(WalletRpcProvider, {
              selection: { state: "configured", profile: source.profile },
              children: createElement(Domains, { target: next }),
            }),
          }),
        ),
      );
    const wait = (expected: Record<string, unknown>) =>
      act(async () =>
        vi.waitFor(() =>
          expect(JSON.parse(node.textContent!)).toMatchObject(expected),
        ),
      );
    return {
      render,
      wait,
      client,
      refresh: async () => {
        let failure: unknown;
        await act(async () => {
          try {
            await refresh();
          } catch (error) {
            failure = error;
          }
        });
        if (failure) throw failure;
      },
    };
  }
  it("全分页只提交完整资产，隐藏资产互斥；cap/child/wrapper 持有关系与逐项 Error 保留", async () => {
    const source = fixture(),
      view = mount(source);
    await view.render();
    await view.wait({
      kiosks: [itemId],
      nft: itemId,
      pending: false,
      visible: [capId],
      hidden: [directId],
      hiddenError: true,
    });
    const queries = view.client
      .getQueryCache()
      .getAll()
      .filter(
        (q) => q.queryKey[0] === "wallet-assets" && q.getObserversCount() > 0,
      );
    expect(new Set(queries.map((q) => q.queryKey[4])).size).toBe(1);
    expect(queries.every((q) => q.meta?.skipPersistedCache)).toBe(true);
    expect(
      source.requests
        .filter((r) => r.query.includes("WalletSnapshotRead"))
        .every((r) => r.query.includes("checkpoint(sequenceNumber: 10)")),
    ).toBe(true);
  });
  it("直接拥有 NFT 不需要等待 Kiosk；切换 object 不复用旧持有数据", async () => {
    const view = mount(fixture(), directId);
    await view.render();
    await view.wait({ nft: directId, pending: false });
    await view.render(itemId);
    await view.wait({ nft: itemId, pending: false });
  });
  it("同 S 点查与 Kiosk 子对象引用不一致时拒绝持有证明", async () => {
    const view = mount(fixture({ changedPointRead: true }));
    await view.render();
    await view.wait({ nft: "error", pending: false });
  });
  it("不在受支持 Kiosk 范围的 ObjectOwner 显示未证明状态，不静默导航为空", async () => {
    const view = mount(fixture({ unprovedChild: true }));
    await view.render();
    await view.wait({ nft: "error", pending: false });
  });
  it("无 objectId 的详情 Hook 不造成永久 loading", async () => {
    const view = mount(fixture(), null);
    await view.render();
    await view.wait({ nft: null, pending: false, metaPending: false });
  });
  it("重新准入失败撤下旧 Kiosk 和 NFT，不伪造空 kiosk 或持有对象", async () => {
    const source = fixture(),
      view = mount(source);
    await view.render();
    await view.wait({ nft: itemId });
    source.fail();
    await expect(view.refresh()).rejects.toThrow();
    await view.wait({ nft: "error", kiosks: "error" });
  });
});

describe("原生资产展示与 owner 语义", () => {
  it("ConsensusAddressOwner 与 AddressOwner 均按完整地址判断，ObjectOwner/Shared/Immutable 不冒充账户", () => {
    const base = {
      objectId: directId,
      type: normalizeStructTag("0x2::nft::NFT"),
      version: "1",
      digest: "",
      content: new Uint8Array(),
      objectBcs: undefined,
      json: null,
      display: null,
      previousTransaction: null,
      hasPublicTransfer: true,
    };
    expect(
      directlyOwnedAsset(
        {
          ...base,
          owner: {
            $kind: "ConsensusAddressOwner",
            ConsensusAddressOwner: { owner: address, startVersion: "1" },
          },
        },
        "0xb",
      ),
    ).toBe(true);
    expect(
      directlyOwnedAsset(
        { ...base, owner: { $kind: "AddressOwner", AddressOwner: address } },
        "0xb",
      ),
    ).toBe(true);
    for (const owner of [
      { $kind: "ObjectOwner", ObjectOwner: address },
      { $kind: "Shared", Shared: { initialSharedVersion: "1" } },
      { $kind: "Immutable", Immutable: true },
    ] as const)
      expect(directlyOwnedAsset({ ...base, owner }, "0xb")).toBe(false);
  });
  it("无 Display 的特色资产仍可见，隐藏组优先且不重复；结构 URL 不是媒体", () => {
    const base = {
      objectId: directId,
      type: normalizeStructTag("0xa::nft::NFT"),
      version: "1",
      digest: "",
      content: new Uint8Array(),
      objectBcs: undefined,
      json: null,
      display: null,
      previousTransaction: null,
      hasPublicTransfer: null,
      owner: { $kind: "AddressOwner" as const, AddressOwner: address },
    };
    expect(groupCollectibles([base], [], {}, ["0xa::nft::NFT"]).visual).toEqual(
      [base],
    );
    const result = groupCollectibles([base], ["0xe"], {}, ["0xa::nft::NFT"]);
    expect(result).toEqual({ visual: [], other: [], hidden: [base] });
    expect(assetMediaUrl({ url: { bad: true } })).toBeNull();
    expect(assetMediaUrl({ metadata: { url: "ipfs://abc" } })).toBe(
      "https://ipfs.io/ipfs/abc",
    );
    expect(assetMediaUrl({ metadata: null })).toBeNull();
  });
});

// Existing reader/Provider protocol fixtures do not claim native storage proof.
beforeEach(() => {
  vi.spyOn(WalletNetworkAdmissionStore.prototype, "capture").mockResolvedValue(
    undefined,
  );
});
