// Copyright (c) LinkU Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { OBJECT_SELECTION } from "./asset-reader";
import { BALANCE_SELECTION } from "./balance-reader";
import { COIN_METADATA_SELECTION } from "./coin-metadata-reader";
import { DYNAMIC_FIELD_SELECTION } from "./dynamic-fields";
import { DISPLAY_HISTORY_SELECTION } from "./display-history";
import {
  INDEXED_EVENT_SELECTION,
  INDEXED_TRANSACTION_SELECTION,
} from "./indexed-lists";
import { MOVE_OBJECT_IDENTITY_SELECTION } from "./move-object-identity";

function snapshot(name: string, variables: string, selection: string) {
  return `query ${name}($checkpoint: UInt53!, ${variables}) {
    checkpoint(sequenceNumber: $checkpoint) {
      sequenceNumber digest query { ${selection} }
    }
  }`;
}

/** Authored read contracts only. Validation never executes these business selections. */
export const WALLET_GRAPHQL_SCHEMA_CONTRACTS = Object.freeze({
  snapshot: `query WalletSchemaSnapshot {
    checkpoint(sequenceNumber: 0) { sequenceNumber digest query { __typename } }
    serviceConfig {
      availableRange(type: "Query", field: "checkpoints", filters: []) {
        first { sequenceNumber } last { sequenceNumber }
      }
      defaultPageSize(type: "Address", field: "objects")
      maxPageSize(type: "Address", field: "objects")
    }
  }`,
  balances: snapshot(
    "WalletSchemaBalances",
    "$owner: RtdAddress!, $cursor: String",
    `address(address: $owner) { address balances(first: 50, after: $cursor) {
      pageInfo { hasNextPage endCursor } nodes { ${BALANCE_SELECTION} }
    } }`,
  ),
  coinMetadata: snapshot(
    "WalletSchemaMetadata",
    "$type: String!",
    COIN_METADATA_SELECTION,
  ),
  ownedObjects: snapshot(
    "WalletSchemaObjects",
    "$owner: RtdAddress!, $cursor: String, $filter: ObjectFilter",
    `address(address: $owner) { address objects(first: 50, after: $cursor, filter: $filter) {
      pageInfo { hasNextPage endCursor } nodes { ${OBJECT_SELECTION} }
    } }`,
  ),
  multiGetObjects: snapshot(
    "WalletSchemaMultiGetObjects",
    "$keys: [ObjectKey!]!",
    `multiGetObjects(keys: $keys) { address asMoveObject { ${OBJECT_SELECTION} } }`,
  ),
  dynamicFields: snapshot(
    "WalletSchemaDynamicFields",
    "$parent: RtdAddress!, $cursor: String, $name: DynamicFieldName!",
    `address(address: $parent) { address
      dynamicFields(first: 50, after: $cursor) {
        pageInfo { hasNextPage endCursor } nodes { ${DYNAMIC_FIELD_SELECTION} }
      }
      dynamicField(name: $name) { ${DYNAMIC_FIELD_SELECTION} }
      dynamicObjectField(name: $name) { ${DYNAMIC_FIELD_SELECTION} }
    }`,
  ),
  stakingObjects: snapshot(
    "WalletSchemaStakingObjects",
    "$owner: RtdAddress!, $object: RtdAddress!, $cursor: String, $filter: ObjectFilter",
    `object(address: $object) { address asMoveObject { ${MOVE_OBJECT_IDENTITY_SELECTION} } }
     address(address: $owner) { address objects(first: 50, after: $cursor, filter: $filter) {
       pageInfo { hasNextPage endCursor } nodes { ${MOVE_OBJECT_IDENTITY_SELECTION} }
     } }`,
  ),
  indexedTransactions: snapshot(
    "WalletSchemaTransactions",
    "$filter: TransactionFilter!, $cursor: String",
    `transactions(filter: $filter, last: 50, before: $cursor) {
      pageInfo { hasNextPage hasPreviousPage startCursor endCursor }
      nodes { ${INDEXED_TRANSACTION_SELECTION} }
    }`,
  ),
  stakingMultiGetObjects: snapshot(
    "WalletSchemaStakingMultiGet",
    "$keys: [ObjectKey!]!",
    `multiGetObjects(keys: $keys) { address asMoveObject { ${MOVE_OBJECT_IDENTITY_SELECTION} } }`,
  ),
  indexedEvents: snapshot(
    "WalletSchemaEvents",
    "$filter: EventFilter!, $cursor: String",
    `events(filter: $filter, first: 50, after: $cursor) {
      pageInfo { hasNextPage hasPreviousPage startCursor endCursor }
      nodes { ${INDEXED_EVENT_SELECTION} }
    }`,
  ),
  displayHistory: `query WalletSchemaDisplay { ${DISPLAY_HISTORY_SELECTION} }`,
});

export type WalletGraphQLSchemaContract =
  keyof typeof WALLET_GRAPHQL_SCHEMA_CONTRACTS;
