// Copyright (c) LinkU Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { describe, expect, it } from "vitest";

import { flattenRtdArguments } from "~/pages/transaction-result/programmable-transaction-view/utils";

describe("utils.ts", () => {
	describe("flattenCommandData", () => {
		it("should format SplitCoin data", () => {
			expect(flattenRtdArguments(["GasCoin", { Input: 1 }])).toEqual("GasCoin, Input(1)");
			expect(flattenRtdArguments(["GasCoin", { Result: 2 }])).toEqual("GasCoin, Result(2)");
			expect(flattenRtdArguments(["GasCoin", { NestedResult: [1, 2] }])).toEqual(
				"GasCoin, NestedResult(1, 2)",
			);
		});
		it("should format TransferObjects data", () => {
			expect(
				flattenRtdArguments([
					[
						{
							Result: 0,
						},
						{
							Result: 1,
						},
						{
							Result: 2,
						},
						{
							Result: 3,
						},
						{
							Result: 4,
						},
					],
					{
						Input: 0,
					},
				]),
			).toEqual("[Result(0), Result(1), Result(2), Result(3), Result(4)], Input(0)");
		});
		it("should flatten MergeCoinsRtdTransaction data", () => {
			expect(
				flattenRtdArguments([
					{
						Input: 0,
					},
					[
						{
							Result: 0,
						},
						{
							Result: 1,
						},
						{
							Result: 2,
						},
						{
							Result: 3,
						},
						{
							Result: 4,
						},
					],
				]),
			).toEqual("Input(0), [Result(0), Result(1), Result(2), Result(3), Result(4)]");
		});
	});
});
