// Copyright (c) LinkU Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { type SignedTransaction } from '_src/ui/app/WalletSigner';
import type { RtdTransactionBlockResponse } from 'rtd-typescript/client';
import {
	type RtdSignAndExecuteTransactionBlockInput,
	type RtdSignMessageOutput,
} from 'rtd-wallet-standard';

export type TransactionDataType = {
	type: 'transaction';
	data: string;
	account: string;
	justSign?: boolean;
	requestType?: RtdSignAndExecuteTransactionBlockInput['requestType'];
	options?: RtdSignAndExecuteTransactionBlockInput['options'];
};

export type SignMessageDataType = {
	type: 'sign-message';
	message: string;
	accountAddress: string;
};

export type ApprovalRequest = {
	id: string;
	approved: boolean | null;
	origin: string;
	originFavIcon?: string;
	txResult?: RtdTransactionBlockResponse | RtdSignMessageOutput;
	txResultError?: string;
	txSigned?: SignedTransaction;
	createdDate: string;
	tx: TransactionDataType | SignMessageDataType;
};

export interface SignMessageApprovalRequest extends Omit<ApprovalRequest, 'txResult' | 'tx'> {
	tx: SignMessageDataType;
	txResult?: RtdSignMessageOutput;
}

export interface TransactionApprovalRequest extends Omit<ApprovalRequest, 'txResult' | 'tx'> {
	tx: TransactionDataType;
	txResult?: RtdTransactionBlockResponse;
}

export function isSignMessageApprovalRequest(
	request: ApprovalRequest,
): request is SignMessageApprovalRequest {
	return request.tx.type === 'sign-message';
}

export function isTransactionApprovalRequest(
	request: ApprovalRequest,
): request is TransactionApprovalRequest {
	return request.tx.type !== 'sign-message';
}
