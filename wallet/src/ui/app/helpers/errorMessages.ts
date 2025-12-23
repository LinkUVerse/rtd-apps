// Copyright (c) LinkU Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

/**
 * Helper method for producing user-friendly error messages from Signer operations
 * from SignerWithProvider instances (e.g., signTransaction, getAddress, and so forth)
 */
export function getSignerOperationErrorMessage(error: unknown) {
	return (error as Error).message || 'Something went wrong.';
}

/**
 * Helper method for producing user-friendly error messages from connection errors
 * @deprecated Ledger support has been removed
 */
export function getLedgerConnectionErrorMessage(_error: unknown) {
	return null;
}

/**
 * Helper method for producing user-friendly error messages from application errors
 * @deprecated Ledger support has been removed
 */
export function getRtdApplicationErrorMessage(_error: unknown) {
	return null;
}
