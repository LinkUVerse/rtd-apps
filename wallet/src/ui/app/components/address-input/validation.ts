// Copyright (c) LinkU Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { useRtdNSEnabled } from 'rtd-apps-core';
import { useRtdClient } from 'rtd-dapp-kit';
import { type RtdClient } from 'rtd-typescript/client';
import { isValidRtdAddress, isValidRtdNSName } from 'rtd-typescript/utils';
import { useMemo } from 'react';
import * as Yup from 'yup';

const CACHE_EXPIRY_TIME = 60 * 1000; // 1 minute in milliseconds

export function createRtdAddressValidation(client: RtdClient, rtdNSEnabled: boolean) {
	const resolveCache = new Map<string, { valid: boolean; expiry: number }>();

	const currentTime = Date.now();
	return Yup.string()
		.ensure()
		.trim()
		.required()
		.test('is-rtd-address', 'Invalid address. Please check again.', async (value) => {
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
		})
		.label("Recipient's address");
}

export function useRtdAddressValidation() {
	const client = useRtdClient();
	const rtdNSEnabled = useRtdNSEnabled();

	return useMemo(() => {
		return createRtdAddressValidation(client, rtdNSEnabled);
	}, [client, rtdNSEnabled]);
}
