// Copyright (c) LinkU Labs, Inc.
// SPDX-License-Identifier: Apache-2.0
import { act, createElement as h, type ReactNode } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import type { WalletAssetObject } from "rtd-apps-core/src/rpc/WalletRpcContext";
import { NFTDisplayCard, NFTDisplayCardFromObject } from "./index";
import VisualAssets from "../../pages/home/nfts/VisualAssets";
import KioskDetailsPage from "../../pages/home/kiosk-details";
import HiddenNftsPage from "../../pages/home/hidden-assets";

const state = vi.hoisted(() => ({
  point: vi.fn(),
  objects: [] as WalletAssetObject[],
  error: false,
}));
vi.mock("_app/i18n", () => ({ useI18n: () => ({ t: (key: string) => key }) }));
vi.mock("_hooks", () => ({
  useFileExtensionType: () => ({ name: "PNG", type: "image" }),
  useActiveAddress: () => "0xb",
}));
vi.mock("rtd-apps-core/src/rpc/asset-hooks", () => ({
  useGetObject: (...args: unknown[]) => state.point(...args),
  useMultiGetObjects: () => ({
    data: state.objects,
    isError: state.error,
    isPending: false,
    isLoading: false,
    error: new Error("unavailable"),
  }),
}));
vi.mock("rtd-apps-core/src/rpc/kiosk-hooks", () => ({
  useGetKioskContents: () => ({
    data: {
      kiosks: new Map([["0xc", { kioskId: "0xc", items: state.objects }]]),
    },
    isError: state.error,
    isPending: false,
    error: new Error("unavailable"),
  }),
}));
vi.mock("rtd-apps-core/src/rpc/WalletRpcContext", () => ({
  useWalletRpc: () => ({ packages: {} }),
}));
vi.mock("../../hooks/useResolveVideo", () => ({ useResolveVideo: () => null }));
vi.mock("../../hooks/useUnlockedGuard", () => ({
  useUnlockedGuard: () => false,
}));
vi.mock("../../hooks/useActiveAddress", () => ({
  useActiveAddress: () => "0xb",
}));
vi.mock("../../hooks/useBlockedObjectList", () => ({
  useBlockedObjectList: () => ({ data: [] }),
}));
vi.mock("../../pages/home/hidden-assets/HiddenAssetsProvider", () => ({
  useHiddenAssets: () => ({
    hiddenAssetIds: ["0xa"],
    showAsset: vi.fn(),
    hideAsset: vi.fn(),
  }),
}));
vi.mock("../buynlarge/useBuyNLargeAssets", () => ({
  useBuyNLargeAssets: () => [],
}));
vi.mock("../../../../shared/analytics/ampli", () => ({ ampli: {} }));
vi.mock("react-router-dom", () => ({
  Link: ({ children, to }: { children: ReactNode; to: string }) =>
    h("a", { href: to }, children),
  useSearchParams: () => [new URLSearchParams({ kioskId: "0xc" })],
}));
vi.mock("_components/loading", () => ({
  default: ({
    children,
    loading,
  }: {
    children: ReactNode;
    loading?: boolean;
  }) => (loading ? null : children),
}));
vi.mock("_components/loading/LoadingIndicator", () => ({
  default: () => null,
}));
vi.mock("../error-boundary", () => ({
  ErrorBoundary: ({ children }: { children: ReactNode }) => children,
}));
vi.mock("../alert", () => ({
  default: ({ children }: { children: ReactNode }) =>
    h("div", { role: "alert" }, children),
}));
vi.mock("../explorer-link", () => ({
  default: ({ children }: { children: ReactNode }) => children,
}));
vi.mock("../LabelValueItem", () => ({ LabelValueItem: () => null }));
vi.mock("../LabelValuesContainer", () => ({
  LabelValuesContainer: ({ children }: { children: ReactNode }) => children,
}));
vi.mock("../../shared/collapse", () => ({
  Collapsible: ({ children }: { children: ReactNode }) => children,
}));
vi.mock("../../shared/PageTitle", () => ({ default: () => null }));
vi.mock("../../shared/ButtonUI", () => ({ Button: () => null }));
vi.mock("../../shared/text", () => ({
  Text: ({ children }: { children: ReactNode }) => h("span", null, children),
}));
vi.mock("_app/shared/heading", () => ({
  Heading: ({ children }: { children: ReactNode }) => h("h2", null, children),
}));
vi.mock("./NftImage", () => ({
  NftImage: ({
    name,
    src,
    isLocked,
  }: {
    name: string;
    src: string;
    isLocked?: boolean;
  }) =>
    h("img", {
      alt: name,
      src: src || undefined,
      "data-locked": String(!!isLocked),
    }),
}));

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
let host: HTMLDivElement, root: ReturnType<typeof createRoot>;
function asset(name = "admitted NFT", id = "0xa"): WalletAssetObject {
  return {
    objectId: id,
    type: "0x88::fixture::NFT",
    version: "1",
    digest: "digest",
    owner: { $kind: "AddressOwner", AddressOwner: "0xb" },
    content: new Uint8Array(),
    objectBcs: undefined,
    previousTransaction: "fixture-transaction",
    json: {},
    display: {
      output: { name, image_url: `https://media.invalid/${name}.png` },
      errors: null,
      basis: {
        kind: "V2",
        snapshotCheckpoint: "10",
        objectType: "0x88::fixture::NFT",
        templateId: "0xc",
        sourceCheckpoint: "1",
        objectVersion: "1",
        objectDigest: "fixture-object-digest",
        previousTransactionDigest: "fixture-transaction",
        contentsBcsSha256: "a".repeat(64),
        historyCoverage: {
          genesisDigest: "fixture-genesis",
          sourceId: "component-fixture",
          generation: "component-fixture",
          firstCheckpoint: "0",
          lastCheckpoint: "10",
          lastCheckpointDigest: "fixture-checkpoint",
          snapshotCheckpoint: "10",
          snapshotCheckpointDigest: "fixture-checkpoint",
        },
      },
    },
    hasPublicTransfer: true,
  };
}
async function render(node: ReactNode) {
  await act(async () => root.render(node));
}
beforeEach(() => {
  state.objects = [asset(), asset("second NFT", "0xd")];
  state.error = false;
  state.point.mockReset().mockImplementation(() => {
    throw new Error("Duplicate point query for an admitted object");
  });
  host = document.createElement("div");
  document.body.append(host);
  root = createRoot(host);
});
afterEach(async () => {
  await act(async () => root.unmount());
  host.remove();
});

