// Copyright (c) LinkU Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { useFormatCoin } from 'rtd-apps-core';
import { useRtdClient } from 'rtd-dapp-kit';
import { Transaction } from 'rtd-typescript/transactions';
import { RTD_TYPE_ARG } from 'rtd-typescript/utils';
import { useQuery } from '@tanstack/react-query';

export function useTransactionData(sender?: string | null, transaction?: Transaction | null) {
	const client = useRtdClient();
	return useQuery({
		// eslint-disable-next-line @tanstack/query/exhaustive-deps
		queryKey: ['transaction-data', transaction?.serialize()],
		queryFn: async () => {
			const clonedTransaction = Transaction.from(transaction!);
			if (sender) {
				clonedTransaction.setSenderIfNotSet(sender);
			}
			// Build the transaction to bytes, which will ensure that the transaction data is fully populated:
			await clonedTransaction!.build({ client });
			return clonedTransaction!.getData();
		},
		enabled: !!transaction,
	});
}

export function useTransactionGasBudget(sender?: string | null, transaction?: Transaction | null) {
	const { data, ...rest } = useTransactionData(sender, transaction);

	const [formattedGas] = useFormatCoin(data?.gasData.budget, RTD_TYPE_ARG);

	return {
		data: formattedGas,
		...rest,
	};
}
