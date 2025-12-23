// Copyright (c) LinkU Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import type { RtdTransactionBlockResponse } from 'rtd-typescript/client';

// TODO: Support programmable transactions:
export function checkStakingTxn(_txn: RtdTransactionBlockResponse) {
	return false;
}
