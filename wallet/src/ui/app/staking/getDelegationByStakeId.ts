// Copyright (c) LinkU Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import type { DelegatedStake } from 'rtd-typescript/client';

// Helper function to get the delegation by stakedRtdId
export const getDelegationDataByStakeId = (
	delegationsStake: DelegatedStake[],
	stakeRtdId: string,
) => {
	let stake = null;
	for (const { stakes } of delegationsStake) {
		stake = stakes.find(({ stakedRtdId }) => stakedRtdId === stakeRtdId) || null;
		if (stake) return stake;
	}

	return stake;
};
