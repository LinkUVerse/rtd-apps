import { act, createElement, useEffect } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
vi.mock("webextension-polyfill", () => ({ default: { runtime: { getManifest: () => ({ version: "0.0.0-test" }), getURL: (path: string) => `chrome-extension://test/${path}` } } }));
const m = vi.hoisted(() => ({
  binding: "chain-a",
  session: "session-a",
  account: "account-a",
  nft: "nft-a",
  guard: false,
  rpcState: "configured",
  blocked: [] as string[],
  loading: false,
  error: false,
  owned: true,
  locked: false,
  mounts: 0,
  unmounts: 0,
  callbacks: {} as {
    onPreparationStateChange?: (active: boolean) => void;
    onDispatchStarted?: () => void;
    onRecoveryChecked?: (active: boolean) => void;
  },
}));
vi.mock("rtd-apps-core/src/rpc/WalletRpcContext", () => ({
  useWalletRpc: () => ({ bindingKey: m.binding, readSessionKey: m.session,
    state: m.rpcState, readAdmission: { blocked: m.blocked } }),
}));
vi.mock("../src/ui/app/hooks/useActiveAccount", () => ({
  useActiveAccount: () => ({ id: m.account, address: m.account }),
}));
vi.mock("../src/ui/app/hooks/useActiveAddress", () => ({
  useActiveAddress: () => m.account,
}));
vi.mock("../src/ui/app/hooks/useUnlockedGuard", () => ({
  useUnlockedGuard: () => m.guard,
}));
vi.mock("../src/ui/app/i18n", () => ({
  useI18n: () => ({ t: (key: string) => key }),
}));
vi.mock("../src/shared/rpc/read-error", () => ({
  walletReadErrorMessage: () => "read-error",
}));
vi.mock("../src/ui/app/hooks", () => ({
  useOwnedNFT: () => ({
    data: m.owned ? { type: "Type", hasPublicTransfer: true } : null,
    isPending: m.loading,
    isError: m.error,
    error: new Error("read-error"),
    kioskItem: { isLocked: m.locked },
  }),
}));
vi.mock("react-router-dom", () => ({
  useParams: () => ({ nftId: m.nft }),
  useNavigate: () => vi.fn(),
  Navigate: () => createElement("span", null, "redirect"),
}));
vi.mock("../src/ui/app/components/overlay", () => ({
  default: ({ children }: any) => children,
}));
vi.mock("../src/ui/app/components/loading", () => ({
  default: ({ loading, children }: any) =>
    loading ? createElement("span", null, "loading") : children,
}));
vi.mock("../src/ui/app/components/alert", () => ({
  default: ({ children }: any) => children,
}));
vi.mock("../src/ui/app/components/nft-display", () => ({ NFTDisplayCard: () => null }));
vi.mock("../src/ui/app/pages/home/nft-transfer/TransferNFTForm", () => ({
  TransferNFTForm: (props: typeof m.callbacks) => {
    m.callbacks = props;
    useEffect(() => {
      m.mounts++;
      return () => {
        m.unmounts++;
      };
    }, []);
    return createElement("div", null, createElement("input", { name: "draft", defaultValue: "" }), createElement("button", { disabled: (props as any).ownershipReady === false }, "prepare"));
  },
}));
import NftTransferPage from "../src/ui/app/pages/home/nft-transfer/index";
Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
let root: Root, host: HTMLDivElement;
async function render() {
  await act(async () => root.render(createElement(NftTransferPage)));
}
beforeEach(() => {
  Object.assign(m, {
    binding: "chain-a",
    session: "session-a",
    account: "account-a",
    nft: "nft-a",
    guard: false,
    rpcState: "configured",
    blocked: [],
    loading: false,
    error: false,
    owned: true,
    locked: false,
    mounts: 0,
    unmounts: 0,
    callbacks: {},
  });
  host = document.createElement("div");
  root = createRoot(host);
});
afterEach(async () => {
  await act(async () => root.unmount());
});

it.each(["loading", "fenced", "initializing"])("typed NFT recipient survives temporary %s while preparation remains disabled", async state => {
  await render();
  const input = host.querySelector('input')!;
  input.value = '0xa0ccc8bcc83f6c628340134f8546a21e0618fd1aaa02432bba454c4a2c2233da';
  expect(host.querySelector('button')!.disabled).toBe(false);
  if (state === 'loading') m.loading = true;
  if (state === 'fenced') m.blocked = ['assets'];
  if (state === 'initializing') m.rpcState = 'initializing';
  await render();
  expect(host.querySelector('input')).toBe(input);
  expect(input.value).toContain('0xa0ccc8');
  expect(host.querySelector('button')!.disabled).toBe(true);
  m.loading = false; m.blocked = []; m.rpcState = 'configured';
  await render();
  expect(host.querySelector('input')).toBe(input);
  expect(input.value).toContain('0xa0ccc8');
  expect(host.querySelector('button')!.disabled).toBe(false);
  expect(m.mounts).toBe(1); expect(m.unmounts).toBe(0);
});
it.each(['error', 'missing', 'lock', 'session', 'account'])("the draft is retired for definite %s", async state => {
  await render();
  const input = host.querySelector('input')!; input.value = '0xa0ccc8';
  if (state === 'error') m.error = true;
  if (state === 'missing') m.owned = false;
  if (state === 'lock') m.guard = true;
  if (state === 'session') { m.session = 'new'; m.loading = true; }
  if (state === 'account') { m.account = 'new'; m.loading = true; }
  await render();
  expect(host.querySelector('input')).not.toBe(input);
  expect(m.unmounts).toBe(1);
});
