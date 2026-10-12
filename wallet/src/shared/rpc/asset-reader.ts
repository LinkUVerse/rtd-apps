// Copyright (c) LinkU Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { KIOSK_COLLECTION_TIMEOUT_MS } from "./kiosk-read-budget";

import { ObjectError, type RtdClientTypes } from "rtd-typescript/client";
import type {
  WalletAssetObject,
  WalletDynamicField,
} from "rtd-apps-core/src/rpc/WalletRpcContext";
import { fromBase64, normalizeStructTag, toBase64 } from "rtd-typescript/utils";

import {
  checkpointNumber,
  GraphQLSnapshot,
  type GraphQLSnapshotProof,
  responseRecord,
  SnapshotReadError,
} from "./graphql-snapshot";
import { assertGenesisDigest } from "./profile";
import { readStaking } from "./staking-reader";
import { readNativeKiosks } from "./kiosk-reader";
import { readOriginByteKiosks } from "./originbyte-kiosk";
import { WalletReadSession } from "./session";
import { collectSnapshotPages, decodeConnection } from "./snapshot-pagination";
import {
  decodeDynamicField,
  dynamicType,
  DYNAMIC_FIELD_SELECTION,
} from "./dynamic-fields";

export { walletAddress } from "./asset-address";
import { walletAddress } from "./asset-address";
import { displayBasis, DISPLAY_BASIS_SELECTION } from "./display-history";
import { readSnapshotCoinMetadata } from "./coin-metadata-reader";
import { readSnapshotBalances } from "./balance-reader";
import { moveType, unsignedAmount } from "./asset-values";
export { moveType, unsignedAmount } from "./asset-values";

import { decodeSnapshotOwner as owner } from "./move-object-identity";

export type { WalletAssetObject } from "rtd-apps-core/src/rpc/WalletRpcContext";

export interface SnapshotResult<T> {
  readonly snapshot: GraphQLSnapshotProof;
  readonly value: T;
}

export const ASSET_COVERAGE = Object.freeze(
  [
    { type: "Query", field: "checkpoints" },
    { type: "Address", field: "balances" },
    { type: "Address", field: "objects" },
    { type: "Address", field: "dynamicFields" },
    { type: "Address", field: "dynamicField" },
    { type: "Address", field: "dynamicObjectField" },
    { type: "Query", field: "object" },
    { type: "Query", field: "coinMetadata" },
    { type: "MoveObject", field: "contents" },
    { type: "MoveValue", field: "display" },
  ].map((dependency) => Object.freeze(dependency)),
);

function digest(value: unknown) {
  try {
    return assertGenesisDigest(value);
  } catch {
    throw new SnapshotReadError("incompatible");
  }
}

function bytes(value: unknown): Uint8Array<ArrayBuffer> {
  if (typeof value !== "string") throw new SnapshotReadError("incompatible");
  try {
    const result = fromBase64(value);
    if (toBase64(result) !== value) throw new Error("non canonical BCS");
    return Uint8Array.from(result);
  } catch {
    throw new SnapshotReadError("incompatible");
  }
}

function display(
  value: unknown,
  type: string,
  proof: GraphQLSnapshotProof,
): WalletAssetObject["display"] {
  if (!proof.displayHistory) throw new SnapshotReadError("coverage");
  if (value === null) return null;
  const raw = responseRecord(value);
  const output = raw.output === null ? null : responseRecord(raw.output);
  const errors = raw.errors === null ? null : responseRecord(raw.errors);
  if (
    errors &&
    Object.values(errors).some((error) => typeof error !== "string")
  )
    throw new SnapshotReadError("incompatible");
  return {
    output,
    errors: errors as Record<string, string> | null,
    basis: displayBasis(raw.basis, type, proof),
  };
}

function assetObject(
  value: unknown,
  proof: GraphQLSnapshotProof,
): WalletAssetObject {
  const raw = responseRecord(value);
  const content = responseRecord(raw.contents);
  const type = moveType(responseRecord(content.type).repr);
  if (
    raw.hasPublicTransfer !== null &&
    typeof raw.hasPublicTransfer !== "boolean"
  )
    throw new SnapshotReadError("incompatible");
  return {
    hasPublicTransfer: raw.hasPublicTransfer,
    objectId: walletAddress(raw.address),
    version: String(checkpointNumber(raw.version)),
    digest: digest(raw.digest),
    owner: owner(raw.owner),
    type,
    content: bytes(content.bcs),
    objectBcs: undefined,
    json: content.json === null ? null : responseRecord(content.json),
    display: display(content.display, type, proof),
    previousTransaction:
      raw.previousTransaction === null
        ? null
        : digest(responseRecord(raw.previousTransaction).digest),
  };
}

