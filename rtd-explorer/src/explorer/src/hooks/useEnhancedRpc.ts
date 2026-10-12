// Copyright (c) LinkU Labs, Inc.
// SPDX-License-Identifier: Apache-2.0
import { useExplorerClient } from "~/rpc/explorer-client";
import { ExplorerRpcClient } from "~/rpc/ExplorerRpcClient";
import { useMemo } from "react";

import { useNetwork } from "~/context";
import { Network } from "~/utils/api/DefaultRpcClient";

// TODO: Use enhanced RPC locally by default
export function useEnhancedRpcClient() {
	const [network] = useNetwork();
	const client = useExplorerClient();
	const enhancedRpc = useMemo(() => {
		if (network === String(Network.LOCAL)) {
			return new ExplorerRpcClient({ network: "localnet", url: "http://localhost:9124" });
		}

		return client;
	}, [network, client]);

	return enhancedRpc;
}
