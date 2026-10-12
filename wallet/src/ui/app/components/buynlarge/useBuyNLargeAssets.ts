// Copyright (c) LinkU Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import {
  useGetOwnedObjects,
  matchesAssetType,
} from "rtd-apps-core/src/rpc/asset-hooks";
import { useActiveAddress } from "../../hooks/useActiveAddress";
import { useConfig } from "./useConfig";

export function useBuyNLargeAssets() {
  const config = useConfig();
  const types = config
    .filter((item) => item.enabled && item.objectType)
    .map((item) => item.objectType!);
  const { data } = useGetOwnedObjects(
    useActiveAddress(),
    { includeTypes: types },
    { enabled: !!types.length },
  );
  return config
    .filter((item) => item.enabled && item.objectType)
    .map((item) => ({
      ...item,
      asset: data?.find((object) =>
        matchesAssetType(object.type, item.objectType!),
      ),
    }));
}
