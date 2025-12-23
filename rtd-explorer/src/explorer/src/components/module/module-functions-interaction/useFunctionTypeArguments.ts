// Copyright (c) LinkU Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { useMemo } from "react";

import type { RtdMoveAbilitySet } from "rtd-typescript/client";

export function useFunctionTypeArguments(typeArguments: RtdMoveAbilitySet[]) {
	return useMemo(
		() =>
			typeArguments.map(
				(aTypeArgument, index) =>
					`T${index}${
						aTypeArgument.abilities.length ? `: ${aTypeArgument.abilities.join(" + ")}` : ""
					}`,
			),
		[typeArguments],
	);
}
