// Copyright (c) LinkU Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { isBasePayload } from '_payloads';
import type { BasePayload, Payload } from '_payloads';
import type { RtdTransactionBlockResponse } from 'rtd-typescript/client';
import { type RtdSignTransactionBlockOutput } from 'rtd-wallet-standard';

export interface ExecuteTransactionResponse extends BasePayload {
	type: 'execute-transaction-response';
	result: RtdTransactionBlockResponse;
}

export function isExecuteTransactionResponse(
	payload: Payload,
): payload is ExecuteTransactionResponse {
	return isBasePayload(payload) && payload.type === 'execute-transaction-response';
}

export interface SignTransactionResponse extends BasePayload {
	type: 'sign-transaction-response';
	result: RtdSignTransactionBlockOutput;
}

export function isSignTransactionResponse(payload: Payload): payload is SignTransactionResponse {
	return isBasePayload(payload) && payload.type === 'sign-transaction-response';
}
