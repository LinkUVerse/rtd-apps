// Copyright (c) LinkU Labs, Inc.
// SPDX-License-Identifier: Apache-2.0
import { useWalletRpc } from 'rtd-apps-core/src/rpc/WalletRpcContext';
import { useQuery } from '@tanstack/react-query';
import type { SerializedUIAccount } from '_src/background/accounts/Account';
import { UnlockAccountButton } from '../../../components/accounts/UnlockAccountButton';
import { useState, type ReactNode } from 'react';
import { useBackgroundClient } from '../../../hooks/useBackgroundClient';
import { useAppDispatch } from '_hooks';
import { respondToTransactionRequest } from '_redux/slices/transaction-requests';

/** No preview subtree mounts until the request's durable journal has been checked. */
export function DappRecoveryGate({ accountId, account, requestId, origin, bindingKey, children }: {
  accountId?: string; account?: SerializedUIAccount; requestId: string; origin: string; bindingKey?: string;
  children: (afterAttempt: () => Promise<void>) => ReactNode;
}) {
  const background = useBackgroundClient();
  const rpc = useWalletRpc();
  const dispatch = useAppDispatch();
  const [attempted, setAttempted] = useState(false);
  const [sending, setSending] = useState(false);
  const query = useQuery({
    // Recovery is owned by the background; frontend admission must not remount preparation.
    queryKey: ['dapp-execution-recovery', accountId, requestId, bindingKey, rpc.bindingKey, origin, account?.isLocked ?? false],
    enabled: !!accountId && !account?.isLocked,
    queryFn: ({ signal }) => background.recoverDappExecution({ accountId: accountId!, requestId }).then(result => {
      signal.throwIfAborted(); return result;
    }),
    retry: false, staleTime: 0, gcTime: 0,
    refetchInterval: (q) => attempted || q.state.data?.state === 'pending' ? 3000 : false,
    meta: { skipPersistedCache: true },
  });
  const refreshAfterAttempt = async () => { setAttempted(true); await query.refetch(); };
  if (accountId && query.isSuccess && query.data === null && !attempted)
    return <>{children(refreshAfterAttempt)}</>;
  const confirmed = !query.isError && query.data?.state === 'confirmed';
  async function respond(approved: boolean) {
    if (approved && (!confirmed || !accountId)) return;
    setSending(true);
    try {
      await dispatch(respondToTransactionRequest({ txRequestID: requestId, accountId, approved, recoverOnly: approved }));
      if (approved) await query.refetch();
    } finally { setSending(false); }
  }
  return <section className="flex flex-col gap-4 p-6">
    <p className="break-all">{origin}</p>
    <h2>{confirmed ? '原交易已确认' : '正在核对原交易'}</h2>
    <p>此页面仅查询原交易，不会重新签名或发送。关闭页面不会撤销可能已提交的交易。</p>
    {account?.isLocked && <UnlockAccountButton account={account} />}
    {query.data?.digest && <p className="break-all">{query.data.digest}</p>}
    {query.isError && <p role="alert">{query.error.message}</p>}
    {attempted && query.data === null && <p>尚未读到执行记录，提交结果仍需核实，请不要重新发送。</p>}
    <button type="button" disabled={query.isFetching || sending || !accountId || account?.isLocked} onClick={() => void query.refetch()}>查询原交易</button>
    {confirmed && <button type="button" disabled={sending} onClick={() => void respond(true)}>返回原执行结果</button>}
    <button type="button" disabled={sending} onClick={() => void respond(false)}>关闭请求</button>
  </section>;
}
