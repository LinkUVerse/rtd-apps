// Copyright (c) LinkU Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

/** Passive full-service assessment belongs to a sustained page.
 * This never selects a transaction authorization or disables negative admission checks.
 */
export function shouldObserveReadCapabilities(
  pathname: string,
  toolbarPopup: boolean,
): boolean {
  return (
    !toolbarPopup && !/^\/dapp\/(?:connect|approve)\/[^/]+\/?$/.test(pathname)
  );
}

/** These routes use independent readers or local state, not NFT/Display snapshots.
 * Receipt coverage and optional NFT observers request snapshots on demand.
 * Keep NFT/Kiosk and unknown routes conservative. */
export function shouldPreloadAssetSnapshot(pathname: string): boolean {
  return !/^\/(?:tokens(?:\/details)?|send(?:\/select)?|stake(?:\/.*)?|transactions(?:\/[^/]+)?|receipt|accounts(?:\/.*)?|apps(?:\/.*)?|onramp|usdc-promo|restricted)?\/?$/.test(
    pathname,
  );
}
