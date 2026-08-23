// Copyright (c) LinkU Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { Check12 } from 'rtd-apps-icons';
import * as RadixCheckbox from '@radix-ui/react-checkbox';
import { forwardRef } from 'react';
import type { ComponentProps, ReactNode } from 'react';

type CheckboxProps = {
	label: ReactNode;
} & Omit<ComponentProps<typeof RadixCheckbox.Root>, 'className' | 'ref' | 'id'>;

export const Checkbox = forwardRef<HTMLButtonElement, CheckboxProps>(
	({ label, ...props }, forwardedRef) => (
		<div className="flex min-h-11 items-center gap-2.5">
			<RadixCheckbox.Root
				className="group peer inline-flex min-h-11 min-w-11 appearance-none items-center justify-center border-0 bg-transparent p-0 m-0 cursor-pointer"
				ref={forwardedRef}
				id={props.name}
				{...props}
			>
				<div className="theme-input group-data-[state=checked]:bg-success group-data-[state=checked]:border-success h-5 w-5 border-steel disabled:border-hero-darkest/10 border border-solid rounded flex items-center justify-center">
					<Check12 className="text-hero-darkest/10 group-data-[state=checked]:text-white text-body font-semibold" />
				</div>
			</RadixCheckbox.Root>
			<label
				className="text-body text-steel-dark peer-data-[state=checked]:text-steel-darker peer-disabled:text-gray-60 font-medium"
				htmlFor={props.name}
			>
				{label}
			</label>
		</div>
	),
);
