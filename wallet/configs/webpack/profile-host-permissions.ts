// Copyright (c) LinkU Labs, Inc.
// SPDX-License-Identifier: Apache-2.0
import { API_ENV } from '../../src/shared/api-env';
import { validateNetworkProfile } from '../../src/shared/rpc/profile';
import { profilePermissionOrigins } from '../../src/shared/rpc/profile-permissions';

/** Grant only the same complete built-ins that the wallet can select. */
export function builtinHostPermissions(registryJson: string | undefined): string[] {
  if (!registryJson?.trim()) return [];
  const registry: unknown = JSON.parse(registryJson);
  if (!registry || typeof registry !== 'object' || Array.isArray(registry)) {
    throw new Error('Invalid built-in wallet profile registry');
  }
  const networks: string[] = [API_ENV.local, API_ENV.devNet, API_ENV.testNet, API_ENV.mainnet];
  const origins: string[] = [];
  for (const [network, entry] of Object.entries(registry)) {
    if (!networks.includes(network)) throw new Error('Unsupported built-in wallet network');
    origins.push(...profilePermissionOrigins(validateNetworkProfile(entry, { requireComplete: true })));
  }
  return Array.from(new Set(origins)).sort();
}
