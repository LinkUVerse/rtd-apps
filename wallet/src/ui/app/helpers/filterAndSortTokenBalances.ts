// Copyright (c) LinkU Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { type RtdClientTypes } from 'rtd-typescript/client';
import { RTD_TYPE_ARG } from 'rtd-typescript/utils';

const USDC_TYPE_ARG =
	'0x5d4b302506645c37ff133b98c4b50a5ae14841659738d6d733d59d0d217a93bf::coin::COIN';

export function filterAndSortTokenBalances(tokens: readonly RtdClientTypes.Balance[]) {
	const priority = (type: string) => (type === RTD_TYPE_ARG ? 0 : type === USDC_TYPE_ARG ? 1 : 2);
	return tokens
		.filter((token) => BigInt(token.balance) > 0n)
		.sort((a, b) => {
			const order =
				priority(a.coinType) - priority(b.coinType) ||
				getCoinSymbol(a.coinType).localeCompare(getCoinSymbol(b.coinType));
			if (order) return order;
			const aBalance = BigInt(a.balance);
			const bBalance = BigInt(b.balance);
			return aBalance === bBalance
				? a.coinType.localeCompare(b.coinType)
				: aBalance > bBalance
					? -1
					: 1;
		});
}

export function getCoinSymbol(coinTypeArg: string) {
	return coinTypeArg.substring(coinTypeArg.lastIndexOf(':') + 1);
}
