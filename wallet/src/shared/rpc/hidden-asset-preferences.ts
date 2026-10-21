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

/**
 * idb-keyval settles neither way when the database open is blocked by another
 * extension context. The Assets tab renders "正在加载" until this resolves, so an
 * unsettled read is a terminal state — bound it and let the caller show its
 * failure branch with a retry instead.
 */
export async function readHiddenAssets(key: string, timeoutMs = 5_000) {
  if (!Number.isSafeInteger(timeoutMs) || timeoutMs < 1 || timeoutMs > 30_000)
    throw new RangeError("Invalid hidden asset read budget");
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    const value = await Promise.race([
      get(key),
      new Promise<never>((_, reject) => {
        timer = setTimeout(
          () => reject(new Error("Hidden asset preferences did not settle")),
          timeoutMs,
        );
      }),
    ]);
    return decodeHiddenAssets(value);
  } finally {
    if (timer !== undefined) clearTimeout(timer);
  }
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
