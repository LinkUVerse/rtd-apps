// Copyright (c) LinkU Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { useFeatureValue, type JSONValue } from '@growthbook/growthbook-react';
import { useMemo } from 'react';
import { normalizeStructTag } from 'rtd-typescript/utils';
import { z } from 'zod';
import { dynamicType } from '_src/shared/rpc/dynamic-fields';

const configSchema = z.object({
	enabled: z.boolean(),
	objectType: z.string().refine(value => {
		try { normalizeStructTag(dynamicType(value)); return true; }
		catch { return false; }
	}),
	sheetTitle: z.string(),
	sheetDescription: z.string(),
	homeDescription: z.string(),
	homeImage: z.string(),
	backgroundColor: z.string(),
});
type BuyNLargeConfig = z.infer<typeof configSchema>;

/** Remote merchandising configuration must not break the ordinary owned-asset query or classification. */
export function decodeBuyNLargeConfig(value: unknown): BuyNLargeConfig[] {
	if (!Array.isArray(value)) return [];
	return value.flatMap(entry => {
		const parsed = configSchema.safeParse(entry);
		return parsed.success ? [parsed.data] : [];
	});
}

export function useConfig() {
	const value = useFeatureValue<JSONValue>('buynlargev2', []);
	return useMemo(() => decodeBuyNLargeConfig(value), [value]);
}
