// Copyright (c) LinkU Labs, Inc.
// SPDX-License-Identifier: Apache-2.0
export type StakingReward =
  | {
      readonly state: "estimated";
      readonly amount: string;
      readonly usedDefaultActivationRate: boolean;
    }
  | {
      readonly state: "unknown";
      readonly reason:
        | "missing-current-rate"
        | "zero-current-rate"
        | "overflow"
        | "pool-unresolved"
        | "pending";
    };
export type StakingApy =
  | {
      readonly state: "estimated";
      readonly fraction: number;
      readonly sampleCount: number;
    }
  | {
      readonly state: "unknown";
      readonly reason:
        | "insufficient-history"
        | "no-valid-samples"
        | "inactive-pool";
    };
export interface WalletValidator {
  readonly address: string;
  readonly name: string;
  readonly description: string;
  readonly imageUrl: string;
  readonly projectUrl: string;
  readonly poolId: string;
  readonly active: boolean;
  readonly votingPower: string;
  readonly commissionBps: string;
  readonly stakeBalance: string;
  readonly activationEpoch: string | null;
  readonly deactivationEpoch: string | null;
  readonly atRiskEpochs: string | null;
  readonly apy: StakingApy;
}
export interface StakePosition {
  readonly objectId: string;
  readonly version: string;
  readonly digest: string;
  readonly poolId: string;
  readonly validatorAddress: string | null;
  readonly principal: string;
  readonly activationEpoch: string;
  readonly requestEpoch: string;
  readonly status: "pending" | "active";
  readonly poolState: "active" | "inactive" | "unresolved";
  readonly reward: StakingReward;
}
export interface WalletStakingView {
  readonly epoch: string;
  readonly safeMode: boolean;
  readonly protocolVersion: string;
  readonly referenceGasPrice: string;
  readonly epochStartTimestampMs: string;
  readonly epochDurationMs: string;
  readonly subsidyStartEpoch: string;
  readonly totalStake: string;
  readonly validators: readonly WalletValidator[];
  /** Null means no owner was requested, not an empty account portfolio. */
  readonly positions: readonly StakePosition[] | null;
}
