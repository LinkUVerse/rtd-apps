// Copyright (c) LinkU Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { GrowthBookContext } from '@growthbook/growthbook-react';
import { useRtdClient } from 'rtd-dapp-kit';
import { normalizeRtdAddress } from 'rtd-typescript/utils';
import { useQuery } from '@tanstack/react-query';
import { useContext } from 'react';

const RTD_NS_FEATURE_FLAG = 'rtdns';

// This should align with whatever names we want to be able to resolve.
const RTD_NS_DOMAINS = ['.rtd'];

export function isRtdNSName(name: string) {
	return RTD_NS_DOMAINS.some((domain) => name.endsWith(domain));
}

export function useRtdNSEnabled() {
	// Use useContext directly to safely check if GrowthBook is configured
	const context = useContext(GrowthBookContext);
	// If GrowthBook is not configured, default to enabled
	if (!context?.growthbook) {
		return true;
	}
	return context.growthbook.isOn(RTD_NS_FEATURE_FLAG);
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
	const normalizedAddress = address ? normalizeRtdAddress(address) : null;

	return useQuery({
		queryKey: ['resolve-rtdns-name', normalizedAddress],
		queryFn: async () => {
			// NOTE: We only fetch 1 here because it's the default name.
			const { data } = await client.resolveNameServiceNames({
				address: normalizedAddress!,
				limit: 1,
			});

			return data[0] || null;
		},
		enabled: !!address && enabled,
		refetchOnWindowFocus: false,
		retry: false,
	});
}
