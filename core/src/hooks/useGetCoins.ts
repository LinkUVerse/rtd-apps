// Copyright (c) LinkU Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { useRtdClient } from 'rtd-dapp-kit';
import { PaginatedCoins } from 'rtd-typescript/client';
import { useInfiniteQuery } from '@tanstack/react-query';

const MAX_COINS_PER_REQUEST = 10;

export function useGetCoins(
	coinType: string,
	address?: string | null,
	maxCoinsPerRequest = MAX_COINS_PER_REQUEST,
) {
	const client = useRtdClient();
	return useInfiniteQuery<PaginatedCoins>({
		queryKey: ['get-coins', address, coinType, maxCoinsPerRequest],
		initialPageParam: null,
		getNextPageParam: ({ hasNextPage, nextCursor }) => (hasNextPage ? nextCursor : null),
		queryFn: ({ pageParam }) =>
			client.getCoins({
				owner: address!,
				coinType,
				cursor: pageParam as string | null,
				limit: maxCoinsPerRequest,
			}),
		enabled: !!address,
	});
}
