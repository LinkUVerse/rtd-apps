// Copyright (c) LinkU Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { blake2b } from "@noble/hashes/blake2.js";
import { toBase58 } from "rtd-typescript/utils";
import type {
  WalletAccountHistory,
  WalletHistoryContinuation,
  WalletHistoryCoverage,
  WalletHistoryPageRequest,
} from "rtd-apps-core/src/rpc/WalletRpcContext";
import { WalletHistoryError } from "./history-facts";
import { ledgerHistoryRow } from "./ledger-history-view";
import type {
  WalletLedgerHistoryPage,
  WalletLedgerReader,
} from "./ledger-reader";

const MAX_PAGES = 100;

function snapshotKey(
  bindingKey: string,
  readSessionKey: string,
  address: string,
  lower: number,
  upper: number,
) {
  return toBase58(
    blake2b(
      new TextEncoder().encode(
        JSON.stringify([bindingKey, readSessionKey, address, lower, upper]),
      ),
      { dkLen: 32 },
    ),
  );
}

export function nativeHistoryCoverage(
  certified: boolean,
): WalletHistoryCoverage {
  // Native Ledger history has no extension registration/Kiosk/capability
  // indexes. Those flags are true because the Activity page is not claiming
  // extension coverage; only genesis-to-tip certification is meaningful here.
  return Object.freeze({
    registrationComplete: true,
    completeForRegisteredKiosks: true,
    completeForDiscoveredOwnerTokens: true,
    completeForDiscoveredCapabilities: true,
    allAccountActivityCertified: certified,
    allAccountTransfersCertified: null,
  });
}

export async function ledgerAccountHistoryPage(
  reader: WalletLedgerReader,
  page: WalletLedgerHistoryPage,
  previous: WalletHistoryContinuation | null,
): Promise<WalletAccountHistory> {
  if (
    previous &&
    (previous.bindingKey !== reader.session.bindingKey ||
      previous.readSessionKey !== reader.session.cacheKey ||
      previous.address !== page.address)
  )
    throw new WalletHistoryError("changed");
  const lower = previous?.window.lower ?? page.lowestAvailableCheckpoint ?? 0;
  const upper = previous?.window.upper ?? page.checkpointHeight;
  if (
    page.checkpointHeight < upper ||
    (page.lowestAvailableCheckpoint !== null &&
      page.lowestAvailableCheckpoint > lower)
  )
    throw new WalletHistoryError("changed");
  if (previous && (page.address !== previous.address || lower > upper))
    throw new WalletHistoryError("changed");
  const flags = nativeHistoryCoverage(lower === 0);
  const snapshot = snapshotKey(
    reader.session.bindingKey,
    reader.session.cacheKey,
    page.address,
    lower,
    upper,
  );
  const rows = await Promise.all(
    page.transactions.map((raw) => ledgerHistoryRow(raw, page.address)),
  );
  if (rows.some((row) => row.checkpoint > upper))
    throw new WalletHistoryError("changed");
  if (
    rows.some(
      (row, index) => index > 0 && rows[index - 1].digest === row.digest,
    )
  )
    throw new WalletHistoryError("incompatible");
  let continuation: WalletHistoryContinuation | null = null;
  if (page.hasNextPage) {
    if (!page.nextCursor) throw new WalletHistoryError("coverage");
    const cursors = previous?.cursors ?? [];
    if (cursors.includes(page.nextCursor))
      throw new WalletHistoryError("incompatible");
    const last = rows.at(-1) ??
      previous?.last ?? {
        checkpoint: upper,
        digest: snapshot,
      };
    continuation = Object.freeze({
      bindingKey: reader.session.bindingKey,
      readSessionKey: reader.session.cacheKey,
      address: page.address,
      window: Object.freeze({
        lower,
        upper,
        digest: snapshot,
        certified: lower === 0,
      }),
      snapshot,
      flags: JSON.stringify(flags),
      last,
      cursor: page.nextCursor,
      cursors: Object.freeze([...cursors, page.nextCursor]),
    });
  }
  return Object.freeze({
    bindingKey: reader.session.bindingKey,
    readSessionKey: reader.session.cacheKey,
    address: page.address,
    checkpointLo: lower,
    checkpointHi: upper,
    checkpointDigest: snapshot,
    snapshot,
    coverage: flags,
    transactions: Object.freeze(rows),
    continuation,
  });
}

export async function readLedgerAccountHistory(
  reader: WalletLedgerReader,
  address: string,
  signal?: AbortSignal,
  page?: WalletHistoryPageRequest,
): Promise<WalletAccountHistory> {
  if (page) {
    const raw = await reader.historyPage(
      address,
      page.continuation?.cursor ?? null,
      {
        signal,
      },
    );
    return ledgerAccountHistoryPage(reader, raw, page.continuation);
  }
  let previous: WalletHistoryContinuation | null = null;
  const pages: WalletAccountHistory[] = [];
  for (let index = 0; index < MAX_PAGES; index++) {
    const raw = await reader.historyPage(address, previous?.cursor ?? null, {
      signal,
    });
    const current = await ledgerAccountHistoryPage(reader, raw, previous);
    pages.push(current);
    previous = current.continuation ?? null;
    if (!previous) break;
  }
  if (previous) throw new WalletHistoryError("partial");
  const first = pages[0];
  return Object.freeze({
    ...first,
    transactions: Object.freeze(pages.flatMap((value) => value.transactions)),
    continuation: null,
  });
}
