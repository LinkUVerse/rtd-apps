// Copyright (c) LinkU Labs, Inc.
// SPDX-License-Identifier: Apache-2.0
import { act, createElement as h } from "react";
import { createRoot } from "react-dom/client";
import { expect, it, vi } from "vitest";
import { PreviewTransfer } from "./PreviewTransfer";
import type { PreparedCoinTransfer } from "_src/shared/rpc/coin-transfer-preparation";

vi.mock("_app/i18n", () => ({ useI18n: () => ({ t: (key: string) => key }) }));
vi.mock("_components/receipt-card/TxnAddress", () => ({
  TxnAddress: ({ address }: { address: string }) => h("span", null, address),
}));
vi.mock("rtd-apps-core/src/rpc/coin", async (original) => ({
  ...(await original<typeof import("rtd-apps-core/src/rpc/coin")>()),
  useCoinMetadata: () => {
    throw new Error("Metadata is offline after approval");
  },
  useFormatCoin: () => {
    throw new Error("Metadata is offline after approval");
  },
}));
Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });

it("keeps the exact approved amount and sender visible when live metadata is unavailable", async () => {
  const input = {
    sender: "0x1",
    to: "0x2",
    coinType: "0x2::rtd::RTD",
    amount: "9007199254.740993123",
    coinDecimals: 9,
    isPayAllRtd: false,
  };
  const prepared = { input } as PreparedCoinTransfer;
  const node = document.createElement("div"),
    root = createRoot(node);
  try {
    await act(async () =>
      root.render(
        h(PreviewTransfer, { prepared, coinSymbol: "RTD", gasBudget: "0.003" }),
      ),
    );
    expect(node.textContent).toContain("9,007,199,254.740993123");
    expect(node.textContent).toContain("0x1");
    expect(node.textContent).toContain("0x2");
    expect(node.textContent).toContain("0.003 RTD");
    expect(node.textContent).not.toContain("common.syncError");
    await act(async () =>
      root.render(
        h(PreviewTransfer, {
          prepared: {
            input: { ...input, amount: "2.5", coinDecimals: 2, sender: "0x3" },
          } as PreparedCoinTransfer,
          coinSymbol: "TEST",
          gasBudget: "0.004",
        }),
      ),
    );
    expect(node.textContent).toContain("2.5TEST");
    expect(node.textContent).toContain("0x3");
    expect(node.textContent).not.toContain("9,007,199,254.740993123");
  } finally {
    await act(async () => root.unmount());
  }
});
