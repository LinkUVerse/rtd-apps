// Copyright (c) LinkU Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { createRtdAddressValidation } from '_components/address-input/validation';
import { type MessageKey, type MessageValues } from '_app/i18n';
import { type RtdClient } from 'rtd-typescript/client';
import * as Yup from 'yup';

export function createValidationSchema(
	client: RtdClient,
	rtdNSEnabled: boolean,
	senderAddress: string,
	objectId: string,
	t: (key: MessageKey, values?: MessageValues) => string,
) {
	return Yup.object({
		to: createRtdAddressValidation(client, rtdNSEnabled, {
			required: t('validation.required'),
			invalid: t('validation.invalidAddress'),
		})
			.test(
				'sender-address',
				t('validation.nftOwnedByAddress'),
				(value) => senderAddress !== value,
			)
			.test(
				'nft-sender-address',
				t('validation.nftRecipientDifferent'),
				(value) => objectId !== value,
			),
	});
}
