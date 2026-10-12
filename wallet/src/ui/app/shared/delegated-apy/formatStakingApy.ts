// Copyright (c) LinkU Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

/** Presentation only: retain the original fraction for ordering and analytics. */
export function formatStakingApy(
  fraction: number | null,
  decimals = 2,
  unknown = "--",
) {
  if (
    fraction === null ||
    !Number.isFinite(fraction) ||
    fraction <= 0 ||
    fraction >= 0.1
  )
    return unknown;
  const rounded = Number((fraction * 100).toFixed(decimals));
  return `${rounded === 0 ? "~" : ""}${rounded}%`;
}
