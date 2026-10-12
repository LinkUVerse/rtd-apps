// Copyright (c) LinkU Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { useQuery } from '@tanstack/react-query';
import { useEffect, useState } from 'react';

import { useBackgroundClient } from './useBackgroundClient';

export function useStorageMigrationStatus() {
	const [enabled, setEnabled] = useState(true);
	const backgroundClient = useBackgroundClient();
	const response = useQuery({
		queryKey: ['storage migration status'],
		queryFn: () => backgroundClient.getStorageMigrationStatus(),
		refetchInterval: 1000,
		enabled,
		meta: { skipPersistedCache: true },
	});
	useEffect(() => {
		// A network change clears QueryClient while this hook may stay mounted.
		// Recheck missing readiness rather than keeping a disabled empty query.
		setEnabled(response.data !== 'ready');
	}, [response.data]);
	return response;
}
