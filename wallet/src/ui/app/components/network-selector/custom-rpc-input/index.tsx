// Copyright (c) LinkU Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { useAppDispatch, useAppSelector } from '_hooks';
import { changeActiveNetwork } from '_redux/slices/app';
import { useBackgroundClient } from '../../../hooks/useBackgroundClient';
import { validateNetworkProfile } from '_src/shared/rpc/profile';
import { profilePermissionOrigins, type CustomProfileReview } from '_src/shared/rpc/custom-profile-review';
import { useEffect, useState } from 'react';
import type { WalletNetworkProfile } from '_src/shared/rpc/profile';
import Browser from 'webextension-polyfill';

const fields = [
  ['id', '配置标识'], ['displayName', '网络名称'], ['sdkNetwork', 'SDK 网络标签'],
  ['walletStandardChain', '钱包标准链标签（rtd:...）'], ['expectedGenesisDigest', '完整创世摘要 H0'],
  ['generation', '部署代次'], ['revision', '配置版本'],
  ['fullnodeGrpcWeb', 'Fullnode gRPC-Web'], ['graphqlUrl', 'GraphQL（可选）'],
  ['archiveGrpcWeb', '归档 gRPC-Web（可选）'], ['accountHistoryUrl', '账户历史服务（可选）'],
  ['faucetUrl', '领币服务 origin（可选）'], ['explorerUrl', '区块浏览器（可选）'],
] as const;
type Field = typeof fields[number][0];

export function CustomRPCInput() {
  const active = useAppSelector(({ app }) => app.customProfile);
  const background = useBackgroundClient();
  const [loaded, setLoaded] = useState<{ profile: WalletNetworkProfile | null } | null>(null);
  const [error, setError] = useState('');
  useEffect(() => {
    let cancelled = false;
    setLoaded(null); setError('');
    if (!active) void background.getSavedCustomProfile().then(
      (profile) => { if (!cancelled) setLoaded({ profile }); },
      (error) => { if (!cancelled) setError(error instanceof Error ? error.message : '读取配置失败'); },
    );
    return () => { cancelled = true; };
  }, [active, background]);
  if (error) return <p role="alert">{error}。原配置仍保留，请检查后重新打开设置。</p>;
  if (!active && !loaded) return <p role="status">正在读取已保存的网络配置…</p>;
  const saved = active ?? loaded?.profile ?? null;
  return <CustomProfileForm key={JSON.stringify(saved)} saved={saved} />;
}

function CustomProfileForm({ saved }: { saved: WalletNetworkProfile | null }) {
  const background = useBackgroundClient();
  const dispatch = useAppDispatch();
  const [values, setValues] = useState<Record<Field, string>>(() => Object.fromEntries(fields.map(([key]) => [key,
    key === 'revision' ? String((saved?.revision ?? 0) + 1)
    : (saved?.endpoints as Record<string, string> | undefined)?.[key] ?? (saved as unknown as Record<string, string> | undefined)?.[key] ?? '',
  ])) as Record<Field, string>);
  const [packages, setPackages] = useState(JSON.stringify(saved?.packages ?? {}, null, 2));
  const [review, setReview] = useState<CustomProfileReview | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  async function preview() {
    setError(''); setReview(null); setBusy(true);
    try {
      const optional = (key: Field) => values[key].trim() || undefined;
      const profile = validateNetworkProfile({
        schemaVersion: 2, ...values, revision: Number(values.revision),
        endpoints: { fullnodeGrpcWeb: values.fullnodeGrpcWeb, graphqlUrl: optional('graphqlUrl'),
          archiveGrpcWeb: optional('archiveGrpcWeb'), accountHistoryUrl: optional('accountHistoryUrl') },
        packages: JSON.parse(packages), faucetUrl: optional('faucetUrl'), explorerUrl: optional('explorerUrl'),
      });
      // Requested directly from the user's submit gesture, before any asynchronous preflight.
      if (!(await Browser.permissions.request({ origins: profilePermissionOrigins(profile) }))) {
        throw new Error('未授权网络服务地址，配置未保存');
      }
      setReview(await background.prepareCustomProfile(profile));
    } catch (error) { setError(error instanceof Error ? error.message : '网络预检失败'); }
    finally { setBusy(false); }
  }
  async function confirm() {
    if (!review) return;
    setBusy(true); setError('');
    try {
      const network = await background.confirmCustomProfile(review.token);
      await dispatch(changeActiveNetwork({ network, store: false })).unwrap();
      setReview(null);
    } catch (error) { setReview(null); setError(error instanceof Error ? error.message : '保存网络失败'); }
    finally { setBusy(false); }
  }
  return <form onSubmit={(event) => { event.preventDefault(); void preview(); }} className="flex flex-col gap-3">
    <p className="text-bodySmall">填写同一部署的数据服务。旧单一 RPC 地址不会自动转换；省略服务会使对应功能不可用。</p>
    <fieldset disabled={busy || !!review} className="flex flex-col gap-2">
      {fields.map(([key, label]) => <label key={key} className="flex flex-col gap-1 text-bodySmall">
        {label}<input aria-label={label} value={values[key]} required={!label.includes('可选')}
          className="rounded border border-gray-40 p-2" onChange={(event) => setValues({ ...values, [key]: event.target.value })} />
      </label>)}
      <label className="flex flex-col gap-1 text-bodySmall">同链合约配置（JSON）
        <textarea aria-label="同链合约配置（JSON）" value={packages} rows={4} onChange={(event) => setPackages(event.target.value)} className="rounded border border-gray-40 p-2" />
      </label>
    </fieldset>
    {error && <p role="alert">{error}</p>}
    {review ? <div className="flex flex-col gap-2">
      <p>已核验：{review.verifiedRoles.join('、')}。请核对后确认保存。</p>
      <p className="break-all">H0：{review.profile.expectedGenesisDigest}</p>
      <p>部署代次：{review.profile.generation}；配置版本：{review.profile.revision}</p>
      {!!review.additionalServices.length && <p>账户历史覆盖将在读取时验证；领币服务与链的对应关系需由部署配置保证。</p>}
      <p>预检仅证明链身份，不代表合约、历史覆盖或全部功能已可用。</p>
      <button type="button" disabled={busy || review.expiresAt <= Date.now()} onClick={() => void confirm()}>确认保存并切换</button>
      <button type="button" disabled={busy} onClick={() => setReview(null)}>返回修改</button>
    </div> : <button type="submit" disabled={busy}>{busy ? '正在预检…' : '授权服务地址并预检'}</button>}
  </form>;
}
