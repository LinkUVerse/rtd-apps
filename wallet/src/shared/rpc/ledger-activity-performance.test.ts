// Copyright (c) LinkU Labs, Inc.
// SPDX-License-Identifier: Apache-2.0
import { expect, it } from "vitest";
import { toBase58 } from "rtd-typescript/utils";
import { snapshotFixture } from "../../../tests/unit/rpc/fixtures";
import {
  executionFixture,
  sender,
} from "../../../tests/unit/rpc/execution-fixtures";
import { readLedgerAccountHistory } from "./ledger-account-history";
import type { WalletLedgerReader } from "./ledger-reader";

const PAGES = 100;
const ROWS_PER_PAGE = 20;
const ROWS = PAGES * ROWS_PER_PAGE;

function digest(index: number) {
  const bytes = new Uint8Array(32);
  new DataView(bytes.buffer).setUint32(28, index + 1);
  return toBase58(bytes);
}

async function historyFixture() {
  const native = snapshotFixture({ range: () => ({ first: 0, last: ROWS }) });
  const template = (await executionFixture()).result();
  const rows = Array.from({ length: ROWS }, (_, index) => {
    const row = structuredClone(template);
    row.digest = digest(index);
    row.checkpoint = BigInt(index + 1);
    row.timestamp = { seconds: 1_700_000_000n + BigInt(index), nanos: 0 };
    return row;
  });
  const fake = {
    session: native.session,
    historyPage: async (
      address: string,
      cursor: string | null,
    ) => {
      const start = cursor === null ? 0 : Number(cursor);
      const end = Math.min(start + ROWS_PER_PAGE, rows.length);
      return {
        bindingKey: native.session.bindingKey,
        readSessionKey: native.session.cacheKey,
        address,
        source: "archive" as const,
        checkpointHeight: ROWS,
        lowestAvailableCheckpoint: 0,
        transactions: rows.slice(start, end),
        hasNextPage: end < rows.length,
        nextCursor: end < rows.length ? String(end) : null,
      };
    },
  } as unknown as WalletLedgerReader;
  return { fake };
}

it(
  "Ledger 活动首屏/翻页/全历史客户端基准",
  async () => {
    const { fake } = await historyFixture();
    const timed = async (read: () => Promise<unknown>) => {
      const started = performance.now();
      await read();
      return performance.now() - started;
    };

    const first = await timed(() =>
      readLedgerAccountHistory(fake, sender, undefined, {
        continuation: null,
      }),
    );
    const firstPage = await readLedgerAccountHistory(fake, sender, undefined, {
      continuation: null,
    });
    const next = await timed(() =>
      readLedgerAccountHistory(fake, sender, undefined, {
        continuation: firstPage.continuation ?? null,
      }),
    );
    const full = await timed(() => readLedgerAccountHistory(fake, sender));
    const fullResult = await readLedgerAccountHistory(fake, sender);
    expect(fullResult.transactions).toHaveLength(ROWS);
    console.info(
      JSON.stringify({
        firstPageMs: Number(first.toFixed(1)),
        nextPageMs: Number(next.toFixed(1)),
        fullHistoryMs: Number(full.toFixed(1)),
        rows: ROWS,
      }),
    );
    expect(first).toBeLessThan(1000);
    expect(next).toBeLessThan(1000);
    expect(full).toBeLessThan(20000);
  },
  60000,
);
