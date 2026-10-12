// Copyright (c) LinkU Labs, Inc.
// SPDX-License-Identifier: Apache-2.0
import { createElement as h, type ReactNode } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { beforeEach, expect, it, vi } from 'vitest';
import { RpcError } from 'rtd-typescript/grpc';
import { NFTDisplayCard } from './index';
import { Kiosk } from './Kiosk';

const state = vi.hoisted(() => ({ error: null as Error | null }));
vi.mock('_app/i18n', () => ({ useI18n: () => ({ t: (key: string) => key }) }));
vi.mock('_hooks', () => ({
  useGetNFTMeta: () => ({ isPending: false, data: { name: 'previous NFT', imageUrl: 'https://old.invalid/private.png' } }),
  useFileExtensionType: () => ({ name: 'PNG', type: 'image' }),
  useActiveAddress: () => '0xb',
}));
vi.mock('rtd-apps-core/src/rpc/asset-hooks', () => ({ useGetObject: () => ({ isError: true, error: state.error }) }));
vi.mock('rtd-apps-core/src/rpc/WalletRpcContext', () => ({ useWalletRpc: () => ({ packages: {} }) }));
vi.mock('rtd-apps-core/src/rpc/kiosk-hooks', () => ({ useGetKioskContents: () => ({ isError: true, error: state.error, isPending: false }) }));
vi.mock('../../hooks/useResolveVideo', () => ({ useResolveVideo: () => null }));
vi.mock('../../../../shared/rpc/nft-assets', () => ({ collectibleKioskCap: () => null }));
vi.mock('_components/loading', () => ({ default: ({ children }: { children: ReactNode }) => children }));
vi.mock('../alert', () => ({ default: ({ children }: { children: ReactNode }) => h('div', { role: 'alert' }, children) }));
vi.mock('./NftImage', () => ({ NftImage: () => h('img', { src: 'https://old.invalid/private.png' }) }));
vi.mock('../../shared/text', () => ({ Text: ({ children }: { children: ReactNode }) => h('span', null, children) }));
vi.mock('_app/shared/heading', () => ({ Heading: ({ children }: { children: ReactNode }) => h('h2', null, children) }));
beforeEach(() => { state.error = new RpcError('private upstream diagnostic', 'UNAVAILABLE'); });
it.each(['horizontal', 'vertical'] as const)('失败的%s NFT卡只显示公开错误，不渲染旧标签或媒体', orientation => {
  const markup = renderToStaticMarkup(h(NFTDisplayCard, { objectId: '0xa', size: 'lg', orientation, wideView: true }));
  expect(markup).toContain('查询服务暂不可用，请稍后重试');
  expect(markup).not.toContain('private');
  expect(markup).not.toContain('previous NFT');
  expect(markup).not.toContain('<img');
  expect(markup).not.toContain('<h2');
});
it('Kiosk读取失败也使用公开提示', () => {
  const markup = renderToStaticMarkup(h(Kiosk, { object: {} as never }));
  expect(markup).toContain('查询服务暂不可用，请稍后重试');
  expect(markup).not.toContain('private');
  expect(markup).not.toContain('<img');
});
