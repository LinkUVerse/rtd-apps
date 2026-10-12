// Copyright (c) LinkU Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import type { RtdWallet } from '_src/dapp-interface/WalletStandardInterface';
import { DAppKitProvider, useCurrentAccount, useWalletConnection, useWallets } from 'rtd-dapp-kit-react';
import { Transaction } from 'rtd-typescript/transactions';
import { verifyTransactionSignature } from 'rtd-typescript/verify';
import { fromBase64 } from 'rtd-typescript/utils';
import { getWallets, ReadonlyWalletAccount } from 'rtd-wallet-standard';
import { useRef, useState } from 'react';
import ReactDOM from 'react-dom/client';
import { createDemoKit, type DemoKit } from './dapp-kit';
import { failureFixtureTransaction } from './failure-fixture';
import { tokenFixtureTransaction } from './token-fixture';
import { authorizationFixtureTransaction } from './authorization-fixture';

const networkEvents: unknown[] = [];
let observingNetwork = false;
function inspectNetwork() {
 const wallet = getWallets().get().find(value => value.name.toLowerCase().includes('rtd wallet'));
 if (wallet && !observingNetwork) {
  observingNetwork = true;
  (wallet as RtdWallet).features['standard:events'].on('change', event => networkEvents.push({ chains: event.chains, accounts: event.accounts?.map(({ address, chains }) => ({ address, chains })) }));
 }
 return { chains: wallet?.chains, accounts: wallet?.accounts.map(({ address, chains }) => ({ address, chains })), events: networkEvents };
}

type Action = 'execute' | 'sign' | 'message';
function transaction(address: string) {
	const tx = new Transaction();
	const [coin] = tx.splitCoins(tx.gas, [1]);
	tx.transferObjects([coin], address);
	return tx;
}

// Keep the unauthorized-account scenario at the wallet boundary. Passing a fake UI
// account to Kit would only test its local registry and never reach the extension.
async function wrongAccountAction(action: Action, address: string, network: string, wrongChain = false, missingAccount = false, missingChain = false) {
	const wallet = getWallets().get().find((value) =>
		value.name.toLowerCase().includes('rtd wallet') && value.accounts.some((account) => account.address === address),
	) as RtdWallet | undefined;
	const original = wallet?.accounts.find((account) => account.address === address);
	if (!wallet || !original) throw new Error('Wallet account unavailable');
	const account = wrongChain || missingChain ? original : new ReadonlyWalletAccount({
		address: '0x' + '01'.repeat(32), publicKey: original.publicKey,
		chains: original.chains, features: original.features,
	});
	const input = { account: missingAccount ? undefined! : account, chain: (missingChain ? undefined! : wrongChain ? 'rtd:wrong-chain-test' : `rtd:${network}`) as `rtd:${string}`, transaction: { toJSON: () => transaction(address).toJSON() } };
	if (action === 'execute') return wallet.features['rtd:signAndExecuteTransaction']!.signAndExecuteTransaction(input);
	if (action === 'sign') return wallet.features['rtd:signTransaction']!.signTransaction(input);
	return wallet.features['rtd:signPersonalMessage']!.signPersonalMessage({ account: input.account, chain: input.chain, message: new TextEncoder().encode('Test message') });
}

