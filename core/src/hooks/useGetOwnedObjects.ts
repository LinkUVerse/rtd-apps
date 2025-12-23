// Copyright (c) LinkU Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { useRtdClient } from 'rtd-dapp-kit';
import { PaginatedObjectsResponse, type RtdObjectDataFilter } from 'rtd-typescript/client';
import { useInfiniteQuery } from '@tanstack/react-query';

const MAX_OBJECTS_PER_REQ = 6;

export function useGetOwnedObjects(
	address?: string | null,
	filter?: RtdObjectDataFilter,
	maxObjectRequests = MAX_OBJECTS_PER_REQ,
) {
	const client = useRtdClient();
	return useInfiniteQuery<PaginatedObjectsResponse>({
		initialPageParam: null,
		queryKey: ['get-owned-objects', address, filter, maxObjectRequests],
		queryFn: ({ pageParam }) =>
			client.getOwnedObjects({
				owner: address!,
				filter,
				options: {
					showType: true,
					showContent: true,
					showDisplay: true,
				},
				limit: maxObjectRequests,
				cursor: pageParam as string | null,
			}),

		staleTime: 10 * 1000,
		enabled: !!address,
		getNextPageParam: ({ hasNextPage, nextCursor }) => (hasNextPage ? nextCursor : null),
	});
}
