// Copyright (c) LinkU Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { ObjectError, type RtdClientTypes } from "rtd-typescript/client";
import type { WalletDynamicField } from "rtd-apps-core/src/rpc/WalletRpcContext";
import { normalizeStructTag, toBase64 } from "rtd-typescript/utils";
import type { SnapshotResult } from "./asset-reader";
import { walletAddress } from "./asset-address";
import {
  decodeDynamicField,
  dynamicType,
  DYNAMIC_FIELD_SELECTION,
} from "./dynamic-fields";
import {
  GraphQLSnapshot,
  responseRecord,
  SnapshotReadError,
} from "./graphql-snapshot";
import {
  decodeMoveObjectIdentity,
  MOVE_OBJECT_IDENTITY_SELECTION,
} from "./move-object-identity";
import { WalletReadSession } from "./session";
import { collectSnapshotPages, decodeConnection } from "./snapshot-pagination";
import { readStaking } from "./staking-reader";
import type {
  WalletStakingObject,
  WalletStakingSource,
} from "./staking-source";

export const STAKING_COVERAGE = Object.freeze(
  [
    { type: "Query", field: "checkpoints" },
    { type: "Query", field: "object" },
    { type: "Address", field: "objects" },
    { type: "Address", field: "dynamicFields" },
    { type: "Address", field: "dynamicField" },
    { type: "MoveObject", field: "contents" },
  ].map((row) => Object.freeze(row)),
);

function requestedAddress(value: unknown, expected: string) {
  const raw = responseRecord(value);
  if (walletAddress(raw.address) !== expected)
    throw new SnapshotReadError("incompatible");
  return raw;
}

function requestedType(value: string) {
  if (!value.trim() || value.includes("@"))
    throw new SnapshotReadError("incompatible");
  try {
    return normalizeStructTag(value);
  } catch {
    throw new SnapshotReadError("incompatible");
  }
}

/** Isolated BCS domain: cannot be used as a complete NFT/Display asset reader. */
export class WalletStakingSnapshotReader implements WalletStakingSource {
  readonly #collectionFence: Pick<GraphQLSnapshot, "session" | "revalidate">;
  private constructor(
    readonly snapshot: GraphQLSnapshot,
    compositeRead = false,
  ) {
    // Only static read() owns this private instance. Its nested collections are
    // tentative until readStaking's final real snapshot.revalidate succeeds.
    // Public open() still validates every independently returned collection.
    this.#collectionFence = compositeRead
      ? {
          session: snapshot.session,
          revalidate: async (signal?: AbortSignal) => {
            signal?.throwIfAborted();
            snapshot.session.assertActive();
          },
        }
      : snapshot;
  }
  get proof() {
    return this.snapshot.proof;
  }

  static async open(
    session: WalletReadSession,
    options: Parameters<typeof GraphQLSnapshot.open>[2] = {},
  ) {
    return new WalletStakingSnapshotReader(
      await GraphQLSnapshot.open(session, STAKING_COVERAGE, options),
    );
  }

  static async read(
    session: WalletReadSession,
    owner?: string,
    callerSignal?: AbortSignal,
  ) {
    const address = owner === undefined ? undefined : walletAddress(owner);
    const signal = AbortSignal.any([
      session.signal,
      AbortSignal.timeout(20_000),
      ...(callerSignal ? [callerSignal] : []),
    ]);
    return session.read(async () => {
      const reader = new WalletStakingSnapshotReader(
        await GraphQLSnapshot.open(session, STAKING_COVERAGE, { signal }),
        true,
      );
      return reader.staking(address, signal);
    });
  }

  staking(owner?: string, signal?: AbortSignal) {
    return readStaking(this, owner, signal);
  }
  private result<T>(value: T): SnapshotResult<T> {
    return Object.freeze({ snapshot: this.proof, value });
  }

