// Copyright (c) LinkU Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { useI18n, type MessageKey } from '_app/i18n';
import { cva, type VariantProps } from 'class-variance-authority';
import { useEffect, useState } from 'react';

const timeStyle = cva([], {
	variants: {
		variant: {
			body: 'text-body',
			bodySmall: 'text-bodySmall',
		},
		color: {
			'steel-dark': 'text-steel-dark',
			'steel-darker': 'text-steel-darker',
		},
		weight: {
			medium: 'font-medium',
			semibold: 'font-semibold',
		},
	},
	defaultVariants: {
		variant: 'body',
		color: 'steel-dark',
		weight: 'semibold',
	},
});

export interface CountDownTimerProps extends VariantProps<typeof timeStyle> {
	timestamp: number | undefined;
	label?: string;
	endLabel?: string;
}

export function CountDownTimer({
	timestamp,
	label,
	endLabel,
	...styles
}: CountDownTimerProps) {
	const { t } = useI18n();
	const resolvedEndLabel = endLabel ?? t('staking.now');
	const [now, setNow] = useState(() => Date.now());

	useEffect(() => {
		const timer = window.setInterval(() => setNow(Date.now()), 1_000);
		return () => window.clearInterval(timer);
	}, []);

	const remaining = timestamp ? Math.max(0, timestamp - now) : 0;
	const totalSeconds = Math.floor(remaining / 1_000);
	const formatPart = (value: number, unit: 'hour' | 'minute' | 'second') =>
		value
			? t(`time.${unit}${value === 1 ? '' : 's'}` as MessageKey, {
					count: value,
				})
			: '';
	const duration = (() => {
		if (!totalSeconds) return resolvedEndLabel;
		if (totalSeconds >= 3_600) {
			return [
				formatPart(Math.floor(totalSeconds / 3_600), 'hour'),
				formatPart(Math.floor((totalSeconds % 3_600) / 60), 'minute'),
			]
				.filter(Boolean)
				.join(' ');
		}
		return [
			formatPart(Math.floor(totalSeconds / 60), 'minute'),
			formatPart(totalSeconds % 60, 'second'),
		]
			.filter(Boolean)
			.join(' ');
	})();

	return (
		<div className={timeStyle(styles)}>
			<span className="whitespace-nowrap tabular-nums">
				{duration === resolvedEndLabel ? '' : label} {duration}
			</span>
		</div>
	);
}
