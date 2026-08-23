// Copyright (c) LinkU Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { cva, type VariantProps } from 'class-variance-authority';

const badgeStyle = cva(['nova-badge w-max'], {
	variants: {
		variant: {
			warning: 'nova-badge--warning',
			success: 'nova-badge--success',
		},
	},
});

export interface BadgeProps extends VariantProps<typeof badgeStyle> {
	label: string;
}

export function Badge({ label, ...styles }: BadgeProps) {
	return <div className={badgeStyle(styles)}>{label}</div>;
}
