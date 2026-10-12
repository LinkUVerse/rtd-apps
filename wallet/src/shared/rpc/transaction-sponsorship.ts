// Copyright (c) LinkU Labs, Inc.
// SPDX-License-Identifier: Apache-2.0
import type { Transaction } from 'rtd-typescript/transactions';
import { walletAddress } from './asset-address';

/** This wallet's execute entry collects one sender signature; sign-only may use an external owner. */
export function unsupportedSponsorExecution(transaction: Transaction, sender: string, justSign: boolean) {
 const owner=transaction.getData().gasData.owner;
 return !justSign&&owner!==null&&walletAddress(owner)!==walletAddress(sender);
}
