// Copyright (c) LinkU Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import type { WalletAssetObject } from "rtd-apps-core/src/rpc/WalletRpcContext";

import useFileExtensionType from "./useFileExtensionType";
import useMediaUrl from "./useMediaUrl";

export default function useNFTBasicData(
  nftObj: WalletAssetObject | null | undefined,
) {
  const nftObjectID = nftObj?.objectId || null;
  const filePath = useMediaUrl(nftObj?.json ?? null);
  const objType = nftObj?.type ?? null;
  const nftFields = nftObj?.json ?? null;
  const fileExtensionType = useFileExtensionType(filePath || "");
  return {
    nftObjectID,
    filePath,
    nftFields,
    fileExtensionType,
    objType,
  };
}
