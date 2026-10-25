// Copyright (c) LinkU Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import clsx from "clsx";

import { useI18n } from "~/i18n";

type BrandMarkProps = {
	tone?: "dark" | "light";
	compact?: boolean;
	className?: string;
};

/**
 * RTD Explorer identity: a faceted block glyph with an amber consensus node,
 * followed by the wordmark. The glyph is inline SVG so it inherits the tone of
 * the surface it sits on.
 */
export function BrandMark({ tone = "dark", compact = false, className }: BrandMarkProps) {
	const light = tone === "light";
	const { t } = useI18n();
	return (
		<span className={clsx("flex items-center gap-3", className)}>
			<span
				className={clsx(
					"grid h-10 w-10 shrink-0 place-items-center rounded-2xl border shadow-lift",
					light
						? "border-white/20 bg-white/10 text-white"
						: "border-white/70 bg-ink text-white",
				)}
			>
				<svg viewBox="0 0 24 24" fill="none" className="h-6 w-6" aria-hidden="true">
					<path
						d="M12 2.8 20.2 7.4v9.2L12 21.2 3.8 16.6V7.4L12 2.8Z"
						stroke="currentColor"
						strokeWidth="1.5"
						strokeLinejoin="round"
					/>
					<path
						d="M12 7.6 16.4 10v4.2L12 16.6 7.6 14.2V10L12 7.6Z"
						fill="currentColor"
						opacity="0.22"
					/>
					<circle cx="12" cy="2.8" r="1.5" fill="#F59E0B" />
					<circle cx="3.8" cy="16.6" r="1.3" fill="currentColor" opacity="0.55" />
					<circle cx="20.2" cy="16.6" r="1.3" fill="currentColor" opacity="0.55" />
				</svg>
			</span>
			{!compact && (
				<span className="flex min-w-0 flex-col gap-0.5">
					<span
						className={clsx(
							"text-[17px] font-semibold leading-none tracking-[-0.01em]",
							light ? "text-white" : "text-ink",
						)}
					>
						RTD Explorer
					</span>
					<span
						className={clsx(
							"font-mono text-[9px] font-semibold uppercase leading-none tracking-[0.18em]",
							light ? "text-white/50" : "text-steel-dark",
						)}
					>
						{t("ARCHIVE · FULLNODE")}
					</span>
				</span>
			)}
		</span>
	);
}
