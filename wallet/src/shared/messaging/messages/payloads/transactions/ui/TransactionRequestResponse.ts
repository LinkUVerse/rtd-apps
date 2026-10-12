// Copyright (c) LinkU Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { isBasePayload } from "_payloads";
import type { BasePayload, Payload } from "_payloads";
import { type SignedTransaction } from "_src/shared/messaging/signed-results";
import type { DappConfirmedResult } from "_src/shared/rpc/dapp-execution-result";
import { type RtdSignMessageOutput } from "rtd-wallet-standard";

export interface TransactionRequestResponse extends BasePayload {
  type: "transaction-request-response";
  txID: string;
  approved: boolean;
  txResult?: DappConfirmedResult | RtdSignMessageOutput;
  txResultError?: string;
  txSigned?: SignedTransaction;
}

export function isTransactionRequestResponse(
  payload: Payload,
): payload is TransactionRequestResponse {
  return (
    isBasePayload(payload) && payload.type === "transaction-request-response"
  );
}
