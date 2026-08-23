// Copyright (c) LinkU Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import LoadingIndicator from '_components/loading/LoadingIndicator';
import clsx from 'clsx';
import { forwardRef, type ReactNode, type Ref } from 'react';

import { ButtonOrLink, type ButtonOrLinkProps } from './utils/ButtonOrLink';

function Decorator({
	disabled,
	children,
}: {
	disabled?: boolean;
	children: ReactNode;
}) {
	return (
		<div
			className={clsx(
				'text-heading2 bg-transparent text-center flex shrink-0 justify-center text-inherit',
				disabled && 'opacity-60',
			)}
		>
			{children}
		</div>
	);
}

interface LargeButtonProps extends ButtonOrLinkProps {
	children: ReactNode;
	loading?: boolean;
	before?: ReactNode;
	after?: ReactNode;
	top?: ReactNode;
	spacing?: string;
	center?: boolean;
	disabled?: boolean;
	primary?: boolean;
}

export const LargeButton = forwardRef(
	(
		{
			top,
			before,
			after,
			center,
			spacing,
			loading,
			disabled,
			children,
			primary,
			className,
			...otherProps
		}: LargeButtonProps,
		ref: Ref<HTMLAnchorElement | HTMLButtonElement>,
	) => {
		return (
			<ButtonOrLink
				ref={ref}
				disabled={disabled}
				{...otherProps}
				className={clsx(
					'nova-action-card group justify-between',
					primary && 'nova-action-card--primary',
					spacing === 'sm' && '!p-3',
					className,
				)}
			>
				{loading && (
					<div className="p-2 w-full flex justify-center items-center h-full">
						<LoadingIndicator />
					</div>
				)}
				{!loading && (
					<div
						className={clsx(
							'flex min-w-0 items-center w-full gap-2.5',
							center && 'justify-center',
						)}
					>
						{before && <Decorator disabled={disabled}>{before}</Decorator>}
						<div className="flex min-w-0 flex-col">
							{top && <Decorator disabled={disabled}>{top}</Decorator>}
							<div
								className={clsx(
									'nova-action-card__label',
									disabled && 'opacity-60',
								)}
							>
								{children}
							</div>
						</div>
						{after && (
							<div className="ml-auto">
								<Decorator disabled={disabled}>{after}</Decorator>
							</div>
						)}
					</div>
				)}
			</ButtonOrLink>
		);
	},
);
