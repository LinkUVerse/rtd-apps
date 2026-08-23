// Copyright (c) LinkU Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { forwardRef } from 'react';
import type { ComponentProps } from 'react';

type InputProps = Omit<ComponentProps<'input'>, 'className'>;

export const Input = forwardRef<HTMLInputElement, InputProps>(
	(props, forwardedRef) => (
		<input
			className="nova-input peer font-medium"
			ref={forwardedRef}
			{...props}
		/>
	),
);
