// Copyright (c) LinkU Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { Text } from '_app/shared/text';
import { formatDate } from '_helpers';
import { useI18n } from '_app/i18n';

type DateCardProps = {
	timestamp: number;
	size: 'sm' | 'md';
};

export function DateCard({ timestamp, size }: DateCardProps) {
	const { locale } = useI18n();
	const txnDate = formatDate(
		timestamp,
		['month', 'day', 'hour', 'minute'],
		locale,
	);

	return (
		<Text
			color="steel-dark"
			weight={size === 'sm' ? 'medium' : 'normal'}
			variant={size === 'sm' ? 'subtitleSmallExtra' : 'pBodySmall'}
		>
			<span className="whitespace-nowrap tabular-nums">{txnDate}</span>
		</Text>
	);
}
