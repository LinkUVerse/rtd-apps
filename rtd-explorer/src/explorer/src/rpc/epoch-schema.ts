// Copyright (c) LinkU Labs, Inc.
// SPDX-License-Identifier: Apache-2.0
import { z } from "zod";

// RTD crates/rtd-json-rpc-types/src/rtd_extended.rs; these APIs are RTD extensions.
const u64 = z
  .string()
  .regex(/^(0|[1-9][0-9]*)$/)
  .refine(
    (value) =>
      /^(0|[1-9][0-9]*)$/.test(value) && BigInt(value) <= 18446744073709551615n,
  );
export const epochValidatorSchema = z
  .object({
    name: z.string(),
    imageUrl: z.string(),
    rtdAddress: z.string(),
    stakingPoolRtdBalance: u64,
    nextEpochGasPrice: u64,
    commissionRate: u64,
    votingPower: u64,
  })
  .passthrough();
const end = z
  .object({
    lastCheckpointId: u64,
    epochEndTimestamp: u64,
    protocolVersion: u64,
    referenceGasPrice: u64,
    totalStake: u64,
    storageFundReinvestment: u64,
    storageCharge: u64,
    storageRebate: u64,
    storageFundBalance: u64,
    stakeSubsidyAmount: u64,
    totalGasFees: u64,
    totalStakeRewardsDistributed: u64,
    leftoverStorageFundInflow: u64,
  })
  .passthrough();
export const epochSchema = z
  .object({
    epoch: u64,
    validators: z.array(epochValidatorSchema),
    epochTotalTransactions: u64,
    firstCheckpointId: u64,
    epochStartTimestamp: u64,
    endOfEpochInfo: end.nullable(),
    referenceGasPrice: z
      .number()
      .int()
      .nonnegative()
      .max(Number.MAX_SAFE_INTEGER)
      .nullable(),
  })
  .passthrough();
export const epochPageSchema = z
  .object({
    data: z.array(epochSchema),
    nextCursor: u64.nullable(),
    hasNextPage: z.boolean(),
  })
  .refine(
    (page) =>
      !page.hasNextPage || (page.data.length > 0 && page.nextCursor !== null),
    { message: "Next epoch page requires nonempty data and a cursor" },
  );
export type ExplorerEpochInfo = z.infer<typeof epochSchema>;
export type ExplorerEpochPage = z.infer<typeof epochPageSchema>;
export type ExplorerEndOfEpochInfo = z.infer<typeof end>;

export const epochRequestSchema = z.object({
  cursor: u64.nullable().default(null),
  limit: z
    .number()
    .int()
    .positive()
    .max(Number.MAX_SAFE_INTEGER)
    .nullable()
    .default(null),
  descendingOrder: z.boolean().default(false),
});
