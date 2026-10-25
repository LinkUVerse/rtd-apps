// Copyright (c) LinkU Labs, Inc.
// SPDX-License-Identifier: Apache-2.0
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { WalletAccountHistory } from 'rtd-apps-core/src/rpc/WalletRpcContext';

const store = vi.hoisted(() => new Map<string, unknown>());
vi.mock('idb-keyval', () => ({
  get: async (key: string) => structuredClone(store.get(key)),
  update: async (key: string, fn: (value: unknown) => unknown) => {
    store.set(key, structuredClone(fn(structuredClone(store.get(key)))));
  },
  del: async (key: string) => void store.delete(key),
}));
import {
  clearActivityCache,
  decodeActivity,
  readActivity,
  writeActivity,
} from './activity-cache';

const address = '0x' + 'a'.repeat(64);
const binding = 'binding-1';
function row(n: number) {
  return {
    digest: `digest-${n}`,
    checkpoint: 100 - n,
    sender: address,
    origins: ['affectedAddress'],
    transaction: { digest: `digest-${n}` },
    status: 'SUCCESS',
    timestampMs: 1_700_000_000_000 + n,
    kind: 'ProgrammableTransaction',
    nativeTransaction: { large: 'x'.repeat(100) },
    eventFacts: { complete: true },
    kioskTransfers: null,
  };
}
function history(rows: number): WalletAccountHistory {
  return {
    bindingKey: binding,
    readSessionKey: 'session',
    address,
    checkpointLo: 0,
    checkpointHi: 100,
    checkpointDigest: 'digest',
    snapshot: 'a'.repeat(64),
    coverage: {
      registrationComplete: false,
      completeForRegisteredKiosks: true,
      completeForDiscoveredOwnerTokens: true,
      completeForDiscoveredCapabilities: null,
      allAccountActivityCertified: false,
      allAccountTransfersCertified: null,
    },
    transactions: Array.from({ length: rows }, (_, i) => row(i)),
    continuation: null,
  } as unknown as WalletAccountHistory;
}

describe('活动列表展示缓存', () => {
  beforeEach(() => store.clear());

  it('写入后可按同一网络绑定和账户读回，只保留卡片所需字段', async () => {
    await writeActivity(binding, address, history(2), 42);
    const cached = await readActivity(binding, address.toUpperCase().replace('0X', '0x'));
    expect(cached?.savedAt).toBe(42);
    expect(cached?.checkpointHi).toBe(100);
    expect(cached?.transactions.map((r) => r.digest)).toEqual(['digest-0', 'digest-1']);
    expect(cached?.transactions[0].nativeTransaction).toBeNull();
    expect(cached?.transactions[0].eventFacts).toBeNull();
  });

  it('其它网络绑定或其它账户不会读到这份缓存', async () => {
    await writeActivity(binding, address, history(1));
    expect(await readActivity('binding-2', address)).toBeUndefined();
    expect(await readActivity(binding, '0x' + 'b'.repeat(64))).toBeUndefined();
  });

  it('最多缓存首页 20 行，超出的账户按最近写入淘汰', async () => {
    await writeActivity(binding, address, history(30), 1);
    expect((await readActivity(binding, address))?.transactions).toHaveLength(20);
    for (let i = 0; i < 20; i++)
      await writeActivity(binding, '0x' + i.toString(16).padStart(64, '0'), history(1), 1000 + i);
    expect(await readActivity(binding, address)).toBeUndefined();
    expect(await readActivity(binding, '0x' + (19).toString(16).padStart(64, '0'))).toBeDefined();
  });

  it('格式不符的条目被忽略', () => {
    const base = { version: 1, bindingKey: binding, address, savedAt: 1, checkpointLo: 0,
      checkpointHi: 10, coverage: {}, transactions: [row(0)] };
    expect(decodeActivity(base, binding, address)).toBeDefined();
    for (const bad of [
      { ...base, version: 2 },
      { ...base, checkpointLo: 11 },
      { ...base, transactions: [{ ...row(0), status: 'PENDING' }] },
      { ...base, transactions: [{ ...row(0), checkpoint: -1 }] },
      null,
    ])
      expect(decodeActivity(bad, binding, address)).toBeUndefined();
  });

  it('退出登录清空全部活动缓存', async () => {
    await writeActivity(binding, address, history(1));
    await clearActivityCache();
    expect(await readActivity(binding, address)).toBeUndefined();
  });
});
