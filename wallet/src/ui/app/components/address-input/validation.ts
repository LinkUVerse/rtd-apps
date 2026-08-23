// Copyright (c) LinkU Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { useRtdNSEnabled } from 'rtd-apps-core';
import { useI18n } from '_app/i18n';
import { useRtdClient } from 'rtd-dapp-kit';
import { type RtdClient } from 'rtd-typescript/client';
import { isValidRtdAddress, isValidRtdNSName } from 'rtd-typescript/utils';
import { useMemo } from 'react';
import * as Yup from 'yup';

const CACHE_EXPIRY_TIME = 60 * 1000; // 1 minute in milliseconds

type AddressValidationMessages = {
	required: string;
	invalid: string;
};

export function createRtdAddressValidation(
	client: RtdClient,
	rtdNSEnabled: boolean,
	messages: AddressValidationMessages,
) {
	const resolveCache = new Map<string, { valid: boolean; expiry: number }>();

	const currentTime = Date.now();
	return Yup.string()
		.ensure()
		.trim()
		.required(messages.required)
		.test('is-rtd-address', messages.invalid, async (value) => {
			if (rtdNSEnabled && isValidRtdNSName(value)) {
				if (resolveCache.has(value)) {
					const cachedEntry = resolveCache.get(value)!;
					if (currentTime < cachedEntry.expiry) {
						return cachedEntry.valid;
					} else {
						resolveCache.delete(value); // Remove expired entry
					}
				}

				const address = await client.resolveNameServiceAddress({
					name: value,
				});

				resolveCache.set(value, {
					valid: !!address,
					expiry: currentTime + CACHE_EXPIRY_TIME,
				});

				return !!address;
			}

			return isValidRtdAddress(value);
		});
}

export function useRtdAddressValidation() {
	const { t } = useI18n();
	const client = useRtdClient();
	const rtdNSEnabled = useRtdNSEnabled();

	return useMemo(() => {
		return createRtdAddressValidation(client, rtdNSEnabled, {
			required: t('validation.required'),
			invalid: t('validation.invalidAddress'),
		});
	}, [client, rtdNSEnabled, t]);
}
