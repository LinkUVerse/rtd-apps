// Copyright (c) LinkU Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { useExplorerQuery } from "~/rpc/explorer-client";
import { useContext } from "react";

import { NetworkContext } from "../../context";
import { Network } from "../../utils/api/DefaultRpcClient";
import { NetworkSelect, type NetworkOption } from "~/ui/header/NetworkSelect";

export default function WrappedNetworkSelect() {
	const [network, setNetwork] = useContext(NetworkContext);
	const { data } = useExplorerQuery("getLatestRtdSystemState");
	const { data: binaryVersion } = useExplorerQuery("getRpcApiVersion");

	const networks = [
		{ id: Network.MAINNET, label: "Mainnet" },
		{ id: Network.TESTNET, label: "Testnet" },
		{ id: Network.DEVNET, label: "Devnet" },
		{ id: Network.LOCAL, label: "Local" },
	].filter(Boolean) as NetworkOption[];

	return (
		<NetworkSelect
			value={network}
			onChange={(networkId) => {
				setNetwork(networkId);
			}}
			networks={networks}
			version={data?.protocolVersion}
			binaryVersion={binaryVersion}
		/>
	);
}
