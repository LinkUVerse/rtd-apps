// Copyright (c) LinkU Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { useRtdClient } from "rtd-dapp-kit";
import { keepPreviousData, useInfiniteQuery } from "@tanstack/react-query";

import { RtdClient, type PaginatedTransactionResponse, type TransactionFilter } from "rtd-typescript/client";
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
	const client =
		 (useAltRpc && network === Network.MAINNET)  ? new RtdClient({ url: "https://mainnet.rtdet.app" })
		: (useAltRpc && network === Network.TESTNET) ? new RtdClient({ url: "https://testnet.rtdet.app" })
		: useRtdClient();

	return useInfiniteQuery<PaginatedTransactionResponse>({
		queryKey: ["get-transaction-blocks", filter, limit],
		queryFn: async ({ pageParam }) =>
			await client.queryTransactionBlocks({
				filter,
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
