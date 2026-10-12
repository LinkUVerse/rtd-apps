// Copyright (c) LinkU Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import type { WalletAssetObject } from "./WalletRpcContext";

export function hasDisplayData(object?: WalletAssetObject | null) {
  return !!object?.display && object.display.output !== null;
}

/** Display v2 can return structured values; only strings belong in labels and URLs. */
export function displayString(
  object: WalletAssetObject | null | undefined,
  field: string,
): string | null {
  if (object?.display?.errors?.[field]) return null;
  const value = object?.display?.output?.[field];
  return typeof value === "string" ? value : null;
}
