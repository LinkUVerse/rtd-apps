import { act, createElement } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
const state = vi.hoisted(() => ({ scope: 'chain-a', account: '0x1', read: vi.fn(), change: vi.fn() }));
vi.mock('rtd-apps-core/src/rpc/WalletRpcContext', () => ({ useWalletRpc: () => ({assetPreferenceScope: state.scope}) }));
vi.mock('../../../hooks/useActiveAddress', () => ({useActiveAddress: () => state.account}));
vi.mock('_app/i18n', () => ({useI18n: () => ({t: (key: string) => key})}));
vi.mock('../../../shared/Link', () => ({ Link: () => null }));
vi.mock('_shared/rpc/hidden-asset-preferences', () => ({
  hiddenAssetKey: (chain: string, account: string) => `${chain}:${account}`,
  readHiddenAssets: (...args: unknown[]) => state.read(...args),
  changeHiddenAsset: (...args: unknown[]) => state.change(...args),
}));
import { HiddenAssetsProvider, useHiddenAssets } from './HiddenAssetsProvider';
Object.assign(globalThis, {IS_REACT_ACT_ENVIRONMENT: true});
let root: Root, node: HTMLDivElement;
let context: ReturnType<typeof useHiddenAssets>;
function Child() { context = useHiddenAssets(); return createElement('div', null, `assets:${context.hiddenAssetIds.join(',')}`); }
async function render() { await act(async () => root.render(createElement(HiddenAssetsProvider, null, createElement(Child)))); }
beforeEach(() => { state.scope = 'chain-a'; state.account = '0x1'; state.read.mockReset(); state.change.mockReset(); node = document.createElement('div'); root = createRoot(node); });
afterEach(async () => { await act(async () => root.unmount()); });
it('withholds child assets until persisted preferences are loaded', async () => {
  let resolve!: (ids: string[]) => void;
  state.read.mockReturnValue(new Promise<string[]>((r) => {resolve = r;}));
  await render(); expect(node.textContent).toBe('common.loading');
  await act(async () => resolve(['asset-a'])); expect(node.textContent).toBe('assets:asset-a');
});
it('never carries old ids or late reads into another account', async () => {
  let resolve!: (ids: string[]) => void;
  state.read.mockReturnValueOnce(new Promise<string[]>((r) => {resolve = r;})).mockResolvedValue(['new']);
  await render(); state.account = '0x2'; await render();
  await act(async () => resolve(['old'])); expect(node.textContent).toBe('assets:new');
});
it('old callbacks are inert after switching chain', async () => {
  state.read.mockResolvedValue([]); await render(); const old = context.hideAsset;
  state.scope = 'chain-b'; await render();
  await act(async () => old('0x3')); expect(state.change).not.toHaveBeenCalled();
});
it('read failure is explicit and does not show an empty asset list', async () => {
  state.read.mockRejectedValue(new Error('IDB unavailable')); await render();
  expect(node.textContent).toContain('assets.preferencesFailed'); expect(node.textContent).not.toContain('assets:');
});
it('shows updates only after durable success', async () => {
  state.read.mockResolvedValue([]); await render();
  let resolve!: () => void; state.change.mockReturnValue(new Promise<void>((r) => {resolve = r;}));
  await act(async () => context.hideAsset('0x3')); expect(node.textContent).toBe('assets:');
  state.read.mockResolvedValue(['0x3']); await act(async () => resolve()); expect(node.textContent).toBe('assets:0x3');
});
