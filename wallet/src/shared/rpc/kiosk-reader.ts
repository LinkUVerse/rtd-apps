// Copyright (c) LinkU Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { KIOSK_COLLECTION_TIMEOUT_MS } from "./kiosk-read-budget";

import { bcs, type BcsType } from "rtd-typescript/bcs";
import {
  normalizeRtdAddress,
  normalizeStructTag,
  toBase64,
} from "rtd-typescript/utils";
import type { WalletAssetObject } from "rtd-apps-core/src/rpc/WalletRpcContext";
import type {
  WalletKioskItem,
  WalletNativeKiosk,
} from "rtd-apps-core/src/rpc/kiosk-types";
import type { KioskOwnerCap } from "rtd-kiosk";

import type { WalletAssetReader, SnapshotResult } from "./asset-reader";
import { SnapshotReadError } from "./graphql-snapshot";

// Layouts match this checkout's framework Move source and the checked SDK's generated contracts.
export const KIOSK_CAP_BCS = bcs.struct("KioskOwnerCap", {
  id: bcs.Address,
  for: bcs.Address,
});
export const PERSONAL_CAP_BCS = bcs.struct("PersonalKioskCap", {
  id: bcs.Address,
  cap: bcs.option(KIOSK_CAP_BCS),
});
export const KIOSK_BCS = bcs.struct("Kiosk", {
  id: bcs.Address,
  profits: bcs.struct("Balance", { value: bcs.u64() }),
  owner: bcs.Address,
  item_count: bcs.u32(),
  allow_extensions: bcs.bool(),
});
export const KIOSK_ITEM_BCS = bcs.struct("Item", { id: bcs.Address });
export const KIOSK_LISTING_BCS = bcs.struct("Listing", {
  id: bcs.Address,
  is_exclusive: bcs.bool(),
});
export const KIOSK_LOCK_BCS = bcs.struct("Lock", { id: bcs.Address });

/** Reject a valid BCS prefix followed by trailing bytes; parsing alone accepts that prefix. */
export function exactBcs<T, Input>(
  codec: BcsType<T, Input>,
  content: Uint8Array,
): T {
  try {
    const decoded = codec.parse(content);
    const canonical = codec.serialize(decoded as unknown as Input).toBytes();
    if (toBase64(canonical) !== toBase64(content))
      throw new Error("non-canonical BCS");
    return decoded;
  } catch {
    throw new SnapshotReadError("incompatible");
  }
}

function packageTypes(
  packages: Readonly<{ kiosk?: string; personalKiosk?: string }>,
) {
  if (!packages.kiosk || packages.kiosk !== normalizeRtdAddress("0x2"))
    throw new Error("当前网络未证明受支持的 RTD framework Kiosk 合约");
  return {
    cap: normalizeStructTag(`${packages.kiosk}::kiosk::KioskOwnerCap`),
    kiosk: normalizeStructTag(`${packages.kiosk}::kiosk::Kiosk`),
    item: normalizeStructTag(`${packages.kiosk}::kiosk::Item`),
    listing: normalizeStructTag(`${packages.kiosk}::kiosk::Listing`),
    lock: normalizeStructTag(`${packages.kiosk}::kiosk::Lock`),
    personal: packages.personalKiosk
      ? normalizeStructTag(
          `${packages.personalKiosk}::personal_kiosk::PersonalKioskCap`,
        )
      : null,
  };
}

export function nativeKioskCap(
  object: Pick<
    WalletAssetObject,
    "type" | "content" | "objectId" | "digest" | "version"
  >,
  packages: Readonly<{ kiosk?: string; personalKiosk?: string }>,
): KioskOwnerCap | null {
  const types = packageTypes(packages);
  if (object.type === types.cap) {
    const cap = exactBcs(KIOSK_CAP_BCS, object.content);
    if (cap.id !== object.objectId) throw new SnapshotReadError("incompatible");
    return {
      objectId: cap.id,
      kioskId: cap.for,
      digest: object.digest,
      version: object.version,
      isPersonal: false,
    };
  }
  if (object.type === types.personal) {
    const personal = exactBcs(PERSONAL_CAP_BCS, object.content);
    if (personal.id !== object.objectId || !personal.cap)
      throw new SnapshotReadError("incompatible");
    return {
      objectId: personal.id,
      kioskId: personal.cap.for,
      digest: object.digest,
      version: object.version,
      isPersonal: true,
    };
  }
  return null;
}

