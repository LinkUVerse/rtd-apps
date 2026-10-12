// Copyright (c) LinkU Labs, Inc.
// SPDX-License-Identifier: Apache-2.0
import { act, createElement as h } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { StakeTxnCard } from "./StakeTxnCard";
const f = vi.hoisted(() => ({
  query: { data: undefined as any, isError: false },
}));
vi.mock("rtd-apps-core/src/rpc/staking-hooks", () => ({
  useStakingView: () => f.query,
}));
vi.mock("_src/ui/app/i18n", () => ({
  useI18n: () => ({
    t: (key: string, values?: any) => (values ? `${key}:${values.count}` : key),
  }),
}));
vi.mock("_app/staking/validators/ValidatorLogo", () => ({
  ValidatorLogo: () => null,
}));
vi.mock("_src/ui/app/shared/tooltip", () => ({ IconTooltip: () => null }));
vi.mock("_components/receipt-card/TxnAmount", async () => {
  const { createElement } = await import("react");
  return {
    TxnAmount: ({ amount }: any) =>
      createElement("span", { "data-amount": true }, String(amount)),
  };
});
vi.mock("_src/ui/app/shared/text", async () => {
  const { createElement } = await import("react");
  return { Text: ({ children }: any) => createElement("span", {}, children) };
});
vi.mock("../../shared/transaction-summary/Card", async () => {
  const { createElement } = await import("react");
  return { Card: ({ children }: any) => createElement("div", {}, children) };
});
vi.mock("_src/ui/app/shared/countdown-timer", async () => {
  const { createElement } = await import("react");
  return {
    CountDownTimer: ({ timestamp }: any) =>
      createElement("span", { "data-timer": true }, String(timestamp)),
  };
});
Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
let host: HTMLDivElement, root: ReturnType<typeof createRoot>;
beforeEach(() => {
  f.query = {
    isError: false,
    data: {
      epoch: "2",
      safeMode: false,
      epochStartTimestampMs: String(Date.now()),
      epochDurationMs: "60000",
      validators: [
        {
          active: true,
          address: "validator",
          apy: { state: "estimated", fraction: 0.037 },
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
async function render(epoch = "2") {
  await act(async () =>
    root.render(
      h(StakeTxnCard, {
        event: {
          kind: "stake",
          index: 0,
          poolId: "pool",
          validatorAddress: "validator",
          stakerAddress: "sender",
          epoch,
          amount: "9007199254740993",
        },
      }),
    ),
  );
}
it("uses current APY and snapshot timers while preserving exact event amount", async () => {
  await render();
  expect(host.textContent).toContain("staking.currentApy");
  expect(host.textContent).toContain("3.7%");
  expect(host.querySelector("[data-amount]")?.textContent).toBe(
    "9007199254740993",
  );
  expect(host.querySelectorAll("[data-timer]")).toHaveLength(2);
});
it("missing current state is not proof that rewards started", async () => {
  f.query.data = undefined;
  await render();
  expect(host.textContent).not.toContain("staking.rewardsStarted");
  expect(host.textContent).toContain("staking.epochNumber:3");
  expect(host.textContent).toContain("--");
  expect(host.querySelector("[data-amount]")).not.toBeNull();
  expect(host.querySelector("[data-timer]")).toBeNull();
});
it("failed enrichment discards stale APY and timing without hiding event facts", async () => {
  f.query.isError = true;
  await render();
  expect(host.textContent).not.toContain("3.7%");
  expect(host.querySelector("[data-timer]")).toBeNull();
  expect(host.querySelector("[data-amount]")).not.toBeNull();
});
it("safe mode and inactive validator retain unknown enrichment", async () => {
  f.query.data.safeMode = true;
  f.query.data.validators[0].active = false;
  await render();
  expect(host.textContent).not.toContain("staking.rewardsStarted");
  expect(host.textContent).not.toContain("3.7%");
  expect(host.querySelector("[data-timer]")).toBeNull();
});
it("past activation uses proven current epoch; future epoch arithmetic stays exact", async () => {
  await render("0");
  expect(host.textContent).toContain("staking.rewardsStarted");
  await render("9007199254740993");
  expect(host.textContent).toContain("staking.epochNumber:9007199254740994");
  expect(host.textContent).toContain("staking.epochNumber:9007199254740995");
  expect(host.querySelector("[data-timer]")).toBeNull();
});
it("u64 epoch overflow is unknown rather than an invented future epoch", async () => {
  await render("18446744073709551615");
  expect(host.textContent).not.toContain("18446744073709551616");
  expect(host.textContent).not.toContain("18446744073709551617");
  expect(host.querySelector("[data-timer]")).toBeNull();
});

it("tiny positive current APY is approximate while event amount remains exact", async () => {
  f.query.data.validators[0].apy.fraction = 3.5770019835013045e-8;
  await render();
  expect(host.textContent).toContain("~0%");
  expect(host.querySelector("[data-amount]")?.textContent).toBe(
    "9007199254740993",
  );
});
