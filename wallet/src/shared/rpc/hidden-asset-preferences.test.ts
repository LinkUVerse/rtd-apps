import { beforeEach, describe, expect, it, vi } from 'vitest';
const db = vi.hoisted(() => new Map<string, unknown>());
vi.mock('idb-keyval', () => ({
  get: async (key: string) => db.get(key),
  update: async (key: string, fn: (value: unknown) => unknown) => { db.set(key, fn(db.get(key))); },
}));
import { changeHiddenAsset, decodeHiddenAssets, hiddenAssetKey, readHiddenAssets } from './hidden-asset-preferences';
import { walletAddress } from './asset-address';
beforeEach(() => db.clear());
describe('scoped hidden preferences', () => {
  it('isolates chain/generation/account and normalizes addresses', () => {
    expect(hiddenAssetKey('chain-a/gen1', '0x1')).toBe(hiddenAssetKey('chain-a/gen1', walletAddress('0x1')));
    expect(new Set([hiddenAssetKey('a/1', '0x1'), hiddenAssetKey('a/2', '0x1'), hiddenAssetKey('b/1', '0x1'), hiddenAssetKey('a/1', '0x2')]).size).toBe(4);
  });
  it('retains unscoped legacy data without guessing its chain or account', async () => {
    db.set('hidden-asset-ids', ['0x1']);
    expect(await readHiddenAssets(hiddenAssetKey('a', '0x1'))).toEqual([]);
    expect(db.get('hidden-asset-ids')).toEqual(['0x1']);
  });
  it('adds idempotently and undoes only the target, retaining other edits', async () => {
    const key = hiddenAssetKey('a', '0x1');
    await changeHiddenAsset(key, '0x2', true);
    await changeHiddenAsset(key, '0x2', true);
    await changeHiddenAsset(key, '0x3', true);
    expect(await changeHiddenAsset(key, '0x2', false)).toEqual([walletAddress('0x3')]);
  });
  it.each([null, [], {version: 1, ids: []}, {version: 2, ids: ['not-address']}])('rejects corrupt stored values without replacing them: %j', async (value) => {
    db.set('key', value);
    await expect(changeHiddenAsset('key', '0x1', true)).rejects.toThrow();
    expect(db.get('key')).toEqual(value);
  });
  it('deduplicates canonical ids', () => {
    expect(decodeHiddenAssets({version: 2, ids: ['0x1', walletAddress('0x1')]})).toEqual([walletAddress('0x1')]);
  });
});
