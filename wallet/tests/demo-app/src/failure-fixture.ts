// Copyright (c) LinkU Labs, Inc.
// SPDX-License-Identifier: Apache-2.0
import { Transaction } from 'rtd-typescript/transactions';
import { isValidRtdAddress, normalizeRtdAddress } from 'rtd-typescript/utils';

/** Explicit local-only dev action; ordinary demo sends remain unchanged. */
export function failureFixtureTransaction(url: URL, network: string): Transaction | null {
  const packageId=url.searchParams.get('failurePackage'),gateId=url.searchParams.get('failureGate');
  if(!packageId&&!gateId)return null;
  if(network!=='localnet'||url.protocol!=='http:'||url.hostname!=='127.0.0.1'||
    !packageId||!gateId||!isValidRtdAddress(packageId)||!isValidRtdAddress(gateId))
    throw new Error('Failure fixture requires explicit package and gate on localnet / 127.0.0.1');
  const tx=new Transaction();
  tx.moveCall({target:`${normalizeRtdAddress(packageId)}::execution_gate::visit`,arguments:[tx.object(normalizeRtdAddress(gateId))]});
  return tx;
}
