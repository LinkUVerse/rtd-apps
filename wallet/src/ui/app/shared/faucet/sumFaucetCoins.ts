// Copyright (c) LinkU Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

/** V2 returns individual JSON numbers. Reject lost precision before conversion. */
export function sumFaucetCoins(coins: { amount: number }[] | null): bigint {
	if (!Array.isArray(coins) || coins.length === 0) {
		throw new Error('Faucet returned no transferred coins');
	}
	return coins.reduce((total, coin) => {
		if (!coin || !Number.isSafeInteger(coin.amount) || coin.amount <= 0) {
			throw new Error('Faucet returned an invalid or imprecise amount');
		}
		return total + BigInt(coin.amount);
	}, 0n);
}
