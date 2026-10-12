// Copyright (c) LinkU Labs, Inc.
// SPDX-License-Identifier: Apache-2.0
import { act, createElement as h, type ReactNode } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { API_ENV } from "_shared/api-env";
import { RTD_TYPE_ARG } from "rtd-typescript/utils";
import { CoinBalance } from "./index";
const f = vi.hoisted(() => ({ quote: vi.fn(), env: "mainnet" }));
vi.mock("_hooks", () => ({
  useAppSelector: (select: any) => select({ app: { apiEnv: f.env } }),
}));
vi.mock("_app/hooks/useIsWalletDefiEnabled", () => ({
  useIsWalletDefiEnabled: () => false,
}));
vi.mock("rtd-apps-core/src/rpc/price", () => ({
  useBalanceInUSD: (type: string, amount: bigint) => f.quote(type, amount),
}));
vi.mock("rtd-apps-core/src/rpc/coin", () => ({
  useFormatCoin: () => ["balance", "TOKEN"],
}));
vi.mock("_src/ui/app/shared/text", () => ({
  Text: ({ children }: { children: ReactNode }) => h("span", {}, children),
}));
vi.mock("_src/ui/app/shared/heading", () => ({
  Heading: ({ children }: { children: ReactNode }) => h("span", {}, children),
}));
Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
let host: HTMLDivElement, root: ReturnType<typeof createRoot>;
beforeEach(() => {
  f.quote.mockReset();
  f.env = API_ENV.mainnet;
  host = document.createElement("div");
  document.body.append(host);
  root = createRoot(host);
});
afterEach(async () => {
  await act(async () => root.unmount());
  host.remove();
});
async function render(type: string, amount = 1234567n) {
  await act(async () => root.render(h(CoinBalance, { type, amount })));
}
it("selected nonnative coin supplies both quote type and exact amount, including after switching", async () => {
  const token = "0x42::usd::USD";
  f.quote.mockImplementation((type: string) => (type === token ? 2.47 : 99));
  await render(RTD_TYPE_ARG);
  expect(host.textContent).toContain("~$99.00 USD");
  await render(token);
  expect(f.quote).toHaveBeenLastCalledWith(token, 1234567n);
  expect(host.textContent).toContain("~$2.47 USD");
});
it("a valid zero quote is displayed while unavailable quote is omitted", async () => {
  f.quote.mockReturnValue(0);
  await render(RTD_TYPE_ARG);
  expect(host.textContent).toContain("~$0.00 USD");
  f.quote.mockReturnValue(null);
  await render(RTD_TYPE_ARG, 2n);
  expect(host.textContent).not.toContain("USD");
});
it("non-mainnet does not request a price", async () => {
  f.env = API_ENV.local;
  await render(RTD_TYPE_ARG);
  expect(f.quote).not.toHaveBeenCalled();
});
