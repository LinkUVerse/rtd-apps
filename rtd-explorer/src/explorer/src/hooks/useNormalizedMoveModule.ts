// Copyright (c) LinkU Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { useExplorerQuery } from "~/rpc/explorer-client";

export function useNormalizedMoveModule(
  packageId?: string | null,
  moduleName?: string | null,
) {
  return useExplorerQuery(
    "getNormalizedMoveModule",
    {
      package: packageId!,
      module: moduleName!,
    },
    {
      enabled: !!(packageId && moduleName),
    },
  );
}
