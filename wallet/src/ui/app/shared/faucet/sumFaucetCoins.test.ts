import { describe, expect, it } from 'vitest';

import { sumFaucetCoins } from './sumFaucetCoins';

describe('faucet V2 amounts', () => {
	it('sums without losing precision when the total exceeds safe JSON integers', () => {
		expect(sumFaucetCoins([{ amount: Number.MAX_SAFE_INTEGER }, { amount: 2 }]))
			.toBe(9007199254740993n);
	});
	it.each([null, []])('does not announce success without coins (%j)', (coins) => {
		expect(() => sumFaucetCoins(coins)).toThrow('no transferred coins');
	});
	it.each([0, -1, 1.5, NaN, Infinity, Number.MAX_SAFE_INTEGER + 1])(
		'rejects invalid or already rounded amounts (%s)', (amount) => {
			expect(() => sumFaucetCoins([{ amount }])).toThrow('invalid or imprecise');
		},
	);
});
