// Copyright (c) LinkU Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { cva, cx, type VariantProps } from 'class-variance-authority';
import clsx from 'clsx';
import { forwardRef, type ComponentProps, type ReactNode } from 'react';

const styles = cva(
	[
		'nova-pill outline-0 flex flex-row items-center gap-1.5 group',
		'w-full min-w-0 normal-case',
		'hover:text-hero hover:bg-rtd-light hover:border-rtd',
		'focus:text-hero focus:bg-rtd-light focus:border-rtd',
		'active:text-steel active:bg-gray-45 active:border-transparent',
		'disabled:text-gray-60 disabled:bg-transparent disabled:border-transparent',
	],
	{
		variants: {
			bgOnHover: {
				blueLight: ['text-hero'],
				grey: ['text-steel-dark'],
			},
		},
		defaultVariants: {
			bgOnHover: 'blueLight',
		},
	},
);

export interface ButtonConnectedToProps
	extends
		VariantProps<typeof styles>,
		Omit<ComponentProps<'button'>, 'ref' | 'className'> {
	iconBefore?: ReactNode;
	text?: ReactNode;
	iconAfter?: ReactNode;
	truncate?: boolean;
}

export const ButtonConnectedTo = forwardRef<
	HTMLButtonElement,
	ButtonConnectedToProps
>(({ bgOnHover, iconBefore, iconAfter, text, truncate, ...rest }, ref) => {
	return (
		<button {...rest} ref={ref} className={styles({ bgOnHover })}>
			<div className="flex">{iconBefore}</div>
			<div
				className={clsx(
					'min-w-0 overflow-hidden whitespace-nowrap',
					truncate && 'truncate',
				)}
			>
				{text}
			</div>
			<div
				className={cx(
					'flex',
					bgOnHover === 'grey'
						? 'text-steel group-hover:text-inherit group-focus:text-inherit group-active::text-inherit'
						: null,
				)}
			>
				{iconAfter}
			</div>
		</button>
	);
});
