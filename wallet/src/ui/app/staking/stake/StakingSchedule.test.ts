import { act, createElement as h } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import StakeForm from "./StakeForm";
import { UnStakeForm } from "./UnstakeForm";
import type { WalletStakingView, StakePosition } from "rtd-apps-core/src/rpc/staking-types";

vi.mock("_src/ui/app/i18n", () => ({
  useI18n: () => ({ t: (key: string, args?: { count?: string | number }) =>
    args?.count === undefined ? key : `${key}:${args.count}` }),
}));
vi.mock("rtd-apps-core/src/rpc/coin", () => ({
  useFormatCoin: (value: unknown) => [String(value ?? "--"), "RTD", { isPending: false }],
}));
vi.mock("formik", async () => {
  const { createElement } = await import("react");
  return { useFormikContext: () => ({ setFieldValue: () => undefined }),
    Form: ({ children }: any) => createElement("form", {}, children),
    Field: () => createElement("input", { "aria-label": "amount" }) };
});
vi.mock("_components/number-input", () => ({ default: () => null }));
vi.mock("_app/shared/card", async () => {
  const { createElement } = await import("react");
  return { Card: ({ children, header, footer }: any) => createElement("div", {}, header, children, footer) };
});
Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
let host: HTMLDivElement, root: ReturnType<typeof createRoot>;
const base = 1700000000000;
const view = { epoch: "2", safeMode: false, epochStartTimestampMs: String(base), epochDurationMs: "60000" } as WalletStakingView;
const position = { principal: "1", reward: { state: "unknown", reason: "pending" } } as StakePosition;
beforeEach(() => {
  vi.useFakeTimers();vi.setSystemTime(base + 60000);
  host = document.createElement("div");document.body.append(host);root = createRoot(host);
});
afterEach(async () => { await act(async () => root.unmount());host.remove();vi.useRealTimers(); });
async function render(unstake = false, selected = view) {
  await act(async () => root.render(unstake ? h(UnStakeForm, { view: selected, position }) : h(StakeForm, { view: selected, coinBalance: 10n, coinType: "0x2::rtd::RTD" })));
}
it("an ended indexed epoch cannot advertise old epoch 3/4 for a new stake", async () => {
  await render();expect(host.textContent?.match(/staking.scheduleUnavailable/g)).toHaveLength(2);
  expect(host.textContent).not.toContain("staking.epochNumber");
});
it("an ended indexed epoch cannot be shown as the current withdrawal epoch", async () => {
  await render(true);expect(host.textContent).toContain("staking.scheduleUnavailable");
  expect(host.textContent).not.toContain("staking.epochNumber");
});
it("a live epoch estimate expires both forecasts at the source epoch boundary without network work", async () => {
  vi.setSystemTime(base + 58000);await render();expect(host.textContent).not.toContain("staking.scheduleUnavailable");
  await act(async () => vi.advanceTimersByTime(2000));
  expect(host.textContent?.match(/staking.scheduleUnavailable/g)).toHaveLength(2);
});
it("safe mode and future-dated epoch snapshots explicitly keep the schedule unknown", async () => {
  vi.setSystemTime(base + 1000);await render(false, { ...view, safeMode: true });
  expect(host.textContent?.match(/staking.scheduleUnavailable/g)).toHaveLength(2);
  vi.setSystemTime(base - 1);await render();expect(host.textContent?.match(/staking.scheduleUnavailable/g)).toHaveLength(2);
});
