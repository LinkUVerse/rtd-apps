// Copyright (c) LinkU Labs, Inc.
// SPDX-License-Identifier: Apache-2.0
import { act, createElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { beforeEach, afterEach, expect, it, vi } from "vitest";
const m = vi.hoisted(() => ({ locked: false, listed: false, exclusive: false,
  originByte: false, registered: true, originExclusive: false, publicTransfer: true }));
vi.mock("_hooks", () => ({
  useOwnedNFT: () => ({ data: { hasPublicTransfer: m.publicTransfer, type: "NFT" },
    isPending: false, isError: false, kioskItem: { isLocked: m.locked,
      listing: m.listed || m.exclusive ? { isExclusive: m.exclusive } : undefined,
      ...(m.originByte ? { originByteRegistered: m.registered, originByteExclusive: m.originExclusive } : {}) } }),
  useNFTBasicData: () => ({ nftFields: null, fileExtensionType: {}, filePath: null }),
  useGetNFTMeta: () => ({ data: null, isPending: false }),
}));
vi.mock("_app/hooks/useActiveAddress", () => ({ useActiveAddress: () => "0x1" }));
vi.mock("_src/ui/app/hooks/useUnlockedGuard", () => ({ useUnlockedGuard: () => false }));
vi.mock("_src/ui/app/i18n", () => ({ useI18n: () => ({ t: (key: string) => key }) }));
vi.mock("_src/ui/app/components/buynlarge/useBuyNLargeAssets", () => ({ useBuyNLargeAssets: () => [] }));
vi.mock("_src/ui/app/hooks/useExplorerLink", () => ({ useExplorerLink: () => null }));
vi.mock("react-router-dom", () => ({ useSearchParams: () => [new URLSearchParams("objectId=0x2")],
  useNavigate: () => vi.fn(), Navigate: () => null }));
vi.mock("_app/shared/ButtonUI", () => ({ Button: ({ disabled, text, to, title }: any) =>
  createElement("button", { disabled, "data-to": to, title }, text) }));
vi.mock("_app/shared/Link", () => ({ Link: () => null }));
vi.mock("_app/shared/collapse", () => ({ Collapsible: ({ children }: any) => children }));
vi.mock("_components/LabelValueItem", () => ({ LabelValueItem: () => null }));
vi.mock("_components/LabelValuesContainer", () => ({ LabelValuesContainer: ({ children }: any) => children }));
vi.mock("_components/loading", () => ({ default: ({ children }: any) => children }));
vi.mock("_components/alert", () => ({ default: ({ children }: any) => children }));
vi.mock("_components/nft-display", () => ({ NFTDisplayCard: () => null }));
vi.mock("_src/ui/app/shared/PageTitle", () => ({ default: () => null }));
vi.mock("_src/ui/app/shared/text", () => ({ Text: ({ children }: any) => children }));
vi.mock("rtd-apps-icons", () => ({ ArrowRight16: () => null, ArrowUpRight12: () => null }));
import NFTDetailsPage from "./index";
Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
let root: Root, host: HTMLDivElement;
beforeEach(() => {
  Object.assign(m, { locked: false, listed: false, exclusive: false,
    originByte: false, registered: true, originExclusive: false, publicTransfer: true });
  host = document.createElement("div"); root = createRoot(host);
});
afterEach(async () => { await act(async () => root.unmount()); });
async function render() { await act(async () => root.render(createElement(NFTDetailsPage))); }
const send = () => host.querySelector<HTMLButtonElement>('button[data-to="/nft-transfer/0x2"]');
it.each(["exclusive", "origin-unregistered", "origin-exclusive", "no-public-transfer"])(
  "%s disables sending in the actual details page",
  async (state) => {
    if (state === "exclusive") m.exclusive = true;
    else if (state === "no-public-transfer") m.publicTransfer = false;
    else { m.originByte = true; if (state === "origin-unregistered") m.registered = false; else m.originExclusive = true; }
    await render(); expect(send()).not.toBeNull(); expect(send()!.disabled).toBe(true);
  },
);
it.each(["ordinary", "ordinary-listing", "origin-registered"])(
  "%s retains the actual send action", async (state) => {
    m.listed = state === "ordinary-listing"; m.originByte = state === "origin-registered";
    await render(); expect(send()).not.toBeNull(); expect(send()!.disabled).toBe(false);
  },
);
it("locked item exposes no send action", async () => {
  m.locked = true; await render(); expect(send()).toBeNull();
});
