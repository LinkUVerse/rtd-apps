// Copyright (c) LinkU Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { beforeEach, describe, expect, it, vi } from "vitest";
import { executionFixture } from "../../../tests/unit/rpc/execution-fixtures";
import {
  clearLedgerActivityCache,
  decodeLedgerActivity,
  readLedgerActivity,
  writeLedgerActivity,
} from "./ledger-activity-cache";

const store = vi.hoisted(() => new Map<string, unknown>());
vi.mock("idb-keyval", () => ({
  get: async (key: string) => structuredClone(store.get(key)),
  update: async (key: string, fn: (value: unknown) => unknown) => {
    store.set(key, structuredClone(fn(structuredClone(store.get(key)))));
  },
  del: async (key: string) => void store.delete(key),
}));

const address = "0x" + "a".repeat(64);
const binding = "binding-1";

async function page(rows = 1) {
  const transactions = [];
  for (let i = 0; i < rows; i++) {
    const fixture = await executionFixture(BigInt(i + 1));
    const raw = fixture.result();
    raw.checkpoint = 21n;
    raw.timestamp = { seconds: 1_700_000_000n + BigInt(i), nanos: 0 };
    transactions.push(raw);
  }
  return {
    bindingKey: binding,
    readSessionKey: "session",
    address,
    source: "archive" as const,
    checkpointHeight: 30,
    lowestAvailableCheckpoint: 0,
    transactions,
    hasNextPage: false,
    nextCursor: null,
  };
}

describe("Historical Ledger 展示缓存", () => {
  beforeEach(() => store.clear());

  it("写入后按同一网络绑定和账户读回，只保留卡片字段", async () => {
    await writeLedgerActivity(binding, address, await page(2), 42);
    const cached = await readLedgerActivity(
      binding,
      address.toUpperCase().replace("0X", "0x"),
    );
    expect(cached).toMatchObject({
      savedAt: 42,
      checkpointLo: 0,
      checkpointHi: 30,
    });
    expect(cached?.transactions).toHaveLength(2);
    expect(cached?.transactions[0]).toMatchObject({
      checkpoint: 21,
      status: "SUCCESS",
      kind: "ProgrammableTransaction",
      nativeTransaction: null,
      eventFacts: null,
      kioskTransfers: null,
    });
    expect(cached?.transactions[0].sender).toMatch(/^0x[0-9a-f]{64}$/);
  });

  it("其它绑定/账户读不到，格式不符条目被拒绝", async () => {
    await writeLedgerActivity(binding, address, await page(1), 1);
    expect(await readLedgerActivity("binding-2", address)).toBeUndefined();
    expect(
      await readLedgerActivity(binding, "0x" + "b".repeat(64)),
    ).toBeUndefined();
    const base = {
      version: 1,
      bindingKey: binding,
      address,
      savedAt: 1,
      checkpointLo: 0,
      checkpointHi: 10,
      transactions: [],
    };
    expect(decodeLedgerActivity(base, binding, address)).toMatchObject({
      checkpointHi: 10,
    });
    expect(
      decodeLedgerActivity({ ...base, checkpointLo: 11 }, binding, address),
    ).toBeUndefined();
    expect(
      decodeLedgerActivity({ ...base, version: 2 }, binding, address),
    ).toBeUndefined();
  });

  it("退出登录清空 Ledger 缓存", async () => {
    await writeLedgerActivity(binding, address, await page(1));
    await clearLedgerActivityCache();
    expect(await readLedgerActivity(binding, address)).toBeUndefined();
  });
});
