// Copyright (c) LinkU Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { KIOSK_COLLECTION_TIMEOUT_MS } from "./kiosk-read-budget";

import { bcs } from "rtd-typescript/bcs";
import { normalizeStructTag, toBase64 } from "rtd-typescript/utils";
import type {
  WalletAssetObject,
  WalletRpc,
} from "rtd-apps-core/src/rpc/WalletRpcContext";
import { walletAddress } from "./asset-address";
import { dynamicType } from "./dynamic-fields";
import { SnapshotReadError } from "./graphql-snapshot";
import type { WalletAssetReader } from "./asset-reader";
import {
  KIOSK_BCS,
  KIOSK_CAP_BCS,
  exactBcs,
  readFrameworkKioskContents,
} from "./kiosk-reader";
import type { WalletOriginByteKiosk } from "rtd-apps-core/src/rpc/kiosk-types";

// Origin-Byte/protocol e8e8efd, ob_kiosk.move OwnerToken. This is discovery, NOT an OwnerCap.
export const ORIGINBYTE_OWNER_TOKEN_BCS = bcs.struct("OwnerToken", {
  id: bcs.Address,
  kiosk: bcs.Address,
  owner: bcs.Address,
});

export function originByteOwnerToken(
  object: Pick<WalletAssetObject, "objectId" | "type" | "content" | "owner">,
  address: string,
  packages: WalletRpc["packages"],
) {
  if (!packages.originByte) return null;
  const type = normalizeStructTag(
    `${packages.originByte.discoveryPackage}::ob_kiosk::OwnerToken`,
  );
  if (object.type !== type) return null;
  try {
    const owner = walletAddress(address);
    const token = ORIGINBYTE_OWNER_TOKEN_BCS.parse(object.content);
    if (
      token.id !== object.objectId ||
      token.owner !== owner ||
      toBase64(ORIGINBYTE_OWNER_TOKEN_BCS.serialize(token).toBytes()) !==
        toBase64(object.content) ||
      !(
        (object.owner.$kind === "AddressOwner" &&
          object.owner.AddressOwner === owner) ||
        (object.owner.$kind === "ConsensusAddressOwner" &&
          object.owner.ConsensusAddressOwner.owner === owner)
      )
    )
      throw new Error("OwnerToken mismatch");
    return Object.freeze({
      kind: "originbyte-discovery" as const,
      objectId: token.id,
      kioskId: token.kiosk,
      owner: token.owner,
      discoveryPackage: packages.originByte.discoveryPackage,
    });
  } catch {
    throw new SnapshotReadError("incompatible");
  }
}

/** Read-only discovery at the admitted S. Tokens never authorize transaction inputs. */
export async function discoverOriginByteKiosks(
  reader: WalletAssetReader,
  address: string,
  callerSignal?: AbortSignal,
) {
  const signal = AbortSignal.any([
    AbortSignal.timeout(KIOSK_COLLECTION_TIMEOUT_MS),
    ...(callerSignal ? [callerSignal] : []),
  ]);
  signal.throwIfAborted();
  const packages = reader.snapshot.session.profile.packages;
  if (!packages.originByte) throw new Error("当前网络未配置 OriginByte 部署");
  const owner = walletAddress(address);
  const objects = (await reader.ownedObjects(owner, { signal })).value;
  const tokens = objects.flatMap((object) => {
    const token = originByteOwnerToken(object, owner, packages);
    return token ? [token] : [];
  });
  if (
    tokens.length > 128 ||
    new Set(tokens.map((token) => token.kioskId)).size !== tokens.length
  )
    throw new SnapshotReadError("incompatible");
  const kiosks = (
    await reader.objects(
      tokens.map((token) => token.kioskId),
      signal,
    )
  ).value;
  const value = tokens.map((token, index) => {
    const object = kiosks[index];
    if (
      !object ||
      object instanceof Error ||
      object.objectId !== token.kioskId ||
      object.type !== normalizeStructTag("0x2::kiosk::Kiosk") ||
      object.owner.$kind !== "Shared"
    )
      throw new SnapshotReadError("incompatible");
    try {
      const content = KIOSK_BCS.parse(object.content);
      if (
        content.id !== token.kioskId ||
        content.owner !== owner ||
        toBase64(KIOSK_BCS.serialize(content).toBytes()) !==
          toBase64(object.content)
      )
        throw new Error("Kiosk ownership mismatch");
    } catch {
      throw new SnapshotReadError("incompatible");
    }
    return Object.freeze({ token, kiosk: object });
  });
  await reader.snapshot.revalidate(signal);
  return Object.freeze({ snapshot: reader.proof, value: Object.freeze(value) });
}

