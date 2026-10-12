// Copyright (c) LinkU Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { useExplorerRpcContext as useRtdClientContext } from '../rpc/ExplorerRpcContext';
import { KioskClient, type KioskClientOptions } from 'rtd-kiosk';
import { createContext, useMemo, type ReactNode } from 'react';

export const KioskClientContext = createContext<KioskClient | null>(null);

const rtdToKioskNetwork: Record<string, KioskClientOptions['network']> = {
	mainnet: 'mainnet',
	testnet: 'testnet',
};

export type KioskClientProviderProps = {
	children: ReactNode;
};

export function KioskClientProvider({ children }: KioskClientProviderProps) {
	const { client, network } = useRtdClientContext();
	const kioskNetwork = rtdToKioskNetwork[network.toLowerCase()] || 'custom';
	const kioskClient = useMemo(
		() => new KioskClient({ client, network: kioskNetwork }),
		[client, kioskNetwork],
	);
	return <KioskClientContext.Provider value={kioskClient}>{children}</KioskClientContext.Provider>;
}
