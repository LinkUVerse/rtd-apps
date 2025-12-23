// Copyright (c) LinkU Labs, Inc.
// SPDX-License-Identifier: Apache-2.0
import { useCoinsReFetchingConfig } from '_app/hooks/useCoinsReFetchingConfig';
import { useRtdClientQuery } from 'rtd-dapp-kit';

export function useGetAllBalances(owner: string) {
	const { staleTime, refetchInterval } = useCoinsReFetchingConfig();

	return useRtdClientQuery(
		'getAllBalances',
		{ owner: owner! },
		{
			enabled: !!owner,
			refetchInterval,
			staleTime,
		},
	);
}
