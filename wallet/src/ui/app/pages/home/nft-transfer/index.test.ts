import { act, createElement, useEffect } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
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
  exclusive: false,
  listed: false,
  originByte: false,
  registered: true,
  originExclusive: false,
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
vi.mock("_src/ui/app/hooks/useActiveAccount", () => ({
  useActiveAccount: () => ({ id: m.account, address: m.account }),
}));
vi.mock("_app/hooks/useActiveAddress", () => ({
  useActiveAddress: () => m.account,
}));
vi.mock("_src/ui/app/hooks/useUnlockedGuard", () => ({
  useUnlockedGuard: () => m.guard,
}));
vi.mock("_src/ui/app/i18n", () => ({
  useI18n: () => ({ t: (key: string) => key }),
}));
vi.mock("_src/shared/rpc/read-error", () => ({
  walletReadErrorMessage: () => "read-error",
}));
vi.mock("_hooks", () => ({
  useOwnedNFT: () => ({
    data: m.owned ? { type: "Type", hasPublicTransfer: true } : null,
    isPending: m.loading,
    isError: m.error,
    error: new Error("read-error"),
    kioskItem: {
      isLocked: m.locked,
      listing: m.listed || m.exclusive ? { isExclusive: m.exclusive } : undefined,
      ...(m.originByte ? { originByteRegistered: m.registered, originByteExclusive: m.originExclusive } : {}),
    },
  }),
}));
vi.mock("react-router-dom", () => ({
  useParams: () => ({ nftId: m.nft }),
  useNavigate: () => vi.fn(),
  Navigate: () => createElement("span", null, "redirect"),
}));
vi.mock("_components/overlay", () => ({
  default: ({ children }: any) => children,
}));
vi.mock("_components/loading", () => ({
  default: ({ loading, children }: any) =>
    loading ? createElement("span", null, "loading") : children,
}));
vi.mock("_components/alert", () => ({
  default: ({ children }: any) => children,
}));
vi.mock("_components/nft-display", () => ({ NFTDisplayCard: () => null }));
vi.mock("./TransferNFTForm", () => ({
  TransferNFTForm: (props: typeof m.callbacks) => {
    m.callbacks = props;
    useEffect(() => {
      m.mounts++;
      return () => {
        m.unmounts++;
      };
    }, []);
    return createElement("span", null, "form");
  },
}));
import NftTransferPage from "./index";
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
    exclusive: false,
    listed: false,
    originByte: false,
    registered: true,
    originExclusive: false,
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
it.each(["loading", "error", "missing"])(
  "a dispatched form survives the %s asset revalidation until its original outcome",
  async (state) => {
    await render();
    await act(async () => m.callbacks.onDispatchStarted?.());
    if (state === "missing") m.owned = false;
    else if (state === "loading") m.loading = true;
    else m.error = true;
    await render();
    expect(host.textContent).toContain("form");
    expect(m.unmounts).toBe(0);
    expect(m.mounts).toBe(1);
  },
);
it("ownership retraction before dispatch still removes the form", async () => {
  await render();
  m.error = true;
  await render();
  expect(host.textContent).not.toContain("form");
});
it.each(["initializing", "fenced"])("a preparation survives temporary %s without treating hidden query data as negative ownership", async (state) => {
  await render();
  await act(async () => m.callbacks.onPreparationStateChange?.(true));
  m.owned = false;
  m.loading = false;
  if (state === "initializing") m.rpcState = "initializing";
  else m.blocked = ["assets"];
  await render();
  expect(host.textContent).toContain("form");
  expect(m.unmounts).toBe(0);
  m.rpcState = "configured";m.blocked = [];
  await render();
  expect(host.textContent).not.toContain("form");
  expect(m.unmounts).toBe(1);
});
it("a null recovery releases the retained form back to the current ownership gate", async () => {
  await render();
  await act(async () => m.callbacks.onDispatchStarted?.());
  m.owned = false;
  await render();
  await act(async () => m.callbacks.onRecoveryChecked?.(false));
  expect(host.textContent).not.toContain("form");
});
it.each(["binding", "session", "account", "nft"] as const)(
  "a changed %s retires the old handoff rather than retaining its form",
  async (key) => {
    await render();
    await act(async () => m.callbacks.onDispatchStarted?.());
    m[key] = "changed";
    m.owned = false;
    await render();
    expect(host.textContent).not.toContain("form");
    expect(m.unmounts).toBe(1);
  },
);

it.each(["exclusive", "origin-unregistered", "origin-exclusive"])(
  "%s never exposes an initial NFT transfer form",
  async (state) => {
    if (state === "exclusive") m.exclusive = true;
    else { m.originByte = true; if (state === "origin-unregistered") m.registered = false; else m.originExclusive = true; }
    await render();
    expect(host.textContent).not.toContain("form");
    expect(m.mounts).toBe(0);
  },
);
it("ordinary listing keeps the NFT form available", async () => {
  m.listed = true;
  await render();
  expect(host.textContent).toContain("form");
});
it("a newly exclusive listing withdraws an unsubmitted approval and draft", async () => {
  await render();
  await act(async () => m.callbacks.onPreparationStateChange?.(true));
  m.exclusive = true;
  await render();
  expect(host.textContent).not.toContain("form");
  expect(m.unmounts).toBe(1);
});
it("exclusive discovery after dispatch retains only the original outcome form", async () => {
  await render();
  await act(async () => m.callbacks.onDispatchStarted?.());
  m.exclusive = true;
  await render();
  expect(host.textContent).toContain("form");
  await act(async () => m.callbacks.onRecoveryChecked?.(false));
  expect(host.textContent).not.toContain("form");
});
it("locking the original account removes its retained form", async () => {
  await render();
  await act(async () => m.callbacks.onDispatchStarted?.());
  m.guard = true;
  await render();
  expect(host.textContent).not.toContain("form");
});
it("initial missing, pending or locked NFT never grants a form", async () => {
  m.loading = true;
  await render();
  expect(host.textContent).not.toContain("form");
  m.loading = false;
  m.locked = true;
  await render();
  expect(host.textContent).not.toContain("form");
});

it("an admitted draft survives temporary snapshot loading after preparation ends", async () => {
  await render();
  await act(async () => m.callbacks.onPreparationStateChange?.(true));
  m.loading = true;
  await render();
  expect(host.textContent).toContain("form");
  expect(m.mounts).toBe(1);
  expect(m.unmounts).toBe(0);
  await act(async () => m.callbacks.onPreparationStateChange?.(false));
  expect(host.textContent).toContain("form");
  expect(m.unmounts).toBe(0);
  m.loading = false;
  m.owned = false;
  await render();
  expect(host.textContent).not.toContain("form");
  expect(m.unmounts).toBe(1);
});
it.each(["error", "missing", "locked"])(
  "active preparation still retires immediately for %s",
  async (state) => {
    await render();
    await act(async () => m.callbacks.onPreparationStateChange?.(true));
    if (state === "error") m.error = true;
    else if (state === "missing") m.owned = false;
    else m.guard = true;
    await render();
    expect(host.textContent).not.toContain("form");
    expect(m.unmounts).toBe(1);
  },
);
it.each(["binding", "session", "account", "nft"] as const)(
  "active preparation cannot survive changed %s",
  async (key) => {
    await render();
    await act(async () => m.callbacks.onPreparationStateChange?.(true));
    m[key] = "changed";
    m.loading = true;
    await render();
    expect(host.textContent).not.toContain("form");
    expect(m.unmounts).toBe(1);
  },
);
