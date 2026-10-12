import { act, createElement as h } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { DelegationDetailCard } from "./DelegationDetailCard";
const f = vi.hoisted(() => ({
  query: { data: undefined as any, isPending: false, isError: false },
}));
vi.mock("rtd-apps-core/src/rpc/staking-hooks", () => ({
  useStakingView: () => f.query,
}));
vi.mock("rtd-apps-core/src/rpc/coin", () => ({
  useCoinMetadata: () => ({ data: { decimals: 9 } }),
}));
vi.mock("_src/ui/app/hooks/useGetAllBalances", () => ({
  useGetAllBalances: () => ({ data: [], isError: false }),
}));
vi.mock("../../hooks/useActiveAddress", () => ({
  useActiveAddress: () => "owner",
}));
vi.mock("_hooks", () => ({ useAppSelector: () => "mainnet" }));
vi.mock("_src/shared/analytics/ampli", () => ({
  ampli: { clickedStakeRtd: vi.fn(), clickedUnstakeRtd: vi.fn() },
}));
vi.mock("_src/ui/app/i18n", () => ({
  useI18n: () => ({ t: (key: string) => key }),
}));
vi.mock("_app/shared/tooltip", () => ({ IconTooltip: () => null }));
vi.mock("_src/ui/app/shared/faucet/FaucetRequestButton", () => ({
  default: () => null,
}));
vi.mock("_components/loading/LoadingIndicator", () => ({
  default: () => null,
}));
vi.mock("rtd-apps-icons", () => ({
  ArrowLeft16: () => null,
  StakeAdd16: () => null,
  StakeRemove16: () => null,
}));
vi.mock("_app/shared/bottom-menu-layout", async () => {
  const { createElement } = await import("react");
  const Box = ({ children }: any) => createElement("div", {}, children);
  return { default: Box, Content: Box };
});
vi.mock("_app/shared/text", async () => {
  const { createElement } = await import("react");
  return { Text: ({ children }: any) => createElement("span", {}, children) };
});
vi.mock("../../shared/heading", async () => {
  const { createElement } = await import("react");
  return {
    Heading: ({ children }: any) => createElement("span", {}, children),
  };
});
vi.mock("_components/alert", async () => {
  const { createElement } = await import("react");
  return {
    default: ({ children }: any) =>
      createElement("div", { role: "alert" }, children),
  };
});
vi.mock("_app/shared/card", async () => {
  const { createElement } = await import("react");
  return {
    Card: ({ children, header }: any) =>
      createElement("div", {}, header, children),
  };
});
vi.mock("_app/shared/card/CardItem", async () => {
  const { createElement } = await import("react");
  return {
    CardItem: ({ children, title }: any) =>
      createElement("div", {}, title, children),
  };
});
vi.mock("../home/StakeAmount", async () => {
  const { createElement } = await import("react");
  return {
    StakeAmount: ({ balance }: any) =>
      createElement(
        "span",
        { "data-amount": true },
        balance?.toString() ?? "--",
      ),
  };
});
vi.mock("_app/shared/ButtonUI", async () => {
  const { createElement } = await import("react");
  return {
    Button: ({ text, to }: any) => createElement("a", { href: to }, text),
  };
});
Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
let host: HTMLDivElement, root: ReturnType<typeof createRoot>;
beforeEach(() => {
  f.query = {
    isPending: false,
    isError: false,
    data: {
      safeMode: false,
      validators: [
        {
          poolId: "pool",
          address: "validator",
          commissionBps: "100",
          apy: { state: "estimated", fraction: 3.5770019835013045e-8 },
        },
      ],
      positions: [
        {
          objectId: "stake",
          poolId: "pool",
          validatorAddress: "validator",
          principal: "9007199254740993",
          poolState: "active",
          reward: { state: "estimated", amount: "1" },
        },
      ],
    },
  };
  host = document.createElement("div");
  document.body.append(host);
  root = createRoot(host);
});
afterEach(async () => {
  await act(async () => root.unmount());
  host.remove();
});
async function render(validatorAddress = "validator") {
  await act(async () =>
    root.render(
      h(DelegationDetailCard, { validatorAddress, stakedId: "stake" }),
    ),
  );
}
it("retains exact principal and marks a tiny valid APY without a duplicated percent", async () => {
  await render();
  expect(host.textContent).toContain("~0%");
  expect(host.textContent).not.toContain("~0%%");
  expect(host.querySelector("[data-amount]")?.textContent).toBe(
    "9007199254740993",
  );
});
it("shows safe mode even with an estimated reward", async () => {
  f.query.data.safeMode = true;
  await render();
  expect(host.textContent).toContain("staking.safeMode");
  expect(host.querySelectorAll("[data-amount]")[1].textContent).toBe("1");
});
it("unknown APY stays unknown; failed snapshots and foreign validators hide actions", async () => {
  f.query.data.validators[0].apy = { state: "unknown" };
  await render();
  expect(host.textContent).not.toContain("~0%");
  expect(host.textContent).toContain("--");
  f.query.isError = true;
  await render();
  expect(host.querySelector("a")).toBeNull();
  expect(host.querySelector("[data-amount]")).toBeNull();
  f.query.isError = false;
  await render("other");
  expect(host.querySelector("a")).toBeNull();
});
