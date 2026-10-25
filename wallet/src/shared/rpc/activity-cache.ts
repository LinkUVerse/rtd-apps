// Copyright (c) LinkU Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { del, get, update } from 'idb-keyval';
import type {
  WalletAccountHistory,
  WalletHistoryTransaction,
} from 'rtd-apps-core/src/rpc/WalletRpcContext';

/**
 * Display-only copy of the Activity list's newest verified page, so the tab can
 * show the last result immediately while the verified read runs. It is never a
 * substitute for a verified read: it carries no cursor, it is keyed by the
 * network binding (chain, generation, endpoints) and the account, and the
 * caller replaces it with the fresh page — or with the read's error — as soon
 * as the read settles. The generic query cache deliberately excludes chain
 * facts (`wallet-*` keys), so this store is separate and versioned.
 */
const STORE_KEY = 'wallet-activity-cache.v1';
const MAX_ENTRIES = 16;
const MAX_ROWS = 20;

export interface CachedActivity {
  readonly savedAt: number;
  readonly checkpointLo: number;
  readonly checkpointHi: number;
  readonly coverage: WalletAccountHistory['coverage'];
  readonly transactions: readonly WalletHistoryTransaction[];
}
interface Entry extends CachedActivity {
  readonly version: 1;
  readonly bindingKey: string;
  readonly address: string;
}
type Store = Record<string, Entry>;

export function activityCacheKey(bindingKey: string, address: string) {
  return JSON.stringify([bindingKey, address.toLowerCase()]);
}

const integer = (v: unknown): v is number =>
  typeof v === 'number' && Number.isSafeInteger(v) && v >= 0;

function validRow(row: unknown): row is WalletHistoryTransaction {
  if (!row || typeof row !== 'object') return false;
  const r = row as Record<string, unknown>;
  return (
    typeof r.digest === 'string' &&
    r.digest.length > 0 &&
    integer(r.checkpoint) &&
    (r.sender === null || typeof r.sender === 'string') &&
    (r.status === 'SUCCESS' || r.status === 'FAILURE') &&
    integer(r.timestampMs) &&
    Array.isArray(r.origins) &&
    (r.transaction === null || typeof r.transaction === 'object')
  );
}

/** A stored entry is used only if it matches the exact binding and account. */
export function decodeActivity(
  value: unknown,
  bindingKey: string,
  address: string,
): CachedActivity | undefined {
  if (!value || typeof value !== 'object') return undefined;
  const e = value as Partial<Entry>;
  if (
    e.version !== 1 ||
    e.bindingKey !== bindingKey ||
    typeof e.address !== 'string' ||
    e.address !== address.toLowerCase() ||
    !integer(e.savedAt) ||
    !integer(e.checkpointLo) ||
    !integer(e.checkpointHi) ||
    e.checkpointLo > e.checkpointHi ||
    !e.coverage ||
    typeof e.coverage !== 'object' ||
    !Array.isArray(e.transactions) ||
    e.transactions.length > MAX_ROWS ||
    !e.transactions.every(validRow)
  )
    return undefined;
  return {
    savedAt: e.savedAt,
    checkpointLo: e.checkpointLo,
    checkpointHi: e.checkpointHi,
    coverage: e.coverage,
    transactions: e.transactions,
  };
}

/** Only what an Activity card renders; native facts and receipts are re-read on open. */
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
        timer = setTimeout(() => reject(new Error('activity cache did not settle')), timeoutMs);
      }),
    ]);
  } finally {
    if (timer !== undefined) clearTimeout(timer);
  }
}

/**
 * idb-keyval can stay unsettled when another extension context blocks the
 * database, so a read is bounded; any failure simply means "no cache".
 */
export async function readActivity(
  bindingKey: string,
  address: string,
  timeoutMs = 1_500,
): Promise<CachedActivity | undefined> {
  try {
    const store = await bounded(get<Store>(STORE_KEY), timeoutMs);
    return decodeActivity(store?.[activityCacheKey(bindingKey, address)], bindingKey, address);
  } catch {
    return undefined;
  }
}

/** Store the newest verified page; keeps the most recent entries only. */
export async function writeActivity(
  bindingKey: string,
  address: string,
  history: WalletAccountHistory,
  now: number = Date.now(),
): Promise<void> {
  const entry: Entry = {
    version: 1,
    bindingKey,
    address: address.toLowerCase(),
    savedAt: now,
    checkpointLo: history.checkpointLo,
    checkpointHi: history.checkpointHi,
    coverage: { ...history.coverage },
    transactions: history.transactions.slice(0, MAX_ROWS).map(slim),
  };
  try {
    await bounded(
      update<Store>(STORE_KEY, (current) => {
        const next: Store = { ...(current && typeof current === 'object' ? current : {}) };
        next[activityCacheKey(bindingKey, address)] = entry;
        const kept = Object.entries(next)
          .filter(([, v]) => v && typeof v === 'object' && integer(v.savedAt))
          .sort(([, a], [, b]) => b.savedAt - a.savedAt)
          .slice(0, MAX_ENTRIES);
        return Object.fromEntries(kept);
      }),
      3_000,
    );
  } catch {
    // A cache that cannot be written only costs the next visit its head start.
  }
}

/** Logout removes every cached account's activity. */
export async function clearActivityCache(): Promise<void> {
  try {
    await bounded(del(STORE_KEY), 3_000);
  } catch {
    // Nothing else depends on this store.
  }
}
