import { act, createElement } from 'react';
import { createRoot } from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { expect, it, vi } from 'vitest';
import { receiptIndexCovered } from './receipt-indexing';
const m = vi.hoisted(() => ({ rpc: {} as any }));
vi.mock('rtd-apps-core/src/rpc/WalletRpcContext', () => ({ useWalletRpc: () => m.rpc }));
import { useReceiptIndexing } from '../../ui/app/hooks/useReceiptIndexing';
Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
const proof = (checkpoint: string, bindingKey = 'chain') => ({ checkpoint, bindingKey, cacheKey: checkpoint, digest: 'digest' });
it('requires same binding and target coverage without precision loss', () => {
  expect(receiptIndexCovered(proof('10'), 'chain', '11')).toBe(false);
  expect(receiptIndexCovered(proof('11'), 'chain', '11')).toBe(true);
  expect(receiptIndexCovered(proof('9007199254740993'), 'chain', '9007199254740994')).toBe(false);
  expect(() => receiptIndexCovered(proof('11', 'other'), 'chain', '11')).toThrow();
  for (const value of ['-1', '01', '', '18446744073709551616']) expect(() => receiptIndexCovered(proof(value), 'chain', '1')).toThrow();
});
it('waits for a new admitted snapshot without repeatedly refreshing the same receipt', async () => {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const node = document.createElement('div'); const root = createRoot(node);
  const refresh = vi.fn().mockResolvedValue(undefined);
  m.rpc = { hasFullnodeSession: true, bindingKey: 'chain', readSessionKey: 'session', assetSnapshotKey: '10', refreshAssets: refresh, openAssetSnapshot: async () => ({ proof: proof('10') }) };
  function View() { const query = useReceiptIndexing('digest', '11'); return createElement('div', null, query.data === true ? 'covered' : 'syncing'); }
  const render = () => act(async () => { root.render(createElement(QueryClientProvider, { client }, createElement(View))); });
  try {
    await render(); await act(() => vi.waitFor(() => expect(node.textContent).toBe('syncing')));
    expect(node.textContent).toBe('syncing');
    m.rpc = { ...m.rpc, assetSnapshotKey: '10-readmitted' }; await render();
    expect(refresh).not.toHaveBeenCalled();
    m.rpc = { ...m.rpc, assetSnapshotKey: '11', openAssetSnapshot: async () => ({ proof: proof('11') }) }; await render();
    await act(() => vi.waitFor(() => expect(node.textContent).toBe('covered')));
    expect(refresh).not.toHaveBeenCalled();
    m.rpc = { ...m.rpc, readSessionKey: 'new-session', assetSnapshotKey: 'other', openAssetSnapshot: async () => ({ proof: proof('11', 'wrong-chain') }) }; await render();
    await act(() => vi.waitFor(() => expect(node.textContent).toBe('syncing')));
    expect(refresh).not.toHaveBeenCalled();
    expect(node.textContent).toBe('syncing');
  } finally { await act(async () => root.unmount()); client.clear(); }
});
