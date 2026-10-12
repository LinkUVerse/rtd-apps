// Copyright (c) LinkU Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { isBasePayload } from "_payloads";
import type { BasePayload, Payload } from "_payloads";
import type { DappConfirmedResult } from "_src/shared/rpc/dapp-execution-result";
import { type RtdSignTransactionBlockOutput } from "rtd-wallet-standard";

export interface ExecuteTransactionResponse extends BasePayload {
  type: "execute-transaction-response";
  result: DappConfirmedResult;
}

export function isExecuteTransactionResponse(
  payload: Payload,
): payload is ExecuteTransactionResponse {
  return (
    isBasePayload(payload) && payload.type === "execute-transaction-response"
  );
}

export interface SignTransactionResponse extends BasePayload {
  type: "sign-transaction-response";
  result: RtdSignTransactionBlockOutput;
}

export function isSignTransactionResponse(
  payload: Payload,
): payload is SignTransactionResponse {
  return isBasePayload(payload) && payload.type === "sign-transaction-response";
}
