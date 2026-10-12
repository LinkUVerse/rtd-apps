// Copyright (c) LinkU Labs, Inc.
// SPDX-License-Identifier: Apache-2.0
import { describe, expect, it, vi } from 'vitest';
import { withPreparationGuard } from './preparation-guard';
import { WalletReadSession } from './session';
import { executionScopeKey, validateNetworkProfile } from './profile';
import { profileFixture } from './profile-fixture';
import type { WalletJournalRecord } from './execution-journal';
import type { ExecutionLock } from './execution-coordinator';

function fixture() {
  const session = new WalletReadSession(validateNetworkProfile(profileFixture()));
  const journal = { get: vi.fn().mockResolvedValue(null), pending: vi.fn().mockResolvedValue(null) };
  const occupied = new Set<string>();
  const lock: ExecutionLock = { run: async (scope, operation) => {
    if (occupied.has(scope)) throw new Error('busy');
    occupied.add(scope);
    try { return await operation(); } finally { occupied.delete(scope); }
  } };
  return { session, journal, lock, occupied };
}
describe('持久pending与跨入口准备互斥', () => {
  it('pending存在时不调用任何构建或模拟操作', async () => {
    const f = fixture(), operation = vi.fn();
    f.journal.pending.mockResolvedValue({ state: 'dispatch-pending' });
    await expect(withPreparationGuard(f.session, '0x7', operation, f)).rejects.toThrow('待确认');
    expect(operation).not.toHaveBeenCalled();
    expect(f.journal.pending).toHaveBeenCalledWith(executionScopeKey(f.session.profile, '0x7'));
  });
  it('journal读取失败时保持关闭，释放锁供恢复重试', async () => {
    const f = fixture(), operation = vi.fn().mockResolvedValue('preview');
    f.journal.pending.mockRejectedValueOnce(new Error('storage unavailable'));
    await expect(withPreparationGuard(f.session, '0x7', operation, f)).rejects.toThrow('storage unavailable');
    expect(operation).not.toHaveBeenCalled(); expect(f.occupied.size).toBe(0);
    await expect(withPreparationGuard(f.session, '0x7', operation, f)).resolves.toBe('preview');
  });
  it('同一dApp请求已有终态也不能重新构建', async () => {
    const f = fixture(), operation = vi.fn();
    f.journal.get.mockResolvedValue({ state: 'confirmed-success' });
    await expect(withPreparationGuard(f.session, '0x7', operation, { ...f, requestId: 'original' })).rejects.toThrow('已有执行记录');
    expect(operation).not.toHaveBeenCalled();
  });
  it('准备期间保持与执行相同的scope锁，URL别名不能绕开', async () => {
    const f = fixture();
    const other = new WalletReadSession(validateNetworkProfile({ ...profileFixture(), id: 'alias', revision: 2,
      endpoints: { fullnodeGrpcWeb: 'https://another.example/fullnode' } }));
    await withPreparationGuard(f.session, '0x7', async () => {
      await expect(withPreparationGuard(other, '0x07', vi.fn(), f)).rejects.toThrow('busy');
      await expect(f.lock.run(executionScopeKey(other.profile, '0x7'), async () => true)).rejects.toThrow('busy');
      expect(f.occupied.size).toBe(1);
    }, f);
    expect(f.occupied.size).toBe(0);
  });
  it('返回前重新读取pending，拒绝外部写入后的旧预览', async () => {
    const f = fixture();
    await expect(withPreparationGuard(f.session, '0x7', async () => {
      f.journal.pending.mockResolvedValue({ state: 'dispatch-pending' } as WalletJournalRecord);
      return 'stale preview';
    }, f)).rejects.toThrow('待确认');
  });
  it.each(['caller', 'session'])('%s取消后，即使操作忽略信号也不交付预览', async mode => {
    const f = fixture(), caller = new AbortController();
    await expect(withPreparationGuard(f.session, '0x7', async () => {
      if (mode === 'caller') caller.abort(); else f.session.close();
      return 'late preview';
    }, { ...f, signal: caller.signal })).rejects.toBeInstanceOf(Error);
    expect(f.occupied.size).toBe(0);
  });
});
