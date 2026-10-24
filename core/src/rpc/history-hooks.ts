// Copyright (c) LinkU Labs, Inc.
// SPDX-License-Identifier: Apache-2.0
import { walletReadAllowed, walletReadKeyParts } from "./read-admission";

import { useQuery } from "@tanstack/react-query";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useWalletRpc, type WalletAccountHistory } from "./WalletRpcContext";

/** Poll interval while a just-confirmed transaction is not yet in the window. */
export const EXPECTED_HISTORY_POLL_MS = 2_000;
/** Give up the fast poll after this long; the regular interval takes over. */
export const EXPECTED_HISTORY_TIMEOUT_MS = 60_000;
const MAX_EXPECTED_PER_ADDRESS = 8;

// A confirmed transaction reaches the account history window only after the
// certified boundary and the account index catch up (seconds). The wallet
// remembers its own just-sent digests so the Activity list polls quickly
// until they appear, instead of waiting for the next regular poll.
const expected = new Map<string, Map<string, number>>();

function addressKey(address: string): string {
  return address.toLowerCase();
}

/** Remember a transaction this wallet just confirmed for `address`. */
export function expectHistoryTransaction(
  address: string | null | undefined,
  digest: string | null | undefined,
  now: number = Date.now(),
): void {
  if (!address || !digest) return;
  const key = addressKey(address);
  const entries = expected.get(key) ?? new Map<string, number>();
  entries.delete(digest);
  entries.set(digest, now);
  while (entries.size > MAX_EXPECTED_PER_ADDRESS)
    entries.delete(entries.keys().next().value!);
  expected.set(key, entries);
}

/**
 * Whether `address` still waits for a remembered digest absent from `shown`.
 * Digests that appeared or timed out are forgotten.
 */
export function awaitingHistoryTransaction(
  address: string | null | undefined,
  shown: readonly { readonly digest: string }[] | undefined,
  now: number = Date.now(),
): boolean {
  if (!address) return false;
  const key = addressKey(address);
  const entries = expected.get(key);
  if (!entries) return false;
  const present = new Set(shown?.map((row) => row.digest));
  for (const [digest, since] of entries)
    if (present.has(digest) || now - since >= EXPECTED_HISTORY_TIMEOUT_MS)
      entries.delete(digest);
  if (entries.size === 0) expected.delete(key);
  return entries.size > 0;
}

/** Test seam: forget every remembered digest. */
export function clearExpectedHistoryTransactions(): void {
  expected.clear();
}

/**
 * The Activity list reads one verified page at a time. The query holds only
 * the first page, so polling, focus and manual refresh re-read just that page
 * (newest first, where a new transaction appears). Older pages are appended on
 * demand with `loadMore`, each continuing the first page's fixed window; they
 * are dropped as soon as the first page moves to another window or snapshot,
 * so rows of two different windows are never shown together.
 */
export function useWalletAccountHistory(
  address?: string | null,
  refreshInterval = 20_000,
) {
  const rpc = useWalletRpc();
  const query = useQuery({
    queryKey: [
      "wallet-account-history",
      rpc.bindingKey,
      rpc.readSessionKey,
      ...walletReadKeyParts(rpc, "history"),
      address,
    ],
    queryFn: ({ signal }) =>
      rpc.readAccountHistory(address!, signal, { continuation: null }),
    enabled:
      walletReadAllowed(rpc, "history") && rpc.hasFullnodeSession && !!address,
    retry: false,
    gcTime: 10_000,
    staleTime: 10_000,
    refetchInterval: (current) =>
      awaitingHistoryTransaction(address, current.state.data?.transactions)
        ? Math.min(EXPECTED_HISTORY_POLL_MS, refreshInterval || Infinity)
        : refreshInterval,
    // A refresh — manual, on focus or from the interval — must not blank the
    // list: the previous page stays rendered until the new one arrives, and the
    // reader returns whole windows newest-first, so new transactions appear at
    // the head. Switching accounts drops it, so one address's rows never show
    // under another.
    placeholderData: (previous, previousQuery) =>
      previousQuery?.queryKey.at(-1) === address ? previous : undefined,
    meta: { skipPersistedCache: true, walletReadOperation: "history" },
  });
  const first =
    !walletReadAllowed(rpc, "history") || query.isError ? undefined : query.data;
  // Older pages belong to the exact window and snapshot of the first page.
  const windowKey = first
    ? `${first.bindingKey}|${first.readSessionKey}|${first.address}|${first.checkpointHi}|${first.snapshot}`
    : null;
  const [more, setMore] = useState<{
    key: string | null;
    pages: readonly WalletAccountHistory[];
  }>({ key: null, pages: [] });
  const [moreError, setMoreError] = useState<unknown>(null);
  const [loadingMore, setLoadingMore] = useState(false);
  const pages = more.key === windowKey ? more.pages : [];
  const inFlight = useRef<AbortController | null>(null);
  useEffect(() => {
    // A new window invalidates any page still being fetched for the old one.
    inFlight.current?.abort();
    inFlight.current = null;
    setLoadingMore(false);
    setMoreError(null);
  }, [windowKey]);
  useEffect(() => () => inFlight.current?.abort(), []);
  const tail = pages.at(-1) ?? first;
  const continuation = tail?.continuation ?? null;
  const loadMore = useCallback(async () => {
    if (!address || !continuation || inFlight.current) return;
    const controller = new AbortController();
    inFlight.current = controller;
    const key = windowKey;
    setLoadingMore(true);
    setMoreError(null);
    try {
      const page = await rpc.readAccountHistory(address, controller.signal, {
        continuation,
      });
      if (controller.signal.aborted) return;
      setMore((current) => ({
        key,
        pages: [...(current.key === key ? current.pages : []), page],
      }));
    } catch (error) {
      if (!controller.signal.aborted) setMoreError(error);
    } finally {
      if (inFlight.current === controller) {
        inFlight.current = null;
        setLoadingMore(false);
      }
    }
  }, [address, continuation, rpc, windowKey]);
  const data = useMemo(
    () =>
      first && pages.length
        ? Object.freeze({
            ...first,
            transactions: Object.freeze(
              [first, ...pages].flatMap((page) => page.transactions),
            ),
            continuation,
          })
        : first,
    [first, pages, continuation],
  );
  return {
    ...query,
    data,
    /** Whether older verified pages of the same window remain to be read. */
    hasMore: !!continuation,
    loadMore,
    loadingMore,
    /** A failed older page; the loaded rows stay valid and loading can be retried. */
    loadMoreError: moreError,
  };
}
