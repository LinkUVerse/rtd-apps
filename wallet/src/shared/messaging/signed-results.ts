// Copyright (c) LinkU Labs, Inc.
// SPDX-License-Identifier: Apache-2.0
export type SignedTransaction = {
  transactionBlockBytes: string;
  signature: string;
};

export type SignedMessage = {
  messageBytes: string;
  signature: string;
};
