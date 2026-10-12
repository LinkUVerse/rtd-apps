import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useWalletRpc } from 'rtd-apps-core/src/rpc/WalletRpcContext';
import type { WalletObjectEffect } from 'rtd-apps-core/src/rpc/transaction-view';
import { readHistoricalEffect } from '_src/shared/rpc/historical-effect';
import { useI18n } from '../../i18n';

export function HistoricalObject({ effect }: { effect: WalletObjectEffect }) {
  const rpc = useWalletRpc(), { t } = useI18n();
  const [requested, setRequested] = useState(false);
  const eligible = !!effect.objectDigest && effect.version !== null && ['ObjectWrite', 'PackageWrite'].includes(effect.outputState);
  const query = useQuery({
    queryKey: ['wallet-historical-object', rpc.bindingKey, rpc.readSessionKey, effect.objectId, effect.version, effect.objectDigest],
    queryFn: ({ signal }) => readHistoricalEffect(rpc, effect, signal),
    enabled: requested && eligible && !!rpc.readHistoricalObjects,
    retry: false, gcTime: 0, meta: { skipPersistedCache: true },
  });
  if (!eligible) return null;
  if (!rpc.readHistoricalObjects) return <p>{t('receipt.archiveUnavailable')}</p>;
  return <div className="break-all">
    <button type="button" className="border-0 bg-transparent text-hero-dark" disabled={query.isFetching}
      onClick={() => { if (requested) void query.refetch(); else setRequested(true); }}>{t('receipt.readHistoricalObject')}</button>
    {requested && query.isFetching && <p role="status">{t('receipt.historicalLoading')}</p>}
    {query.isError && <p role="status">{t('receipt.historicalUnavailable')}</p>}
    {query.data && !query.isError && <div>
      <p>{t('receipt.historicalVerified')}</p><p>{query.data.type}</p><p>{query.data.digest}</p>
    </div>}
  </div>;
}
