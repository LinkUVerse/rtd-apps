// Copyright (c) LinkU Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { ExplorerRpcClient } from "../../rpc/ExplorerRpcClient";

export enum Network {
	LOCAL = "LOCAL",
	DEVNET = "DEVNET",
	TESTNET = "TESTNET",
	MAINNET = "MAINNET",
}

export type NetworkConfig = {
	grpcUrl: string;
	graphqlUrl: string;
	accountHistoryUrl: string;
};

const env = import.meta.env;

/** Dev endpoints are same-origin paths proxied by Vite (see vite.config.ts). */
const devConfig: NetworkConfig = {
	grpcUrl: env.VITE_LOCAL_GRPC_URL || "/fullnode",
	graphqlUrl: env.VITE_LOCAL_GRAPHQL_URL || "/archive/graphql",
	accountHistoryUrl: env.VITE_LOCAL_ACCOUNT_HISTORY_URL || "/account/graphql",
};

const configFor = (suffix: string, fallback: NetworkConfig): NetworkConfig => ({
	grpcUrl: env[`VITE_${suffix}_GRPC_URL`] || fallback.grpcUrl,
	graphqlUrl: env[`VITE_${suffix}_GRAPHQL_URL`] || fallback.graphqlUrl,
	accountHistoryUrl: env[`VITE_${suffix}_ACCOUNT_HISTORY_URL`] || fallback.accountHistoryUrl,
});

export const NetworkConfigs: Record<Network, NetworkConfig> = {
	[Network.LOCAL]: devConfig,
	[Network.DEVNET]: configFor("DEVNET", devConfig),
	[Network.TESTNET]: configFor("TESTNET", devConfig),
	[Network.MAINNET]: configFor("MAINNET", devConfig),
};

const defaultClientMap = new Map<Network | string, ExplorerRpcClient>();

const sdkNetworkFor = (network: Network | string): string => {
	switch (network) {
		case Network.LOCAL:
			return "localnet";
		case Network.DEVNET:
			return "devnet";
		case Network.TESTNET:
			return "testnet";
		case Network.MAINNET:
			return "mainnet";
		default:
			return "custom";
	}
};

/**
 * Known networks use the configured fullnode/archive endpoints. A custom
 * network value is treated as a fullnode gRPC-Web URL and its sibling dev
 * ports are derived exactly like the mobile client does.
 */
export const createRtdClient = (network: Network | string) => {
	const existingClient = defaultClientMap.get(network);
	if (existingClient) return existingClient;

	const known = Object.prototype.hasOwnProperty.call(NetworkConfigs, network);
	let config: NetworkConfig;
	if (known) {
		config = NetworkConfigs[network as Network];
	} else {
		const url = new URL(network);
		const host = `http://${url.hostname}`;
		config = {
			grpcUrl: url.href.replace(/\/+$/, ""),
			graphqlUrl: `${host}:43412/graphql`,
			accountHistoryUrl: `${host}:43413/account/graphql`,
		};
	}

	const client = new ExplorerRpcClient({
		network: sdkNetworkFor(network),
		...config,
	});
	defaultClientMap.set(network, client);
	return client;
};
