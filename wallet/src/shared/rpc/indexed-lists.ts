// Copyright (c) LinkU Labs, Inc.
// SPDX-License-Identifier: Apache-2.0
import { TypeTagSerializer } from "rtd-typescript/bcs";
import { fromBase64, toBase64 } from "rtd-typescript/utils";
import { matchesAssetType } from "rtd-apps-core/src/rpc/asset-hooks";
import { walletAddress } from "./asset-address";
import { dynamicType } from "./dynamic-fields";
import { WalletEventBcs } from "./event-envelope";
import {
  GraphQLSnapshot,
  checkpointNumber,
  responseRecord,
  SnapshotReadError,
} from "./graphql-snapshot";
import { assertGenesisDigest } from "./profile";
import { collectSnapshotPages } from "./snapshot-pagination";
import { WalletReadSession } from "./session";

import type {
  IndexedListOptions,
  IndexedTransactionReference,
  IndexedEvent,
  IndexedEventFilter,
} from "rtd-apps-core/src/rpc/indexed-types";

function incompatible(): never {
  throw new SnapshotReadError("incompatible");
}
function bytes(value: unknown) {
  if (typeof value !== "string" || value.length > 1_500_000)
    return incompatible();
  const decoded = fromBase64(value);
  if (toBase64(decoded) !== value) return incompatible();
  return decoded;
}
function moduleSelector(value: string) {
  const parts = value.split("::");
  if (
    parts.length > 2 ||
    (parts.length === 2 && !/^[A-Za-z_][A-Za-z0-9_]*$/.test(parts[1]))
  )
    return incompatible();
  return [walletAddress(parts[0]), ...parts.slice(1)].join("::");
}

export const INDEXED_TRANSACTION_SELECTION =
  "digest sender { address } effects { checkpoint { sequenceNumber } }";
export const INDEXED_EVENT_SELECTION = `sequenceNumber eventBcs sender { address }
  transaction { digest effects { checkpoint { sequenceNumber } } }
  transactionModule { package { address } name } contents { type { repr } bcs }`;

/** Explicit indexed filters only. These lists are neither receipt proofs nor complete account activity. */
export class WalletIndexedLists {
  constructor(
    readonly session: WalletReadSession,
    readonly fetch?: typeof globalThis.fetch,
  ) {}

  sentTransactions(senderInput: string, options: IndexedListOptions) {
    const sender = walletAddress(senderInput);
    return this.collect(
      "transactions",
      { sentAddress: sender },
      INDEXED_TRANSACTION_SELECTION,
      options,
      (input): IndexedTransactionReference => {
        const node = responseRecord(input);
        const actual = walletAddress(responseRecord(node.sender).address);
        if (actual !== sender) return incompatible();
        return Object.freeze({
          digest: assertGenesisDigest(node.digest),
          sender: actual,
          checkpoint: checkpointNumber(
            responseRecord(responseRecord(node.effects).checkpoint)
              .sequenceNumber,
          ),
        });
      },
      (item) => item.digest,
    );
  }

  events(input: IndexedEventFilter, options: IndexedListOptions) {
    if (Object.keys(input).length !== 1) return incompatible();
    const filter: Record<string, string> =
      input.type !== undefined
        ? { type: dynamicType(input.type) }
        : { module: moduleSelector(input.module!) };
    let prior: { digest: string; sequence: number } | undefined;
    const completedTransactions = new Set<string>();
    return this.collect<IndexedEvent>(
      "events",
      filter,
      INDEXED_EVENT_SELECTION,
      options,
      (input): IndexedEvent => {
        const node = responseRecord(input),
          tx = responseRecord(node.transaction);
        const module = responseRecord(node.transactionModule),
          contents = responseRecord(node.contents);
        const raw = bytes(node.eventBcs),
          event = WalletEventBcs.parse(raw);
        if (
          toBase64(WalletEventBcs.serialize(event).toBytes()) !== toBase64(raw)
        )
          return incompatible();
        const type = dynamicType(responseRecord(contents.type).repr);
        const packageId = walletAddress(responseRecord(module.package).address);
        // The native GraphQL resolver represents ZERO system-event senders as null.
        // Accept that representation only when the canonical Event BCS proves ZERO.
        const sender = node.sender === null && event.sender === walletAddress("0x0")
          ? event.sender
          : walletAddress(responseRecord(node.sender).address);
        if (
          typeof module.name !== "string" ||
          !/^[A-Za-z_][A-Za-z0-9_]*$/.test(module.name) ||
          event.packageId !== packageId ||
          event.module !== module.name ||
          event.sender !== sender ||
          dynamicType(TypeTagSerializer.tagToString({ struct: event.type })) !==
            type ||
          toBase64(event.contents) !== toBase64(bytes(contents.bcs))
        )
          return incompatible();
        if (filter.type !== undefined && !matchesAssetType(type, filter.type))
          return incompatible();
        if (
          filter.module !== undefined &&
          filter.module !== packageId &&
          filter.module !== `${packageId}::${module.name}`
        )
          return incompatible();
        const digest = assertGenesisDigest(tx.digest),
          sequenceNumber = checkpointNumber(node.sequenceNumber);
        if (
          prior?.digest === digest &&
          (options.order === "ascending"
            ? sequenceNumber <= prior.sequence
            : sequenceNumber >= prior.sequence)
        )
          return incompatible();
        if (prior && prior.digest !== digest)
          completedTransactions.add(prior.digest);
        if (completedTransactions.has(digest)) return incompatible();
        prior = { digest, sequence: sequenceNumber };
        return Object.freeze({
          transactionDigest: digest,
          sequenceNumber,
          checkpoint: checkpointNumber(
            responseRecord(responseRecord(tx.effects).checkpoint)
              .sequenceNumber,
          ),
          sender,
          packageId,
          module: module.name,
          type,
          contents: Uint8Array.from(event.contents),
        });
      },
      (item) => `${item.transactionDigest}:${item.sequenceNumber}`,
    );
  }

