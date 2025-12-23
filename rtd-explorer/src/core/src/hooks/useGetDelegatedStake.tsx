// Copyright (c) LinkU Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { useRtdClient } from "rtd-dapp-kit";
import type { DelegatedStake } from "rtd-typescript/client";
import { useQuery, type UseQueryOptions } from "@tanstack/react-query";
import { normalizeRtdAddress } from "rtd-typescript/utils";
type UseGetDelegatedStakesOptions = {
	address: string;
} & Omit<UseQueryOptions<DelegatedStake[]>, "queryKey" | "queryFn">;

export function useGetDelegatedStake(options: UseGetDelegatedStakesOptions) {
	const client = useRtdClient();
	const { address, ...queryOptions } = options;
	const normalizedAddress = normalizeRtdAddress(address);
	return useQuery({
		queryKey: ["delegated-stakes", normalizedAddress],
		queryFn: () => client.getStakes({ owner: normalizedAddress }),
		...queryOptions,
	});
}
