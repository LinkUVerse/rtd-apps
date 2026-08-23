// Copyright (c) LinkU Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { Text } from '_app/shared/text';
import { ChevronDown12 } from 'rtd-apps-icons';
import * as SelectPrimitive from '@radix-ui/react-select';
import { forwardRef } from 'react';

const Select = SelectPrimitive.Root;
const SelectValue = SelectPrimitive.Value;

const SelectTrigger = forwardRef<
	React.ElementRef<typeof SelectPrimitive.Trigger>,
	React.ComponentPropsWithoutRef<typeof SelectPrimitive.Trigger>
>(({ className, children, ...props }, ref) => (
	<SelectPrimitive.Trigger
		ref={ref}
		className="nova-input flex items-center justify-between gap-2 font-medium cursor-pointer disabled:cursor-default group"
		{...props}
	>
		{children}
		<SelectPrimitive.Icon asChild>
			<ChevronDown12 className="transition text-steel group-hover:text-steel-darker group-active:text-steel-dark group-disabled:text-gray-45" />
		</SelectPrimitive.Icon>
	</SelectPrimitive.Trigger>
));
SelectTrigger.displayName = SelectPrimitive.Trigger.displayName;

const SelectContent = forwardRef<
	React.ElementRef<typeof SelectPrimitive.Content>,
	React.ComponentPropsWithoutRef<typeof SelectPrimitive.Content>
>(({ className, children, ...props }, ref) => (
	<SelectPrimitive.Portal>
		<SelectPrimitive.Content
			ref={ref}
			className="z-[99999] min-w-[112px] bg-transparent"
			{...props}
		>
			<SelectPrimitive.Viewport className="nova-card p-1.5">
				{children}
			</SelectPrimitive.Viewport>
		</SelectPrimitive.Content>
	</SelectPrimitive.Portal>
));
SelectContent.displayName = SelectPrimitive.Content.displayName;

const SelectItem = forwardRef<
	React.ElementRef<typeof SelectPrimitive.Item>,
	React.ComponentPropsWithoutRef<typeof SelectPrimitive.Item>
>(({ className, children, ...props }, ref) => (
	<SelectPrimitive.Item
		ref={ref}
		className="transition flex min-h-10 items-center text-steel-dark cursor-pointer px-2.5 py-2 outline-none rounded-lg hover:text-steel-darker hover:bg-rtd-lightest"
		{...props}
	>
		<SelectPrimitive.ItemText>
			<Text variant="body" weight="semibold">
				{children}
			</Text>
		</SelectPrimitive.ItemText>
	</SelectPrimitive.Item>
));
SelectItem.displayName = SelectPrimitive.Item.displayName;

export { Select, SelectTrigger, SelectContent, SelectItem, SelectValue };
