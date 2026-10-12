// Copyright (c) LinkU Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import type {
  WalletAssetObject,
  WalletRpc,
} from "rtd-apps-core/src/rpc/WalletRpcContext";
import { assetAddress } from "rtd-apps-core/src/rpc/asset-hooks";
import { normalizeStructTag } from "rtd-typescript/utils";
import { hasDisplayData } from "rtd-apps-core/src/rpc/display";
import { nativeKioskCap } from "./kiosk-reader";
import { originByteOwnerToken } from "./originbyte-kiosk";
import type { WalletKioskItem, WalletOriginByteKiosk } from "rtd-apps-core/src/rpc/kiosk-types";

/** Snapshot eligibility for the existing owned asset; fresh inputs and simulation still decide execution. */
export function nftTransferEligible(
  object: Pick<WalletAssetObject, "hasPublicTransfer"> | null | undefined,
  kioskItem?: WalletKioskItem | WalletOriginByteKiosk["items"][number],
) {
  return object?.hasPublicTransfer === true &&
    (!kioskItem || (
      !kioskItem.isLocked && !kioskItem.listing?.isExclusive &&
      (!("originByteRegistered" in kioskItem) || (
        kioskItem.originByteRegistered === true && kioskItem.originByteExclusive === false
      ))
    ));
}

export function collectibleKioskCap(
  object: WalletAssetObject | null | undefined,
  packages: WalletRpc["packages"],
) {
  if (!object) return null;
  const native = packages.kiosk ? nativeKioskCap(object, packages) : null;
  if (native) return native;
  const owner = object.owner.$kind === "AddressOwner" ? object.owner.AddressOwner
    : object.owner.$kind === "ConsensusAddressOwner" ? object.owner.ConsensusAddressOwner.owner : null;
  return owner ? originByteOwnerToken(object, owner, packages) : null;
}
export function directlyOwnedAsset(object: WalletAssetObject, address: string) {
  const normalized = assetAddress(address);
  return object.owner.$kind === "AddressOwner"
    ? object.owner.AddressOwner === normalized
    : object.owner.$kind === "ConsensusAddressOwner" &&
        object.owner.ConsensusAddressOwner.owner === normalized;
}

/** Classify only a fully admitted collection. Hidden objects never leak into either visible group. */
export function groupCollectibles(
  objects: readonly WalletAssetObject[],
  hiddenIds: readonly string[],
  packages: WalletRpc["packages"],
  featuredTypes: readonly string[] = [],
) {
  const hidden = new Set(hiddenIds.map(assetAddress));
  const featured = new Set(featuredTypes.map(normalizeStructTag));
  const result: {
    visual: WalletAssetObject[];
    other: WalletAssetObject[];
    hidden: WalletAssetObject[];
  } = { visual: [], other: [], hidden: [] };
  for (const object of objects) {
    const cap = collectibleKioskCap(object, packages);
    if (hidden.has(object.objectId)) result.hidden.push(object);
    else if (cap || hasDisplayData(object) || featured.has(object.type))
      result.visual.push(object);
    else result.other.push(object);
  }
  result.visual.sort(
    (a, b) => Number(featured.has(b.type)) - Number(featured.has(a.type)),
  );
  return result;
}

export function assetMediaUrl(
  fields: Record<string, unknown> | null | undefined,
) {
  const metadata = fields?.metadata;
  const nested =
    metadata && typeof metadata === "object" && !Array.isArray(metadata)
      ? (metadata as Record<string, unknown>)
      : null;
  const value = fields?.url ?? nested?.url;
  return typeof value === "string"
    ? value.replace(/^ipfs:\/\//, "https://ipfs.io/ipfs/")
    : null;
}
