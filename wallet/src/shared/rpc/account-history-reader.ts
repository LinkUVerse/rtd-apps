// Copyright (c) LinkU Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import type {
  WalletAccountHistory,
  WalletHistoryCoverage,
  WalletHistoryTransaction,
} from "rtd-apps-core/src/rpc/WalletRpcContext";
import { walletAddress } from "./asset-address";
import { checkpointNumber } from "./graphql-snapshot";
import {
  admitHistoryTransaction,
  historyCheck,
  historyInteger,
  WalletHistoryError,
} from "./history-facts";
import { WalletReadSession } from "./session";

import {
  historyCoverageFlags,
  runAccountHistoryRead,
} from "./account-history-protocol";
export {
  HISTORY_COVERAGE_QUERY,
  HISTORY_PAGE_QUERY,
} from "./account-history-protocol";
/** One admitted complete window. A partial page/cursor is never exposed as an empty or complete history. */
export class WalletAccountHistoryReader {
  readonly #timeout: number;
  readonly #pageSize: number;
  readonly #maxPages: number;
  readonly #minimumCheckpoint: number | undefined;
  constructor(
    readonly session: WalletReadSession,
    readonly options: {
      fetch?: typeof fetch;
      timeoutMs?: number;
      pageSize?: number;
      maxPages?: number;
      minimumCheckpoint?: string;
    } = {},
  ) {
    // Admission, every page and final revalidation share this one deadline.
    this.#timeout = options.timeoutMs ?? 60_000;
    this.#pageSize = options.pageSize ?? 20;
    this.#maxPages = options.maxPages ?? 100;
    this.#minimumCheckpoint =
      options.minimumCheckpoint === undefined
        ? undefined
        : checkpointNumber(options.minimumCheckpoint);
    if (
      !Number.isSafeInteger(this.#timeout) ||
      this.#timeout < 1 ||
      this.#timeout > 60_000 ||
      !Number.isInteger(this.#pageSize) ||
      this.#pageSize < 1 ||
      this.#pageSize > 50 ||
      !Number.isInteger(this.#maxPages) ||
      this.#maxPages < 1 ||
      this.#maxPages > 100
    )
      throw new RangeError("账户历史查询预算无效");
  }
  async read(
    address: string,
    callerSignal?: AbortSignal,
  ): Promise<WalletAccountHistory> {
    const owner = walletAddress(address);
    const url = this.session.profile.endpoints.accountHistoryUrl;
    if (!url || !this.session.profile.endpoints.graphqlUrl)
      throw new WalletHistoryError("unconfigured");
    return runAccountHistoryRead(
      this.session,
      {
        fetch: this.options.fetch,
        timeoutMs: this.#timeout,
        signal: callerSignal,
      },
      async (protocol) =>
        protocol.inWindow(async ({ coverage: before }) => {
          const signal = protocol.signal,
            chain = this.session.profile.expectedGenesisDigest;
          const rows: WalletHistoryTransaction[] = [],
            seen = new Set<string>(),
            cursors = new Set<string>();
          let cursor: string | null = null,
            snapshot: string | undefined,
            total: number | undefined,
            flags: WalletHistoryCoverage | undefined,
            complete = false;
          for (let pageNumber = 0; pageNumber < this.#maxPages; pageNumber++) {
            signal.throwIfAborted();
            const page = await protocol.page({
              chain,
              address: owner,
              lo: before.lower,
              hi: before.upper,
              limit: this.#pageSize,
              cursor,
            });
            historyCheck(
              page.chainId === chain &&
                page.address === owner &&
                historyInteger(page.checkpointLo) === before.lower &&
                historyInteger(page.checkpointHi) === before.upper &&
                page.limit === this.#pageSize &&
                typeof page.snapshot === "string" &&
                /^[0-9a-f]{64}$/.test(page.snapshot) &&
                typeof page.hasNextPage === "boolean",
            );
            const count = historyInteger(page.totalTransactions),
              pageFlags = historyCoverageFlags(page);
            if (count > this.#pageSize * this.#maxPages)
              throw new WalletHistoryError("budget");
            historyCheck(
              pageFlags.allAccountActivityCertified === before.certified,
            );
            if (
              snapshot !== undefined &&
              (snapshot !== page.snapshot ||
                total !== count ||
                JSON.stringify(flags) !== JSON.stringify(pageFlags))
            )
              throw new WalletHistoryError("changed");
            snapshot = page.snapshot;
            total = count;
            flags = pageFlags;
            historyCheck(
              Array.isArray(page.transactions) &&
                page.transactions.length <= this.#pageSize,
            );
            for (const input of page.transactions) {
              const row = await admitHistoryTransaction(
                  input,
                  before.lower,
                  before.upper,
                ),
                previous = rows.at(-1);
              historyCheck(
                !seen.has(row.digest) &&
                  (!previous ||
                    previous.checkpoint > row.checkpoint ||
                    (previous.checkpoint === row.checkpoint &&
                      previous.digest < row.digest)),
              );
              rows.push(row);
              seen.add(row.digest);
              signal.throwIfAborted();
            }
            historyCheck(rows.length <= count);
            if (!page.hasNextPage) {
              historyCheck(page.nextCursor === null && rows.length === count);
              complete = true;
              break;
            }
            historyCheck(
              page.transactions.length === this.#pageSize &&
                rows.length < count &&
                typeof page.nextCursor === "string" &&
                page.nextCursor.length <= 2048 &&
                /^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/.test(page.nextCursor) &&
                !cursors.has(page.nextCursor),
            );
            cursor = page.nextCursor;
            cursors.add(cursor);
          }
          if (!complete) throw new WalletHistoryError("budget");
          return Object.freeze({
            bindingKey: this.session.bindingKey,
            readSessionKey: this.session.cacheKey,
            address: owner,
            checkpointLo: before.lower,
            checkpointHi: before.upper,
            checkpointDigest: before.digest,
            snapshot: snapshot!,
            coverage: flags!,
            transactions: Object.freeze(rows),
            totalTransactions: total!,
          });
        }, this.#minimumCheckpoint),
    );
  }
}
