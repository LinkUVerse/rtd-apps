// Copyright (c) LinkU Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { forwardRef } from 'react';
import type { ComponentProps } from 'react';

type TextAreaProps = Omit<ComponentProps<'textarea'>, 'className' | 'ref'>;

export const TextArea = forwardRef<HTMLTextAreaElement, TextAreaProps>(
	(props, forwardedRef) => (
		<textarea
			className="nova-input min-h-[96px] resize-none font-medium"
			ref={forwardedRef}
			{...props}
		/>
	),
);
