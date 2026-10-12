// Copyright (c) LinkU Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

/** Same rate direction as PoolTokenExchangeRate::rate(): pool tokens / RTD. */
export interface StakingRate {
  readonly epoch: string;
  readonly rtdAmount: string;
  readonly poolTokenAmount: string;
}
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
        | "overflow";
    };
export type StakingApy =
  | {
      readonly state: "estimated";
      readonly fraction: number;
      readonly sampleCount: number;
    }
  | {
      readonly state: "unknown";
      readonly reason: "insufficient-history" | "no-valid-samples";
    };
const MAX_U64 = (1n << 64n) - 1n;
function u64(value: string) {
  if (typeof value !== "string" || !/^(0|[1-9][0-9]{0,19})$/.test(value))
    throw new Error("质押数据不是规范 u64");
  const result = BigInt(value);
  if (result > MAX_U64) throw new Error("质押数据超出 u64");
  return result;
}
interface Rate {
  epoch: bigint;
  tokens: bigint;
  rtd: bigint;
}
/** Sort and validate the complete admitted table. Never allocate one entry per missing epoch. */
function table(input: readonly StakingRate[], currentEpoch: string): Rate[] {
  const current = u64(currentEpoch);
  if (input.length > 10_000) throw new Error("质押汇率表超出读取预算");
  const rows = input.map((row) => ({
    epoch: u64(row.epoch),
    tokens: u64(row.poolTokenAmount),
    rtd: u64(row.rtdAmount),
  }));
  rows.sort((a, b) => (a.epoch > b.epoch ? -1 : a.epoch < b.epoch ? 1 : 0));
  for (let i = 0; i < rows.length; i++) {
    if (
      rows[i].epoch > current ||
      (i > 0 && rows[i].epoch === rows[i - 1].epoch)
    )
      throw new Error("质押汇率表含未来或重复 epoch");
  }
  return rows;
}
function rational(rate: Rate | undefined) {
  // Rust Default is (0,0); rate() is 1 whenever RTD amount is zero.
  return !rate || rate.rtd === 0n
    ? { numerator: 1n, denominator: 1n }
    : { numerator: rate.tokens, denominator: rate.rtd };
}
export function estimateStakingReward(input: {
  principal: string;
  activationEpoch: string;
  currentEpoch: string;
  rates: readonly StakingRate[];
}): StakingReward {
  const principal = u64(input.principal),
    activation = u64(input.activationEpoch),
    current = u64(input.currentEpoch);
  if (activation > current) throw new Error("尚未激活的仓位不能估算已获得奖励");
  const rates = table(input.rates, input.currentEpoch);
  if (!rates.length)
    return { state: "unknown", reason: "missing-current-rate" };
  // backfill_rates copies the previous observed rate, only between table min and max.
  const activationRate =
    activation <= rates[0].epoch
      ? rates.find((rate) => rate.epoch <= activation)
      : undefined;
  const start = rational(activationRate),
    end = rational(rates[0]);
  if (end.numerator === 0n)
    return { state: "unknown", reason: "zero-current-rate" };
  const numerator =
    start.numerator * end.denominator - end.numerator * start.denominator;
  const denominator = start.denominator * end.numerator;
  const scaled = numerator <= 0n ? 0n : numerator * principal;
  // Rust round is halfway away from zero; negative rewards are clamped to zero first.
  const rounded = (scaled * 2n + denominator) / (2n * denominator);
  if (rounded > MAX_U64) return { state: "unknown", reason: "overflow" };
  return {
    state: "estimated",
    amount: rounded.toString(),
    usedDefaultActivationRate: !activationRate,
  };
}
export function estimateStakingApy(input: {
  rates: readonly StakingRate[];
  currentEpoch: string;
  subsidyStartEpoch: string;
}): StakingApy {
  const rates = table(input.rates, input.currentEpoch),
    subsidy = u64(input.subsidyStartEpoch);
  const maximum = rates[0]?.epoch;
  const minimum = rates.at(-1)?.epoch;
  if (
    maximum === undefined ||
    minimum === undefined ||
    maximum <= (minimum > subsidy ? minimum : subsidy)
  )
    return { state: "unknown", reason: "insufficient-history" };
  const samples: number[] = [];
  // Missing epochs inherit the older rate. All the inserted identical pairs have APY=0
  // and are filtered by the Rust rule; only observed change boundaries can contribute.
  for (let i = 0; i + 1 < rates.length && samples.length < 30; i++) {
    const newer = rates[i],
      older = rates[i + 1];
    if (newer.epoch <= subsidy) break;
    const previous = rational(older),
      next = rational(newer);
    const previousFloat =
      Number(previous.numerator) / Number(previous.denominator);
    const nextFloat = Number(next.numerator) / Number(next.denominator);
    const apy = Math.pow(previousFloat / nextFloat, 365) - 1;
    if (Number.isFinite(apy) && apy > 0 && apy < 0.1) samples.push(apy);
  }
  return samples.length
    ? {
        state: "estimated",
        fraction:
          samples.reduce((sum, sample) => sum + sample, 0) / samples.length,
        sampleCount: samples.length,
      }
    : { state: "unknown", reason: "no-valid-samples" };
}
