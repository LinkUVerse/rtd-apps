// Copyright (c) LinkU Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import type { AssetSnapshotProof } from "./WalletRpcContext";

export interface IndexedListOptions {
  readonly lower: number;
  readonly upper: number;
  readonly order: 'ascending' | 'descending';
  readonly signal?: AbortSignal;
  readonly maxPages?: number;
  readonly maxItems?: number;
}
export interface IndexedTransactionReference {
  readonly digest: string;
  readonly sender: string;
  readonly checkpoint: number;
}
export interface IndexedEvent {
  readonly transactionDigest: string;
  readonly sequenceNumber: number;
  readonly checkpoint: number;
  readonly sender: string;
  readonly packageId: string;
  readonly module: string;
  readonly type: string;
  readonly contents: Uint8Array;
}
export type IndexedEventFilter = { readonly type: string; readonly module?: never } |
  { readonly module: string; readonly type?: never };

export interface IndexedListResult<T> {
  readonly snapshot: AssetSnapshotProof;
  readonly window: {readonly lower:number; readonly upper:number};
  readonly filter: Readonly<Record<string,string|number>>;
  readonly order: 'ascending'|'descending';
  readonly verification: 'index-reference';
  readonly value: readonly T[];
}
