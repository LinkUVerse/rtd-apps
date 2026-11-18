// Copyright (c) LinkU Labs, Inc.
// SPDX-License-Identifier: Apache-2.0
import { beforeEach, describe, expect, it, vi } from 'vitest';

const store = vi.hoisted(() => new Map<string, unknown>());
vi.mock('idb-keyval', () => ({
  get: async (key: string) => structuredClone(store.get(key)),
  update: async (key: string, fn: (value: unknown) => unknown) => {
    store.set(key, structuredClone(fn(structuredClone(store.get(key)))));
  },
  del: async (key: string) => void store.delete(key),
}));
import {
  clearPendingActivity,
  readPendingActivity,
  readPendingActivitySync,
  reconcilePendingActivity,
  rememberPendingActivity,
} from './activity-pending';

const address = '0x' + 'a'.repeat(64);
const other = '0x' + 'b'.repeat(64);
const binding = 'binding-1';

function remember(
  digest: string,
  sentAt?: number,
  sender = address,
  summary?: Parameters<typeof rememberPendingActivity>[0]['summary'],
) {
  rememberPendingActivity({
    bindingKey: binding,
    address,
    digest,
    sender,
    status: 'SUCCESS',
    sentAt,
    summary,
  });
}

describe('交易活动本地待确认记录', () => {
  beforeEach(async () => {
    store.clear();
    await clearPendingActivity();
  });

  it('确认成功的交易先进入本地记录，同一网络和账户可立即读回', async () => {
    remember('digest-1');
    expect(readPendingActivitySync(binding, address).map((e) => e.digest)).toEqual([
      'digest-1',
    ]);
    const entries = await readPendingActivity(binding, address);
    expect(entries).toHaveLength(1);
    expect(entries[0]).toMatchObject({
      digest: 'digest-1',
      sender: address,
      status: 'SUCCESS',
      confirmedAt: null,
    });
  });

  it('本地已签名摘要随待确认记录保存并读回', async () => {
    remember('digest-1', undefined, address, {
      kind: 'coin',
      recipient: other,
      recipientName: 'alice.rtd',
      amount: '1.5',
      coinSymbol: 'RTD',
      gasBudget: '1000',
    });
    const [entry] = await readPendingActivity(binding, address);
    expect(entry.summary).toMatchObject({
      kind: 'coin',
      recipient: other,
      recipientName: 'alice.rtd',
      amount: '1.5',
      coinSymbol: 'RTD',
      gasBudget: '1000',
    });
  });

  it('不同网络绑定或账户互相隔离', async () => {
    remember('digest-1');
    expect(await readPendingActivity('binding-2', address)).toEqual([]);
    expect(await readPendingActivity(binding, other)).toEqual([]);
  });

  it('检查点历史页返回同一摘要后标记已完成，未知摘要保持确认中', () => {
    remember('digest-1');
    remember('digest-2');
    const entries = reconcilePendingActivity(binding, address, ['digest-1']);
    expect(
      entries.find((entry) => entry.digest === 'digest-1')?.confirmedAt,
    ).not.toBeNull();
    expect(
      entries.find((entry) => entry.digest === 'digest-2')?.confirmedAt,
    ).toBeNull();
  });

  it('已完成的标记先写入内存，随后可从本地存储恢复', async () => {
    remember('digest-1');
    reconcilePendingActivity(binding, address, ['digest-1']);
    // A fresh read merges the idb copy back in without losing the marker.
    const entries = await readPendingActivity(binding, address);
    expect(entries[0].confirmedAt).not.toBeNull();
  });

  it('重复恢复同一摘要不会把它重新变回确认中', () => {
    remember('digest-1');
    reconcilePendingActivity(binding, address, ['digest-1']);
    remember('digest-1');
    expect(readPendingActivitySync(binding, address)[0].confirmedAt).not.toBeNull();
  });

  it('过期的本地记录不再展示', async () => {
    remember('digest-1', 1);
    expect(readPendingActivitySync(binding, address, 8 * 24 * 60 * 60 * 1_000)).toEqual([]);
    expect(
      await readPendingActivity(binding, address, 8 * 24 * 60 * 60 * 1_000),
    ).toEqual([]);
  });

  it('退出登录清空本地记录', async () => {
    remember('digest-1');
    await clearPendingActivity();
    expect(readPendingActivitySync(binding, address)).toEqual([]);
    expect(await readPendingActivity(binding, address)).toEqual([]);
  });
});
