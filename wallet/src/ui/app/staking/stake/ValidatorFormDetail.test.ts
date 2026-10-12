// Copyright (c) LinkU Labs, Inc.
// SPDX-License-Identifier: Apache-2.0
import { act, createElement as h } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { ValidatorFormDetail } from "./ValidatorFormDetail";
const f = vi.hoisted(() => ({
  query: { data: undefined as any, isPending: false, isError: false },
}));
vi.mock("rtd-apps-core/src/rpc/staking-hooks", () => ({
  useStakingView: () => f.query,
}));
vi.mock("../../hooks/useActiveAddress", () => ({
  useActiveAddress: () => "owner",
}));
vi.mock("react-router-dom", () => ({
  useSearchParams: () => [new URLSearchParams({ staked: "position" })],
}));
vi.mock("_src/ui/app/i18n", () => ({
  useI18n: () => ({ t: (key: string) => key }),
}));
vi.mock("../validators/ValidatorLogo", () => ({ ValidatorLogo: () => null }));
vi.mock("_src/ui/app/shared/tooltip", () => ({ IconTooltip: () => null }));
vi.mock("_components/loading/LoadingIndicator", () => ({
  default: () => null,
}));
vi.mock("_src/ui/app/shared/text", async () => {
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
vi.mock("_app/shared/card", async () => {
  const { createElement } = await import("react");
  return {
    Card: ({ children, header, footer }: any) =>
      createElement("div", {}, header, children, footer),
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
Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
let host: HTMLDivElement, root: ReturnType<typeof createRoot>;
beforeEach(() => {
  f.query = {
    isPending: false,
    isError: false,
    data: {
      validators: [
        {
          address: "validator",
          poolId: "active",
          active: true,
          stakeBalance: "18014398509481986",
          apy: { state: "unknown" },
        },
        {
          address: "validator",
          poolId: "retired",
          active: false,
          stakeBalance: "100",
          apy: { state: "unknown" },
        },
      ],
      positions: [
        {
          objectId: "position",
          validatorAddress: "validator",
          poolId: "retired",
          principal: "100",
        },
        {
          objectId: "current",
          validatorAddress: "validator",
          poolId: "active",
          principal: "9007199254740993",
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
async function render(unstake = false, validatorAddress = "validator") {
  await act(async () =>
    root.render(h(ValidatorFormDetail, { validatorAddress, unstake })),
  );
}
it("counts only the selected active pool and preserves exact principal", async () => {
  await render();
  expect(
    Array.from(host.querySelectorAll("[data-amount]")).map(
      (el) => el.textContent,
    ),
  ).toEqual(["18014398509481986", "9007199254740993"]);
  expect(host.textContent).toContain("--");
});
it("withdrawal follows the owned retired pool without an invented active share", async () => {
  await render(true);
  expect(host.querySelector("[role=alert]")).toBeNull();
  expect(host.textContent).not.toContain("100%");
  expect(host.textContent).toContain("--");
});
it("spoofed validator or missing stake gives an error instead of zero", async () => {
  await render(true, "other");
  expect(host.querySelector("[role=alert]")).not.toBeNull();
  f.query.data.positions = [];
  await render(true);
  expect(host.querySelector("[role=alert]")).not.toBeNull();
});
it("failed snapshot does not retain successful values", async () => {
  await render();
  f.query.isError = true;
  await render();
  expect(host.querySelector("[role=alert]")).not.toBeNull();
  expect(host.querySelector("[data-amount]")).toBeNull();
});

it("distinguishes a tiny valid estimate from missing history", async () => {
  f.query.data.validators[0].apy = {
    state: "estimated",
    fraction: 3.5770019835013045e-8,
    sampleCount: 1,
  };
  await render();
  expect(host.textContent).toContain("~0%");
  f.query.data = {
    ...f.query.data,
    validators: f.query.data.validators.map((v: any) => ({
      ...v,
      apy: { state: "unknown" },
    })),
  };
  await render();
  expect(host.textContent).not.toContain("~0%");
  expect(host.textContent).toContain("--");
});
