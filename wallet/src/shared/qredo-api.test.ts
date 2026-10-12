import { afterEach, expect, it, vi } from 'vitest';
import { QredoAPI } from './qredo-api';

afterEach(() => vi.unstubAllGlobals());

it('keeps remote record reads without exposing transaction creation', async () => {
  const fetch = vi.fn()
    .mockResolvedValueOnce(new Response(JSON.stringify({ list: [] })))
    .mockResolvedValueOnce(new Response(JSON.stringify({ txID: 'remote-record' })));
  vi.stubGlobal('fetch', fetch);
  const api = new QredoAPI('source', 'https://qredo.example/api', { accessToken: 'test-token' });
  expect(await api.getTransactions({ address: '0x1', network: 'testnet' })).toEqual({ list: [] });
  expect(await api.getTransaction('remote-record')).toEqual({ txID: 'remote-record' });
  expect(fetch.mock.calls.map(([url]) => url)).toEqual([
    'https://qredo.example/api/transactions?address=0x1&network=testnet',
    'https://qredo.example/api/transactions/remote-record',
  ]);
  expect(fetch.mock.calls.every(([, init]) => !init.method || init.method === 'GET')).toBe(true);
  expect('createTransaction' in api).toBe(false);
});
