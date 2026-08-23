// Copyright (c) LinkU Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { cva, type VariantProps } from 'class-variance-authority';
import type { ReactNode } from 'react';

const cardContentStyle = cva([], {
	variants: {
		variant: {
			white: 'theme-surface',
			gray: 'bg-rtd-lightest',
		},
		padding: {
			none: 'p-0',
			small: 'p-3.5',
		},
		titleDivider: {
			true: 'border-t border-t-gray-45 border-solid border-0 border-transparent',
		},
	},
	defaultVariants: {
		variant: 'white',
		padding: 'small',
	},
});

export interface CardProps extends VariantProps<typeof cardContentStyle> {
	header?: ReactNode;
	footer?: ReactNode;
	children?: ReactNode;
}

export function Card({ header, footer, children, ...styleProps }: CardProps) {
	return (
		<div
			className={'nova-card box-border overflow-hidden flex flex-col w-full'}
		>
			{header && (
				<div className="bg-rtd-lightest flex items-center justify-center">
					{header}
				</div>
			)}
			<div className={cardContentStyle(styleProps)}>
				{children}
				{footer && (
					<div className={'flex flex-col pt-0 justify-center w-full'}>
						{children && (
							<span className="h-px bg-gray-45 w-full px-4 mb-3.5"></span>
						)}
						<div className="flex justify-between">{footer}</div>
					</div>
				)}
			</div>
		</div>
	);
}

export { CardItem } from './CardItem';
