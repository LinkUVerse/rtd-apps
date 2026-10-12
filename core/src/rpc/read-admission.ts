// Copyright (c) LinkU Labs, Inc.
// SPDX-License-Identifier: Apache-2.0
import type { WalletRpc } from "./WalletRpcContext";

export const WALLET_READ_OPERATIONS = Object.freeze([
  "entry",
  "balances",
  "coinMetadata",
  "staking",
  "assets",
  "assetBalances",
  "assetCoinMetadata",
  "assetCoins",
  "assetStaking",
  "assetNativeKiosks",
  "assetKiosks",
  "assetDynamicFields",
  "names",
  "sentTransactions",
  "eventsByType",
  "eventsByModule",
  "history",
  "receipts",
  "historicalObjects",
  "freshObject",
  "freshCoins",
  "freshBalance",
  "prepare",
  "simulate",
  "recipient",
] as const);
export type WalletReadOperation = (typeof WALLET_READ_OPERATIONS)[number];
/** Ephemeral negative read fence only. No identity, capability or signing authority. */
export interface WalletReadAdmissionView {
  readonly phase: "checking" | "observed" | "unavailable";
  readonly blocked: readonly WalletReadOperation[];
  readonly keys: Readonly<Record<WalletReadOperation, string>>;
  readonly reasons?: Readonly<
    Partial<Record<WalletReadOperation, "checking" | "blocked" | "unavailable">>
  >;
}
export function walletReadAllowed(
  rpc: WalletRpc,
  operation: WalletReadOperation,
) {
  return !rpc.readAdmission?.blocked.includes(operation);
}
export function walletReadKeyParts(
  rpc: WalletRpc,
  operation: WalletReadOperation,
): readonly string[] {
  return rpc.readAdmission ? [rpc.readAdmission.keys[operation]] : [];
}
export function assetReadOperation(operation: string): WalletReadOperation {
  switch (operation) {
    case "balances":
      return "assetBalances";
    case "coin-metadata":
      return "assetCoinMetadata";
    case "coin-objects":
      return "assetCoins";
    case "staking":
      return "assetStaking";
    case "wallet-kiosks":
      return "assetKiosks";
    case "native-kiosks":
      return "assetNativeKiosks";
    case "dynamic-fields":
    case "dynamic-field":
      return "assetDynamicFields";
    default:
      return "assets";
  }
}
