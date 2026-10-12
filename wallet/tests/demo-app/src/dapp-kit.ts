// Copyright (c) LinkU Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { createDAppKit } from 'rtd-dapp-kit-react';
import { RtdGrpcClient } from 'rtd-typescript/grpc';

export function createDemoKit(network: string, endpoint: string) {
	if (!/^[a-zA-Z0-9_-]+$/.test(network)) throw new Error('Set VITE_RTD_NETWORK to the wallet network name.');
	const url = new URL(endpoint);
	const local = ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname);
	if ((url.protocol !== 'https:' && !(local && url.protocol === 'http:')) || url.username || url.password || url.hash) {
		throw new Error('Use an HTTPS gRPC-Web endpoint, or HTTP on localhost.');
	}
	return createDAppKit({
		networks: [network],
		autoConnect: false,
		enableBurnerWallet: false,
		slushWalletConfig: null,
		createClient: () => new RtdGrpcClient({ network, baseUrl: url.href }),
	});
}
export type DemoKit = ReturnType<typeof createDemoKit>;
