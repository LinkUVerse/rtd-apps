// Copyright (c) LinkU Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { Transaction } from 'rtd-typescript/transactions';
import { RTD_SYSTEM_STATE_OBJECT_ID } from 'rtd-typescript/utils';

export function createStakeTransaction(amount: bigint, validator: string) {
	const tx = new Transaction();
	const stakeCoin = tx.splitCoins(tx.gas, [amount]);
	tx.moveCall({
		target: '0x3::rtd_system::request_add_stake',
		arguments: [
			tx.sharedObjectRef({
				objectId: RTD_SYSTEM_STATE_OBJECT_ID,
				initialSharedVersion: 1,
				mutable: true,
			}),
			stakeCoin,
			tx.pure.address(validator),
		],
	});
	return tx;
}

export function createUnstakeTransaction(stakedRtdId: string) {
	const tx = new Transaction();
	tx.moveCall({
		target: '0x3::rtd_system::request_withdraw_stake',
		arguments: [tx.object(RTD_SYSTEM_STATE_OBJECT_ID), tx.object(stakedRtdId)],
	});
	return tx;
}
