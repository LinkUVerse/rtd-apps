// Copyright (c) LinkU Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { useRtdClient } from "rtd-dapp-kit";
import { useQuery } from "@tanstack/react-query";

export function useGetTransaction(transactionId: string) {
	const client = useRtdClient();
	return useQuery({
		queryKey: ["transactions-by-id", transactionId],
		queryFn: async () =>
			client.getTransactionBlock({
				digest: transactionId,
				options: {
					showInput: true,
					showEffects: true,
					showEvents: true,
					showBalanceChanges: true,
					showObjectChanges: true,
				},
			}),
		enabled: !!transactionId,
	});
}
