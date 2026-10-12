// Copyright (c) LinkU Labs, Inc.
// SPDX-License-Identifier: Apache-2.0
import type { ValidatedNetworkProfile } from './profile';

/** Chrome host permissions are origins, not paths or external navigation URLs. */
export function profilePermissionOrigins(profile: ValidatedNetworkProfile): string[] {
  return Array.from(new Set([
    ...Object.values(profile.endpoints), profile.faucetUrl,
  ].filter((url): url is string => !!url).map((url) => `${new URL(url).origin}/*`)));
}
