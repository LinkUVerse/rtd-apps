// Copyright (c) LinkU Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { useRtdClientQuery } from "rtd-dapp-kit";
import { useContext } from "react";

import { NetworkContext } from "../../context";
import { Network } from "../../utils/api/DefaultRpcClient";
import { NetworkSelect, type NetworkOption } from "~/ui/header/NetworkSelect";

export default function WrappedNetworkSelect() {
	const [network, setNetwork] = useContext(NetworkContext);
	const { data } = useRtdClientQuery("getLatestRtdSystemState");
	const { data: binaryVersion } = useRtdClientQuery("getRpcApiVersion");

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
