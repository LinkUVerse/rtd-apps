// Copyright (c) LinkU Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { useGetOwnedObjects } from "rtd-apps-core/src/rpc/asset-hooks";
import { useWalletRpc } from "rtd-apps-core/src/rpc/WalletRpcContext";
import { useMemo } from "react";
import { groupCollectibles } from "../../../shared/rpc/nft-assets";
import { useConfig } from "../components/buynlarge/useConfig";
import { useHiddenAssets } from "../pages/home/hidden-assets/HiddenAssetsProvider";

export enum AssetFilterTypes {
  visual = "visual",
  other = "other",
}
export function useGetNFTs(address?: string | null) {
  const rpc = useWalletRpc();
  const config = useConfig();
  const query = useGetOwnedObjects(address, {
    excludeTypes: ["0x2::coin::Coin"],
  });
  const { hiddenAssetIds } = useHiddenAssets();
  const classified = useMemo(() => {
    if (!query.data || query.isError) return { data: undefined, error: null };
    try {
      return {
        data: groupCollectibles(
          query.data,
          hiddenAssetIds,
          rpc.packages,
          config
            .filter((item) => item.enabled && item.objectType)
            .map((item) => item.objectType!),
        ),
        error: null,
      };
    } catch (error) {
      return {
        data: undefined,
        error: error instanceof Error ? error : new Error("资产分类失败"),
      };
    }
  }, [query.data, query.isError, hiddenAssetIds, rpc.packages, config]);
  return {
    ...query,
    data: classified.data,
    isError: query.isError || !!classified.error,
    error: query.error ?? classified.error,
  };
}
