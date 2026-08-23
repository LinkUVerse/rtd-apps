// Copyright (c) LinkU Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { cva, type VariantProps } from 'class-variance-authority';
import { forwardRef, type ReactNode, type Ref } from 'react';

import { ButtonOrLink, type ButtonOrLinkProps } from './utils/ButtonOrLink';

const styles = cva(
	[
		'nova-pill outline-none truncate',
		'disabled:cursor-default disabled:opacity-50',
	],
	{
		variants: {
			loading: {
				true: 'opacity-70',
				false: '',
			},
			dark: {
				true: 'text-steel-darker',
				false: 'text-hero-dark hover:bg-rtd-light focus:bg-rtd-light',
			},
		},
		defaultVariants: {
			dark: false,
		},
	},
);

export interface PillProps
	extends
		Omit<VariantProps<typeof styles>, 'loading'>,
		Omit<ButtonOrLinkProps, 'className'> {
	before?: ReactNode;
	after?: ReactNode;
	text?: ReactNode;
}

export const Pill = forwardRef(
	(
		{ before, after, text, loading, dark, ...otherProps }: PillProps,
		ref: Ref<HTMLAnchorElement | HTMLButtonElement>,
	) => (
		<ButtonOrLink
			className={styles({ loading, dark })}
			{...otherProps}
			loading={loading}
			ref={ref}
		>
			{text}
		</ButtonOrLink>
	),
);
