// Copyright (c) LinkU Labs, Inc.
// SPDX-License-Identifier: Apache-2.0
import { afterEach, expect, test, vi } from 'vitest';
import { getWallets, ReadonlyWalletAccount, type Wallet } from 'rtd-wallet-standard';
import { createDemoKit } from './dapp-kit';
import { executionFixture, sender } from '../../unit/rpc/execution-fixtures';

const cleanups: (() => void)[] = [];
afterEach(() => { while (cleanups.length) cleanups.pop()!(); vi.unstubAllGlobals(); });

test('requires explicit network and browser endpoint configuration', () => {
	for (const [network, url] of [['', 'https://example.test'], ['unknown', 'http://remote.test'], ['unknown', 'https://user:pass@example.test'], ['unknown', 'https://example.test/#fragment']]) {
		expect(() => createDemoKit(network, url)).toThrow();
	}
});

test('modern Kit connects, signs and disconnects without legacy features or network traffic', async () => {
	const fetch = vi.fn(() => { throw new Error('Unexpected network request'); });
	vi.stubGlobal('fetch', fetch);
	const fixture = await executionFixture();
	const execute = vi.fn(async () => ({ digest: fixture.digest, bytes: fixture.bytesBase64, signature: fixture.signed.signature, effects: fixture.receipt().effectsBase64 }));
	const account = new ReadonlyWalletAccount({ address: sender, publicKey: new Uint8Array(32), chains: ['rtd:unknown'], features: ['rtd:signTransaction', 'rtd:signPersonalMessage', 'rtd:signAndExecuteTransaction'] });
	const sign = vi.fn(async () => ({ bytes: 'AQ==', signature: 'fixture-signature' }));
	const message = vi.fn(async () => ({ bytes: 'AQ==', signature: 'fixture-message-signature' }));
	const legacy = vi.fn(() => { throw new Error('Legacy feature selected'); });
	const disconnect = vi.fn(async () => {});
	const wallet: Wallet = { name: 'RTD Wallet fixture', version: '1.0.0', icon: 'data:image/svg+xml;base64,AA==', chains: ['rtd:unknown'], accounts: [account], features: {
		'standard:connect': { version: '1.0.0', connect: async () => ({ accounts: [account] }) },
		'standard:disconnect': { version: '1.0.0', disconnect },
		'standard:events': { version: '1.0.0', on: () => () => {} },
		'rtd:signAndExecuteTransaction': { version: '2.0.0', signAndExecuteTransaction: execute },
		'rtd:signTransaction': { version: '2.0.0', signTransaction: sign },
		'rtd:signPersonalMessage': { version: '1.0.0', signPersonalMessage: message },
		'rtd:signTransactionBlock': { version: '1.0.0', signTransactionBlock: legacy },
	} };
	cleanups.push(getWallets().register(wallet));
	const kit = createDemoKit('unknown', 'http://127.0.0.1:39400');
	const uiWallet = kit.stores.$wallets.get().find((item) => item.name === wallet.name)!;
	expect(uiWallet).toBeDefined();
	await kit.connectWallet({ wallet: uiWallet });
	await kit.signTransaction({ transaction: '{"fixture":true}' });
	await kit.signPersonalMessage({ message: new Uint8Array([1]) });
	const execution = await kit.signAndExecuteTransaction({ transaction: '{"fixture":true}' });
	expect(execute).toHaveBeenCalledOnce();
	expect(execute).toHaveBeenCalledWith(expect.objectContaining({ account, chain: 'rtd:unknown' }));
	expect(execution.$kind).toBe('Transaction');
	expect(execution.Transaction?.digest).toBe(fixture.digest);
	expect(sign).toHaveBeenCalledOnce();
	expect(sign).toHaveBeenCalledWith(expect.objectContaining({ account, chain: 'rtd:unknown' }));
	expect(message).toHaveBeenCalledOnce();
	expect(legacy).not.toHaveBeenCalled();
	await kit.disconnectWallet();
	expect(disconnect).toHaveBeenCalledOnce();
	expect(kit.stores.$connection.get().status).toBe('disconnected');
	expect(fetch).not.toHaveBeenCalled();
});

test('disconnected signing is rejected without dispatch', async () => {
	const fetch = vi.fn(); vi.stubGlobal('fetch', fetch);
	const kit = createDemoKit('unknown', 'https://example.test');
	await expect(kit.signTransaction({ transaction: '{}' })).rejects.toThrow();
	expect(fetch).not.toHaveBeenCalled();
});
