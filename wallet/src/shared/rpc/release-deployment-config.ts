// Copyright (c) LinkU Labs, Inc.
// SPDX-License-Identifier: Apache-2.0
import type { ValidatedNetworkProfile } from "./profile";
import { selectReviewedDeployment } from "./reviewed-deployment-registry";

// Replaced by common webpack DefinePlugin in UI and background builds.
declare const __WALLET_REVIEWED_DEPLOYMENTS__: string;
const registry =
  typeof __WALLET_REVIEWED_DEPLOYMENTS__ === "undefined"
    ? undefined
    : __WALLET_REVIEWED_DEPLOYMENTS__;

/** Capture build input once. Never synthesize authority from a profile or a response. */
export function selectConfiguredDeployment(profile: ValidatedNetworkProfile) {
  return selectReviewedDeployment(profile, registry);
}
