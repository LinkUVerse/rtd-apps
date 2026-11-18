// Copyright (c) LinkU Labs, Inc.
// SPDX-License-Identifier: Apache-2.0
import { act, createElement as h } from 'react';
import { createRoot } from 'react-dom/client';
import { beforeEach, expect, it, vi } from 'vitest';
import type { WalletHistoryTransaction } from 'rtd-apps-core/src/rpc/WalletRpcContext';

const store = vi.hoisted(() => new Map<string, unknown>());
const m = vi.hoisted(() => ({ expectDigest: vi.fn() }));
vi.mock('idb-keyval', () => ({
  get: async (key: string) => structuredClone(store.get(key)),
  update: async (key: string, fn: (value: unknown) => unknown) => {
    store.set(key, structuredClone(fn(structuredClone(store.get(key)))));
  },
  del: async (key: string) => void store.delete(key),
}));
vi.mock('rtd-apps-core/src/rpc/WalletRpcContext', () => ({
  useWalletRpc: () => ({ bindingKey: 'binding-1' }),
}));
vi.mock('rtd-apps-core/src/rpc/history-hooks', () => ({
  expectHistoryTransaction: m.expectDigest,
}));
import {
  clearPendingActivity,
  rememberPendingActivity,
} from '_src/shared/rpc/activity-pending';
import { usePendingActivity } from './usePendingActivity';

const address = '0x' + 'a'.repeat(64);
function verifiedRow(digest: string): WalletHistoryTransaction {
  return {
    digest,
    checkpoint: 10,
    sender: address,
    origins: ['affectedAddress'],
    transaction: null,
    status: 'SUCCESS',
    timestampMs: 10,
    kind: 'ProgrammableTransaction',
    nativeTransaction: null,
    eventFacts: null,
    kioskTransfers: null,
  };
}
function Probe({ verified }: { verified?: readonly WalletHistoryTransaction[] }) {
  const result = usePendingActivity(address, verified);
  return h(
    'div',
    null,
    JSON.stringify({
      pending: result.pendingRows.map((row) => row.digest),
      pendingTags: [...result.pendingDigests],
      confirmedTags: [...result.confirmedDigests],
    }),
  );
}
Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
beforeEach(async () => {
  store.clear();
  m.expectDigest.mockReset();
  await clearPendingActivity();
});
it('本地已验证成功的记录立即显示已完成，检查点返回同摘要后仍保持已完成', async () => {
  rememberPendingActivity({
    bindingKey: 'binding-1',
    address,
    digest: 'digest-1',
    sender: address,
    status: 'SUCCESS',
  });
  const node = document.createElement('div');
  const root = createRoot(node);
  try {
    await act(async () => root.render(h(Probe, {})));
    let view = JSON.parse(node.textContent!);
    expect(view.pending).toEqual(['digest-1']);
    expect(view.pendingTags).toEqual([]);
    expect(view.confirmedTags).toEqual(['digest-1']);
    expect(m.expectDigest).toHaveBeenCalledWith(address, 'digest-1');
    await act(async () => root.render(h(Probe, { verified: [verifiedRow('digest-1')] })));
    view = JSON.parse(node.textContent!);
    expect(view.pending).toEqual([]);
    expect(view.pendingTags).toEqual([]);
    expect(view.confirmedTags).toEqual(['digest-1']);
  } finally {
    await act(async () => root.unmount());
  }
});
it('检查点已经包含该摘要时不再重复展示本地行', async () => {
  rememberPendingActivity({
    bindingKey: 'binding-1',
    address,
    digest: 'digest-1',
    sender: address,
    status: 'SUCCESS',
  });
  const node = document.createElement('div');
  const root = createRoot(node);
  try {
    await act(async () =>
      root.render(h(Probe, { verified: [verifiedRow('digest-1')] })),
    );
    const view = JSON.parse(node.textContent!);
    expect(view.pending).toEqual([]);
    expect(view.confirmedTags).toEqual(['digest-1']);
  } finally {
    await act(async () => root.unmount());
  }
});
