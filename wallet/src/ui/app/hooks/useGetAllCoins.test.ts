// Copyright (c) LinkU Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { describe, expect, it, vi } from 'vitest';

import { fetchAllCoins, getAllCoinsQueryOptions } from './useGetAllCoins';

describe('useGetAllCoins helpers', () => {
	it('fetches every page of coins for an owner and coin type', async () => {
		const getCoins = vi
			.fn()
			.mockResolvedValueOnce({
				data: [
					{
						coinObjectId: '0x1',
						version: '1',
						digest: 'digest-1',
						balance: '1',
					},
				],
				nextCursor: 'cursor-1',
			})
			.mockResolvedValueOnce({
				data: [
					{
						coinObjectId: '0x2',
						version: '2',
						digest: 'digest-2',
						balance: '2',
					},
				],
				nextCursor: null,
			});

		const coins = await fetchAllCoins(
			{ getCoins } as never,
			'0x2::rtd::RTD',
			'0xabc',
		);

		expect(coins).toEqual([
			{ coinObjectId: '0x1', version: '1', digest: 'digest-1', balance: '1' },
			{ coinObjectId: '0x2', version: '2', digest: 'digest-2', balance: '2' },
		]);
		expect(getCoins).toHaveBeenNthCalledWith(1, {
			owner: '0xabc',
			coinType: '0x2::rtd::RTD',
			cursor: null,
			limit: 100,
		});
		expect(getCoins).toHaveBeenNthCalledWith(2, {
			owner: '0xabc',
			coinType: '0x2::rtd::RTD',
			cursor: 'cursor-1',
			limit: 100,
		});
	});

	it('marks coin refs queries as non-persisted and immediately stale', () => {
		const options = getAllCoinsQueryOptions(
			{ getCoins: vi.fn() } as never,
			'0x2::rtd::RTD',
			'0xabc',
		);

		expect(options.queryKey).toEqual([
			'get-all-coins',
			'0xabc',
			'0x2::rtd::RTD',
		]);
		expect(options.meta).toEqual({ skipPersistedCache: true });
		expect(options.staleTime).toBe(0);
		expect(options.gcTime).toBe(0);
	});
});
