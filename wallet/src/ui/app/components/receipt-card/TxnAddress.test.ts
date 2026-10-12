// Copyright (c) LinkU Labs, Inc.
// SPDX-License-Identifier: Apache-2.0
import { act, createElement as h, type ReactNode } from 'react';
import { createRoot } from 'react-dom/client';
import { beforeEach, expect, it, vi } from 'vitest';
import { TxnAddress } from './TxnAddress';

const state = vi.hoisted(() => ({ reverse: undefined as string | undefined, hook: vi.fn() }));
vi.mock('_app/hooks/useAppResolveRtdnsName', () => ({ useResolveRtdNSName: (address?: string) => {
  state.hook(address); return address ? state.reverse : undefined;
} }));
vi.mock('_app/i18n', () => ({ useI18n: () => ({ t: (key: string) => key }) }));
vi.mock('_components/explorer-link', () => ({ default: ({ address, children }: { address: string; children: ReactNode }) =>
  h('a', { href: `https://explorer.invalid/address/${address}` }, children) }));
Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
const address = '0x' + 'bad0'.padEnd(64, '1');
beforeEach(() => { state.reverse = undefined; state.hook.mockReset(); });

it.each([undefined, 'default.rtd'])('reverse label %s never replaces the real address or link destination', async name => {
  state.reverse = name;
  const node = document.createElement('div'), root = createRoot(node);
  try {
    await act(async () => root.render(h(TxnAddress, { address, label: 'Recipient', fullAddress: true })));
    expect(node.querySelector('a')?.getAttribute('href')).toBe(`https://explorer.invalid/address/${address}`);
    expect(node.querySelector('a')?.textContent).toBe(address);
    if (name) expect(node.textContent).toContain(name);
  } finally { await act(async () => root.unmount()); }
});

it('prepared forward name keeps its own label and full address without a competing reverse lookup', async () => {
  state.reverse = 'unrelated-default.rtd';
  const node = document.createElement('div'), root = createRoot(node);
  try {
    await act(async () => root.render(h(TxnAddress, { address, label: 'Recipient', recipientName: 'leaf.root.rtd' })));
    expect(node.textContent).toContain('leaf.root.rtd');
    expect(node.textContent).not.toContain('unrelated-default.rtd');
    expect(node.querySelector('a')?.textContent).toBe(address);
    expect(node.querySelector('a')?.getAttribute('href')).toBe(`https://explorer.invalid/address/${address}`);
    expect(state.hook).toHaveBeenCalledWith(undefined);
    await act(async () => root.render(h(TxnAddress, { address: '0x'+'d'.repeat(64), label: 'Recipient', fullAddress: true })));
    expect(node.textContent).not.toContain('leaf.root.rtd');
    expect(node.querySelector('a')?.textContent).toBe('0x'+'d'.repeat(64));
  } finally { await act(async () => root.unmount()); }
});
