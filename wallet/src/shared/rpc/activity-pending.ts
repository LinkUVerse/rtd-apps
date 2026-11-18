// Copyright (c) LinkU Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { del, get, update } from 'idb-keyval';

/**
 * Locally known transfers that the account history service has not returned
 * yet. A confirmed execution is written here before the checkpoint/indexer
 * catches up, so the Activity list can show it immediately as "confirming".
 * Once a verified history page contains the digest, the entry is marked
 * confirmed and the row is rendered from the verified page instead.
 *
 * This is display-only: a pending entry is never treated as a certified
 * history fact, and the verified read remains the only source of the window,
 * coverage flags and final row facts.
 */
const STORE_KEY = 'wallet-activity-pending.v1';
const MAX_ENTRIES_PER_ACCOUNT = 20;
const MAX_ACCOUNTS = 16;
const PENDING_TTL_MS = 7 * 24 * 60 * 60 * 1_000;
const CONFIRMED_TTL_MS = 24 * 60 * 60 * 1_000;

export interface LocalActivitySummary {
  readonly kind: 'coin' | 'nft';
  readonly recipient: string;
  readonly recipientName?: string;
  readonly amount?: string;
  readonly coinSymbol?: string;
  readonly gasBudget?: string;
  readonly objectId?: string;
  readonly objectType?: string;
}

export interface LocalActivityEntry {
  readonly digest: string;
  readonly sender: string;
  readonly status: 'SUCCESS' | 'FAILURE';
  readonly sentAt: number;
  /** When the verified history page first returned this digest. */
  readonly confirmedAt: number | null;
  /** Facts from the approved draft, shown only while chain details are unavailable. */
  readonly summary?: LocalActivitySummary;
}

interface Entry extends LocalActivityEntry {
  readonly version: 1;
  readonly bindingKey: string;
  readonly address: string;
}
type Store = Record<string, Entry[]>;

/** Entries written in this UI context can be read synchronously on mount. */
const memory = new Map<string, readonly LocalActivityEntry[]>();

export function activityPendingKey(bindingKey: string, address: string) {
  return JSON.stringify([bindingKey, address.toLowerCase()]);
}

const integer = (value: unknown): value is number =>
  typeof value === 'number' && Number.isSafeInteger(value) && value >= 0;

function validSummary(value: unknown): value is LocalActivitySummary {
  if (!value || typeof value !== 'object') return false;
  const summary = value as Record<string, unknown>;
  const text = (field: unknown) =>
    field === undefined ||
    (typeof field === 'string' && field.length > 0 && field.length <= 512);
  return (
    (summary.kind === 'coin' || summary.kind === 'nft') &&
    typeof summary.recipient === 'string' &&
    summary.recipient.length > 0 &&
    summary.recipient.length <= 512 &&
    text(summary.recipientName) &&
    text(summary.amount) &&
    text(summary.coinSymbol) &&
    text(summary.gasBudget) &&
    text(summary.objectId) &&
    text(summary.objectType)
  );
}

function validEntry(value: unknown): value is Entry {
  if (!value || typeof value !== 'object') return false;
  const entry = value as Record<string, unknown>;
  return (
    entry.version === 1 &&
    typeof entry.bindingKey === 'string' &&
    typeof entry.address === 'string' &&
    typeof entry.digest === 'string' &&
    entry.digest.length > 0 &&
    entry.digest.length <= 512 &&
    typeof entry.sender === 'string' &&
    entry.sender.length > 0 &&
    entry.sender.length <= 512 &&
    (entry.status === 'SUCCESS' || entry.status === 'FAILURE') &&
    integer(entry.sentAt) &&
    (entry.confirmedAt === null ||
      (integer(entry.confirmedAt) && entry.confirmedAt >= entry.sentAt)) &&
    (entry.summary === undefined ||
      entry.summary === null ||
      validSummary(entry.summary))
  );
}

function fresh(entry: LocalActivityEntry, now: number): boolean {
  return entry.confirmedAt === null
    ? now - entry.sentAt < PENDING_TTL_MS
    : now - entry.confirmedAt < CONFIRMED_TTL_MS;
}

function decode(
  value: unknown,
  bindingKey: string,
  address: string,
  now: number,
): readonly LocalActivityEntry[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter(validEntry)
    .filter((entry) => entry.bindingKey === bindingKey)
    .filter((entry) => entry.address === address.toLowerCase())
    .filter((entry) => fresh(entry, now))
    .sort((a, b) => b.sentAt - a.sentAt)
    .slice(0, MAX_ENTRIES_PER_ACCOUNT)
    .map(({ digest, sender, status, sentAt, confirmedAt, summary }) => ({
      digest,
      sender,
      status,
      sentAt,
      confirmedAt,
      ...(summary ? { summary } : {}),
    }));
}

async function bounded<T>(work: Promise<T>, timeoutMs: number): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      work,
      new Promise<never>((_, reject) => {
        timer = setTimeout(
          () => reject(new Error('pending activity did not settle')),
          timeoutMs,
        );
      }),
    ]);
  } finally {
    if (timer !== undefined) clearTimeout(timer);
  }
}

