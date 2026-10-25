// Copyright (c) LinkU Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { useExplorerClient } from "~/rpc/explorer-client";
import { keepPreviousData, useInfiniteQuery } from "@tanstack/react-query";

import { useNetworkContext } from "~/context";

export const DEFAULT_TRANSACTIONS_LIMIT = 20;

// Fetch transaction blocks through the archive GraphQL facade.
export function useGetTransactionBlocks(
	filter?: any,
	limit = DEFAULT_TRANSACTIONS_LIMIT,
	refetchInterval?: number,
	useAltRpc = false,
) {
	const [network] = useNetworkContext();
	const client = useExplorerClient();

	return useInfiniteQuery<any>({
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
		getNextPageParam: ({ hasNextPage, nextCursor }: any) =>
			hasNextPage ? nextCursor : null,
		staleTime: 10 * 1000,
		retry: false,
		placeholderData: keepPreviousData,
		refetchInterval,
	});
}
