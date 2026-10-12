// Copyright (c) LinkU Labs, Inc.
// SPDX-License-Identifier: Apache-2.0
import type { RtdTransactionBlockResponse } from 'rtd-typescript/jsonRpc';

// todo: add more logic for deriving transaction label
export const getLabel = (transaction: RtdTransactionBlockResponse, currentAddress?: string) => {
	const isSender = transaction.transaction?.data.sender === currentAddress;
	// Rename to "Send" to Transaction
	return isSender ? 'Transaction' : 'Receive';
};
