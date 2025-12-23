// Copyright (c) LinkU Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { useRtdClient } from "rtd-dapp-kit";
import { DynamicFieldPage } from "rtd-typescript/client";
import { normalizeRtdAddress } from "rtd-typescript/utils";
import { useInfiniteQuery } from "@tanstack/react-query";

const MAX_PAGE_SIZE = 10;

export function useGetDynamicFields(parentId: string, maxPageSize = MAX_PAGE_SIZE) {
	const client = useRtdClient();
	return useInfiniteQuery<DynamicFieldPage>({
		queryKey: ["dynamic-fields", { maxPageSize, parentId }],
		queryFn: ({ pageParam = null }) =>
			client.getDynamicFields({
				parentId: normalizeRtdAddress(parentId),
				cursor: pageParam as string | null,
				limit: maxPageSize,
			}),
		enabled: !!parentId,
		initialPageParam: null,
		getNextPageParam: ({ nextCursor, hasNextPage }) => (hasNextPage ? nextCursor : null),
	});
}
