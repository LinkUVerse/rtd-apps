// Copyright (c) LinkU Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

export enum API_ENV {
	mainnet = 'mainnet',
	devNet = 'devNet',
	testNet = 'testNet',
	local = 'local',
	customRPC = 'customRPC',
}

export const networkNames: Record<API_ENV, string> = {
	[API_ENV.local]: 'Local',
	[API_ENV.testNet]: 'Testnet',
	[API_ENV.devNet]: 'Devnet',
	[API_ENV.mainnet]: 'Mainnet',
	[API_ENV.customRPC]: 'Custom RPC',
};

export type NetworkEnvType =
	| { env: Exclude<API_ENV, API_ENV.customRPC>; customRpcUrl: null }
	| { env: API_ENV.customRPC; customRpcUrl: string; walletStandardChain?: `rtd:${string}`; profile?: import('./rpc/profile').WalletNetworkProfile };

/** Page-facing wallet status exposes its chain label, not private service deployment details. */
export function toPublicNetwork(network: NetworkEnvType): NetworkEnvType {
  return network.env === API_ENV.customRPC
    ? { env: network.env, customRpcUrl: '', walletStandardChain: network.profile?.walletStandardChain }
    : { env: network.env, customRpcUrl: null };
}

/** The same advertised chain label is used by page discovery and background authorization. */
export function walletStandardChain(network: NetworkEnvType): `rtd:${string}` {
  if (network.env === API_ENV.customRPC)
    return network.profile?.walletStandardChain ?? network.walletStandardChain ?? 'rtd:unknown';
  return { [API_ENV.local]: 'rtd:localnet', [API_ENV.devNet]: 'rtd:devnet',
    [API_ENV.testNet]: 'rtd:testnet', [API_ENV.mainnet]: 'rtd:mainnet' }[network.env] as `rtd:${string}`;
}