  private async collect<T extends { readonly checkpoint: number }>(
    field: "transactions" | "events",
    predicate: Record<string, string>,
    selection: string,
    options: IndexedListOptions,
    decode: (node: unknown) => T,
    key: (node: T) => string,
  ) {
    const lower = checkpointNumber(options.lower),
      upper = checkpointNumber(options.upper);
    if (
      lower > upper ||
      upper === Number.MAX_SAFE_INTEGER ||
      !["ascending", "descending"].includes(options.order)
    )
      return incompatible();
    const signal = AbortSignal.any([
      AbortSignal.timeout(30_000),
      ...(options.signal ? [options.signal] : []),
    ]);
    signal.throwIfAborted();
    const bounds = {
      ...(lower > 0 ? { afterCheckpoint: lower - 1 } : {}),
      beforeCheckpoint: upper + 1,
    };
    const filter = { ...predicate, ...bounds };
    const filters = Object.keys(field === "events" ? predicate : filter);
    const snapshot = await GraphQLSnapshot.open(
      this.session,
      [
        { type: "Query", field, filters },
        { type: "Query", field: "checkpoints" },
      ],
      { fetch: this.fetch, window: { lower, upper }, signal },
    );
    const descending = options.order === "descending";
    let previous: number | undefined;
    const value = await collectSnapshotPages(
      snapshot,
      async (cursor) => {
        const result = await snapshot.read({
          selection: `${field}(filter: $filter, ${descending ? "last: 50, before" : "first: 50, after"}: $cursor) {
          pageInfo { hasNextPage hasPreviousPage startCursor endCursor } nodes { ${selection} }
        }`,
          variableDefinitions: `$filter: ${field === "events" ? "EventFilter" : "TransactionFilter"}!, $cursor: String`,
          variables: { filter, cursor },
          signal,
        });
        const connection = responseRecord(result[field]),
          page = responseRecord(connection.pageInfo);
        if (
          !Array.isArray(connection.nodes) ||
          typeof page.hasNextPage !== "boolean" ||
          typeof page.hasPreviousPage !== "boolean" ||
          (page.startCursor !== null && typeof page.startCursor !== "string") ||
          (page.endCursor !== null && typeof page.endCursor !== "string")
        )
          return incompatible();
        const nodes = descending
          ? [...connection.nodes].reverse()
          : connection.nodes;
        const items = nodes.map((node) => {
          const item = decode(node);
          if (
            item.checkpoint < lower ||
            item.checkpoint > upper ||
            (previous !== undefined &&
              (descending
                ? item.checkpoint > previous
                : item.checkpoint < previous))
          )
            return incompatible();
          previous = item.checkpoint;
          return item;
        });
        return {
          items,
          hasNextPage: (descending
            ? page.hasPreviousPage
            : page.hasNextPage) as boolean,
          cursor: (descending ? page.startCursor : page.endCursor) as
            | string
            | null,
        };
      },
      key,
      { signal, maxPages: options.maxPages, maxItems: options.maxItems },
    );
    return Object.freeze({
      snapshot: snapshot.proof,
      window: Object.freeze({ lower, upper }),
      filter: Object.freeze(filter),
      order: options.order,
      verification: "index-reference" as const,
      value,
    });
  }
}
