// Copyright (c) LinkU Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { RtdClient, RtdHTTPTransport, getFullnodeUrl } from "rtd-typescript/client";

export enum Network {
	LOCAL = "LOCAL",
	DEVNET = "DEVNET",
	TESTNET = "TESTNET",
	MAINNET = "MAINNET",
}

export const NetworkConfigs: Record<Network, { url: string }> = {
	[Network.LOCAL]: { url: getFullnodeUrl("localnet") },
	[Network.DEVNET]: { url: getFullnodeUrl("devnet") },
	// [Network.TESTNET]: { url: "https://rpc-testnet.rtdscan.xyz" },
	// [Network.MAINNET]: { url: "https://rpc-mainnet.rtdscan.xyz" },
	// [Network.TESTNET]: { url: "https://testnet.rtdet.app" },
	// [Network.MAINNET]: { url: "https://mainnet.rtdet.app" },
	[Network.TESTNET]: { url: getFullnodeUrl("testnet") },
	[Network.MAINNET]: { url: getFullnodeUrl("mainnet") },
};

const defaultClientMap = new Map<Network | string, RtdClient>();

// NOTE: This class should not be used directly in React components, prefer to use the useRtdClient() hook instead
export const createRtdClient = (network: Network | string) => {
	const existingClient = defaultClientMap.get(network);
	if (existingClient) return existingClient;

	const networkUrl = network in Network ? NetworkConfigs[network as Network].url : network;

	const client = new RtdClient({
		transport: new RtdHTTPTransport({ url: networkUrl }),
	});
	defaultClientMap.set(network, client);
	return client;
};
