// Copyright (c) LinkU Labs, Inc.
// SPDX-License-Identifier: Apache-2.0
import { useRtdClient } from "rtd-dapp-kit";
import { RtdClient } from "rtd-typescript/client";
import { useMemo } from "react";

import { useNetwork } from "~/context";
import { Network } from "~/utils/api/DefaultRpcClient";

// TODO: Use enhanced RPC locally by default
export function useEnhancedRpcClient() {
	const [network] = useNetwork();
	const client = useRtdClient();
	const enhancedRpc = useMemo(() => {
		if (network === String(Network.LOCAL)) {
			return new RtdClient({ url: "http://localhost:9124" });
		}

		return client;
	}, [network, client]);

	return enhancedRpc;
}
