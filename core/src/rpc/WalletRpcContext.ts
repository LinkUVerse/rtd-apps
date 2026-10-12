// Copyright (c) LinkU Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { createContext, useContext } from "react";
import type { RtdClientTypes } from "rtd-typescript/client";
import type { WalletStakingView } from "./staking-types";
import type { WalletNativeKiosk, WalletKiosk } from "./kiosk-types";
import type { Transaction } from "rtd-typescript/transactions";
import type { WalletDisplayBasis } from "./display-types";
import type { WalletReadCapabilities } from "./capability-types";
import type { WalletReadAdmissionView } from "./read-admission";

export type WalletSimulationResult = RtdClientTypes.SimulateTransactionResult<{
  effects: true;
  transaction: true;
  bcs: true;
  balanceChanges: true;
  objectTypes: true;
  commandResults: true;
}>;

export interface WalletPreparedTransaction {
  readonly bindingKey: string;
  readonly readSessionKey: string;
  readonly sender: string;
  readonly gasOwner: string;
  readonly gasBudget: string;
  readonly gasPrice: string;
  readonly gasPaymentKind: "coins" | "addressBalance" | "gasless";
  readonly bytesBase64: string;
  readonly digest: string;
  readonly simulation: WalletSimulationResult;
}

export type WalletReceiptTransaction = RtdClientTypes.Transaction<{
  effects: true;
  transaction: true;
  bcs: true;
  balanceChanges: true;
  objectTypes: true;
  events: true;
}>;
export interface WalletTransactionDetails {
  readonly bindingKey: string;
  readonly readSessionKey: string;
  readonly source: "fullnode" | "archive";
  readonly transaction: WalletReceiptTransaction;
}

/** Extension account union, distinct from native sender/affectedAddress transaction lists. */
export interface WalletHistoryCoverage {
  readonly registrationComplete: boolean;
  readonly completeForRegisteredKiosks: boolean;
  readonly completeForDiscoveredOwnerTokens: boolean | null;
  readonly completeForDiscoveredCapabilities: boolean | null;
  readonly allAccountActivityCertified: boolean;
  readonly allAccountTransfersCertified: boolean | null;
}
export interface WalletHistoryTransaction {
  readonly digest: string;
  readonly checkpoint: number;
  readonly sender: string | null;
  readonly origins: readonly string[];
  readonly transaction: WalletReceiptTransaction | null;
  readonly status: "SUCCESS" | "FAILURE";
  readonly timestampMs: number;
  readonly kind: string;
  readonly nativeTransaction: unknown;
  readonly eventFacts: unknown;
  /** Retained native extension facts; absence is not an empty/certified NFT transfer set. */
  readonly kioskTransfers: unknown;
}
export interface WalletAccountHistory {
  readonly bindingKey: string;
  readonly readSessionKey: string;
  readonly address: string;
  readonly checkpointLo: number;
  readonly checkpointHi: number;
  readonly checkpointDigest: string;
  readonly snapshot: string;
  readonly coverage: WalletHistoryCoverage;
  readonly transactions: readonly WalletHistoryTransaction[];
  readonly totalTransactions: number;
}

export interface AssetSnapshotProof {
  readonly bindingKey: string;
  readonly checkpoint: string;
  readonly digest: string;
  readonly cacheKey: string;
}

export interface AssetSnapshotResult<T> {
  readonly snapshot: AssetSnapshotProof;
  readonly value: T;
}

export interface WalletAssetSnapshot {
  readonly proof: AssetSnapshotProof;
  balances(
    owner: string,
    signal?: AbortSignal,
  ): Promise<AssetSnapshotResult<readonly RtdClientTypes.Balance[]>>;
  coinMetadata(
    type: string,
    signal?: AbortSignal,
  ): Promise<AssetSnapshotResult<RtdClientTypes.CoinMetadata | null>>;
  ownedObjects(
    owner: string,
    options?: { type?: string; signal?: AbortSignal },
  ): Promise<AssetSnapshotResult<readonly WalletAssetObject[]>>;
  objects(
    ids: readonly string[],
    signal?: AbortSignal,
  ): Promise<AssetSnapshotResult<readonly (WalletAssetObject | Error)[]>>;
  coinObjects(
    owner: string,
    type: string,
    signal?: AbortSignal,
  ): Promise<AssetSnapshotResult<readonly RtdClientTypes.Coin[]>>;
  staking(
    owner?: string,
    signal?: AbortSignal,
  ): Promise<AssetSnapshotResult<WalletStakingView>>;
  nativeKiosks(
    owner: string,
    signal?: AbortSignal,
  ): Promise<AssetSnapshotResult<readonly WalletNativeKiosk[]>>;
  kiosks(
    owner: string,
    signal?: AbortSignal,
  ): Promise<AssetSnapshotResult<readonly WalletKiosk[]>>;
  dynamicFields(
    parentId: string,
    signal?: AbortSignal,
  ): Promise<AssetSnapshotResult<readonly WalletDynamicField[]>>;
  dynamicField(
    parentId: string,
    name: RtdClientTypes.DynamicFieldName,
    kind: "DynamicField" | "DynamicObject",
    signal?: AbortSignal,
  ): Promise<AssetSnapshotResult<WalletDynamicField | null>>;
}

/** Live Fullnode reference; no GraphQL snapshot and no authorization claim. */
export type WalletFreshObject = RtdClientTypes.Object<{
  content: true;
  objectBcs: true;
  previousTransaction: true;
}> & { readonly hasPublicTransfer: boolean | null };

export type WalletDynamicField = RtdClientTypes.DynamicFieldEntry & {
  readonly value: RtdClientTypes.DynamicFieldValue;
};

