// Copyright (c) LinkU Labs, Inc.
// SPDX-License-Identifier: Apache-2.0
import { describe, expect, it } from "vitest";
import {
  stakingTotals,
  estimatedEpochStart,
  estimatedCurrentEpochEnd,
  stakeSharePercent,
} from "rtd-apps-core/src/rpc/staking-view";
import type {
  StakePosition,
  WalletStakingView,
} from "rtd-apps-core/src/rpc/staking-types";
const position = (change: Partial<StakePosition> = {}): StakePosition => ({
  objectId: "id",
  version: "1",
  digest: "digest",
  poolId: "pool",
  validatorAddress: "validator",
  principal: "9007199254740993",
  activationEpoch: "2",
  requestEpoch: "1",
  status: "active",
  poolState: "active",
  reward: {
    state: "estimated",
    amount: "4503599627370497",
    usedDefaultActivationRate: false,
  },
  ...change,
});
const view = {
  epoch: "2",
  safeMode: false,
  epochStartTimestampMs: "1700000000000",
  epochDurationMs: "60000",
} as WalletStakingView;
describe("staking display preserves known and unknown boundaries", () => {
  it("only a locally current epoch interval supports a new transaction schedule", () => {
    expect(estimatedCurrentEpochEnd(view, 1700000000000)).toBe(1700000060000);
    expect(estimatedCurrentEpochEnd(view, 1700000059999)).toBe(1700000060000);
    expect(estimatedCurrentEpochEnd(view, 1700000060000)).toBeNull();
    expect(estimatedCurrentEpochEnd(view, 1700000060001)).toBeNull();
    expect(estimatedCurrentEpochEnd(view, 1699999999999)).toBeNull();
  });
  it("unknown or unsafe epoch timing never produces a current schedule", () => {
    for (const now of [NaN, Infinity, -1, 1.5, Number.MAX_SAFE_INTEGER + 1])
      expect(estimatedCurrentEpochEnd(view, now)).toBeNull();
    expect(estimatedCurrentEpochEnd({ ...view, safeMode: true }, 1700000000000)).toBeNull();
    expect(estimatedCurrentEpochEnd({ ...view, epochDurationMs: "0" }, 1700000000000)).toBeNull();
    expect(estimatedCurrentEpochEnd({ ...view, epochDurationMs: "18446744073709551615" }, 1700000000000)).toBeNull();
  });
  it("sums exact principal/rewards and deduplicates validators", () => {
    expect(stakingTotals([position(), position()])).toEqual({
      principal: 18014398509481986n,
      rewards: 9007199254740994n,
      validators: 1,
    });
  });
  it("unknown rate prevents publishing a partial reward total", () => {
    expect(
      stakingTotals([
        position(),
        position({
          reward: { state: "unknown", reason: "missing-current-rate" },
        }),
      ]).rewards,
    ).toBeNull();
  });
  it("unresolved pool does not invent a validator count", () => {
    expect(
      stakingTotals([
        position({
          validatorAddress: null,
          poolState: "unresolved",
          reward: { state: "unknown", reason: "pool-unresolved" },
        }),
      ]),
    ).toMatchObject({ validators: null, rewards: null });
  });
  it("pending has not earned rewards; an admitted empty account really totals zero", () => {
    expect(
      stakingTotals([
        position({
          status: "pending",
          reward: { state: "unknown", reason: "pending" },
        }),
      ]).rewards,
    ).toBe(0n);
    expect(stakingTotals([])).toEqual({
      principal: 0n,
      rewards: 0n,
      validators: 0,
    });
  });
  it("future activation gets a display-only estimate; safe mode and past epochs do not", () => {
    expect(estimatedEpochStart(view, "3")).toBe(1700000060000);
    expect(estimatedEpochStart({ ...view, safeMode: true }, "3")).toBeNull();
    expect(estimatedEpochStart(view, "2")).toBeNull();
  });
  it("unrepresentable timestamp, zero duration and malformed epoch cannot become a timer", () => {
    expect(estimatedEpochStart(view, "18446744073709551615")).toBeNull();
    expect(
      estimatedEpochStart({ ...view, epochDurationMs: "0" }, "3"),
    ).toBeNull();
    expect(estimatedEpochStart(view, "3.5")).toBeNull();
  });
  it("share rounds after exact division, keeping original u64 stake out of Number", () => {
    expect(stakeSharePercent("9007199254740993", 18014398509481986n)).toBe(50);
    expect(stakeSharePercent("1", 3n)).toBe(33.33);
    expect(stakeSharePercent("0", 0n)).toBeNull();
    expect(() => stakeSharePercent("2", 1n)).toThrow();
  });
});
