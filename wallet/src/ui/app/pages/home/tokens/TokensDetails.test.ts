import { act, createElement as h, type ReactNode } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import TokenDetails from "./TokensDetails";

const state = vi.hoisted(() => ({
  locked: true,
  pending: true,
  blocked: false,
  checking: false,
  fetching: false,
  error: false,
  data: undefined as any,
  defi: false,
  stakingReads: vi.fn(),
}));
vi.mock("_src/ui/app/hooks/useActiveAccount", () => ({
  useActiveAccount: () => ({
    address: "0x" + "1".repeat(64),
    isLocked: state.locked,
    nickname: "Test",
  }),
}));
vi.mock("_app/hooks/useGetAllBalances", () => ({
  useGetAllBalances: () => ({
    data: state.data,
    isPending: state.pending,
    isFetched: !state.pending,
    isError: state.error,
    error: new Error("unavailable"),
    readBlocked: state.blocked,
    readChecking: state.checking,
    isFetching: state.fetching,
    refetch: vi.fn(),
  }),
}));
vi.mock("_app/hooks/useAppResolveRtdnsName", () => ({
  useResolveRtdNSName: () => null,
}));
vi.mock("_app/hooks/useIsWalletDefiEnabled", () => ({
  useIsWalletDefiEnabled: () => state.defi,
}));
vi.mock("_app/i18n", () => ({ useI18n: () => ({ t: (key: string) => key }) }));
vi.mock("_hooks", () => ({
  useAppSelector: (fn: any) => fn({ app: { apiEnv: "local" } }),
  useSortedCoinsByCategories: () => ({
    recognized: [],
    pinned: [],
    unrecognized: [],
  }),
}));
vi.mock("_helpers", () => ({ filterAndSortTokenBalances: (v: any) => v }));
vi.mock("_src/ui/app/hooks/usePinnedCoinTypes", () => ({
  usePinnedCoinTypes: () => [[], {}],
}));
vi.mock("_src/ui/app/hooks/useCoinMetadataOverride", () => ({
  useCoinMetadataOverrides: () => ({}),
}));
vi.mock("rtd-apps-core/src/hooks/useAppsBackend", () => ({
  useAppsBackend: () => ({ request: vi.fn() }),
}));
vi.mock("rtd-apps-core/src/rpc/staking-hooks", () => ({
  useStakingView: (...args: any[]) => {
    state.stakingReads(...args);
    return {};
  },
}));
vi.mock("rtd-apps-core/src/rpc/coin", () => ({
  useFormatCoin: () => ["0", "RTD"],
  useCoinMetadata: () => ({ data: { symbol: "RTD" } }),
}));
vi.mock("rtd-apps-core/src/rpc/price", () => ({ useBalanceInUSD: () => null }));
vi.mock("@growthbook/growthbook-react", () => ({
  useFeature: () => ({ value: null }),
}));
vi.mock("../onramp/useOnrampProviders", () => ({
  useOnrampProviders: () => ({ providers: [] }),
}));
vi.mock("_src/shared/analytics/ampli", () => ({ ampli: {} }));
vi.mock("_src/shared/experimentation/features", () => ({ FEATURES: {} }));
vi.mock("_src/ui/app/components/accounts/AccountsList", () => ({
  AccountsList: () => h("div", null, "accounts"),
}));
vi.mock("_src/ui/app/components/accounts/UnlockAccountButton", () => ({
  UnlockAccountButton: () => h("button", null, "unlock"),
}));
vi.mock("./PortfolioName", () => ({ PortfolioName: () => null }));
vi.mock("./coin-balance", () => ({
  CoinBalance: ({ amount }: { amount: bigint }) =>
    h("div", { "data-testid": "amount" }, amount.toString()),
}));
vi.mock("_components/loading", () => ({
  default: ({
    loading,
    children,
  }: {
    loading: boolean;
    children: ReactNode;
  }) => (loading ? h("div", { role: "status" }, "loading") : children),
}));
vi.mock("_components/alert", () => ({
  default: ({ children }: { children: ReactNode }) =>
    h("div", { role: "alert" }, children),
}));
vi.mock("_src/ui/app/components/buynlarge/HomePanel", () => ({
  BuyNLargeHomePanel: () => null,
}));
vi.mock("_pages/home/usdc-promo/UsdcPromoBanner", () => ({
  UsdcPromoBanner: () => null,
}));
vi.mock("_src/ui/app/shared/faucet/FaucetRequestButton", () => ({
  default: () => null,
}));
vi.mock("./TokenIconLink", () => ({ TokenIconLink: () => null }));
vi.mock("./TokenLink", () => ({ TokenLink: () => null }));
vi.mock("./TokenList", () => ({ TokenList: () => null }));
vi.mock("../interstitial", () => ({ default: () => null }));
vi.mock("_app/shared/LargeButton", () => ({
  LargeButton: ({ children, disabled, to, ...props }: any) =>
    h(
      "button",
      { disabled, "data-to": to, "data-testid": props["data-testid"] },
      children,
    ),
}));
vi.mock("_app/shared/utils/ButtonOrLink", () => ({ ButtonOrLink: () => null }));
vi.mock("_components/coin-icon", () => ({ CoinIcon: () => null }));
vi.mock("_src/ui/app/shared/PageTitle", () => ({ default: () => null }));
Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
let node: HTMLDivElement,
  root: ReturnType<typeof createRoot>,
  client: QueryClient;
