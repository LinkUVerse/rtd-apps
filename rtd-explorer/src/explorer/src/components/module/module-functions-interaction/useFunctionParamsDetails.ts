// Copyright (c) LinkU Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { useMemo } from "react";

import { getNormalizedFunctionParameterTypeDetails } from "../utils";

import type { RtdMoveNormalizedType } from "rtd-typescript/client";

export function useFunctionParamsDetails(
	params: RtdMoveNormalizedType[],
	functionTypeArgNames?: string[],
) {
	return useMemo(
		() =>
			params
				.map((aParam) => getNormalizedFunctionParameterTypeDetails(aParam, functionTypeArgNames))
				.filter(({ isTxContext }) => !isTxContext),
		[params, functionTypeArgNames],
	);
}
