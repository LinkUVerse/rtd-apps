// Copyright (c) LinkU Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

export type AnalyticsArea =
  | "network"
  | "addresses"
  | "epoch-addresses"
  | "move-calls";

/** No analytics implementation is exported by the current RTD SDK or registered by RTD.
 * Keep this separate from query results: absence is neither an empty dataset nor zero.
 */
export function analyticsAvailability(area: AnalyticsArea) {
  return Object.freeze({
    phase: "unavailable" as const,
    reason: "not-configured" as const,
    area,
  });
}

/** Presentation-only tuple for the retained table, not an SDK or transport contract. */
export type PackageActivityRow = [
  { package: string; module: string; function: string },
  string,
];