export type WalletAssetObject = Omit<
  RtdClientTypes.Object<{
    content: true;
    json: true;
    display: true;
    previousTransaction: true;
  }>,
  "display"
> & {
  readonly display:
    | (RtdClientTypes.Display & { readonly basis: WalletDisplayBasis })
    | null;
  /** Null means the service did not establish transferability. */
  readonly hasPublicTransfer: boolean | null;
};

/** Shared core depends on wallet domains, not a dApp connection to the wallet itself. */
export interface WalletNameResolution {
  readonly snapshot: AssetSnapshotProof;
  readonly readSessionKey: string;
  readonly name: string;
  readonly address: string;
  readonly expirationTimestampMs: string;
  /** Ephemeral display TTL measured in this browser; never persisted as authorization. */
  readonly validUntilMonotonicMs: number;
  readonly registry: string;
}

export interface WalletRpc {
  /** Current persistent negatives; absence/clear does not prove readiness. */
  readonly readAdmission?: WalletReadAdmissionView;
  /** Ephemeral read observations; configured/session presence does not establish global readiness. */
  readonly readCapabilities?: WalletReadCapabilities;
  /** Complete independently admitted balance set; separate from NFT/Display portfolio proof. */
  readBalances?(
    owner: string,
    signal?: AbortSignal,
  ): Promise<AssetSnapshotResult<readonly RtdClientTypes.Balance[]>>;
  /** Independently admitted coin metadata; not the complete NFT portfolio proof. */
  readCoinMetadata?(
    type: string,
    signal?: AbortSignal,
  ): Promise<AssetSnapshotResult<RtdClientTypes.CoinMetadata | null>>;
  /** Independent complete staking domain at its own admitted S; not an NFT asset proof. */
  readStakingView?(
    owner?: string,
    signal?: AbortSignal,
  ): Promise<AssetSnapshotResult<WalletStakingView>>;
  /** Explicit indexed filters only; optional when GraphQL is not configured. */
  readSentTransactions?(
    sender: string,
    options: import("./indexed-types").IndexedListOptions,
  ): Promise<
    import("./indexed-types").IndexedListResult<
      import("./indexed-types").IndexedTransactionReference
    >
  >;
  readIndexedEvents?(
    filter: import("./indexed-types").IndexedEventFilter,
    options: import("./indexed-types").IndexedListOptions,
  ): Promise<
    import("./indexed-types").IndexedListResult<
      import("./indexed-types").IndexedEvent
    >
  >;

  /** Optional archive capability; historical data must never become a live transaction input. */
  readHistoricalObjects?(
    selectors: readonly {
      readonly objectId: string;
      readonly version: string;
    }[],
    signal?: AbortSignal,
  ): Promise<{
    readonly bindingKey: string;
    readonly values: readonly (WalletFreshObject | Error)[];
    readonly coverage: { readonly lower: string; readonly upper: string };
  }>;
  /** Local preference identity only; does not prove live endpoint identity. */
  readonly assetPreferenceScope?: string;
  readonly faucetUrl?: string;
  readonly state: "initializing" | "unconfigured" | "invalid" | "configured";
  readonly bindingKey: string;
  readonly readSessionKey: string;
  readonly assetSnapshotKey: string;
  /** Transport/session presence only; each read still verifies H0. Independent of GraphQL admission. */
  readonly hasFullnodeSession: boolean;
  probeEntryAccess(
    signal?: AbortSignal,
  ): Promise<
    | { readonly state: "restricted" }
    | { readonly state: "accessible"; readonly checkpoint: string }
  >;
  readonly packages: Readonly<{
    kiosk?: string;
    personalKiosk?: string;
    originByte?: Readonly<{
      discoveryPackage: string;
      executionPackage: string;
    }>;
    name?: Readonly<{
      packageId: string;
      forwardRegistry: string;
      reverseRegistry: string;
    }>;
  }>;
  resolveRecipientName(
    name: string,
    signal?: AbortSignal,
  ): Promise<WalletNameResolution | null>;
  readDefaultName(
    address: string,
    signal?: AbortSignal,
  ): Promise<WalletNameResolution | null>;
  readonly message?: string;
  prepareTransaction(
    transaction: Transaction,
    sender: string,
    signal?: AbortSignal,
  ): Promise<WalletPreparedTransaction>;
  simulateTransaction(
    bytesBase64: string,
    sender: string,
    signal?: AbortSignal,
  ): Promise<WalletSimulationResult>;
  readTransactionDetails(
    digest: string,
    signal?: AbortSignal,
  ): Promise<WalletTransactionDetails | null>;
  readAccountHistory(
    address: string,
    signal?: AbortSignal,
  ): Promise<WalletAccountHistory>;
  readFreshObject(
    id: string,
    signal?: AbortSignal,
  ): Promise<WalletFreshObject | null>;
  readFreshCoins(
    owner: string,
    coinType: string,
    signal?: AbortSignal,
  ): Promise<readonly RtdClientTypes.Coin[]>;
  readFreshBalance(
    owner: string,
    coinType: string,
    signal?: AbortSignal,
  ): Promise<RtdClientTypes.Balance>;
  /** Current funds, independent of the indexed asset snapshot; never execution authority. */
  readFreshBalances(
    owner: string,
    signal?: AbortSignal,
  ): Promise<readonly RtdClientTypes.Balance[]>;
  openAssetSnapshot(signal?: AbortSignal): Promise<WalletAssetSnapshot>;
  refreshAssets(): Promise<void>;
}

export const WalletRpcContext = createContext<WalletRpc | null>(null);

export function useWalletRpc(): WalletRpc {
  const value = useContext(WalletRpcContext);
  if (!value) throw new Error("缺少钱包数据服务 Provider");
  return value;
}
