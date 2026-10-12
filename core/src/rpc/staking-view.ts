// Copyright (c) LinkU Labs, Inc.
// SPDX-License-Identifier: Apache-2.0
import type { StakePosition, WalletStakingView } from "./staking-types";

export function stakingTotals(positions: readonly StakePosition[]) {
  let principal = 0n,
    rewards = 0n;
  let rewardKnown = true;
  let validatorsKnown = true;
  const validators = new Set<string>();
  for (const position of positions) {
    principal += BigInt(position.principal);
    if (position.validatorAddress) validators.add(position.validatorAddress);
    else validatorsKnown = false;
    if (position.reward.state === "estimated")
      rewards += BigInt(position.reward.amount);
    else if (position.reward.reason !== "pending") rewardKnown = false;
  }
  return {
    principal,
    rewards: rewardKnown ? rewards : null,
    validators: validatorsKnown ? validators.size : null,
  };
}
/** Display estimate only: no conversion of epoch or timestamp until known to fit a JS timer. */
export function estimatedEpochStart(
  view: WalletStakingView,
  epoch: string,
): number | null {
  if (view.safeMode || !/^(0|[1-9][0-9]{0,19})$/.test(epoch)) return null;
  const target = BigInt(epoch),
    current = BigInt(view.epoch);
  if (target <= current) return null;
  const duration = BigInt(view.epochDurationMs);
  if (duration === 0n) return null;
  const timestamp =
    BigInt(view.epochStartTimestampMs) + (target - current) * duration;
  return timestamp <= BigInt(Number.MAX_SAFE_INTEGER)
    ? Number(timestamp)
    : null;
}
/** An indexed epoch that has already ended cannot describe a new transaction's schedule. */
export function estimatedCurrentEpochEnd(
  view: WalletStakingView,
  now = Date.now(),
): number | null {
  if (!Number.isSafeInteger(now) || now < 0) return null;
  const end = estimatedEpochStart(view, (BigInt(view.epoch) + 1n).toString());
  if (
    end === null ||
    end <= now ||
    BigInt(view.epochStartTimestampMs) > BigInt(now)
  ) return null;
  return end;
}
export function stakeSharePercent(part: string, total: bigint): number | null {
  if (total <= 0n) return null;
  const amount = BigInt(part);
  if (amount < 0n || amount > total) throw new Error("验证者质押份额不合法");
  // Only the bounded, rounded percentage is converted to Number, never stake balances.
  return Number((amount * 10000n + total / 2n) / total) / 100;
}
