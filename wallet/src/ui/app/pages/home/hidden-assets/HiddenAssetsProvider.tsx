// Copyright (c) LinkU Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { useI18n } from '_app/i18n';
import { useWalletRpc } from 'rtd-apps-core/src/rpc/WalletRpcContext';
import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { toast } from 'react-hot-toast';
import { useActiveAddress } from '../../../hooks/useActiveAddress';
import { changeHiddenAsset, hiddenAssetKey, readHiddenAssets } from '_shared/rpc/hidden-asset-preferences';
import { Link as InlineLink } from '../../../shared/Link';

interface HiddenAssetContext {
  hiddenAssetIds: string[];
  hideAsset: (assetId: string) => void;
  showAsset: (assetId: string) => void;
}
export const HiddenAssetsContext = createContext<HiddenAssetContext>({
  hiddenAssetIds: [], hideAsset: () => {}, showAsset: () => {},
});

export function HiddenAssetsProvider({ children }: { children: ReactNode }) {
  const rpc = useWalletRpc();
  const account = useActiveAddress();
  const scope = rpc.assetPreferenceScope && account ? hiddenAssetKey(rpc.assetPreferenceScope, account) : null;
  // Remount before rendering children so old account IDs never appear in the new scope.
  return <ScopedHiddenAssets key={scope ?? 'unconfigured'} scope={scope}>{children}</ScopedHiddenAssets>;
}

function ScopedHiddenAssets({ scope, children }: { scope: string | null; children: ReactNode }) {
  const { t } = useI18n();
  const [ids, setIds] = useState<string[]>([]);
  const [loaded, setLoaded] = useState(!scope);
  const [failed, setFailed] = useState(false);
  const alive = useRef(false);
  const revision = useRef(0);
  const channel = useRef<BroadcastChannel | null>(null);
  const reload = async () => {
    if (!scope) return;
    const ticket = ++revision.current;
    try {
      const next = await readHiddenAssets(scope);
      if (alive.current && ticket === revision.current) {
        setIds(next); setLoaded(true); setFailed(false);
      }
    } catch {
      if (alive.current && ticket === revision.current) setFailed(true);
    }
  };
  useEffect(() => {
    alive.current = true;
    void reload();
    const onFocus = () => { void reload(); };
    window.addEventListener('focus', onFocus);
    if (scope && typeof BroadcastChannel !== 'undefined') {
      channel.current = new BroadcastChannel(scope);
      channel.current.onmessage = onFocus;
    }
    return () => {
      alive.current = false; revision.current++;
      window.removeEventListener('focus', onFocus);
      channel.current?.close(); channel.current = null;
    };
  }, [scope]);

  const change = async (assetId: string, hidden: boolean, notify = true) => {
    if (!scope || !alive.current || !loaded || failed) return;
    // Invalidate an older in-flight read; publish UI success only after durable commit.
    ++revision.current;
    try {
      await changeHiddenAsset(scope, assetId, hidden);
      if (!alive.current) return;
      channel.current?.postMessage('changed');
      await reload();
      if (!alive.current || !notify) return;
      toast.custom((notice) => <div className="theme-card flex items-center gap-3 rounded-full px-3 py-2 shadow-notification">
        <InlineLink to={hidden ? '/nfts/hidden-assets' : '/nfts'} color="hero"
          text={`${t('assets.movedTo')} ${t(hidden ? 'assets.hidden' : 'assets.visual')}`}
          onClick={() => toast.dismiss(notice.id)} />
        <InlineLink color="hero" text={t('common.undo')} onClick={() => {
          void change(assetId, !hidden, false); toast.dismiss(notice.id);
        }} />
      </div>, { duration: 4000 });
    } catch {
      if (alive.current) toast.error(t(hidden ? 'assets.hideFailed' : 'assets.showFailed'));
    }
  };
  if (failed) return <div role="alert">{t('assets.preferencesFailed')} <button onClick={() => void reload()}>{t('common.retry')}</button></div>;
  if (!loaded) return <div role="status">{t('common.loading')}</div>;
  return <HiddenAssetsContext.Provider value={{ hiddenAssetIds: ids,
    hideAsset: (id) => { void change(id, true); }, showAsset: (id) => { void change(id, false); },
  }}>{children}</HiddenAssetsContext.Provider>;
}
export const useHiddenAssets = () => useContext(HiddenAssetsContext);