beforeEach(() => {
  Object.assign(state, {
    locked: true,
    pending: true,
    blocked: false,
    checking: false,
    fetching: false,
    error: false,
    data: undefined,
    defi: false,
  });
  state.stakingReads.mockClear();
  node = document.createElement("div");
  root = createRoot(node);
  client = new QueryClient();
});
afterEach(async () => {
  await act(async () => root.unmount());
  client.clear();
});
const render = () =>
  act(async () =>
    root.render(h(QueryClientProvider, { client }, h(TokenDetails))),
  );
it("zero balance keeps staking management accessible without a full staking RPC scan and explains restrictions", async () => {
  Object.assign(state, { locked: false, pending: false, data: [] });
  await render();
  expect(state.stakingReads).not.toHaveBeenCalled();
  expect(
    node.querySelector<HTMLButtonElement>('[data-testid="send-coin-button"]')
      ?.disabled,
  ).toBe(true);
  const stake = node.querySelector<HTMLButtonElement>(
    '[data-testid="stake-management-button"]',
  );
  expect(stake?.disabled).toBe(false);
  expect(stake?.getAttribute("data-to")).toBe("/stake");
  expect(node.textContent).toContain("tokens.sendNeedsBalance");
  expect(node.textContent).toContain("tokens.swapUnavailable");
});
it("funded coin can send while network-disabled swap remains explained", async () => {
  Object.assign(state, {
    locked: false,
    pending: false,
    data: [
      {
        coinType: "0x" + "0".repeat(63) + "2::rtd::RTD",
        balance: "100",
        coinBalance: "100",
        addressBalance: "0",
      },
    ],
  });
  await render();
  expect(
    node.querySelector<HTMLButtonElement>('[data-testid="send-coin-button"]')
      ?.disabled,
  ).toBe(false);
  expect(node.textContent).not.toContain("tokens.sendNeedsBalance");
  expect(node.textContent).toContain("tokens.swapUnavailable");
  expect(state.stakingReads).not.toHaveBeenCalled();
});
it.each(["pending", "blocked", "error", "success"])(
  "locked account remains unlockable during %s balance state",
  async (mode) => {
    state.pending = mode === "pending";
    state.blocked = mode === "blocked";
    state.error = mode === "error";
    state.data = mode === "success" ? [] : undefined;
    await render();
    expect(node.textContent).toContain("unlock");
    expect(node.querySelector('[role="status"]')).toBeNull();
    expect(node.querySelector('[data-testid="amount"]')).toBeNull();
  },
);
it("unlock transitions to loading, then shows zero only after an admitted empty result", async () => {
  await render();
  state.locked = false;
  await render();
  expect(node.textContent).toContain("loading");
  expect(node.querySelector('[data-testid="amount"]')).toBeNull();
  state.pending = false;
  state.data = [];
  await render();
  expect(node.querySelector('[data-testid="amount"]')?.textContent).toBe("0");
  expect(node.textContent).not.toContain("loading");
});
it.each(["blocked", "error"])(
  "unlocked %s state never fabricates a zero balance",
  async (mode) => {
    state.locked = false;
    state.blocked = mode === "blocked";
    state.error = mode === "error";
    await render();
    expect(node.querySelector('[role="alert"]')).not.toBeNull();
    expect(node.querySelector('[data-testid="amount"]')).toBeNull();
    expect(node.textContent).not.toContain("loading");
  },
);

it("network verification in progress is a status, not a rejection or zero balance", async () => {
  state.locked = false;
  state.blocked = true;
  state.checking = true;
  await render();
  expect(node.querySelector('[role="status"]')?.textContent).toBe(
    "tokens.balanceChecking",
  );
  expect(node.querySelector('[role="alert"]')).toBeNull();
  expect(node.querySelector('[data-testid="amount"]')).toBeNull();
});
it("background refresh keeps the admitted balance visible and labels it as the previous verified result", async () => {
  state.locked = false;
  state.pending = false;
  state.fetching = true;
  state.data = [];
  await render();
  expect(node.querySelector('[data-testid="amount"]')?.textContent).toBe("0");
  expect(node.querySelector('[role="status"]')?.textContent).toBe(
    "tokens.balanceRefreshing",
  );
  state.error = true;
  await render();
  expect(node.querySelector('[data-testid="amount"]')).toBeNull();
  expect(node.textContent).toContain("tokens.balanceRetry");
});
