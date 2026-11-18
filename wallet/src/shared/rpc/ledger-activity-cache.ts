// Copyright (c) LinkU Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { del, get, update } from "idb-keyval";
import type { WalletHistoryTransaction } from "rtd-apps-core/src/rpc/WalletRpcContext";
import { walletAddress } from "./asset-address";
import { ledgerHistoryRow } from "./ledger-history-view";
import type { WalletLedgerHistoryPage } from "./ledger-reader";

const STORE_KEY = "wallet-ledger-activity-cache.v1";
const MAX_ENTRIES = 16;
const MAX_ROWS = 20;

export interface CachedLedgerActivity {
  readonly savedAt: number;
  readonly checkpointLo: number;
  readonly checkpointHi: number;
  readonly transactions: readonly WalletHistoryTransaction[];
}
interface Entry extends CachedLedgerActivity {
  readonly version: 1;
  readonly bindingKey: string;
  readonly address: string;
}
type Store = Record<string, Entry>;

export function ledgerActivityCacheKey(bindingKey: string, address: string) {
  return JSON.stringify([bindingKey, address.toLowerCase()]);
}

const integer = (value: unknown): value is number =>
  typeof value === "number" && Number.isSafeInteger(value) && value >= 0;

function validRow(row: unknown): row is WalletHistoryTransaction {
  if (!row || typeof row !== "object") return false;
  const value = row as Record<string, unknown>;
  return (
    typeof value.digest === "string" &&
    value.digest.length > 0 &&
    integer(value.checkpoint) &&
    (value.sender === null || typeof value.sender === "string") &&
    (value.status === "SUCCESS" || value.status === "FAILURE") &&
    integer(value.timestampMs) &&
    Array.isArray(value.origins) &&
    (value.transaction === null || typeof value.transaction === "object")
  );
}

export function decodeLedgerActivity(
  value: unknown,
  bindingKey: string,
  address: string,
): CachedLedgerActivity | undefined {
  if (!value || typeof value !== "object") return undefined;
  const entry = value as Partial<Entry>;
  if (
    entry.version !== 1 ||
    entry.bindingKey !== bindingKey ||
    typeof entry.address !== "string" ||
    entry.address !== address.toLowerCase() ||
    !integer(entry.savedAt) ||
    !integer(entry.checkpointLo) ||
    !integer(entry.checkpointHi) ||
    entry.checkpointLo > entry.checkpointHi ||
    !Array.isArray(entry.transactions) ||
    entry.transactions.length > MAX_ROWS ||
    !entry.transactions.every(validRow)
  )
    return undefined;
  return {
    savedAt: entry.savedAt,
    checkpointLo: entry.checkpointLo,
    checkpointHi: entry.checkpointHi,
    transactions: entry.transactions,
  };
}

function slim(row: WalletHistoryTransaction): WalletHistoryTransaction {
  return {
    digest: row.digest,
    checkpoint: row.checkpoint,
    sender: row.sender,
    origins: [...row.origins],
    transaction: row.transaction,
    status: row.status,
    timestampMs: row.timestampMs,
    kind: row.kind,
    nativeTransaction: null,
    eventFacts: null,
    kioskTransfers: null,
  };
}

async function bounded<T>(work: Promise<T>, timeoutMs: number): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      work,
      new Promise<never>((_, reject) => {
        timer = setTimeout(
          () => reject(new Error("ledger activity cache did not settle")),
          timeoutMs,
        );
      }),
    ]);
  } finally {
    if (timer !== undefined) clearTimeout(timer);
  }
}

export async function readLedgerActivity(
  bindingKey: string,
  address: string,
  timeoutMs = 1_500,
): Promise<CachedLedgerActivity | undefined> {
  try {
    const store = await bounded(get<Store>(STORE_KEY), timeoutMs);
    return decodeLedgerActivity(
      store?.[ledgerActivityCacheKey(bindingKey, address)],
      bindingKey,
      address,
    );
  } catch {
    return undefined;
  }
}

export async function writeLedgerActivity(
  bindingKey: string,
  address: string,
  page: WalletLedgerHistoryPage,
  now: number = Date.now(),
): Promise<void> {
  const owner = walletAddress(address);
  const mapped = await Promise.allSettled(
    page.transactions
      .slice(0, MAX_ROWS)
      .map((raw) => ledgerHistoryRow(raw, owner)),
  );
  const rows = mapped
    .filter(
      (result): result is PromiseFulfilledResult<WalletHistoryTransaction> =>
        result.status === "fulfilled",
    )
    .map((result) => slim(result.value));
  if (!rows.length) return;
  const entry: Entry = {
    version: 1,
    bindingKey,
    address: owner,
    savedAt: now,
    checkpointLo: page.lowestAvailableCheckpoint ?? 0,
    checkpointHi: page.checkpointHeight,
    transactions: rows,
  };
  try {
    await bounded(
      update<Store>(STORE_KEY, (current) => {
        const next: Store = {
          ...(current && typeof current === "object" ? current : {}),
        };
        next[ledgerActivityCacheKey(bindingKey, owner)] = entry;
        return Object.fromEntries(
          Object.entries(next)
            .filter(
              ([, value]) =>
                value && typeof value === "object" && integer(value.savedAt),
            )
            .sort(([, a], [, b]) => b.savedAt - a.savedAt)
            .slice(0, MAX_ENTRIES),
        );
      }),
      3_000,
    );
  } catch {
    // A cache that cannot be written only costs the next visit its head start.
  }
}

export async function clearLedgerActivityCache(): Promise<void> {
  try {
    await bounded(del(STORE_KEY), 3_000);
  } catch {
    // Nothing else depends on this store.
  }
}