async function persist(
  bindingKey: string,
  address: string,
  entries: readonly LocalActivityEntry[],
): Promise<void> {
  const key = activityPendingKey(bindingKey, address);
  const stored: Entry[] = entries.map((entry) => ({
    version: 1,
    bindingKey,
    address: address.toLowerCase(),
    ...entry,
  }));
  await bounded(
    update<Store>(STORE_KEY, (current) => {
      const next: Store = {
        ...(current && typeof current === 'object' ? current : {}),
      };
      if (stored.length) next[key] = stored;
      else delete next[key];
      const kept = Object.entries(next)
        .filter(([, value]) => Array.isArray(value))
        .sort(([, a], [, b]) => {
          const latest = (rows: Entry[]) =>
            Math.max(0, ...rows.map((row) => row.confirmedAt ?? row.sentAt));
          return latest(b) - latest(a);
        })
        .slice(0, MAX_ACCOUNTS);
      return Object.fromEntries(kept);
    }),
    3_000,
  );
}

/** Memory-first view for the first render after a confirmed transfer. */
export function readPendingActivitySync(
  bindingKey: string,
  address: string,
  now: number = Date.now(),
): readonly LocalActivityEntry[] {
  return (memory.get(activityPendingKey(bindingKey, address)) ?? []).filter(
    (entry) => fresh(entry, now),
  );
}

export async function readPendingActivity(
  bindingKey: string,
  address: string,
  now: number = Date.now(),
  timeoutMs = 1_500,
): Promise<readonly LocalActivityEntry[]> {
  const key = activityPendingKey(bindingKey, address);
  try {
    const store = await bounded(get<Store>(STORE_KEY), timeoutMs);
    const stored = decode(store?.[key], bindingKey, address, now);
    // A just-remembered entry can still be waiting for its idb write; do not
    // let that stale read hide it from the Activity list.
    const byDigest = new Map<string, LocalActivityEntry>();
    for (const entry of stored) byDigest.set(entry.digest, entry);
    for (const entry of memory.get(key) ?? []) {
      if (!fresh(entry, now)) continue;
      const known = byDigest.get(entry.digest);
      if (
        !known ||
        (known.confirmedAt === null && entry.confirmedAt !== null)
      )
        byDigest.set(entry.digest, entry);
    }
    const entries = [...byDigest.values()]
      .filter((entry) => fresh(entry, now))
      .sort((a, b) => b.sentAt - a.sentAt)
      .slice(0, MAX_ENTRIES_PER_ACCOUNT);
    memory.set(key, entries);
    return entries;
  } catch {
    return readPendingActivitySync(bindingKey, address);
  }
}

/**
 * Remember a successful execution before its checkpoint is indexed. The
 * in-memory copy is updated synchronously; persistence is best-effort.
 */
export function rememberPendingActivity(input: {
  readonly bindingKey: string;
  readonly address: string;
  readonly digest: string;
  readonly sender: string;
  readonly status: 'SUCCESS' | 'FAILURE';
  readonly sentAt?: number;
  readonly summary?: LocalActivitySummary;
}): void {
  const { bindingKey, address, digest, sender, status } = input;
  if (
    !bindingKey ||
    !address ||
    !digest ||
    !sender ||
    (status !== 'SUCCESS' && status !== 'FAILURE')
  )
    return;
  const key = activityPendingKey(bindingKey, address);
  const now = Date.now();
  const sentAt = input.sentAt ?? now;
  const summary =
    input.summary && validSummary(input.summary) ? input.summary : undefined;
  const current = (memory.get(key) ?? []).filter((entry) => fresh(entry, now));
  // A repeated recovery of the same digest must not reset its state, but a
  // later call can still attach the approved draft facts it did not have.
  const known = current.find((entry) => entry.digest === digest);
  if (known) {
    if (known.summary || !summary) return;
    const next = current.map((entry) =>
      entry.digest === digest ? { ...entry, summary } : entry,
    );
    memory.set(key, next);
    void persist(bindingKey, address, next).catch(() => undefined);
    return;
  }
  const next: readonly LocalActivityEntry[] = [
    {
      digest,
      sender,
      status,
      sentAt,
      confirmedAt: null,
      ...(summary ? { summary } : {}),
    },
    ...current,
  ]
    .sort((a, b) => b.sentAt - a.sentAt)
    .slice(0, MAX_ENTRIES_PER_ACCOUNT);
  memory.set(key, next);
  void persist(bindingKey, address, next).catch(() => undefined);
}

/**
 * Mark remembered digests returned by a verified history page as confirmed.
 * Returns the current entries; the caller drops pending rows whose digest is
 * already present in the verified page.
 */
export function reconcilePendingActivity(
  bindingKey: string,
  address: string,
  verifiedDigests: Iterable<string>,
  now: number = Date.now(),
): readonly LocalActivityEntry[] {
  const key = activityPendingKey(bindingKey, address);
  const current = memory.get(key);
  if (!current) return [];
  const present = new Set(verifiedDigests);
  let changed = false;
  const next = current.map((entry) => {
    if (entry.confirmedAt !== null || !present.has(entry.digest)) return entry;
    changed = true;
    return { ...entry, confirmedAt: Math.max(now, entry.sentAt) };
  });
  if (!changed) return current;
  memory.set(key, next);
  void persist(bindingKey, address, next).catch(() => undefined);
  return next;
}

/** Logout removes pending and recently confirmed activity for every account. */
export async function clearPendingActivity(): Promise<void> {
  memory.clear();
  try {
    await bounded(del(STORE_KEY), 3_000);
  } catch {
    // Nothing else depends on this display-only store.
  }
}
