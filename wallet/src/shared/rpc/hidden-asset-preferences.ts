// Copyright (c) LinkU Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { get, update } from 'idb-keyval';
import { walletAddress } from './asset-address';

export function hiddenAssetKey(chainScope: string, account: string) {
  return JSON.stringify(['wallet-hidden-assets', 2, chainScope, walletAddress(account)]);
}

export function decodeHiddenAssets(value: unknown): string[] {
  if (value === undefined) return [];
  if (!value || typeof value !== 'object' || !('version' in value) || value.version !== 2 ||
      !('ids' in value) || !Array.isArray(value.ids) || value.ids.length > 10000)
    throw new Error('Invalid hidden asset preferences');
  return [...new Set(value.ids.map(walletAddress))];
}

export async function readHiddenAssets(key: string) {
  return decodeHiddenAssets(await get(key));
}

/** Atomic read-modify-write prevents two extension windows from losing each other's edits. */
export async function changeHiddenAsset(key: string, assetId: string, hidden: boolean) {
  const id = walletAddress(assetId);
  let result: string[] = [];
  await update(key, (value: unknown) => {
    const ids = decodeHiddenAssets(value);
    result = hidden ? [...new Set([...ids, id])] : ids.filter((item) => item !== id);
    if (result.length > 10000) throw new Error('Hidden asset preference limit exceeded');
    return { version: 2, ids: result };
  });
  return result;
}
