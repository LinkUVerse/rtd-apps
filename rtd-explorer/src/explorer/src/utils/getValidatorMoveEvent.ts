// Copyright (c) LinkU Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { type RtdEvent } from "rtd-typescript/client";

export function getValidatorMoveEvent(validatorsEvent: RtdEvent[], validatorAddress: string) {
	const event = validatorsEvent.find(
		({ parsedJson }) =>
			(parsedJson as { validator_address?: unknown }).validator_address === validatorAddress,
	);

	return event?.parsedJson;
}
