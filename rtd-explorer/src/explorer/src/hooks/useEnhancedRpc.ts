// Copyright (c) LinkU Labs, Inc.
// SPDX-License-Identifier: Apache-2.0
import { useExplorerClient } from "~/rpc/explorer-client";

// The alternate JSON-RPC endpoint has been retired. The shared gRPC + archive
// GraphQL client already serves every network.
export function useEnhancedRpcClient() {
	return useExplorerClient();
}
