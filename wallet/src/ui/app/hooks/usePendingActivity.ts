// Copyright (c) LinkU Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import {
  activityPendingKey,
  readPendingActivity,
  readPendingActivitySync,
  reconcilePendingActivity,
  type LocalActivityEntry,
} from '_src/shared/rpc/activity-pending';
import { expectHistoryTransaction } from 'rtd-apps-core/src/rpc/history-hooks';
import { useWalletRpc } from 'rtd-apps-core/src/rpc/WalletRpcContext';
import type { WalletHistoryTransaction } from 'rtd-apps-core/src/rpc/WalletRpcContext';
import { useEffect, useMemo, useState } from 'react';

export function useLocalActivityEntry(
  address: string | null | undefined,
  digest: string | null | undefined,
) {
  const rpc = useWalletRpc();
  const bindingKey = rpc.bindingKey;
  const [entry, setEntry] = useState<LocalActivityEntry | undefined>(() =>
    address && digest
      ? readPendingActivitySync(bindingKey, address).find(
          (candidate) => candidate.digest === digest,
        )
      : undefined,
  );
  useEffect(() => {
    if (!address || !digest) {
      setEntry(undefined);
      return;
    }
    let live = true;
    void readPendingActivity(bindingKey, address).then((entries) => {
      if (live)
        setEntry(entries.find((candidate) => candidate.digest === digest));
    });
    return () => {
      live = false;
    };
  }, [address, digest, bindingKey]);
  return entry;
}

interface PendingState {
  readonly key: string | null;
  readonly entries: readonly LocalActivityEntry[];
}

function toHistoryTransaction(
  entry: LocalActivityEntry,
): WalletHistoryTransaction {
  return Object.freeze({
    digest: entry.digest,
    checkpoint: 0,
    sender: entry.sender,
    origins: ['sender'],
    transaction: null,
    status: entry.status,
    timestampMs: entry.sentAt,
    kind: 'ProgrammableTransaction',
    nativeTransaction: null,
    eventFacts: null,
    kioskTransfers: null,
  });
}

/**
 * Local transfers not yet present in the verified Activity page. A successful
 * local row carries a validated execution receipt, so it is shown as complete
 * immediately; the verified page later replaces it under the same digest.
 */
export function usePendingActivity(
  address: string | null | undefined,
  verified: readonly WalletHistoryTransaction[] | undefined,
) {
  const rpc = useWalletRpc();
  const bindingKey = rpc.bindingKey;
  const key =
    address && bindingKey
      ? activityPendingKey(bindingKey, address)
      : null;
  const [state, setState] = useState<PendingState>(() => ({
    key,
    entries:
      key && address
        ? readPendingActivitySync(bindingKey, address)
        : [],
  }));
  useEffect(() => {
    if (!key || !address) {
      setState({ key, entries: [] });
      return;
    }
    let live = true;
    void readPendingActivity(bindingKey, address).then((entries) => {
      if (live) setState({ key, entries });
    });
    return () => {
      live = false;
    };
  }, [key, bindingKey, address]);
  const entries = state.key === key ? state.entries : [];
  useEffect(() => {
    if (!key || !address || !verified) return;
    const next = reconcilePendingActivity(
      bindingKey,
      address,
      verified.map((row) => row.digest),
    );
    setState((current) =>
      current.key === key && current.entries === next
        ? current
        : { key, entries: next },
    );
  }, [key, bindingKey, address, verified, entries]);
  useEffect(() => {
    if (!address) return;
    for (const entry of entries)
      if (entry.confirmedAt === null)
        expectHistoryTransaction(address, entry.digest);
  }, [address, entries]);
  return useMemo(() => {
    const verifiedDigests = new Set((verified ?? []).map((row) => row.digest));
    const pendingRows = entries
      .filter(
        (entry) =>
          entry.confirmedAt === null && !verifiedDigests.has(entry.digest),
      )
      .map(toHistoryTransaction);
    // The local row is written only after the background validated the
    // execution receipt, so a successful local row is already complete even
    // while the published activity history is catching up.
    const locallyComplete = pendingRows.filter(
      (row) => row.status === "SUCCESS",
    );
    return {
      pendingRows,
      pendingDigests: new Set(
        pendingRows
          .filter((row) => row.status !== "SUCCESS")
          .map((row) => row.digest),
      ),
      confirmedDigests: new Set([
        ...entries
          .filter((entry) => entry.confirmedAt !== null)
          .map((entry) => entry.digest),
        ...locallyComplete.map((row) => row.digest),
      ]),
    };
  }, [entries, verified]);
}
