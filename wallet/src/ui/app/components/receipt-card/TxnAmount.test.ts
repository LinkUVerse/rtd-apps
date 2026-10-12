// Copyright (c) LinkU Labs, Inc.
// SPDX-License-Identifier: Apache-2.0
import { act, createElement as h } from "react";
import { createRoot } from "react-dom/client";
import { expect, it, vi } from "vitest";
import { CoinFormat } from "rtd-apps-core/src/rpc/coin";
import { TxnAmount } from "./TxnAmount";

vi.mock("rtd-apps-core/src/rpc/coin", async (importOriginal) => {
  const original =
    await importOriginal<typeof import("rtd-apps-core/src/rpc/coin")>();
  return {
    ...original,
    useFormatCoin: (amount: bigint, _type: string, format?: CoinFormat) => [
      original.formatBalance(amount, 9, format),
      "RTD",
      {},
    ],
  };
});
Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });

it.each(["1000000001", "9007199254740993123"])(
  "批准的完整小数保留原子金额精度：%s",
  async (amount) => {
    const node = document.createElement("div"),
      root = createRoot(node);
    try {
      await act(async () =>
        root.render(
          h(TxnAmount, {
            amount,
            coinType: "0x2::rtd::RTD",
            label: "发送数量",
            format: CoinFormat.FULL,
          }),
        ),
      );
      expect(node.textContent).toContain(
        amount === "1000000001" ? "1.000000001" : "9,007,199,254.740993123",
      );
      expect(node.textContent).toContain("RTD");
    } finally {
      await act(async () => root.unmount());
    }
  },
);
it("已有收据默认舍入与近似标识保持，零金额不显示", async () => {
  const node = document.createElement("div"),
    root = createRoot(node);
  try {
    await act(async () =>
      root.render(
        h(TxnAmount, {
          amount: "-1000000001",
          coinType: "0x2::rtd::RTD",
          label: "变化",
          approximation: true,
        }),
      ),
    );
    expect(node.textContent).toContain("~1");
    expect(node.textContent).not.toContain("1.000000001");
    await act(async () =>
      root.render(
        h(TxnAmount, { amount: "0", coinType: "0x2::rtd::RTD", label: "变化" }),
      ),
    );
    expect(node.textContent).toBe("");
  } finally {
    await act(async () => root.unmount());
  }
});
