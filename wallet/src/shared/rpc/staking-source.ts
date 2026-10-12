// Copyright (c) LinkU Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import type { RtdClientTypes } from "rtd-typescript/client";
import type {
  WalletAssetObject,
  WalletDynamicField,
} from "rtd-apps-core/src/rpc/WalletRpcContext";
import type { SnapshotResult } from "./asset-reader";
import type { GraphQLSnapshot, GraphQLSnapshotProof } from "./graphql-snapshot";

/** BCS object identity only; absence of Display/JSON is not a null Display claim. */
export type WalletStakingObject = Pick<
  WalletAssetObject,
  "objectId" | "version" | "digest" | "owner" | "type" | "content"
>;

export interface WalletStakingSource {
  readonly proof: GraphQLSnapshotProof;
  readonly snapshot: Pick<GraphQLSnapshot, "revalidate">;
  objects(
    ids: readonly string[],
    signal?: AbortSignal,
  ): Promise<SnapshotResult<readonly (WalletStakingObject | Error)[]>>;
  ownedObjects(
    owner: string,
    options?: { type?: string; signal?: AbortSignal },
  ): Promise<SnapshotResult<readonly WalletStakingObject[]>>;
  dynamicFields(
    parent: string,
    signal?: AbortSignal,
  ): Promise<SnapshotResult<readonly WalletDynamicField[]>>;
  dynamicField(
    parent: string,
    name: RtdClientTypes.DynamicFieldName,
    kind: "DynamicField",
    signal?: AbortSignal,
  ): Promise<SnapshotResult<WalletDynamicField | null>>;
}
