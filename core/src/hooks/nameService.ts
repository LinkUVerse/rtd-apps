// Copyright (c) LinkU Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { useFeatureIsOn } from '@growthbook/growthbook-react';
import { useRtdClient } from 'rtd-dapp-kit';
import { useQuery } from '@tanstack/react-query';

const RTD_NS_FEATURE_FLAG = 'rtdns';

// This should align with whatever names we want to be able to resolve.

export function useRtdNSEnabled() {
	return useFeatureIsOn(RTD_NS_FEATURE_FLAG);
}

export function useResolveRtdNSAddress(name?: string | null, enabled?: boolean) {
	const client = useRtdClient();
	const enabledRtdNs = useRtdNSEnabled();

	return useQuery({
		queryKey: ['resolve-rtdns-address', name],
		queryFn: async () => {
			return await client.resolveNameServiceAddress({
				name: name!,
			});
		},
		enabled: !!name && enabled && enabledRtdNs,
		refetchOnWindowFocus: false,
		retry: false,
	});
}

export function useResolveRtdNSName(address?: string | null) {
	const client = useRtdClient();
	const enabled = useRtdNSEnabled();

	return useQuery({
		queryKey: ['resolve-rtdns-name', address],
		queryFn: async () => {
			// NOTE: We only fetch 1 here because it's the default name.
			const { data } = await client.resolveNameServiceNames({
				address: address!,
				limit: 1,
			});

			return data[0] || null;
		},
		enabled: !!address && enabled,
		refetchOnWindowFocus: false,
		retry: false,
	});
}
