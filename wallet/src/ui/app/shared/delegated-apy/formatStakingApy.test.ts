import { expect, it } from "vitest";
import { formatStakingApy } from "./formatStakingApy";

it("keeps missing or invalid samples unknown instead of showing zero", () => {
  for (const value of [null, NaN, Infinity, -0.01, 0, 0.1])
    expect(formatStakingApy(value)).toBe("--");
});
it("converts fraction once and marks rounded positive values as approximate", () => {
  expect(formatStakingApy(0.037)).toBe("3.7%");
  expect(formatStakingApy(3.5770019835013045e-8)).toBe("~0%");
  expect(formatStakingApy(0.000006, 2)).toBe("~0%");
  expect(formatStakingApy(0.000006, 3)).toBe("0.001%");
  expect(formatStakingApy(null, 2, "-")).toBe("-");
});