/** Native framework/PersonalKiosk capabilities; OriginByte has a separate discovery route. */
export async function readNativeKiosks(
  reader: WalletAssetReader,
  address: string,
  callerSignal?: AbortSignal,
): Promise<SnapshotResult<readonly WalletNativeKiosk[]>> {
  const signal = AbortSignal.any([
    AbortSignal.timeout(KIOSK_COLLECTION_TIMEOUT_MS),
    ...(callerSignal ? [callerSignal] : []),
  ]);
  signal.throwIfAborted();
  const packages = reader.snapshot.session.profile.packages;
  packageTypes(packages);
  const owned = await reader.ownedObjects(address, { signal });
  const caps = owned.value.flatMap((object) => {
    const cap = nativeKioskCap(object, packages);
    return cap ? [cap] : [];
  });
  if (
    caps.length > 128 ||
    new Set(caps.map((cap) => cap.kioskId)).size !== caps.length
  )
    throw new SnapshotReadError("incompatible");
  const result: WalletNativeKiosk[] = [];
  let totalItems = 0;
  for (const cap of caps) {
    const { kiosk, contents } = await readFrameworkKioskContents(
      reader,
      cap.kioskId,
      signal,
    );
    totalItems += contents.length;
    if (totalItems > 10_000) throw new SnapshotReadError("incompatible");
    result.push(
      Object.freeze({
        kind: "framework",
        kioskId: cap.kioskId,
        ownerCap: Object.freeze(cap),
        items: Object.freeze(contents),
        profits: kiosk.profits.value,
        owner: kiosk.owner,
        allowExtensions: kiosk.allow_extensions,
      }),
    );
  }
  await reader.snapshot.revalidate(signal);
  return Object.freeze({
    snapshot: reader.proof,
    value: Object.freeze(result),
  });
}

/** Shared framework object layout only; the caller proves its own capability or discovery route. */
export async function readFrameworkKioskContents(
  reader: WalletAssetReader,
  kioskId: string,
  signal: AbortSignal,
  discovered?: SnapshotResult<WalletAssetObject>,
) {
  signal.throwIfAborted();
  // Only a result from this exact admitted reader can replace the duplicate point lookup.
  if (discovered && discovered.snapshot !== reader.proof)
    throw new SnapshotReadError("incompatible");
  const types = packageTypes({ kiosk: normalizeRtdAddress("0x2") });
  const object =
    discovered?.value ?? (await reader.objects([kioskId], signal)).value[0];
  if (!object || object instanceof Error)
    throw object ?? new SnapshotReadError("incompatible");
  if (
    object.objectId !== kioskId ||
    object.type !== types.kiosk ||
    object.owner.$kind !== "Shared"
  )
    throw new SnapshotReadError("incompatible");
  const kiosk = exactBcs(KIOSK_BCS, object.content);
  if (kiosk.id !== kioskId) throw new SnapshotReadError("incompatible");
  const fields = (await reader.dynamicFields(kioskId, signal)).value;
  const items = new Map<
    string,
    { fieldId: string; type: string; content: Uint8Array }
  >();
  const listings = new Map<string, NonNullable<WalletKioskItem["listing"]>>();
  const locks = new Set<string>();
  for (const field of fields) {
    if (field.name.type === types.item) {
      const id = exactBcs(KIOSK_ITEM_BCS, field.name.bcs).id;
      if (
        field.$kind !== "DynamicObject" ||
        field.childId !== id ||
        items.has(id)
      )
        throw new SnapshotReadError("incompatible");
      items.set(id, {
        fieldId: field.fieldId,
        type: field.valueType,
        content: field.value.bcs,
      });
    } else if (field.name.type === types.listing) {
      const listing = exactBcs(KIOSK_LISTING_BCS, field.name.bcs);
      if (
        field.$kind !== "DynamicField" ||
        field.valueType !== "u64" ||
        listings.has(listing.id)
      )
        throw new SnapshotReadError("incompatible");
      const price = exactBcs(bcs.u64(), field.value.bcs);
      listings.set(listing.id, {
        fieldId: field.fieldId,
        isExclusive: listing.is_exclusive,
        price,
      });
    } else if (field.name.type === types.lock) {
      const id = exactBcs(KIOSK_LOCK_BCS, field.name.bcs).id;
      if (
        field.$kind !== "DynamicField" ||
        field.valueType !== "bool" ||
        !exactBcs(bcs.bool(), field.value.bcs) ||
        locks.has(id)
      )
        throw new SnapshotReadError("incompatible");
      locks.add(id);
    }
  }
  if (
    kiosk.item_count !== items.size ||
    items.size > 10_000 ||
    [...listings.keys(), ...locks].some((id) => !items.has(id))
  )
    throw new SnapshotReadError("incompatible");
  const objects = (await reader.objects([...items.keys()], signal)).value;
  const contents = objects.map((item): WalletKioskItem => {
    if (item instanceof Error) throw item;
    const field = items.get(item.objectId);
    // dynamic_object_field.move adds the child under the wrapper field UID, not the kiosk UID.
    if (
      !field ||
      item.owner.$kind !== "ObjectOwner" ||
      item.owner.ObjectOwner !== field.fieldId ||
      item.type !== field.type ||
      toBase64(item.content) !== toBase64(field.content)
    )
      throw new SnapshotReadError("incompatible");
    return Object.freeze({
      ...item,
      kioskId: kioskId,
      isLocked: locks.has(item.objectId),
      listing: listings.get(item.objectId),
    });
  });
  return { kiosk, contents, fields };
}
