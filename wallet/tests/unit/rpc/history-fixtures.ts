// Copyright (c) LinkU Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { vi } from "vitest";
import type { WalletAccountHistory } from "rtd-apps-core/src/rpc/WalletRpcContext";
import { executionFixture, sender } from "./execution-fixtures";
import { snapshotFixture } from "./fixtures";
import { ledgerAccountHistoryPage } from "../../../src/shared/rpc/ledger-account-history";
import { WalletLedgerReader } from "../../../src/shared/rpc/ledger-reader";
import { WalletReadSession } from "../../../src/shared/rpc/session";

/** Minimal UI-history fixture backed by the Historical Ledger view adapter. */
export async function historyFixture(
  options: {
    noHistory?: boolean;
    timeoutMs?: number;
    lowestAvailableCheckpoint?: number;
  } = {},
) {
  const native = snapshotFixture({
    range: () => ({ first: 0, last: 30 }),
  });
  void options.noHistory;
  void options.timeoutMs;
  const raw = (await executionFixture()).result();
  raw.checkpoint = 21n;
  raw.timestamp = { seconds: 1_700_000_000n, nanos: 0 };
  const reader = new WalletLedgerReader(native.session);
  const page = {
    bindingKey: native.session.bindingKey,
    readSessionKey: native.session.cacheKey,
    address: sender,
    source: "archive" as const,
    checkpointHeight: 30,
    lowestAvailableCheckpoint: options.lowestAvailableCheckpoint ?? 0,
    transactions: [raw],
    hasNextPage: false,
    nextCursor: null,
  };
  let cached: WalletAccountHistory | undefined;
  const read = async (address: string): Promise<WalletAccountHistory> => {
    if (cached && cached.address === address) return cached;
    cached = await ledgerAccountHistoryPage(reader, { ...page, address }, null);
    return cached;
  };
  const fakeReader = {
    read,
    readPage: async (address: string) => read(address),
  };
  const requests: unknown[] = [];
  const fetch = vi.fn<typeof globalThis.fetch>(native.fetch);
  return {
    native,
    reader: fakeReader,
    fetch,
    requests,
    rows: [raw],
  };
}
