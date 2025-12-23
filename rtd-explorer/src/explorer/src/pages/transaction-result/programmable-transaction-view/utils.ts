// Copyright (c) LinkU Labs, Inc.
// SPDX-License-Identifier: Apache-2.0
import { type RtdArgument } from "rtd-typescript/client";

export function flattenRtdArguments(data: (RtdArgument | RtdArgument[])[]): string {
	if (!data) {
		return "";
	}

	return data
		.map((value) => {
			if (value === "GasCoin") {
				return value;
			} else if (Array.isArray(value)) {
				return `[${flattenRtdArguments(value)}]`;
			} else if (value === null) {
				return "Null";
			} else if (typeof value === "object") {
				if ("Input" in value) {
					return `Input(${value.Input})`;
				} else if ("Result" in value) {
					return `Result(${value.Result})`;
				} else if ("NestedResult" in value) {
					return `NestedResult(${value.NestedResult[0]}, ${value.NestedResult[1]})`;
				}
			} else {
				throw new Error("Not a correct flattenable data");
			}
			return "";
		})
		.join(", ");
}