export const OBJECT_SELECTION = `address version digest hasPublicTransfer
  owner { __typename
    ... on AddressOwner { address { address } }
    ... on ObjectOwner { address { address } }
    ... on Shared { initialSharedVersion }
    ... on ConsensusAddressOwner { startVersion address { address } }
  }
  contents { bcs json type { repr } display { output errors ${DISPLAY_BASIS_SELECTION} } }
  previousTransaction { digest }`;

function assertDirectOwner(object: WalletAssetObject, address: string) {
  const actual =
    object.owner.$kind === "AddressOwner"
      ? object.owner.AddressOwner
      : object.owner.$kind === "ConsensusAddressOwner"
        ? object.owner.ConsensusAddressOwner.owner
        : null;
  if (actual !== address) throw new SnapshotReadError("incompatible");
}

function requestedAddress(value: unknown, requested: string) {
  const address = responseRecord(value);
  if (walletAddress(address.address) !== requested)
    throw new SnapshotReadError("incompatible");
  return address;
}

/** Asset views only. Coin selection immediately before sending belongs to Fullnode. */
export class WalletAssetReader {
  private constructor(readonly snapshot: GraphQLSnapshot) {}

  get proof() {
    return this.snapshot.proof;
  }

  static async open(
    session: WalletReadSession,
    options: Parameters<typeof GraphQLSnapshot.open>[2] = {},
  ) {
    return new WalletAssetReader(
      await GraphQLSnapshot.open(session, ASSET_COVERAGE, options),
    );
  }

  private result<T>(value: T): SnapshotResult<T> {
    return Object.freeze({ snapshot: this.snapshot.proof, value });
  }

  staking(owner?: string, signal?: AbortSignal) {
    return readStaking(this, owner, signal);
  }

  async balances(
    ownerAddress: string,
    signal?: AbortSignal,
  ): Promise<SnapshotResult<readonly RtdClientTypes.Balance[]>> {
    return readSnapshotBalances(this.snapshot, ownerAddress, signal);
  }

  async coinMetadata(
    coinType: string,
    signal?: AbortSignal,
  ): Promise<SnapshotResult<RtdClientTypes.CoinMetadata | null>> {
    return readSnapshotCoinMetadata(this.snapshot, coinType, signal);
  }

  nativeKiosks(owner: string, signal?: AbortSignal) {
    return readNativeKiosks(this, walletAddress(owner), signal);
  }

  async kiosks(owner: string, callerSignal?: AbortSignal) {
    const operation = new AbortController();
    const signal = AbortSignal.any([
      AbortSignal.timeout(KIOSK_COLLECTION_TIMEOUT_MS),
      operation.signal,
      ...(callerSignal ? [callerSignal] : []),
    ]);
    try {
      const packages = this.snapshot.session.profile.packages;
      signal.throwIfAborted();
      if (!packages.kiosk && !packages.originByte)
        throw new Error("当前网络未配置受支持的 Kiosk 合约");
      // Both complete collections belong to this exact admitted snapshot.
      const [native, origin] = await Promise.all([
        packages.kiosk ? this.nativeKiosks(owner, signal) : null,
        packages.originByte ? readOriginByteKiosks(this, owner, signal) : null,
      ]);
      const value = [...(native?.value ?? []), ...(origin?.value ?? [])];
      if (new Set(value.map((kiosk) => kiosk.kioskId)).size !== value.length)
        throw new SnapshotReadError("incompatible");
      await this.snapshot.revalidate(signal);
      return this.result(Object.freeze(value));
    } finally {
      // Cancel only this collection's remaining work, including a failed sibling.
      operation.abort();
    }
  }

