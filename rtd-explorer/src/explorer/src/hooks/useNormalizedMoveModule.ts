// Copyright (c) LinkU Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { useRtdClient } from "rtd-dapp-kit";
import { useQuery } from "@tanstack/react-query";

export function useNormalizedMoveModule(packageId?: string | null, moduleName?: string | null) {
	const client = useRtdClient();
	return useQuery({
		queryKey: ["normalized-module", packageId, moduleName],
		queryFn: async () =>
			await client.getNormalizedMoveModule({
				package: packageId!,
				module: moduleName!,
			}),
		enabled: !!(packageId && moduleName),
	});
}
