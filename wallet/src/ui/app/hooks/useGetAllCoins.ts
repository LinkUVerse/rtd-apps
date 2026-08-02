// Copyright (c) LinkU Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { useRtdClient } from 'rtd-dapp-kit';
import type {
	CoinStruct,
	PaginatedCoins,
	RtdClient,
} from 'rtd-typescript/client';
import { useQuery } from '@tanstack/react-query';

const MAX_COINS_PER_REQUEST = 100;

export function getAllCoinsQueryKey(coinType: string, address?: string | null) {
	return ['get-all-coins', address, coinType] as const;
}

export async function fetchAllCoins(
	rpc: RtdClient,
	coinType: string,
	address: string,
): Promise<CoinStruct[]> {
	let cursor: string | undefined | null = null;
	const allData: CoinStruct[] = [];
	// keep fetching until cursor is null or undefined
	do {
		const { data, nextCursor }: PaginatedCoins = await rpc.getCoins({
			owner: address,
			coinType,
			cursor,
			limit: MAX_COINS_PER_REQUEST,
		});
		if (!data || !data.length) {
			break;
		}

		allData.push(...data);
		cursor = nextCursor;
	} while (cursor);

	return allData;
}

export function getAllCoinsQueryOptions(
	rpc: RtdClient,
	coinType: string,
	address?: string | null,
) {
	return {
		queryKey: getAllCoinsQueryKey(coinType, address),
		queryFn: () => fetchAllCoins(rpc, coinType, address!),
		enabled: !!address,
		staleTime: 0,
		gcTime: 0,
		meta: { skipPersistedCache: true },
	};
}

// Fetch all coins for an address, this will keep calling the API until all coins are fetched
export function useGetAllCoins(coinType: string, address?: string | null) {
	const rpc = useRtdClient();
	return useQuery(getAllCoinsQueryOptions(rpc, coinType, address));
}
