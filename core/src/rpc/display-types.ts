// Copyright (c) LinkU Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

/** Source identity and continuous publication coverage; not a portable certificate. */
export interface WalletDisplayHistoryCoverage {
  readonly genesisDigest: string;
  readonly sourceId: string;
  readonly generation: string;
  readonly firstCheckpoint: string;
  readonly lastCheckpoint: string;
  readonly lastCheckpointDigest: string;
  readonly snapshotCheckpoint: string;
  readonly snapshotCheckpointDigest: string;
}

export interface WalletDisplayHistoryCapability {
  readonly apiVersion: 1;
  readonly supportedTemplateKinds: readonly ("V1" | "V2")[];
  readonly coverage: WalletDisplayHistoryCoverage;
}

interface DisplayBasis {
  readonly snapshotCheckpoint: string;
  readonly objectType: string;
  readonly templateId: string;
  readonly sourceCheckpoint: string;
  readonly historyCoverage: WalletDisplayHistoryCoverage;
}

export type WalletDisplayBasis =
  | (DisplayBasis & {
      readonly kind: "V1";
      readonly publishedVersion: number;
      readonly sourceCheckpointDigest: string;
      readonly transactionDigest: string;
      readonly checkpointTransactionIndex: string;
      readonly eventIndex: string;
      readonly eventBcsSha256: string;
    })
  | (DisplayBasis & {
      readonly kind: "V2";
      readonly objectVersion: string;
      readonly objectDigest: string;
      readonly previousTransactionDigest: string;
      readonly contentsBcsSha256: string;
    });