  async objects(
    ids: readonly string[],
    signal?: AbortSignal,
  ): Promise<SnapshotResult<readonly (WalletStakingObject | ObjectError)[]>> {
    if (ids.length > 10_000) throw new RangeError("批量对象超过预算");
    const keys = ids.map(walletAddress),
      objects: (WalletStakingObject | ObjectError)[] = [];
    for (let offset = 0; offset < keys.length; offset += 20) {
      const batch = keys.slice(offset, offset + 20);
      const data = await this.snapshot.read({
        selection: `multiGetObjects(keys: $keys) { address asMoveObject { ${MOVE_OBJECT_IDENTITY_SELECTION} } }`,
        variableDefinitions: "$keys: [ObjectKey!]!",
        variables: { keys: batch.map((address) => ({ address })) },
        signal,
      });
      if (
        !Array.isArray(data.multiGetObjects) ||
        data.multiGetObjects.length !== batch.length
      )
        throw new SnapshotReadError("incompatible");
      data.multiGetObjects.forEach((value, index) => {
        if (value === null) {
          objects.push(
            new ObjectError("notFound", "此快照中不存在请求的对象", {
              reason: "notFound",
              objectId: batch[index],
            }),
          );
          return;
        }
        const raw = responseRecord(value),
          object = decodeMoveObjectIdentity(raw.asMoveObject);
        if (
          walletAddress(raw.address) !== batch[index] ||
          object.objectId !== batch[index]
        )
          throw new SnapshotReadError("incompatible");
        objects.push(object);
      });
    }
    await this.#collectionFence.revalidate(signal);
    return this.result(Object.freeze(objects));
  }

  async ownedObjects(
    owner: string,
    options: { type?: string; signal?: AbortSignal } = {},
  ): Promise<SnapshotResult<readonly WalletStakingObject[]>> {
    const address = walletAddress(owner),
      type =
        options.type === undefined ? undefined : requestedType(options.type);
    const objects = await collectSnapshotPages(
      this.#collectionFence,
      async (cursor) => {
        const data = await this.snapshot.read({
          selection: `address(address: $owner) { address objects(first: 50, after: $cursor, filter: $filter) { pageInfo { hasNextPage endCursor } nodes { ${MOVE_OBJECT_IDENTITY_SELECTION} } } }`,
          variableDefinitions:
            "$owner: RtdAddress!, $cursor: String, $filter: ObjectFilter",
          variables: { owner: address, cursor, filter: type ? { type } : null },
          signal: options.signal,
        });
        return decodeConnection(
          requestedAddress(data.address, address).objects,
          (value) => {
            const object = decodeMoveObjectIdentity(value);
            const actual =
              object.owner.$kind === "AddressOwner"
                ? object.owner.AddressOwner
                : object.owner.$kind === "ConsensusAddressOwner"
                  ? object.owner.ConsensusAddressOwner.owner
                  : null;
            if (actual !== address || (type && object.type !== type))
              throw new SnapshotReadError("incompatible");
            return object;
          },
        );
      },
      (object) => object.objectId,
      { signal: options.signal },
    );
    return this.result(objects);
  }

  async dynamicFields(
    parentId: string,
    signal?: AbortSignal,
  ): Promise<SnapshotResult<readonly WalletDynamicField[]>> {
    const parent = walletAddress(parentId);
    const values = await collectSnapshotPages(
      this.#collectionFence,
      async (cursor) => {
        const data = await this.snapshot.read({
          selection: `address(address: $parent) { address dynamicFields(first: 50, after: $cursor) { pageInfo { hasNextPage endCursor } nodes { ${DYNAMIC_FIELD_SELECTION} } } }`,
          variableDefinitions: "$parent: RtdAddress!, $cursor: String",
          variables: { parent, cursor },
          signal,
        });
        return decodeConnection(
          requestedAddress(data.address, parent).dynamicFields,
          (value) => decodeDynamicField(parent, value),
        );
      },
      (value) => value.fieldId,
      { signal },
    );
    return this.result(values);
  }

  async dynamicField(
    parentId: string,
    name: RtdClientTypes.DynamicFieldName,
    kind: "DynamicField",
    signal?: AbortSignal,
  ): Promise<SnapshotResult<WalletDynamicField | null>> {
    if (kind !== "DynamicField") throw new SnapshotReadError("incompatible");
    const parent = walletAddress(parentId),
      type = dynamicType(name.type),
      encoded = toBase64(name.bcs);
    const data = await this.snapshot.read({
      selection: `address(address: $parent) { address field: dynamicField(name: $name) { ${DYNAMIC_FIELD_SELECTION} } }`,
      variableDefinitions: "$parent: RtdAddress!, $name: DynamicFieldName!",
      variables: { parent, name: { type, bcs: encoded } },
      signal,
    });
    const address = requestedAddress(data.address, parent);
    const value =
      address.field === null ? null : decodeDynamicField(parent, address.field);
    if (
      value &&
      (value.$kind !== kind ||
        value.name.type !== type ||
        toBase64(value.name.bcs) !== encoded)
    )
      throw new SnapshotReadError("incompatible");
    await this.#collectionFence.revalidate(signal);
    return this.result(value);
  }
}
