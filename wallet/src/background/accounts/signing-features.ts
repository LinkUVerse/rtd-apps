// Copyright (c) LinkU Labs, Inc.
// SPDX-License-Identifier: Apache-2.0
/** Only local key-backed accounts are enabled for signing in this migration. */
export function accountSigningFeatures(type: string): readonly `${string}:${string}`[] {
  return type === 'mnemonic-derived' || type === 'imported'
    ? ['rtd:signTransaction', 'rtd:signAndExecuteTransaction', 'rtd:signPersonalMessage']
    : [];
}
