// Copyright (c) LinkU Labs, Inc.
// SPDX-License-Identifier: Apache-2.0
import { afterEach, describe, expect, it } from "vitest";
import {
  EXPECTED_HISTORY_TIMEOUT_MS,
  awaitingHistoryTransaction,
  clearExpectedHistoryTransactions,
  expectHistoryTransaction,
} from "rtd-apps-core/src/rpc/history-hooks";

const a = "0x" + "a".repeat(64),
  b = "0x" + "b".repeat(64);

describe("转账后活动列表的待出现交易", () => {
  afterEach(() => clearExpectedHistoryTransactions());

  it("未登记时不进入快速轮询", () => {
    expect(awaitingHistoryTransaction(a, [])).toBe(false);
  });

  it("交易出现前保持快速轮询，出现后立即恢复", () => {
    expectHistoryTransaction(a, "d1", 1_000);
    expect(awaitingHistoryTransaction(a, [{ digest: "old" }], 2_000)).toBe(true);
    expect(awaitingHistoryTransaction(a, undefined, 3_000)).toBe(true);
    expect(awaitingHistoryTransaction(a, [{ digest: "d1" }], 4_000)).toBe(false);
    // 已出现的登记被清除，后续结果即使暂缺也不再快速轮询。
    expect(awaitingHistoryTransaction(a, [], 5_000)).toBe(false);
  });

  it("超时后回到常规轮询", () => {
    expectHistoryTransaction(a, "d1", 0);
    expect(awaitingHistoryTransaction(a, [], EXPECTED_HISTORY_TIMEOUT_MS - 1)).toBe(true);
    expect(awaitingHistoryTransaction(a, [], EXPECTED_HISTORY_TIMEOUT_MS)).toBe(false);
  });

  it("按地址隔离，地址大小写不影响匹配", () => {
    expectHistoryTransaction(a.toUpperCase().replace("0X", "0x"), "d1", 0);
    expect(awaitingHistoryTransaction(b, [], 1)).toBe(false);
    expect(awaitingHistoryTransaction(a, [], 1)).toBe(true);
  });

  it("多笔交易全部出现后才结束", () => {
    expectHistoryTransaction(a, "d1", 0);
    expectHistoryTransaction(a, "d2", 0);
    expect(awaitingHistoryTransaction(a, [{ digest: "d1" }], 1)).toBe(true);
    expect(awaitingHistoryTransaction(a, [{ digest: "d2" }], 2)).toBe(false);
  });

  it("缺少地址或 digest 时忽略登记", () => {
    expectHistoryTransaction(null, "d1");
    expectHistoryTransaction(a, undefined);
    expect(awaitingHistoryTransaction(a, [])).toBe(false);
  });
});
