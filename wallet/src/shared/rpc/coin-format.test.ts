// Copyright (c) LinkU Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import {
  atomicBalance,
  CoinFormat,
  formatBalance,
} from "rtd-apps-core/src/rpc/coin";
import { describe, expect, it } from "vitest";

describe("原子金额与显示单位边界", () => {
  it("高于 Number 精度的余额以 bigint/十进制整数串精确换算，不先取 Number", () => {
    const balance = "900719925474099312345";
    expect(formatBalance(balance, 9, CoinFormat.FULL)).toBe(
      "900,719,925,474.099312345",
    );
    expect(formatBalance(BigInt(balance), 9, CoinFormat.FULL)).toBe(
      "900,719,925,474.099312345",
    );
    expect(formatBalance("-900719925474099312345", 9, CoinFormat.FULL)).toBe(
      "-900,719,925,474.099312345",
    );
  });
  it("零位精度是已知真实精度，负数用于收支显示", () => {
    expect(formatBalance(0n, 0)).toBe("0");
    expect(formatBalance("-12", 0, CoinFormat.FULL)).toBe("-12");
  });
  it.each([9007199254740992, Infinity, NaN, 1.1, "1.1", "1e9", " 1", "01"])(
    "拒绝已丢精度或不规范的原子金额 %s",
    (value) => {
      expect(() => atomicBalance(value)).toThrow();
    },
  );
  it.each([-1, 256, 1.1, NaN])("不能默认或猜测无效 decimals %s", (decimals) => {
    expect(() => formatBalance("1", decimals)).toThrow();
  });
});
