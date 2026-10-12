// Copyright (c) LinkU Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { type RtdClientTypes } from "rtd-typescript/client";
import { RTD_TYPE_ARG } from "rtd-typescript/utils";
import { describe, expect, it } from "vitest";

import { filterAndSortTokenBalances } from "../../ui/app/helpers/filterAndSortTokenBalances";

function balance(coinType: string, amount: string): RtdClientTypes.Balance {
  return {
    coinType,
    balance: amount,
    coinBalance: amount,
    addressBalance: "0",
  };
}

describe("余额页面精度与缓存不可变性", () => {
  it("高于 Number 精度的相近金额按 bigint 排序，不改原快照数组", () => {
    const low = balance("0x4::a::TOKEN", "9007199254740992");
    const high = balance("0x5::b::TOKEN", "9007199254740993");
    const input = Object.freeze([low, high]);
    expect(filterAndSortTokenBalances(input)).toEqual([high, low]);
    expect(input).toEqual([low, high]);
  });
  it("RTD 排前、零余额过滤，其余用新 balance，未伪造 coinObjectCount", () => {
    const rtd = balance(RTD_TYPE_ARG, "1");
    const token = balance("0x5::b::TOKEN", "2");
    expect(
      filterAndSortTokenBalances([token, rtd, balance("0x6::c::ZERO", "0")]),
    ).toEqual([rtd, token]);
    expect(rtd).not.toHaveProperty("totalBalance");
    expect(rtd).not.toHaveProperty("coinObjectCount");
  });
});
