// Copyright (c) LinkU Labs, Inc.
// SPDX-License-Identifier: Apache-2.0
import { BrowserExecutionLock, type ExecutionLock } from './execution-coordinator';
import { WalletExecutionJournal } from './execution-journal';
import { executionScopeKey } from './profile';
import type { WalletReadSession } from './session';

/** Share the execution scope while resolving new bytes; never nest inside coordinator.execute. */
export async function withPreparationGuard<T>(
  session: WalletReadSession,
  sender: string,
  operation: () => Promise<T>,
  options: {
    signal?: AbortSignal;
    requestId?: string;
    journal?: Pick<WalletExecutionJournal, 'get' | 'pending'>;
    lock?: ExecutionLock;
  } = {},
): Promise<T> {
  const signal = AbortSignal.any([session.signal, ...(options.signal ? [options.signal] : [])]);
  const scope = executionScopeKey(session.profile, sender);
  const journal = options.journal ?? new WalletExecutionJournal();
  const assertClear = async () => {
    signal.throwIfAborted(); session.assertActive();
    if (options.requestId && await journal.get(JSON.stringify([scope, options.requestId])))
      throw new Error('此请求已有执行记录，请恢复原交易，不要重新构建');
    if (await journal.pending(scope))
      throw new Error('当前链账户有待确认交易，请先恢复原交易');
    signal.throwIfAborted(); session.assertActive();
  };
  return (options.lock ?? new BrowserExecutionLock()).run(scope, async () => {
    await assertClear();
    const result = await operation();
    // Also reject external journal writes and cancellation before exposing a new preview.
    await assertClear();
    return result;
  }, signal);
}
