// Copyright (c) LinkU Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import clsx from "clsx";

import { useI18n, type Locale } from "~/i18n";

const OPTIONS: { value: Locale; label: string }[] = [
	{ value: "en", label: "EN" },
	{ value: "zh", label: "中文" },
];

export function LanguageToggle() {
	const { locale, setLocale, t } = useI18n();

	return (
		<div
			role="group"
			aria-label={t("Language")}
			className="flex h-10 shrink-0 items-center rounded-full border border-line/80 bg-white/70 p-0.5 shadow-sm backdrop-blur"
		>
			{OPTIONS.map(({ value, label }) => {
				const active = locale === value;
				return (
					<button
						key={value}
						type="button"
						onClick={() => setLocale(value)}
						aria-pressed={active}
						className={clsx(
							"focus-ring rounded-full px-2.5 py-1.5 text-[11px] font-semibold leading-none transition-colors duration-150",
							active
								? "bg-ink text-white shadow-sm"
								: "text-steel-dark hover:text-ink",
						)}
					>
						{label}
					</button>
				);
			})}
		</div>
	);
}