it.each(["visual", "hidden", "kiosk"])(
  "%s list renders admitted cards without point queries",
  async (kind) => {
    await render(
      kind === "visual"
        ? h(VisualAssets, { items: state.objects })
        : kind === "hidden"
          ? h(HiddenNftsPage)
          : h(KioskDetailsPage),
    );
    expect(host.querySelectorAll("img")).toHaveLength(2);
    expect(host.querySelector("img")?.getAttribute("alt")).toBe("admitted NFT");
    expect(state.point).not.toHaveBeenCalled();
  },
);
it.each(["hidden", "kiosk"])(
  "%s parent error hides retained data instead of reviving a card query",
  async (kind) => {
    const page = kind === "hidden" ? HiddenNftsPage : KioskDetailsPage;
    await render(h(page));
    expect(host.querySelectorAll("img")).toHaveLength(2);
    state.error = true;
    await render(h(page));
    expect(host.querySelectorAll("img")).toHaveLength(0);
    expect(host.querySelector('[role="alert"]')).not.toBeNull();
    expect(state.point).not.toHaveBeenCalled();
  },
);
it("object replacement and withdrawal cannot retain old labels or media", async () => {
  await render(h(NFTDisplayCardFromObject, { object: asset(), size: "sm" }));
  await render(
    h(NFTDisplayCardFromObject, {
      object: asset("next NFT", "0xd"),
      size: "sm",
    }),
  );
  expect(host.innerHTML).not.toContain("admitted NFT");
  expect(host.innerHTML).toContain("next NFT");
  await render(null);
  expect(host.innerHTML).toBe("");
  expect(state.point).not.toHaveBeenCalled();
});
it("Display field errors and structured values remain unavailable", async () => {
  const object = asset();
  object.display!.output = {
    name: { text: "untrusted" },
    image_url: "https://bad.invalid/image",
  };
  object.display!.errors = { image_url: "invalid" };
  await render(h(NFTDisplayCardFromObject, { object, size: "sm" }));
  expect(host.innerHTML).not.toContain("untrusted");
  expect(host.innerHTML).not.toContain("bad.invalid");
  expect(state.point).not.toHaveBeenCalled();
});
it("ID-only callers still read once and use the admitted object", async () => {
  state.point.mockReturnValue({
    data: asset(),
    isError: false,
    error: null,
    isPending: false,
  });
  await render(h(NFTDisplayCard, { objectId: "0xa", size: "sm" }));
  expect(state.point).toHaveBeenCalledTimes(1);
  expect(state.point).toHaveBeenCalledWith("0xa");
  expect(host.querySelector("img")?.getAttribute("alt")).toBe("admitted NFT");
});
