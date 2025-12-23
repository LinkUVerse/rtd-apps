// Copyright (c) LinkU Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import type { RtdEvent, RtdTransactionBlockKind, TransactionEffects } from 'rtd-typescript/client';

type FormattedBalance = {
	amount?: number | null;
	coinType?: string | null;
	recipientAddress: string;
}[];

export function getAmount(
	_txnData: RtdTransactionBlockKind,
	_txnEffect: TransactionEffects,
	_events: RtdEvent[],
): FormattedBalance | null {
	// TODO: Support programmable transactions:
	return null;
}
