// Copyright (c) LinkU Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import 'tsconfig-paths/register';

import { requestRtdFromFaucetV0 } from 'rtd-typescript/faucet';
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

const FAUCET_HOST = 'http://127.0.0.1:9123';

export async function requestRtdFromFaucet(recipient: string) {
	await requestRtdFromFaucetV0({ host: FAUCET_HOST, recipient });
}
