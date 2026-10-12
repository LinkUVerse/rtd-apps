// Copyright (c) LinkU Labs, Inc.
// SPDX-License-Identifier: Apache-2.0
import { fromBase64, toBase64 } from 'rtd-typescript/utils';
import type { WalletPreparedTransaction } from 'rtd-apps-core/src/rpc/WalletRpcContext';

export type PreparedTransactionWire = Omit<WalletPreparedTransaction, 'simulation'> & {
  readonly simulationJson: string;
};
const byteTag = '$walletBytes';
/** Chrome runtime messaging uses JSON serialization, which loses Uint8Array identity. */
export function encodePreparedTransaction(prepared: WalletPreparedTransaction): PreparedTransactionWire {
  const { simulation, ...rest } = prepared;
  return { ...rest, simulationJson: JSON.stringify(simulation, (_key, value) => {
    if (value instanceof Uint8Array) return { [byteTag]: toBase64(value) };
    if (value && typeof value === 'object' && Object.hasOwn(value, byteTag)) throw new Error('Reserved simulation wire key');
    return value;
  }) };
}
export function decodePreparedTransaction(wire: PreparedTransactionWire): WalletPreparedTransaction {
  const { simulationJson, ...rest } = wire;
  if (typeof simulationJson !== 'string' || simulationJson.length > 32 * 1024 * 1024) throw new Error('Invalid simulation wire payload');
  const simulation = JSON.parse(simulationJson, (_key, value) => {
    if (value && typeof value === 'object' && Object.hasOwn(value, byteTag)) {
      if (Object.keys(value).length !== 1 || typeof value[byteTag] !== 'string') throw new Error('Invalid simulation bytes');
      const bytes = fromBase64(value[byteTag]);
      if (toBase64(bytes) !== value[byteTag]) throw new Error('Non-canonical simulation bytes');
      return bytes;
    }
    return value;
  });
  if (!simulation || !['Transaction', 'FailedTransaction'].includes(simulation.$kind)) throw new Error('Invalid simulation kind');
  return { ...rest, simulation };
}
