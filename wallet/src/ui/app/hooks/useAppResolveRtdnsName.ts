// Copyright (c) LinkU Labs, Inc.
// SPDX-License-Identifier: Apache-2.0
import { useFeatureIsOn } from '@growthbook/growthbook-react';
import { normalizeRtdNSName } from 'rtd-typescript/utils';

import { useResolveRtdNSName as useResolveRtdNSNameCore } from '../../../../../core';

export function useResolveRtdNSName(address?: string) {
	const enableNewRtdnsFormat = useFeatureIsOn('wallet-enable-new-rtdns-name-format');
	const { data } = useResolveRtdNSNameCore(address);
	return data ? normalizeRtdNSName(data, enableNewRtdnsFormat ? 'at' : 'dot') : undefined;
}
