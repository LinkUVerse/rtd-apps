// Copyright (c) LinkU Labs, Inc.
// SPDX-License-Identifier: Apache-2.0
import { API_ENV } from '../../src/shared/api-env';
import { LOCAL_DEV_ENDPOINTS } from '../../src/shared/rpc/local-dev-endpoints';
import { validateNetworkProfile } from '../../src/shared/rpc/profile';
import { profilePermissionOrigins } from '../../src/shared/rpc/profile-permissions';

/**
 * Grant only the same complete built-ins that the wallet can select, plus the
 * fixed loopback entry points of the local dev stack.
 *
 * The local stack publishes the same ports for every generation, so these
 * origins are stable across `rtd-dev.sh reset`. Granting them unconditionally
 * is what lets "local" work with no build-time configuration; a discovered
 * local profile is always within these origins.
 */
export function builtinHostPermissions(registryJson: string | undefined): string[] {
  const origins: string[] = [
    ...Object.values(LOCAL_DEV_ENDPOINTS).map(
      (url) => `${new URL(url).origin}/*`,
    ),
  ];
  if (!registryJson?.trim()) return Array.from(new Set(origins)).sort();
  const registry: unknown = JSON.parse(registryJson);
  if (!registry || typeof registry !== 'object' || Array.isArray(registry)) {
    throw new Error('Invalid built-in wallet profile registry');
  }
  const networks: string[] = [API_ENV.local, API_ENV.devNet, API_ENV.testNet, API_ENV.mainnet];
  for (const [network, entry] of Object.entries(registry)) {
    if (!networks.includes(network)) throw new Error('Unsupported built-in wallet network');
    origins.push(...profilePermissionOrigins(validateNetworkProfile(entry, { requireComplete: true })));
  }
  return Array.from(new Set(origins)).sort();
}
