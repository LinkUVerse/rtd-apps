// Copyright (c) LinkU Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { type DelegatedStake } from 'rtd-typescript/client';

// Get staked Rtd
export const getAllStakeRtd = (allDelegation: DelegatedStake[]) => {
	return (
		allDelegation.reduce(
			(acc, curr) => curr.stakes.reduce((total, { principal }) => total + BigInt(principal), acc),
			0n,
		) || 0n
	);
};