  async ownedObjects(
    ownerAddress: string,
    options: { type?: string; signal?: AbortSignal; pageSize?: number } = {},
  ): Promise<SnapshotResult<readonly WalletAssetObject[]>> {
    // Smaller pages can bound response size without changing the complete collection contract.
    const pageSize = options.pageSize ?? 50;
    if (!Number.isSafeInteger(pageSize) || pageSize < 1 || pageSize > 50)
      throw new RangeError("拥有对象分页大小必须为1至50的整数");
    const address = walletAddress(ownerAddress);
    const type =
      options.type === undefined ? undefined : moveType(options.type);
    const objects = await collectSnapshotPages(
      this.snapshot,
      async (cursor) => {
        const data = await this.snapshot.read({
          selection: `address(address: $owner) { address objects(first: $pageSize, after: $cursor, filter: $filter) {
          pageInfo { hasNextPage endCursor } nodes { ${OBJECT_SELECTION} }
        } }`,
          variableDefinitions:
            "$owner: RtdAddress!, $cursor: String, $filter: ObjectFilter, $pageSize: Int!",
          variables: {
            owner: address,
            cursor,
            filter: type ? { type } : null,
            pageSize,
          },
          signal: options.signal,
        });
        return decodeConnection(
          requestedAddress(data.address, address).objects,
          (node) => {
            const object = assetObject(node, this.proof);
            assertDirectOwner(object, address);
            if (type && object.type !== type)
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

  async coinObjects(
    ownerAddress: string,
    coinType: string,
    signal?: AbortSignal,
  ): Promise<SnapshotResult<readonly RtdClientTypes.Coin[]>> {
    const result = await this.ownedObjects(ownerAddress, {
      type: `0x2::coin::Coin<${moveType(coinType)}>`,
      signal,
    });
    return this.result(
      Object.freeze(
        result.value.map(
          (object): RtdClientTypes.Coin => ({
            objectId: object.objectId,
            version: object.version,
            digest: object.digest,
            owner: object.owner,
            type: object.type,
            balance: unsignedAmount(object.json?.balance, 64),
          }),
        ),
      ),
    );
  }

  async objects(
    objectIds: readonly string[],
    signal?: AbortSignal,
  ): Promise<SnapshotResult<readonly (WalletAssetObject | ObjectError)[]>> {
    if (objectIds.length > 10_000) throw new RangeError("批量对象超过预算");
    const ids = objectIds.map(walletAddress);
    const objects: (WalletAssetObject | ObjectError)[] = [];
    // Include snapshot proof fields and full 32-byte IDs in the request budget.
    // Forty IDs exceed the upstream default 5,000-byte GraphQL payload limit.
    for (let offset = 0; offset < ids.length; offset += 20) {
      const batch = ids.slice(offset, offset + 20);
      const data = await this.snapshot.read({
        selection: `multiGetObjects(keys: $keys) {
          address asMoveObject { ${OBJECT_SELECTION} }
        }`,
        variableDefinitions: "$keys: [ObjectKey!]!",
        variables: { keys: batch.map((address) => ({ address })) },
        signal,
      });
      if (
        !Array.isArray(data.multiGetObjects) ||
        data.multiGetObjects.length !== batch.length
      )
        throw new SnapshotReadError("incompatible");
      data.multiGetObjects.forEach((raw, i) => {
        if (raw === null) {
          objects.push(
            new ObjectError("notFound", "此快照中不存在请求的对象", {
              reason: "notFound",
              objectId: batch[i],
            }),
          );
          return;
        }
        const wrapper = responseRecord(raw);
        const object = assetObject(wrapper.asMoveObject, this.proof);
        if (
          walletAddress(wrapper.address) !== batch[i] ||
          object.objectId !== batch[i]
        )
          throw new SnapshotReadError("incompatible");
        objects.push(object);
      });
    }
    await this.snapshot.revalidate(signal);
    return this.result(Object.freeze(objects));
  }

  async dynamicFields(
    parentId: string,
    signal?: AbortSignal,
  ): Promise<SnapshotResult<readonly WalletDynamicField[]>> {
    const parent = walletAddress(parentId);
    const fields = await collectSnapshotPages(
      this.snapshot,
      async (cursor) => {
        const data = await this.snapshot.read({
          selection: `address(address: $parent) { address dynamicFields(first: 50, after: $cursor) {
          pageInfo { hasNextPage endCursor } nodes { ${DYNAMIC_FIELD_SELECTION} }
        } }`,
          variableDefinitions: "$parent: RtdAddress!, $cursor: String",
          variables: { parent, cursor },
          signal,
        });
        return decodeConnection(
          requestedAddress(data.address, parent).dynamicFields,
          (field) => decodeDynamicField(parent, field),
        );
      },
      (field) => field.fieldId,
      { signal },
    );
    return this.result(fields);
  }

  async dynamicField(
    parentId: string,
    name: RtdClientTypes.DynamicFieldName,
    kind: "DynamicField" | "DynamicObject",
    signal?: AbortSignal,
  ): Promise<SnapshotResult<WalletDynamicField | null>> {
    const parent = walletAddress(parentId);
    const type = dynamicType(name.type);
    const nameBcs = toBase64(name.bcs);
    const field =
      kind === "DynamicObject" ? "dynamicObjectField" : "dynamicField";
    const data = await this.snapshot.read({
      selection: `address(address: $parent) { address field: ${field}(name: $name) { ${DYNAMIC_FIELD_SELECTION} } }`,
      variableDefinitions: "$parent: RtdAddress!, $name: DynamicFieldName!",
      variables: { parent, name: { type, bcs: nameBcs } },
      signal,
    });
    const address = requestedAddress(data.address, parent);
    const result =
      address.field === null ? null : decodeDynamicField(parent, address.field);
    if (
      result &&
      (result.$kind !== kind ||
        result.name.type !== type ||
        toBase64(result.name.bcs) !== nameBcs)
    )
      throw new SnapshotReadError("incompatible");
    await this.snapshot.revalidate(signal);
    return this.result(result);
  }
}
