// Copyright (c) LinkU Labs, Inc.
// SPDX-License-Identifier: Apache-2.0
import { act, createElement as h } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { SelectValidatorCard } from "./SelectValidatorCard";
const f = vi.hoisted(() => ({
  query: { data: undefined as any, isPending: false, isError: false } as any,
  rpc: { readSessionKey: "session", assetSnapshotKey: "snapshot" },
  selected: vi.fn(),
  queryOptions: vi.fn(),
}));
vi.mock("rtd-apps-core/src/rpc/staking-hooks", () => ({
  useStakingView: (_owner: unknown, options: unknown) => {
    f.queryOptions(options);
    return f.query;
  },
}));
vi.mock("rtd-apps-core/src/rpc/WalletRpcContext", () => ({
  useWalletRpc: () => f.rpc,
}));
vi.mock("_src/shared/analytics/ampli", () => ({
  ampli: { selectedValidator: f.selected },
}));
vi.mock("_src/ui/app/i18n", () => ({
  useI18n: () => ({ t: (key: string) => key }),
}));
vi.mock("./ValidatorListItem", async () => {
  const { createElement } = await import("react");
  return {
    ValidatorListItem: ({ validatorAddress, value }: any) =>
      createElement("span", {}, `${validatorAddress}:${value}`),
  };
});
vi.mock("_app/shared/bottom-menu-layout", async () => {
  const { createElement } = await import("react");
  const Box = ({ children }: any) => createElement("div", {}, children);
  return { Content: Box, Menu: Box };
});
vi.mock("_app/shared/text", async () => {
  const { createElement } = await import("react");
  return { Text: ({ children }: any) => createElement("span", {}, children) };
});
vi.mock("_components/alert", async () => {
  const { createElement } = await import("react");
  return {
    default: ({ children }: any) =>
      createElement("div", { role: "alert" }, children),
  };
});
vi.mock("_components/loading/LoadingIndicator", () => ({
  default: () => null,
}));
vi.mock("rtd-apps-icons", () => ({ ArrowRight16: () => null }));
vi.mock("_app/shared/ButtonUI", async () => {
  const { createElement } = await import("react");
  return {
    Button: ({ text, to, onClick }: any) =>
      createElement("a", { href: to, onClick, "data-cta": true }, text),
  };
});
Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
let host: HTMLDivElement, root: ReturnType<typeof createRoot>;
const render = async () => {
  await act(async () => root.render(h(SelectValidatorCard)));
};
beforeEach(() => {
  vi.clearAllMocks();
  f.rpc = { readSessionKey: "session", assetSnapshotKey: "snapshot" };
  f.query = {
    isPending: false,
    isError: false,
    data: {
      validators: [
        {
          active: true,
          address: "unknown",
          name: "Unknown",
          stakeBalance: "9007199254740993",
          apy: { state: "unknown", reason: "no-valid-samples" },
        },
        {
          active: true,
          address: "known",
          name: "Known",
          stakeBalance: "9007199254740993",
          apy: { state: "estimated", fraction: 0.037, sampleCount: 30 },
        },
        {
          active: false,
          address: "retired",
          name: "Retired",
          stakeBalance: "1",
          apy: { state: "unknown", reason: "inactive-pool" },
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
async function sortApy() {
  const button = Array.from(host.querySelectorAll("button")).find(
    (b) => b.textContent === "staking.apy",
  )!;
  await act(async () => button.click());
}
describe("modern validator selection", () => {
  it("NFT snapshot rotation preserves selection in the independently pinned staking domain", async () => {
    f.query.snapshot = { cacheKey: "staking-proof" };
    await render();
    await act(async () =>
      (
        host.querySelector('[data-testid="validator-list-item"]') as HTMLElement
      ).click(),
    );
    expect(host.querySelector("[data-cta]")).not.toBeNull();
    f.rpc = { ...f.rpc, assetSnapshotKey: "display-failed-again" };
    await render();
    expect(host.querySelector("[data-cta]")).not.toBeNull();
  });
  it("a refreshed staking proof preserves a still-active address and uses its latest data", async () => {
    f.query.snapshot = { cacheKey: "staking-proof" };
    await render();
    await act(async () =>
      (
        host.querySelector('[data-testid="validator-list-item"]') as HTMLElement
      ).click(),
    );
    expect(host.querySelector("[data-cta]")).not.toBeNull();
    const selected = host.querySelector("[data-cta]")!.getAttribute("href");
    f.query.snapshot = { cacheKey: "next-staking-proof" };
    f.query.data = {
      ...f.query.data,
      validators: f.query.data.validators.map((v: any) => ({
        ...v,
        name: `Updated ${v.name}`,
      })),
    };
    await render();
    expect(host.querySelector("[data-cta]")!.getAttribute("href")).toBe(
      selected,
    );
  });
  it("inherits the parent staking proof and preserves an active choice through background refresh", async () => {
    const view = f.query.data;
    const inherit = async (snapshotKey: string) => {
      await act(async () =>
        root.render(
          h<{
            view?: import("rtd-apps-core/src/rpc/staking-types").WalletStakingView;
            snapshotKey?: string;
          }>(SelectValidatorCard, { view, snapshotKey }),
        ),
      );
    };
    await inherit("parent-staking-proof");
    await act(async () =>
      (
        host.querySelector('[data-testid="validator-list-item"]') as HTMLElement
      ).click(),
    );
    f.rpc = { ...f.rpc, assetSnapshotKey: "display-failed-again" };
    await inherit("parent-staking-proof");
    expect(host.querySelector("[data-cta]")).not.toBeNull();
    expect(f.queryOptions).toHaveBeenLastCalledWith({ enabled: false });
    await inherit("next-parent-proof");
    expect(host.querySelector("[data-cta]")).not.toBeNull();
  });
  it("unknown APY stays last in either direction and retired validators cannot be selected", async () => {
    await render();
    await sortApy();
    expect(
      Array.from(
        host.querySelectorAll('[data-testid="validator-list-item"]'),
      ).map((e) => e.textContent),
    ).toEqual(["known:3.7%", "unknown:-"]);
    await sortApy();
    expect(
      Array.from(
        host.querySelectorAll('[data-testid="validator-list-item"]'),
      ).map((e) => e.textContent),
    ).toEqual(["known:3.7%", "unknown:-"]);
    expect(host.textContent).not.toContain("retired");
  });
  it("changing the read session clears the old validator selection", async () => {
    await render();
    await act(async () =>
      (
        host.querySelector('[data-testid="validator-list-item"]') as HTMLElement
      ).click(),
    );
    expect(host.querySelector("[data-cta]")).not.toBeNull();
    f.rpc = { ...f.rpc, readSessionKey: "other-session" };
    await render();
    expect(host.querySelector("[data-cta]")).toBeNull();
  });
  it("unknown APY is not reported as a known zero in analytics", async () => {
    await render();
    await act(async () =>
      Array.from(
        host.querySelectorAll<HTMLElement>(
          '[data-testid="validator-list-item"]',
        ),
      )
        .find((row) => row.textContent?.startsWith("unknown:"))!
        .click(),
    );
    await act(async () =>
      (host.querySelector("[data-cta]") as HTMLElement).click(),
    );
    expect(f.selected).not.toHaveBeenCalled();
  });
  it("a failed snapshot removes list and action rather than displaying an empty validator set", async () => {
    await render();
    f.query = { data: undefined, isPending: false, isError: true };
    await render();
    expect(host.querySelector('[role="alert"]')).not.toBeNull();
    expect(
      host.querySelector('[data-testid="validator-list-item"]'),
    ).toBeNull();
    expect(host.querySelector("[data-cta]")).toBeNull();
  });
  it("an inactive or missing validator clears the choice permanently even if it later returns", async () => {
    await render();
    await act(async () =>
      Array.from(
        host.querySelectorAll<HTMLElement>(
          '[data-testid="validator-list-item"]',
        ),
      )
        .find((row) => row.textContent?.startsWith("known:"))!
        .click(),
    );
    const original = f.query.data;
    expect(host.querySelector("[data-cta]")).not.toBeNull();
    f.query.data = {
      ...original,
      validators: original.validators.map((v: any) =>
        v.address === "known" ? { ...v, active: false } : v,
      ),
    };
    await render();
    expect(host.querySelector("[data-cta]")).toBeNull();
    f.query.data = original;
    await render();
    expect(host.querySelector("[data-cta]")).toBeNull();
  });
  it("a failed read clears selection before the same validator list recovers", async () => {
    await render();
    await act(async () =>
      (
        host.querySelector('[data-testid="validator-list-item"]') as HTMLElement
      ).click(),
    );
    const original = f.query.data;
    f.query = { data: undefined, isPending: false, isError: true };
    await render();
    f.query = { data: original, isPending: false, isError: false };
    await render();
    expect(host.querySelector("[data-cta]")).toBeNull();
  });
});

it("sorts tiny positive estimates by their unrounded value and preserves analytics precision", async () => {
  f.query.data.validators = [
    {
      active: true,
      address: "higher",
      name: "Higher",
      stakeBalance: "1",
      apy: { state: "estimated", fraction: 0.000002, sampleCount: 1 },
    },
    {
      active: true,
      address: "lower",
      name: "Lower",
      stakeBalance: "1",
      apy: { state: "estimated", fraction: 0.000001, sampleCount: 1 },
    },
  ];
  await render();
  await sortApy();
  const rows = () =>
    Array.from(
      host.querySelectorAll<HTMLElement>('[data-testid="validator-list-item"]'),
    );
  expect(rows().map((row) => row.textContent)).toEqual([
    "lower:~0%",
    "higher:~0%",
  ]);
  await sortApy();
  expect(rows().map((row) => row.textContent)).toEqual([
    "higher:~0%",
    "lower:~0%",
  ]);
  await act(async () => rows()[0].click());
  await act(async () =>
    (host.querySelector("[data-cta]") as HTMLElement).click(),
  );
  expect(f.selected).toHaveBeenCalledTimes(1);
  expect(f.selected.mock.calls[0][0].validatorAPY).toBeCloseTo(0.0002, 12);
});

it("renders inherited snapshot without waiting on a second system query", async () => {
  f.query = { data: undefined, isPending: true, isError: false };
  const view = {
    validators: [
      {
        active: true,
        address: "0xa",
        name: "Inherited",
        stakeBalance: "100",
        apy: { state: "unknown" },
      },
    ],
  } as any;
  await act(async () =>
    root.render(
      h<{
        view?: import("rtd-apps-core/src/rpc/staking-types").WalletStakingView;
      }>(SelectValidatorCard, { view }),
    ),
  );
  expect(
    host.querySelectorAll('[data-testid="validator-list-item"]'),
  ).toHaveLength(1);
  expect(f.queryOptions).toHaveBeenLastCalledWith({ enabled: false });
});
