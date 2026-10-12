// Copyright (c) LinkU Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import 'tsconfig-paths/register';

import { requestRtdFromFaucetV2 } from 'rtd-typescript/faucet';
import { Ed25519Keypair } from 'rtd-typescript/keypairs/ed25519';
import * as bip39 from '@scure/bip39';
import { wordlist } from '@scure/bip39/wordlists/english';

export async function generateKeypairFromMnemonic(mnemonic: string) {
	return Ed25519Keypair.deriveKeypair(mnemonic);
}

export async function generateKeypair() {
	const mnemonic = bip39.generateMnemonic(wordlist);
	const keypair = await generateKeypairFromMnemonic(mnemonic);
	return { mnemonic, keypair };
}

function faucetHost() {
	const value = process.env.E2E_FAUCET_URL;
	if (!value) throw new Error('Set E2E_FAUCET_URL from the link-u-smart-contract dev deployment.');
	const url = new URL(value);
	const loopback = ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname);
	if ((url.protocol !== 'https:' && !(url.protocol === 'http:' && loopback)) || url.username || url.password || url.hash) {
		throw new Error('E2E_FAUCET_URL must be HTTPS or loopback HTTP without credentials or fragment.');
	}
	return url.href;
}

export async function requestRtdFromFaucet(recipient: string) {
	await requestRtdFromFaucetV2({ host: faucetHost(), recipient });
}
