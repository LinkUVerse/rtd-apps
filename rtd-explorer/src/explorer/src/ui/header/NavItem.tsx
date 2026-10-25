// Copyright (c) LinkU Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { forwardRef, type ComponentProps, type ReactNode } from "react";

export type NavItemProps = {
	beforeIcon?: ReactNode;
	afterIcon?: ReactNode;
	children: ReactNode;
} & ComponentProps<"button">;

export const NavItem = forwardRef<HTMLButtonElement, NavItemProps>(
	({ children, beforeIcon, afterIcon, ...props }, ref) => (
		<button
			ref={ref}
			type="button"
			className="focus-ring flex h-10 cursor-pointer items-center gap-2 rounded-full border border-line/80 bg-white/70 px-3.5 py-2 text-[13px] font-semibold text-ink shadow-sm outline-none backdrop-blur transition-colors hover:border-rtd-light hover:bg-white ui-open:border-rtd-light ui-open:bg-white"
			{...props}
		>
			{beforeIcon}
			{children}
			{afterIcon}
		</button>
	),
);
