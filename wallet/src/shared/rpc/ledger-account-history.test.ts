// Copyright (c) LinkU Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { describe, expect, it } from "vitest";
import {
  executionFixture,
  sender,
} from "../../../tests/unit/rpc/execution-fixtures";
import { ledgerAccountHistoryPage } from "./ledger-account-history";
import type {
  WalletLedgerHistoryPage,
  WalletLedgerReader,
} from "./ledger-reader";
import { WalletReadSession } from "./session";
import { validateNetworkProfile } from "./profile";
import { profileFixture } from "./profile-fixture";

async function fixture(rows = 2) {
  const session = new WalletReadSession(
    validateNetworkProfile(profileFixture()),
  );
  const reader = { session } as WalletLedgerReader;
  const transactions = [];
  for (let i = 0; i < rows; i++) {
    const raw = (await executionFixture(BigInt(i + 1))).result();
    raw.checkpoint = 21n;
    raw.timestamp = { seconds: 1_700_000_000n + BigInt(i), nanos: 0 };
    transactions.push(raw);
  }
  const page: WalletLedgerHistoryPage = {
    bindingKey: session.bindingKey,
    readSessionKey: session.cacheKey,
    address: sender,
    source: "archive",
    checkpointHeight: 30,
    lowestAvailableCheckpoint: 1,
    transactions,
    hasNextPage: true,
    nextCursor: "BAU=",
  };
  return { session, reader, page };
}

describe("Historical Ledger account-history adapter", () => {
  it("maps a native page with its window and continuation", async () => {
    const f = await fixture();
    const result = await ledgerAccountHistoryPage(f.reader, f.page, null);
    expect(result).toMatchObject({
      bindingKey: f.session.bindingKey,
      readSessionKey: f.session.cacheKey,
      address: sender,
      checkpointLo: 1,
      checkpointHi: 30,
      coverage: { allAccountActivityCertified: false },
    });
    expect(result.transactions).toHaveLength(2);
    expect(result.continuation).toMatchObject({
      cursor: "BAU=",
      window: { lower: 1, upper: 30, certified: false },
      cursors: ["BAU="],
    });
  });

  it("keeps the first page window and accumulates cursors", async () => {
    const f = await fixture(1);
    const first = await ledgerAccountHistoryPage(f.reader, f.page, null);
    const nextPage = {
      ...f.page,
      checkpointHeight: 31,
      nextCursor: "BQY=",
      hasNextPage: false,
    };
    const second = await ledgerAccountHistoryPage(
      f.reader,
      nextPage,
      first.continuation ?? null,
    );
    expect(second.checkpointHi).toBe(30);
    expect(second.continuation).toBeNull();
  });

  it("rejects a retention-bound change across pages", async () => {
    const f = await fixture(1);
    const first = await ledgerAccountHistoryPage(f.reader, f.page, null);
    await expect(
      ledgerAccountHistoryPage(
        f.reader,
        { ...f.page, lowestAvailableCheckpoint: 2, hasNextPage: false },
        first.continuation ?? null,
      ),
    ).rejects.toThrow();
  });
});