// Current RTD Move compiler emits LdFalse for an empty-struct Pack (to_bytecode/translate.rs).
export const ORIGINBYTE_EMPTY_KEY_BCS = bcs.struct("EmptyKey", {
  dummy_field: bcs.bool(),
});
export const ORIGINBYTE_TABLE_BCS = bcs.struct("Table", {
  id: bcs.Address,
  size: bcs.u64(),
});
export const ORIGINBYTE_NFT_REF_BCS = bcs.struct("NftRef", {
  auths: bcs.struct("VecSet", { contents: bcs.vector(bcs.Address) }),
  is_exclusively_listed: bcs.bool(),
});

/** Fixed upstream v3 storage contract. Other layouts require their own verified adapter. */
export async function readOriginByteKiosks(
  reader: WalletAssetReader,
  address: string,
  callerSignal?: AbortSignal,
) {
  const signal = AbortSignal.any([
    AbortSignal.timeout(KIOSK_COLLECTION_TIMEOUT_MS),
    ...(callerSignal ? [callerSignal] : []),
  ]);
  const discovered = await discoverOriginByteKiosks(reader, address, signal);
  const packageId =
    reader.snapshot.session.profile.packages.originByte!.discoveryPackage;
  const type = (name: string) =>
    normalizeStructTag(`${packageId}::ob_kiosk::${name}`);
  const results: WalletOriginByteKiosk[] = [];
  let total = 0;
  for (const { token, kiosk: object } of discovered.value) {
    const { kiosk, contents, fields } = await readFrameworkKioskContents(
      reader,
      token.kioskId,
      signal,
      { snapshot: discovered.snapshot, value: object },
    );
    if (kiosk.owner !== token.owner || !kiosk.allow_extensions)
      throw new SnapshotReadError("incompatible");
    const field = (name: string, valueType: string) => {
      const matches = fields.filter((value) => value.name.type === type(name));
      if (matches.length !== 1) throw new SnapshotReadError("incompatible");
      const value = matches[0];
      if (
        value.$kind !== "DynamicField" ||
        value.valueType !== dynamicType(valueType) ||
        exactBcs(ORIGINBYTE_EMPTY_KEY_BCS, value.name.bcs).dummy_field
      )
        throw new SnapshotReadError("incompatible");
      return value.value.bcs;
    };
    const version = exactBcs(bcs.u64(), field("VersionDfKey", "u64"));
    if (version !== "3") throw new SnapshotReadError("incompatible");
    const cap = exactBcs(
      KIOSK_CAP_BCS,
      field("KioskOwnerCapDfKey", "0x2::kiosk::KioskOwnerCap"),
    );
    if (cap.for !== token.kioskId) throw new SnapshotReadError("incompatible");
    const table = exactBcs(
      ORIGINBYTE_TABLE_BCS,
      field(
        "NftRefsDfKey",
        `0x2::table::Table<0x2::object::ID,${type("NftRef")}>`,
      ),
    );
    if (BigInt(table.size) > 10000n)
      throw new SnapshotReadError("incompatible");
    const refs = (await reader.dynamicFields(table.id, signal)).value;
    const registered = new Map<string, boolean>();
    const itemIds = new Set(contents.map((item) => item.objectId));
    for (const ref of refs) {
      if (
        ref.$kind !== "DynamicField" ||
        ref.name.type !== normalizeStructTag("0x2::object::ID") ||
        ref.valueType !== type("NftRef")
      )
        throw new SnapshotReadError("incompatible");
      const id = exactBcs(bcs.Address, ref.name.bcs);
      const value = exactBcs(ORIGINBYTE_NFT_REF_BCS, ref.value.bcs);
      if (
        !itemIds.has(id) ||
        registered.has(id) ||
        new Set(value.auths.contents).size !== value.auths.contents.length ||
        (value.is_exclusively_listed && value.auths.contents.length !== 1)
      )
        throw new SnapshotReadError("incompatible");
      registered.set(id, value.is_exclusively_listed);
    }
    total += contents.length;
    if (BigInt(registered.size) !== BigInt(table.size) || total > 10000)
      throw new SnapshotReadError("incompatible");
    results.push(
      Object.freeze({
        kind: "originbyte",
        kioskId: token.kioskId,
        ownerTokenId: token.objectId,
        owner: token.owner,
        extensionVersion: version,
        items: Object.freeze(
          contents.map((item) =>
            Object.freeze({
              ...item,
              originByteRegistered: registered.has(item.objectId),
              originByteExclusive: registered.get(item.objectId) ?? false,
            }),
          ),
        ),
      }),
    );
  }
  await reader.snapshot.revalidate(signal);
  return Object.freeze({
    snapshot: reader.proof,
    value: Object.freeze(results),
  });
}
