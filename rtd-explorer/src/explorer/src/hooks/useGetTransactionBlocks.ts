// Copyright (c) LinkU Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { useExplorerClient } from "~/rpc/explorer-client";
import { keepPreviousData, useInfiniteQuery } from "@tanstack/react-query";

import { RtdJsonRpcClient as RtdClient } from "rtd-typescript/jsonRpc";
import type { PaginatedTransactionResponse, TransactionFilter } from "rtd-typescript/jsonRpc";
import { useNetworkContext } from "~/context";
import { Network } from "~/utils/api/DefaultRpcClient";

export const DEFAULT_TRANSACTIONS_LIMIT = 20;

// Fetch transaction blocks
export function useGetTransactionBlocks(
	filter?: TransactionFilter,
	limit = DEFAULT_TRANSACTIONS_LIMIT,
	refetchInterval?: number,
	useAltRpc = false,
) {
	const [network] = useNetworkContext();
	const defaultClient = useExplorerClient();
	const client =
		 (useAltRpc && network === Network.MAINNET)  ? new RtdClient({ network: "mainnet", url: "https://mainnet.rtdet.app" })
		: (useAltRpc && network === Network.TESTNET) ? new RtdClient({ network: "testnet", url: "https://testnet.rtdet.app" })
		: defaultClient;

	return useInfiniteQuery<PaginatedTransactionResponse>({
		queryKey: ["get-transaction-blocks", network, useAltRpc, filter, limit],
		queryFn: async ({ pageParam, signal }) =>
			await client.queryTransactionBlocks({
				filter,
				signal,
				cursor: pageParam as string | null,
				order: "descending",
				limit,
				options: {
					showEffects: true,
					showInput: true,
				},
			}),
		initialPageParam: null,
		getNextPageParam: ({ hasNextPage, nextCursor }) => (hasNextPage ? nextCursor : null),
		staleTime: 10 * 1000,
		retry: false,
		placeholderData: keepPreviousData,
		refetchInterval,
	});
}
