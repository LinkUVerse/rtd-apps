// USDC type - previously imported from swap/utils
const USDC_TYPE_ARG = '0x5d4b302506645c37ff133b98c4b50a5ae14841659738d6d733d59d0d217a93bf::coin::COIN';

// Copyright (c) LinkU Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { type CoinBalance } from 'rtd-typescript/client';
import { RTD_TYPE_ARG } from 'rtd-typescript/utils';

// Sort tokens by symbol and total balance
// Move this to the API backend
// Filter out tokens with zero balance
export function filterAndSortTokenBalances(tokens: CoinBalance[]) {
	return tokens
		.filter((token) => Number(token.totalBalance) > 0)
		.sort((a, b) => {
			if (a.coinType === RTD_TYPE_ARG) {
				return -1;
			}
			if (b.coinType === RTD_TYPE_ARG) {
				return 1;
			}
			if (a.coinType === USDC_TYPE_ARG) {
				return -1;
			}
			if (b.coinType === USDC_TYPE_ARG) {
				return 1;
			}
			return (getCoinSymbol(a.coinType) + Number(a.totalBalance)).localeCompare(
				getCoinSymbol(b.coinType) + Number(b.totalBalance),
			);
		});
}

export function getCoinSymbol(coinTypeArg: string) {
	return coinTypeArg.substring(coinTypeArg.lastIndexOf(':') + 1);
}
