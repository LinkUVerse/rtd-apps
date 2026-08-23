// Copyright (c) LinkU Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

// TODO: replace all the existing button usages (the current Button component or button) with this
// TODO: rename this to Button when the existing Button component is removed

import { cva, type VariantProps } from 'class-variance-authority';
import { forwardRef, type ReactNode, type Ref } from 'react';

import { ButtonOrLink, type ButtonOrLinkProps } from './utils/ButtonOrLink';

const styles = cva(
	[
		'nova-button no-underline outline-none group',
		'flex flex-row flex-nowrap items-center justify-center gap-2',
		'max-w-full min-w-0 w-full',
	],
	{
		variants: {
			variant: {
				primary: 'nova-button--primary',
				secondary: 'nova-button--secondary',
				secondaryRtd: 'nova-button--secondary-rtd',
				outline: 'nova-button--outline',
				outlineWarning: 'nova-button--outline-warning',
				warning: 'nova-button--warning',
				plain: 'nova-button--plain',
				hidden: 'nova-button--hidden h-full',
			},
			size: {
				tall: 'nova-button--tall',
				narrow: 'nova-button--narrow',
				xs: 'nova-button--xs',
				icon: 'nova-button--icon h-full w-full',
			},
		},
	},
);
const iconStyles = cva('flex shrink-0 text-current', {
	variants: {
		border: {
			none: 'border-none',
		},
		variant: {
			primary: 'text-current',
			secondary: 'text-current',
			secondaryRtd: 'text-current',
			outline: 'text-current',
			outlineWarning: 'text-current',
			warning: 'text-current',
			plain: [],
			hidden: [],
		},
	},
});

export interface ButtonProps
	extends
		VariantProps<typeof styles>,
		VariantProps<typeof iconStyles>,
		Omit<ButtonOrLinkProps, 'className'> {
	before?: ReactNode;
	after?: ReactNode;
	text?: ReactNode;
}

export const Button = forwardRef(
	(
		{
			variant = 'primary',
			size = 'narrow',
			before,
			after,
			text,
			...otherProps
		}: ButtonProps,
		ref: Ref<HTMLAnchorElement | HTMLButtonElement>,
	) => {
		return (
			<ButtonOrLink
				ref={ref}
				className={styles({ variant, size })}
				{...otherProps}
			>
				{before ? (
					<div className={iconStyles({ variant })}>{before}</div>
				) : null}
				{text ? <div className="nova-button__label">{text}</div> : null}
				{after ? <div className={iconStyles({ variant })}>{after}</div> : null}
			</ButtonOrLink>
		);
	},
);
