// Copyright (c) LinkU Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import type { DappRequestBinding } from "_src/shared/rpc/dapp-request-binding";
import { type SignedTransaction } from "_src/shared/messaging/signed-results";
import type { DappConfirmedResult } from "_src/shared/rpc/dapp-execution-result";
import { type RtdSignMessageOutput } from "rtd-wallet-standard";

export type TransactionDataType = {
  type: "transaction";
  data: string;
  account: string;
  chain?: string;
  justSign?: boolean;
};

export type SignMessageDataType = {
  type: "sign-message";
  message: string;
  accountAddress: string;
  chain?: string;
};

export type ApprovalRequest = {
  id: string;
  /** Background-pinned source/profile; old requests without it require a new approval flow. */
  binding?: DappRequestBinding;
  approved: boolean | null;
  origin: string;
  originFavIcon?: string;
  txResult?: DappConfirmedResult | RtdSignMessageOutput;
  txResultError?: string;
  txSigned?: SignedTransaction;
  createdDate: string;
  tx: TransactionDataType | SignMessageDataType;
};

export interface SignMessageApprovalRequest extends Omit<
  ApprovalRequest,
  "txResult" | "tx"
> {
  tx: SignMessageDataType;
  txResult?: RtdSignMessageOutput;
}

export interface TransactionApprovalRequest extends Omit<
  ApprovalRequest,
  "txResult" | "tx"
> {
  tx: TransactionDataType;
  txResult?: DappConfirmedResult;
}

export function isSignMessageApprovalRequest(
  request: ApprovalRequest,
): request is SignMessageApprovalRequest {
  return request.tx.type === "sign-message";
}

export function isTransactionApprovalRequest(
  request: ApprovalRequest,
): request is TransactionApprovalRequest {
  return request.tx.type !== "sign-message";
}
