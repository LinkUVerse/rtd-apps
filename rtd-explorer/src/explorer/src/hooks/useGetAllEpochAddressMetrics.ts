// Copyright (c) LinkU Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { useRtdClient } from "rtd-dapp-kit";
import { type RtdClient } from "rtd-typescript/client";
import { useQuery } from "@tanstack/react-query";

export function useGetAllEpochAddressMetrics(
	...input: Parameters<RtdClient["getAllEpochAddressMetrics"]>
) {
	const client = useRtdClient();
	return useQuery({
		queryKey: ["get", "all", "epoch", "addresses", ...input],
		queryFn: () => client.getAllEpochAddressMetrics(...input),
	});
}
