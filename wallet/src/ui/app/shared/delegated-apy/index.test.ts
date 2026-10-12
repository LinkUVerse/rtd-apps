import { act, createElement as h } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { normalizeRtdAddress } from "rtd-typescript/utils";
import { DelegatedAPY } from "./index";
const fixture = vi.hoisted(() => ({
  query: { data: undefined as any, isPending: false, isError: false },
}));
vi.mock("rtd-apps-core/src/rpc/staking-hooks", () => ({
  useStakingView: () => fixture.query,
}));
vi.mock("_app/i18n", () => ({ useI18n: () => ({ t: (key: string) => key }) }));
vi.mock("_app/shared/tooltip", () => ({ IconTooltip: () => null }));
vi.mock("_components/loading/LoadingIndicator", () => ({
  default: () => null,
}));
vi.mock("_app/shared/text", async () => {
  const { createElement } = await import("react");
  return { Text: ({ children }: any) => createElement("span", {}, children) };
});
Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
let host: HTMLDivElement, root: ReturnType<typeof createRoot>;
beforeEach(() => {
  fixture.query = {
    isPending: false,
    isError: false,
    data: {
      validators: [
        {
          active: true,
          address: normalizeRtdAddress("0x1"),
          apy: { state: "estimated", fraction: 0.02, sampleCount: 1 },
        },
        {
          active: true,
          address: normalizeRtdAddress("0x2"),
          apy: { state: "estimated", fraction: 0.04, sampleCount: 1 },
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
async function render(addresses = ["0x1", "0x2", "0x1"]) {
  await act(async () =>
    root.render(h(DelegatedAPY, { stakedValidators: addresses })),
  );
}
it("averages unique validators and converts the fraction to percent once", async () => {
  await render();
  expect(host.textContent).toBe("3%staking.apy");
});
it("marks a positive estimate rounded to zero as approximate", async () => {
  fixture.query.data.validators[0].apy.fraction = 3.5770019835013045e-8;
  await render(["0x1"]);
  expect(host.textContent).toBe("~0%staking.apy");
});
it("does not average a partial set or retain a failed snapshot", async () => {
  fixture.query.data.validators[1].apy = {
    state: "unknown",
    reason: "insufficient-history",
  };
  await render();
  expect(host.textContent).toBe("--");
  fixture.query.isError = true;
  await render(["0x1"]);
  expect(host.textContent).toBe("--");
});