function App({ kit, network, endpoint }: { kit: DemoKit; network: string; endpoint: string }) {
	const wallets = useWallets({ dAppKit: kit });
	const account = useCurrentAccount({ dAppKit: kit });
	const connection = useWalletConnection({ dAppKit: kit });
	const failureFixture = failureFixtureTransaction(new URL(window.location.href), network);
	const tokenFixture = account ? tokenFixtureTransaction(new URL(window.location.href), network, account.address) : null;
	const authorizationFixture = account ? authorizationFixtureTransaction(new URL(window.location.href), network, account.address) : null;
	const wallet = wallets.find((value) => value.name.toLowerCase().includes('rtd wallet'));
	const [error, setError] = useState<string | null>(null);
	const [networkState, setNetworkState] = useState<unknown>(null);
	const [standardAccounts, setStandardAccounts] = useState<string[]>([]);
	const [result, setResult] = useState<string | null>(null);
	const [busy, setBusy] = useState(false);
	const [wrongAccount, setWrongAccount] = useState(false);
	const [wrongChain, setWrongChain] = useState(false);
	const [missingAccount, setMissingAccount] = useState(false);
	const [missingChain, setMissingChain] = useState(false);
	const [cancelMode, setCancelMode] = useState('approval');
	const [serializationWaiting, setSerializationWaiting] = useState(false);
	const pendingCancellation = useRef<{ controller: AbortController; release?: () => void } | null>(null);
	async function cancellableAction(action: 'sign' | 'execute') {
		if (!account) throw new Error('Connect a wallet account first');
		const standard = getWallets().get().find(value => value.name.toLowerCase().includes('rtd wallet') && value.accounts.some(item => item.address === account.address)) as RtdWallet | undefined;
		const approvedAccount = standard?.accounts.find(item => item.address === account.address);
		if (!standard || !approvedAccount) throw new Error('Wallet account unavailable');
		const controller = new AbortController();
		const current: { controller: AbortController; release?: () => void } = { controller };
		pendingCancellation.current = current;
		if (cancelMode === 'pre-aborted') controller.abort(new DOMException('Demo transaction cancelled', 'AbortError'));
		try {
			const input = { account: approvedAccount, chain: `rtd:${network}` as `rtd:${string}`, signal: controller.signal,
				transaction: { toJSON: async () => {
					if (cancelMode === 'serialization') {
						setSerializationWaiting(true);
						await new Promise<void>(resolve => { current.release = resolve; });
					}
					return transaction(account.address).toJSON();
				} },
			};
			return await (action === 'sign' ? standard.features['rtd:signTransaction'].signTransaction(input) : standard.features['rtd:signAndExecuteTransaction'].signAndExecuteTransaction(input));
		} finally { pendingCancellation.current = null; setSerializationWaiting(false); }
	}
	function cancelTransaction() {
		const current = pendingCancellation.current;
		current?.controller.abort(new DOMException('Demo transaction cancelled', 'AbortError'));
		current?.release?.();
	}
	async function run(action: () => unknown | Promise<unknown>) {
		setBusy(true); setError(null); setResult(null);
		try { setResult(JSON.stringify(await action(), (_, value) => typeof value === 'bigint' ? value.toString() : value, 2) ?? 'Completed'); }
		catch (error) { setError(error instanceof Error ? error.message : String(error)); }
		finally { setBusy(false); }
	}
	async function perform(action: Action) {
		if (!account) throw new Error('Connect a wallet account first');
		if (missingChain) return wrongAccountAction(action, account.address, network, false, false, true);
		if (missingAccount) return wrongAccountAction(action, account.address, network, false, true);
		if (wrongAccount) return wrongAccountAction(action, account.address, network);
		if (wrongChain) return wrongAccountAction(action, account.address, network, true);
		if (action === 'execute') return kit.signAndExecuteTransaction({ transaction: transaction(account.address) });
		if (action === 'sign') {
			const result = await kit.signTransaction({ transaction: transaction(account.address) });
			const bytes = fromBase64(result.bytes);
			const signer = await verifyTransactionSignature(bytes, result.signature, { address: account.address });
			const signed = Transaction.from(bytes);
			if (signed.getData().sender !== account.address) throw new Error('Signed transaction sender changed');
			return { verification: { signatureValid: true, address: signer.toRtdAddress(), digest: await signed.getDigest(), submitted: false }, ...result };
		}
		return kit.signPersonalMessage({ message: new TextEncoder().encode('Test message') });
	}
	return <main>
		<h1>RTD modern dApp Kit demo</h1>
        <button onClick={() => setNetworkState(inspectNetwork())}>Inspect wallet network</button>
        <pre data-testid="wallet-network">{JSON.stringify(networkState)}</pre>
		<button onClick={() => setStandardAccounts(getWallets().get().find(value => value.name.toLowerCase().includes('rtd wallet'))?.accounts.map(item => item.address) ?? [])}>Inspect wallet authorization</button>
		<pre data-testid="wallet-authorization">{JSON.stringify(standardAccounts)}</pre>
		<p>Network: rtd:{network} · gRPC-Web: {endpoint}</p>
		<p>Use the same network as the extension. Transactions transfer one smallest unit back to the selected account and consume gas after approval.</p>
		{!wallet && <p>Rtd Wallet not found</p>}
		{account ? <>
			<ul data-testid="accounts-list">{connection.wallet?.accounts.map((item) => <li key={item.address}>
				<button disabled={busy || item.address === account.address} onClick={() => run(() => kit.switchAccount({ account: item }))}>{item.address}</button>
			</li>)}</ul>
			<button disabled={busy} onClick={() => run(() => kit.disconnectWallet())}>Disconnect</button>
		</> : <button disabled={busy || !wallet} onClick={() => run(async () => { if (!wallet) throw new Error('Wallet unavailable'); return kit.connectWallet({ wallet }); })}>Connect</button>}
		<label><input type="checkbox" checked={wrongAccount} onChange={(event) => setWrongAccount(event.target.checked)} />Use wrong account</label>
		<label><input type="checkbox" checked={missingChain} onChange={(event) => setMissingChain(event.target.checked)} />Omit chain</label>
		<label><input type="checkbox" checked={missingAccount} onChange={(event) => setMissingAccount(event.target.checked)} />Omit account</label>
		<label><input type="checkbox" checked={wrongChain} onChange={(event) => setWrongChain(event.target.checked)} />Use wrong chain</label>
		<button disabled={busy} onClick={() => run(() => perform('execute'))}>Send transaction</button>
		{failureFixture && <button disabled={busy || !account} onClick={() => run(() => kit.signAndExecuteTransaction({transaction:failureFixture}))}>Visit failure fixture</button>}
		{tokenFixture && <button disabled={busy || !account} onClick={() => run(() => kit.signAndExecuteTransaction({transaction:tokenFixture}))}>Send mixed token fixture</button>}
		{authorizationFixture && <>
			<button disabled={busy || !account} onClick={() => run(() => kit.signTransaction({transaction:authorizationFixture}))}>Sign authorization fixture</button>
			<button disabled={busy || !account} onClick={() => run(() => kit.signAndExecuteTransaction({transaction:authorizationFixture}))}>Execute authorization fixture</button>
		</>}
		<button disabled={busy} onClick={() => run(() => perform('sign'))}>Sign transaction</button>
		<button disabled={busy} onClick={() => run(() => perform('message'))}>Sign message</button>
		<fieldset><legend>Direct Wallet Standard cancellation test</legend>
			<label>Cancellation stage<select aria-label="Cancellation stage" value={cancelMode} disabled={busy} onChange={event => setCancelMode(event.target.value)}>
				<option value="pre-aborted">Already aborted</option><option value="serialization">While serializing</option><option value="approval">While awaiting approval</option>
			</select></label>
			<button disabled={busy || !account} onClick={() => run(() => cancellableAction('sign'))}>Start cancellable sign</button>
			<button disabled={busy || !account} onClick={() => run(() => cancellableAction('execute'))}>Start cancellable execute</button>
			<button disabled={!busy} onClick={cancelTransaction}>Cancel transaction request</button>
			{serializationWaiting && <p data-testid="serialization-waiting">Serialization waiting</p>}
		</fieldset>
		{error && <section role="alert"><h2>Error</h2><pre>{error}</pre></section>}
		{result && <section><h2>Result</h2><pre data-testid="action-result">{result}</pre></section>}
	</main>;
}

const root = ReactDOM.createRoot(document.getElementById('root')!);
try {
	const network = import.meta.env.VITE_RTD_NETWORK ?? '';
	const endpoint = import.meta.env.VITE_RTD_GRPC_URL ?? '';
	const kit = createDemoKit(network, endpoint);
	root.render(<DAppKitProvider dAppKit={kit}><App kit={kit} network={network} endpoint={endpoint} /></DAppKitProvider>);
} catch (error) {
	root.render(<main role="alert"><h1>Demo configuration required</h1><p>Set VITE_RTD_NETWORK and VITE_RTD_GRPC_URL to the extension network and its browser gRPC-Web endpoint.</p><pre>{String(error)}</pre></main>);
}
