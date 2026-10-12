import { act, createElement as h } from 'react';
import { createRoot } from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { useFaucetMutation } from './useFaucetMutation';
const f = vi.hoisted(() => ({ request: vi.fn(), probe: vi.fn() }));
vi.mock('rtd-typescript/faucet', () => ({ requestRtdFromFaucetV2: f.request }));
vi.mock('../../hooks/useActiveAccount', () => ({
  useActiveAccount: () => ({ address: '0x7', isLocked: false }),
}));
vi.mock('../../i18n', () => ({ useI18n: () => ({ t: (key: string) => key }) }));
Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
let root: ReturnType<typeof createRoot>, host: HTMLDivElement, client: QueryClient;
let latest: ReturnType<typeof useFaucetMutation>;
let faucetHost: string | undefined;
let binding: string;
vi.mock('rtd-apps-core/src/rpc/WalletRpcContext', () => ({
  useWalletRpc: () => ({ faucetUrl: faucetHost, bindingKey: binding, readSessionKey: binding, hasFullnodeSession: true, probeEntryAccess: f.probe }),
}));
function View() {
  latest = useFaucetMutation({ address: '0x8' });
  return null;
}
async function render() {
  await act(async () => root.render(h(QueryClientProvider, { client }, h(View))));
}
beforeEach(() => {
  f.request.mockReset();
  f.probe.mockReset().mockResolvedValue({ state: 'accessible' });
  binding = 'profile-v1';
  faucetHost = 'http://127.0.0.1:9123';
  client = new QueryClient({ defaultOptions: { mutations: { retry: 3 } } });
  host = document.createElement('div');
  root = createRoot(host);
});
afterEach(async () => { await act(async () => root.unmount()); client.clear(); });
it('requests V2 once using the explicit recipient and returns precise units', async () => {
  f.request.mockResolvedValue({ status: 'Success', coins_sent: [{ amount: 100 }, { amount: 3 }] });
  await render();
  await act(async () => expect(await latest.mutateAsync()).toBe(103n));
  expect(f.request).toHaveBeenCalledExactlyOnceWith({ host: faucetHost, recipient: '0x8' });
  expect(client.getMutationCache().getAll()[0].options.mutationKey)
    .toEqual(['faucet-request-tokens', binding, faucetHost, '0x8']);
});
it('does not automatically repeat a failed dispensing request', async () => {
  f.request.mockRejectedValue(new Error('unknown outcome'));
  await render();
  await act(async () => { await expect(latest.mutateAsync()).rejects.toThrow('unknown outcome'); });
  expect(f.request).toHaveBeenCalledOnce();
});
it('without an explicit host disables the action and never uses a fallback service', async () => {
  faucetHost = undefined;
  await render();
  expect(latest.enabled).toBe(false);
  await act(async () => { await expect(latest.mutateAsync()).rejects.toThrow('faucet.hostMissing'); });
  expect(f.request).not.toHaveBeenCalled();
});

it('rejects the dispense request if identity verification fails', async () => {
  f.probe.mockRejectedValue(new Error('chain mismatch'));
  await render();
  await act(async () => { await expect(latest.mutateAsync()).rejects.toThrow('chain mismatch'); });
  expect(f.request).not.toHaveBeenCalled();
});
it('does not dispense when entry policy denies access', async () => {
  f.probe.mockResolvedValue({ state: 'restricted' });
  await render();
  await act(async () => { await expect(latest.mutateAsync()).rejects.toThrow('faucet.networkChanged'); });
  expect(f.request).not.toHaveBeenCalled();
});
it('does not dispense on a stale profile after asynchronous identity verification', async () => {
  let resolve!: (value: unknown) => void;
  f.probe.mockReturnValue(new Promise((done) => { resolve = done; }));
  await render();
  let result!: Promise<unknown>;
  await act(async () => { result = latest.mutateAsync().catch((error) => error); });
  binding = 'profile-v2';
  await render();
  await act(async () => { resolve({ state: 'accessible' }); });
  expect(await result).toBeInstanceOf(Error);
  expect(f.request).not.toHaveBeenCalled();
});
