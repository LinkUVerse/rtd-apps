// Copyright (c) LinkU Labs, Inc.
// SPDX-License-Identifier: Apache-2.0
import { describe, expect, it } from "vitest";
import {
  estimateStakingReward,
  estimateStakingApy,
  type StakingRate,
} from "./staking-rates";
const rate = (epoch: string, tokens: string, rtd: string): StakingRate => ({
  epoch,
  poolTokenAmount: tokens,
  rtdAmount: rtd,
});
const reward = (
  principal = "3",
  rates = [rate("1", "1", "1"), rate("2", "2", "3")],
  activationEpoch = "1",
  currentEpoch = "2",
) => estimateStakingReward({ principal, rates, activationEpoch, currentEpoch });
describe("staking reward rational semantics", () => {
  it.each([
    ["1", "1"],
    ["2", "1"],
    ["3", "2"],
    ["9007199254740993", "4503599627370497"],
    ["18446744073709551615", "9223372036854775808"],
  ])(
    "principal %s rounds half up without f64 conversion",
    (principal, amount) => {
      expect(reward(principal)).toEqual({
        state: "estimated",
        amount,
        usedDefaultActivationRate: false,
      });
    },
  );
  it("missing activation epoch inside observed range inherits the older rate", () => {
    expect(
      reward("3", [rate("1", "1", "1"), rate("4", "2", "3")], "3", "4"),
    ).toMatchObject({ amount: "2", usedDefaultActivationRate: false });
  });
  it.each(["0", "3"])(
    "missing activation %s outside observed range uses Rust default ratio one",
    (activation) => {
      expect(reward("3", undefined, activation, "3")).toMatchObject({
        amount: "2",
        usedDefaultActivationRate: true,
      });
    },
  );
  it("empty current table is unknown rather than a fabricated zero reward", () => {
    expect(reward("3", [])).toEqual({
      state: "unknown",
      reason: "missing-current-rate",
    });
  });
  it("actual loss is zero, while a zero current denominator in the ratio is unknown", () => {
    expect(
      reward("3", [rate("1", "1", "1"), rate("2", "2", "1")]),
    ).toMatchObject({ amount: "0" });
    expect(reward("3", [rate("2", "0", "1")])).toEqual({
      state: "unknown",
      reason: "zero-current-rate",
    });
  });
  it("zero RTD amount means rate one even when pool tokens are not zero", () => {
    expect(
      reward("3", [rate("1", "7", "0"), rate("2", "2", "3")]),
    ).toMatchObject({ amount: "2" });
  });
  it("result outside u64 is explicit overflow rather than saturated fake money", () => {
    expect(
      reward("18446744073709551615", [
        rate("1", "1", "1"),
        rate("2", "1", "3"),
      ]),
    ).toEqual({ state: "unknown", reason: "overflow" });
  });
  it.each([
    "01",
    "-1",
    "1.5",
    "18446744073709551616",
    "Infinity",
    9007199254740992,
  ])("rejects noncanonical principal %s", (principal) => {
    expect(() => reward(principal as string)).toThrow();
  });
  it("pending activation never reports an earned estimate", () =>
    expect(() => reward("3", undefined, "3")).toThrow("尚未激活"));
  it("duplicate and future epochs reject the entire table", () => {
    for (const rates of [
      [rate("1", "1", "1"), rate("1", "2", "3")],
      [rate("3", "1", "1")],
    ])
      expect(() => reward("3", rates)).toThrow("未来或重复");
  });
});

/** Small explicit expansion of the pinned Rust algorithm; used only as an independent test oracle. */
function rustStyleApy(rows: StakingRate[], subsidy: number) {
  const observed = new Map(
    rows.map((r) => [
      Number(r.epoch),
      Number(r.rtdAmount) === 0
        ? 1
        : Number(r.poolTokenAmount) / Number(r.rtdAmount),
    ]),
  );
  const epochs = [...observed.keys()];
  let previous = 1;
  const filled: number[] = [];
  for (let epoch = Math.min(...epochs); epoch <= Math.max(...epochs); epoch++) {
    previous = observed.get(epoch) ?? previous;
    if (epoch >= subsidy) filled.push(previous);
  }
  filled.reverse();
  const samples: number[] = [];
  for (let i = 1; i < filled.length && samples.length < 30; i++) {
    const apy = (filled[i] / filled[i - 1]) ** 365 - 1;
    if (apy > 0 && apy < 0.1) samples.push(apy);
  }
  return samples;
}
describe("staking APY source semantics", () => {
  it("epoch zero/one point has no historical estimate", () => {
    expect(
      estimateStakingApy({
        rates: [rate("0", "1", "1")],
        currentEpoch: "0",
        subsidyStartEpoch: "0",
      }),
    ).toEqual({ state: "unknown", reason: "insufficient-history" });
  });
  it("flat/negative/outlier history never propagates NaN or presents a zero estimate", () => {
    for (const rows of [
      [rate("0", "1", "1"), rate("1", "1", "1")],
      [rate("0", "1", "1"), rate("1", "2", "1")],
      [rate("0", "1", "1"), rate("1", "1", "2")],
    ])
      expect(
        estimateStakingApy({
          rates: rows,
          currentEpoch: "1",
          subsidyStartEpoch: "0",
        }),
      ).toEqual({ state: "unknown", reason: "no-valid-samples" });
  });
  it.each([0, 1, 2, 5, 9, 10])(
    "safe-mode gaps and subsidy cutoff %s equal explicit Rust-style backfill",
    (subsidy) => {
      const rates = [
        rate("0", "100000", "100000"),
        rate("3", "100000", "100010"),
        rate("8", "100000", "100020"),
        rate("10", "100000", "100030"),
      ];
      const samples = rustStyleApy(rates, subsidy);
      const result = estimateStakingApy({
        rates,
        currentEpoch: "10",
        subsidyStartEpoch: String(subsidy),
      });
      if (samples.length) {
        expect(result).toMatchObject({
          state: "estimated",
          sampleCount: samples.length,
        });
        if (result.state === "estimated")
          expect(result.fraction).toBeCloseTo(
            samples.reduce((a, b) => a + b, 0) / samples.length,
            14,
          );
      } else expect(result.state).toBe("unknown");
    },
  );
  it("takes the newest 30 valid samples, not the last 30 epochs including zero samples", () => {
    const rates = Array.from({ length: 50 }, (_, i) =>
      rate(String(i * 2), "100000", String(100000 + i * 10)),
    );
    const samples = rustStyleApy(rates, 0),
      result = estimateStakingApy({
        rates,
        currentEpoch: "98",
        subsidyStartEpoch: "0",
      });
    expect(result).toMatchObject({ state: "estimated", sampleCount: 30 });
    if (result.state === "estimated")
      expect(result.fraction).toBeCloseTo(
        samples.reduce((a, b) => a + b, 0) / 30,
        14,
      );
  });
  it("a u64-wide epoch gap does not allocate a u64-sized array", () => {
    expect(
      estimateStakingApy({
        rates: [
          rate("0", "100000", "100000"),
          rate("18446744073709551615", "100000", "100010"),
        ],
        currentEpoch: "18446744073709551615",
        subsidyStartEpoch: "0",
      }),
    ).toMatchObject({ state: "estimated", sampleCount: 1 });
  });
});
