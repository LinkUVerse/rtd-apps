// Copyright (c) LinkU Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { useRtdClient } from "rtd-dapp-kit";
import { RtdObjectDataOptions, RtdObjectResponse } from "rtd-typescript/client";
import { useQuery, UseQueryOptions } from "@tanstack/react-query";

import { chunkArray } from "../utils/chunkArray";

export function useMultiGetObjects(
	ids: string[],
	options: RtdObjectDataOptions,
	queryOptions?: Omit<UseQueryOptions<RtdObjectResponse[]>, "queryKey" | "queryFn">,
) {
	const client = useRtdClient();
	return useQuery({
		...queryOptions,
		queryKey: ["multiGetObjects", ids],
		queryFn: async () => {
			const responses = await Promise.all(
				chunkArray(ids, 50).map((chunk) =>
					client.multiGetObjects({
						ids: chunk,
						options,
					}),
				),
			);
			return responses.flat();
		},
		enabled: !!ids?.length,
	});
}
