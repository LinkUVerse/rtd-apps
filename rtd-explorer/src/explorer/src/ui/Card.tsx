// Copyright (c) LinkU Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { cva, type VariantProps } from "class-variance-authority";
import clsx from "clsx";
import { type ReactNode } from "react";

const cardStyles = cva(
	"overflow-hidden rounded-3xl border border-white/70 bg-white/80 shadow-card backdrop-blur-xl",
	{
		variants: {
			bg: {
				default: "",
				highlight: "bg-success-light",
				lightBlue: "bg-rtd/10",
				white: "bg-white",
				"white/80": "bg-white/80",
			},
			height: {
				full: "h-full",
			},
			width: {
				full: "w-full",
			},
			rounded: {
				lg: "rounded-lg",
				xl: "rounded-xl",
				"2xl": "rounded-2xl",
				"3xl": "rounded-3xl",
				"4xl": "rounded-4xl",
			},
			spacing: {
				none: "",
				sm: "px-5 py-4",
				md: "p-5",
				lg: "p-6",
				lgGraph: "p-6 pb-4",
			},
			border: {
				gray45: "border border-gray-45",
				steel: "border border-steel",
			},
			shadow: {
				true: "shadow-md",
			},
			growOnHover: {
				true: "transition-all duration-200 hover:-translate-y-0.5 hover:border-rtd-light hover:shadow-lift",
			},
		},
		defaultVariants: {
			bg: "default",
			spacing: "md",
			rounded: "3xl",
		},
	},
);

export type CardProps = {
	children?: ReactNode;
	className?: string;
} & VariantProps<typeof cardStyles>;

export function Card({
	spacing,
	rounded,
	bg,
	border,
	shadow,
	children,
	height,
	width,
	growOnHover,
	className,
}: CardProps) {
	return (
		<div
			className={clsx(
				cardStyles({
					spacing,
					rounded,
					bg,
					border,
					shadow,
					height,
					width,
					growOnHover,
				}),
				className,
			)}
		>
			{children}
		</div>
	);
}
