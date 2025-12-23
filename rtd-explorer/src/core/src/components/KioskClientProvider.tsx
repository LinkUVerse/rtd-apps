// Copyright (c) LinkU Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { useRtdClientContext } from "rtd-dapp-kit";
import { KioskClient, Network } from "rtd-kiosk";
import { createContext, useMemo, type ReactNode } from "react";

export const KioskClientContext = createContext<KioskClient | null>(null);

const rtdToKioskNetwork: Record<string, Network> = {
	mainnet: Network.MAINNET,
	testnet: Network.TESTNET,
};

export type KioskClientProviderProps = {
	children: ReactNode;
};

export function KioskClientProvider({ children }: KioskClientProviderProps) {
	const { client, network } = useRtdClientContext();
	const kioskNetwork = rtdToKioskNetwork[network.toLowerCase()] || Network.CUSTOM;
	const kioskClient = useMemo(
		() => new KioskClient({ client, network: kioskNetwork }),
		[client, kioskNetwork],
	);
	return <KioskClientContext.Provider value={kioskClient}>{children}</KioskClientContext.Provider>;
}
