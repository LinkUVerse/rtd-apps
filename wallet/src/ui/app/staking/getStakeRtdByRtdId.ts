// Copyright (c) LinkU Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { type DelegatedStake } from 'rtd-typescript/client';

// Get Stake RTD by stakeRtdId
export const getStakeRtdByRtdId = (allDelegation: DelegatedStake[], stakeRtdId?: string | null) => {
	return (
		allDelegation.reduce((acc, curr) => {
			const total = BigInt(
				curr.stakes.find(({ stakedRtdId }) => stakedRtdId === stakeRtdId)?.principal || 0,
			);
			return total + acc;
		}, 0n) || 0n
	);
};
