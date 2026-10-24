// Copyright (c) LinkU Labs, Inc.
// SPDX-License-Identifier: Apache-2.0
import { describe, expect, it } from "vitest";
import { historyFixture, historyRow } from "../../../tests/unit/rpc/history-fixtures";
import { sender } from "../../../tests/unit/rpc/execution-fixtures";

describe("账户历史分页读取", () => {
  it("首页即返回并给出续页；续页沿用同一窗口直至读完", async () => {
    const a = (await historyRow(1n, true, 22)).row,
      b = (await historyRow(2n, true, 21)).row;
    const f = await historyFixture({ rows: [a, b] });
    const first = await f.reader.readPage(sender, null);
    expect(first.transactions.map((row) => row.digest)).toEqual([a.digest]);
    expect(first).not.toHaveProperty("totalTransactions");
    expect(first.continuation).not.toBeNull();
    const pagesBefore = f.requests.filter((r) => r.query.includes("WalletAccountHistory")).length;
    expect(pagesBefore).toBe(1);
    const second = await f.reader.readPage(sender, first.continuation!);
    expect(second.transactions.map((row) => row.digest)).toEqual([b.digest]);
    expect(second.continuation).toBeNull();
    expect(second.snapshot).toBe(first.snapshot);
    const pages = f.requests.filter((r) => r.query.includes("WalletAccountHistory"));
    expect(pages[1].variables.cursor).toBe("p1.sig");
    expect(pages.every((r) => r.variables.hi === 25 && r.variables.lo === 0)).toBe(true);
  });

  it.each(["snapshot", "duplicate", "order", "flags", "empty"])(
    "续页%s与首页不一致时拒绝",
    async (failure) => {
      const a = (await historyRow(1n, true, 22)).row,
        b = (await historyRow(2n, true, 21)).row;
      const f = await historyFixture({
        rows: [a, b],
        alter: (data, request) => {
          if (!request.variables.cursor) return;
          const page = data.accountHistory;
          if (failure === "snapshot") page.snapshot = "b".repeat(64);
          if (failure === "empty") page.transactions = [];
          if (failure === "duplicate") page.transactions = [a];
          if (failure === "order")
            page.transactions = [{ ...b, checkpoint: 23, transaction: { ...b.transaction,
              effects: { ...b.transaction.effects, checkpoint: { sequenceNumber: 23 } } } }];
          if (failure === "flags") page.completeForDiscoveredCapabilities = false;
        },
      });
      const first = await f.reader.readPage(sender, null);
      await expect(f.reader.readPage(sender, first.continuation!)).rejects.toThrow();
    },
  );

  it("续页不能用于其它地址或会话", async () => {
    const a = (await historyRow(1n, true, 22)).row,
      b = (await historyRow(2n, true, 21)).row;
    const f = await historyFixture({ rows: [a, b] });
    const first = await f.reader.readPage(sender, null);
    await expect(
      f.reader.readPage("0x" + "9".repeat(64), first.continuation!),
    ).rejects.toMatchObject({ reason: "changed" });
    await expect(
      f.reader.readPage(sender, { ...first.continuation!, readSessionKey: "other" }),
    ).rejects.toMatchObject({ reason: "changed" });
  });

  it("无总数：仅凭固定窗口下 hasNextPage=false 判定读完", async () => {
    const a = (await historyRow(1n, true, 22)).row;
    const f = await historyFixture({ rows: [a] });
    const only = await f.reader.readPage(sender, null);
    expect(only.transactions).toHaveLength(1);
    expect(only.continuation).toBeNull();
  });
});
