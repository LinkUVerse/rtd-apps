import { act, createElement as h } from 'react';
import { createRoot } from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { beforeEach, afterEach, expect, it, vi } from 'vitest';
import { DappRecoveryGate } from './DappRecoveryGate';
const f = vi.hoisted(() => ({ session: 'current-session', binding: 'current-profile', account: undefined as any, recover: vi.fn(), dispatch: vi.fn(), respond: vi.fn(), child: vi.fn() }));
vi.mock('../../../hooks/useBackgroundClient', () => ({ useBackgroundClient: () => ({ recoverDappExecution: f.recover }) }));
vi.mock('../../../components/accounts/UnlockAccountButton', () => ({ UnlockAccountButton: () => 'unlock-account' }));
vi.mock('rtd-apps-core/src/rpc/WalletRpcContext', () => ({ useWalletRpc: () => ({ bindingKey: f.binding, readSessionKey: f.session }) }));
vi.mock('_hooks', () => ({ useAppDispatch: () => f.dispatch }));
vi.mock('_redux/slices/transaction-requests', () => ({ respondToTransactionRequest: f.respond }));
Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
let root: ReturnType<typeof createRoot>, host: HTMLDivElement, client: QueryClient;
let afterAttempt: () => Promise<void>;
beforeEach(() => {
  vi.resetAllMocks(); f.session='current-session'; f.binding='current-profile'; f.account = undefined; f.recover.mockResolvedValue(null); f.dispatch.mockResolvedValue({});
  host = document.createElement('div'); document.body.append(host); root = createRoot(host);
  client = new QueryClient();
});
afterEach(async () => { await act(async () => root.unmount()); client.clear(); host.remove(); });
async function render() {
  await act(async () => root.render(h(QueryClientProvider, { client }, h(DappRecoveryGate, {
    accountId: 'a', account: f.account, requestId: 'r', origin: 'https://dapp.example', bindingKey: 'binding',
    children: (refresh) => { afterAttempt = refresh; f.child(); return h('span', {}, 'preview'); },
  }))));
  await act(async () => { await new Promise(resolve => setTimeout(resolve, 15)); });
}
it('does not mount transaction preparation until durable journal lookup completes', async () => {
  let release!: (v: null) => void;
  f.recover.mockReturnValue(new Promise(resolve => { release = resolve; }));
  await render(); expect(f.child).not.toHaveBeenCalled();
  await act(async () => { release(null); });
  await vi.waitFor(async () => { await act(async () => {}); expect(host.textContent).toContain('preview'); });
  expect(client.getQueryCache().getAll()[0].meta?.skipPersistedCache).toBe(true);
});
it('existing pending shows original digest without mounting a new preview', async () => {
  f.recover.mockResolvedValue({ state: 'pending', digest: 'original-digest', recordId: 'record' });
  await render(); expect(f.child).not.toHaveBeenCalled(); expect(host.textContent).toContain('original-digest');
  expect(host.textContent).not.toContain('返回原执行结果');
});
it('unknown outcome after an attempt cannot fall back to preparing new bytes even with a null journal read', async () => {
  await render(); f.child.mockClear();
  await act(async () => { await afterAttempt(); });
  expect(host.textContent).not.toContain('preview'); expect(host.textContent).toContain('尚未读到执行记录');
  expect(f.child).not.toHaveBeenCalled();
});
it('confirmed receipt uses recovery-only response without an approval token', async () => {
  f.recover.mockResolvedValue({ state: 'confirmed', digest: 'digest', bytes: 'bytes', signature: 'sig', effects: 'effects' });
  await render();
  await act(async () => Array.from(host.querySelectorAll('button')).find(b => b.textContent === '返回原执行结果')!.click());
  expect(f.respond).toHaveBeenCalledWith({ txRequestID: 'r', accountId: 'a', approved: true, recoverOnly: true });
  expect(f.child).not.toHaveBeenCalled();
});
it('read failures never show a new approval route', async () => {
  f.recover.mockRejectedValue(new Error('lookup unavailable'));
  await render(); expect(f.child).not.toHaveBeenCalled();
  expect(host.querySelector('[role=alert]')?.textContent).toBe('lookup unavailable');
});

it('locked accounts can unlock without starting a recovery query or a fresh preview', async () => {
  f.account = { id: 'a', isLocked: true }; await render();
  expect(host.textContent).toContain('unlock-account'); expect(f.recover).not.toHaveBeenCalled(); expect(f.child).not.toHaveBeenCalled();
  f.account = { id: 'a', isLocked: false }; await render();
  expect(f.recover).toHaveBeenCalledOnce(); expect(host.textContent).toContain('preview');
});

it('frontend session replacement retains admitted preview; network change rechecks recovery', async()=>{
 await render();expect(f.recover).toHaveBeenCalledTimes(1);
 const preview=host.querySelector('span');expect(preview?.textContent).toBe('preview');
 f.session='new-frontend-session';await render();
 expect(f.recover).toHaveBeenCalledTimes(1);expect(host.querySelector('span')).toBe(preview);
 let release!: (value:null)=>void;
 f.recover.mockReturnValue(new Promise(resolve=>{release=resolve;}));
 f.binding='different-network';await render();
 expect(f.recover).toHaveBeenCalledTimes(2);expect(host.textContent).not.toContain('preview');
 await act(async()=>{release(null);});
});
