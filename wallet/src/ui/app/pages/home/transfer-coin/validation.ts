// Copyright (c) LinkU Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { createRtdAddressValidation } from '_components/address-input/validation';
import { createTokenValidation } from '_src/shared/validation';
import { type RtdClient } from 'rtd-typescript/client';
import * as Yup from 'yup';

export function createValidationSchemaStepOne(
	client: RtdClient,
	rtdNSEnabled: boolean,
	...args: Parameters<typeof createTokenValidation>
) {
	return Yup.object({
		to: createRtdAddressValidation(client, rtdNSEnabled),
		amount: createTokenValidation(...args),
	});
}
