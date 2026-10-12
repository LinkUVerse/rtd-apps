import { dehydrate, QueryClient } from '@tanstack/react-query';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { queryDehydrateOptions, QUERY_CACHE_KEY } from './queryPersistence';

const storage = vi.hoisted(() => ({ get: vi.fn(), set: vi.fn(), del: vi.fn() }));
vi.mock('idb-keyval', () => storage);
import { persister } from './queryClient';
import { persistQueryClientRestore } from '@tanstack/react-query-persist-client';
import { QUERY_CACHE_BUSTER } from './queryPersistence';

beforeEach(() => vi.clearAllMocks());

describe('新版钱包持久缓存边界', () => {
  it('不持久化链查询、隐私查询或暂停中的提交，只保留成功的普通查询', () => {
    const client = new QueryClient();
    client.setQueryData(['wallet-assets', 'old-network', 'old-account'], { balance: '100' });
    client.setQueryData(['wallet-fresh-coins', 'old-network'], ['stale-coin']);
    client.setQueryDefaults(['accounts'], { meta: { skipPersistedCache: true } });
    client.setQueryData(['accounts'], ['private-account']);
    client.setQueryData(['apps-catalog'], ['app']);
    client.getMutationCache().build(client, { mutationKey: ['send-coin'] }, {
      context: undefined, data: undefined, error: null, failureCount: 0,
      failureReason: null, isPaused: true, status: 'pending',
      variables: { bytes: 'previously-approved' }, submittedAt: Date.now(),
    });
    expect(dehydrate(client).mutations).toHaveLength(1);
    const saved = dehydrate(client, queryDehydrateOptions);
    expect(saved.mutations).toEqual([]);
    expect(saved.queries.map(query => query.queryKey)).toEqual([['apps-catalog']]);
    client.clear();
  });

  it('实际恢复入口拒绝同版本快照中的链数据、隐私查询和暂停提交', async () => {
    const old = new QueryClient();
    old.setQueryData(['wallet-assets', 'old-chain', 'old-account'], { balance: '999' });
    old.setQueryDefaults(['private-profile'], { meta: { skipPersistedCache: true } });
    old.setQueryData(['private-profile'], { address: 'old-account' });
    old.setQueryData(['apps-catalog'], ['allowed']);
    old.getMutationCache().build(old, { mutationKey: ['send-coin'] }, {
      context: undefined, data: undefined, error: null, failureCount: 0,
      failureReason: null, isPaused: true, status: 'pending',
      variables: { bytes: 'must-not-replay' }, submittedAt: Date.now(),
    });
    // Deliberately bypass the save filter, as an older writer could have done.
    const stored = { timestamp: Date.now(), buster: QUERY_CACHE_BUSTER, clientState: dehydrate(old) };
    storage.get.mockResolvedValue(stored);
    const restored = new QueryClient();
    const execute = vi.fn();
    restored.setMutationDefaults(['send-coin'], { mutationFn: execute });
    try {
      await persistQueryClientRestore({ queryClient: restored, persister, buster: QUERY_CACHE_BUSTER });
      await restored.resumePausedMutations();
      expect(execute).not.toHaveBeenCalled();
      expect(restored.getMutationCache().getAll()).toEqual([]);
      expect(restored.getQueryCache().getAll().map(query => query.queryKey)).toEqual([['apps-catalog']]);
      expect(restored.getQueryData(['apps-catalog'])).toEqual(['allowed']);
      expect(stored.clientState.mutations).toHaveLength(1);
      expect(stored.clientState.queries).toHaveLength(3);
    } finally { old.clear(); restored.clear(); }
  });

  it('直接调用persister保存也不能绕过领域过滤', async () => {
    const client = new QueryClient();
    client.setQueryData(['wallet-fresh-coins', 'chain'], ['coin']);
    client.setQueryData(['apps-catalog'], ['allowed']);
    const stored = { timestamp: Date.now(), buster: QUERY_CACHE_BUSTER, clientState: dehydrate(client) };
    try {
      await persister.persistClient(stored);
      expect(storage.set).toHaveBeenCalledOnce();
      const [key, saved] = storage.set.mock.calls[0];
      expect(key).toBe(QUERY_CACHE_KEY);
      expect(saved.clientState.mutations).toEqual([]);
      expect(saved.clientState.queries.map((query: { queryKey: unknown[] }) => query.queryKey)).toEqual([['apps-catalog']]);
      expect(stored.clientState.queries).toHaveLength(2);
    } finally { client.clear(); }
  });

  it.each([null, {}, { buster: QUERY_CACHE_BUSTER, timestamp: 1, clientState: { queries: null } }])(
    '无效缓存结构不进入hydrate: %j', async (stored) => {
      storage.get.mockResolvedValue(stored);
      expect(await persister.restoreClient()).toBeUndefined();
    },
  );

  it('恢复只读新版命名空间，旧缓存不读取、不删除', async () => {
    storage.get.mockImplementation(async (key: string) => key === 'queryClient.v1'
      ? { clientState: { queries: ['legacy-chain-data'] } } : undefined);
    expect(await persister.restoreClient()).toBeUndefined();
    expect(storage.get).toHaveBeenCalledWith(QUERY_CACHE_KEY);
    expect(storage.get).not.toHaveBeenCalledWith('queryClient.v1');
    expect(storage.del).not.toHaveBeenCalled();
  });
});
