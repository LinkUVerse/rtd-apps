import { act, createElement as h } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { profileFixture } from '_src/shared/rpc/profile-fixture';
import { CustomRPCInput } from './index';
const f = vi.hoisted(() => ({ saved: undefined as any, permission: vi.fn(), load: vi.fn(), prepare: vi.fn(), confirm: vi.fn(), dispatch: vi.fn(), change: vi.fn() }));
vi.mock('_hooks', () => ({ useAppSelector: (fn: any) => fn({ app: { customProfile: f.saved } }), useAppDispatch: () => f.dispatch }));
vi.mock('../../../hooks/useBackgroundClient', () => {
  const client = { prepareCustomProfile: f.prepare, confirmCustomProfile: f.confirm, getSavedCustomProfile: f.load };
  return { useBackgroundClient: () => client };
});
vi.mock('_redux/slices/app', () => ({ changeActiveNetwork: f.change }));
vi.mock('webextension-polyfill', () => ({ default: { permissions: { request: f.permission } } }));
Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
let root: ReturnType<typeof createRoot>, host: HTMLDivElement;
beforeEach(async () => {
  vi.resetAllMocks(); f.saved = profileFixture();
  f.permission.mockResolvedValue(true);
  f.prepare.mockImplementation(async (profile) => ({ token: 'review', profile, verifiedRoles: ['fullnode', 'graphql', 'archive'], additionalServices: ['history'], expiresAt: Date.now() + 300_000 }));
  f.confirm.mockResolvedValue({ env: 'customRPC', profile: f.saved, customRpcUrl: f.saved.endpoints.fullnodeGrpcWeb });
  f.dispatch.mockReturnValue({ unwrap: async () => undefined });
  host = document.createElement('div'); document.body.append(host); root = createRoot(host);
  await act(async () => root.render(h(CustomRPCInput)));
});
afterEach(async () => { await act(async () => root.unmount()); host.remove(); });
async function preview() { await act(async () => host.querySelector('form')!.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }))); }
it('previews the explicit services but saves only after confirmation', async () => {
  await preview();
  expect(f.permission).toHaveBeenCalledOnce(); expect(f.prepare).toHaveBeenCalledOnce();
  expect(f.prepare.mock.calls[0][0].revision).toBe(2);
  expect(f.confirm).not.toHaveBeenCalled(); expect(f.dispatch).not.toHaveBeenCalled();
  expect(host.textContent).toContain(f.saved.expectedGenesisDigest);
  const confirm = Array.from(host.querySelectorAll('button')).find(b => b.textContent === '确认保存并切换')!;
  await act(async () => confirm.click());
  expect(f.confirm).toHaveBeenCalledExactlyOnceWith('review');
  expect(f.change.mock.calls[0][0].store).toBe(false);
});
it('permission denial does not probe or save', async () => {
  f.permission.mockResolvedValue(false); await preview();
  expect(f.prepare).not.toHaveBeenCalled(); expect(f.confirm).not.toHaveBeenCalled();
  expect(host.querySelector('[role=alert]')?.textContent).toContain('未授权');
});
it('failed identity does not offer confirmation', async () => {
  f.prepare.mockRejectedValue(new Error('wrong chain')); await preview();
  expect(host.querySelector('[role=alert]')?.textContent).toContain('wrong chain');
  expect(host.textContent).not.toContain('确认保存并切换'); expect(f.confirm).not.toHaveBeenCalled();
});
it('failed confirmation does not change redux selection', async () => {
  await preview(); f.confirm.mockRejectedValue(new Error('expired'));
  await act(async () => Array.from(host.querySelectorAll('button')).find(b => b.textContent === '确认保存并切换')!.click());
  expect(f.dispatch).not.toHaveBeenCalled(); expect(host.querySelector('[role=alert]')?.textContent).toBe('expired');
});

it('loads the saved custom profile while a built-in is selected, without switching', async () => {
  f.saved = undefined; f.load.mockResolvedValue({ ...profileFixture(), revision: 7 });
  await act(async () => root.render(h(CustomRPCInput)));
  expect(f.load).toHaveBeenCalledOnce();
  expect((host.querySelector('[aria-label="配置版本"]') as HTMLInputElement).value).toBe('8');
  expect((host.querySelector('[aria-label="Fullnode gRPC-Web"]') as HTMLInputElement).value).toBe(profileFixture().endpoints.fullnodeGrpcWeb);
  expect(f.confirm).not.toHaveBeenCalled(); expect(f.dispatch).not.toHaveBeenCalled();
});
it('a saved-profile read failure cannot expose a blank overwrite form', async () => {
  f.saved = undefined; f.load.mockRejectedValue(new Error('bad stored version'));
  await act(async () => root.render(h(CustomRPCInput)));
  expect(host.querySelector('[role=alert]')?.textContent).toContain('bad stored version');
  expect(host.querySelector('form')).toBeNull(); expect(f.confirm).not.toHaveBeenCalled();
});
it('fresh installation displays empty endpoint fields without fabricated defaults', async () => {
  f.saved = undefined; f.load.mockResolvedValue(null);
  await act(async () => root.render(h(CustomRPCInput)));
  expect((host.querySelector('[aria-label="Fullnode gRPC-Web"]') as HTMLInputElement).value).toBe('');
  expect((host.querySelector('[aria-label="配置版本"]') as HTMLInputElement).value).toBe('1');
});
