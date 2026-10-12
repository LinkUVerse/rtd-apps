import { act, createElement } from 'react';
import { createRoot } from 'react-dom/client';
import { expect, it, vi } from 'vitest';
import { useOwnedNFT } from './useOwnedNFT';

const mocks = vi.hoisted(() => ({ object: vi.fn(), kiosks: vi.fn(), rpc: vi.fn() }));
vi.mock('rtd-apps-core/src/rpc/asset-hooks', async (original) => ({
  ...(await original<typeof import('rtd-apps-core/src/rpc/asset-hooks')>()),
  useGetObject: mocks.object,
}));
vi.mock('rtd-apps-core/src/rpc/kiosk-hooks', () => ({ useGetKioskContents: mocks.kiosks }));
vi.mock('rtd-apps-core/src/rpc/WalletRpcContext', () => ({ useWalletRpc: mocks.rpc }));
Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });

it.each([true, false])('OriginByte配置=%s时，持有详情按实际可用分支决定读取', async (configured) => {
  const item = {
    objectId: '0xa', digest: 'same', version: '1', type: '0x2::nft::NFT',
    owner: { $kind: 'ObjectOwner', ObjectOwner: '0xc' }, content: new Uint8Array([1]),
  };
  mocks.object.mockReturnValue({ data: item, isError: false, error: null, isPending: false });
  mocks.rpc.mockReturnValue({ packages: configured ? {
    originByte: { discoveryPackage: '0x88', executionPackage: '0x99' },
  } : {} });
  mocks.kiosks.mockImplementation((_owner, options) => ({
    data: options.enabled ? { list: [item] } : undefined,
    isPending: !options.enabled, isError: false, error: null,
  }));
  const node = document.createElement('div'), root = createRoot(node);
  function View() {
    const result = useOwnedNFT('0xa', '0xb');
    return createElement('pre', null, JSON.stringify({
      id: result.data?.objectId ?? null, error: result.error?.message ?? null, pending: result.isPending,
    }));
  }
  try {
    await act(async () => root.render(createElement(View)));
    expect(mocks.kiosks).toHaveBeenLastCalledWith('0xb', { enabled: configured });
    const result = JSON.parse(node.textContent!);
    expect(result.pending).toBe(false);
    if (configured) expect(result).toEqual({ id: '0xa', error: null, pending: false });
    else { expect(result.id).toBeNull(); expect(result.error).toContain('未配置'); }
  } finally { await act(async () => root.unmount()); }
});
