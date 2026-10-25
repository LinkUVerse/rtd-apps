// Copyright (c) LinkU Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { format, formatDistance, isToday, isYesterday } from "date-fns";
import { useMemo } from "react";

import { useDateLocale, useI18n } from "~/i18n";
import { useEpochProgress } from "~/pages/epochs/utils";
import { Card } from "~/ui/Card";
import { ProgressBar } from "~/ui/ProgressBar";
import { LinkWithQuery } from "~/ui/utils/LinkWithQuery";

function formatEpochLabel(epoch: string | number | undefined) {
	if (epoch === undefined || epoch === null) return "—";
	return Number(epoch).toLocaleString("en-US");
}

export function CurrentEpoch() {
	const { epoch, progress, end, start } = useEpochProgress();
	const { t } = useI18n();
	const dateLocale = useDateLocale();

	const formattedDateString = useMemo(() => {
		if (!start) return null;
		const epochStartDate = new Date(start);
		const day = isToday(epochStartDate)
			? t("Today")
			: isYesterday(epochStartDate)
			? t("Yesterday")
			: format(epochStartDate, "PPP", { locale: dateLocale });
		return `${format(epochStartDate, "p", { locale: dateLocale })}, ${day}`;
	}, [start, t, dateLocale]);

	const timelineLabel = end
		? end > Date.now()
			? t("Ends in {time}", {
					time: formatDistance(end, new Date(), { locale: dateLocale }),
			  })
			: t("Ending soon")
		: null;

	return (
		<LinkWithQuery to={`/epoch/${epoch}`} className="focus-ring block h-full rounded-3xl">
			<Card growOnHover bg="white/80" height="full" spacing="lg" className="flex flex-col">
				<div className="flex items-start justify-between gap-3">
					<div className="section-kicker">{t("Current epoch")}</div>
					<span className="inline-flex items-center gap-1.5 rounded-full border border-rtd-light bg-rtd-lightest px-2.5 py-1 font-mono text-[10px] font-semibold uppercase tracking-[0.1em] text-rtd-dark">
						<span className="h-1.5 w-1.5 animate-pulse rounded-full bg-rtd" />
						{t("Live")}
					</span>
				</div>

				<div className="mt-4 flex items-end justify-between gap-3">
					<div className="mono-num text-[36px] font-semibold leading-none tracking-[-0.03em] text-ink">
						{formatEpochLabel(epoch)}
					</div>
					<div className="pb-0.5 font-mono text-[10px] uppercase tracking-[0.12em] text-steel">
						{t("Epoch")}
					</div>
				</div>

				<div className="mt-6 space-y-2">
					<div className="flex items-center justify-between text-[12px]">
						<span className="font-medium text-steel-dark">
							{formattedDateString
								? t("Started {time}", { time: formattedDateString })
								: t("Awaiting epoch data")}
						</span>
						<span className="font-mono text-[10px] uppercase tracking-[0.1em] text-rtd-dark">
							{timelineLabel ?? "—"}
						</span>
					</div>
					<ProgressBar animate progress={progress || 0} />
				</div>

				<div className="mt-auto flex items-center justify-between border-t border-line/70 pt-4">
					<span className="font-mono text-[10px] uppercase tracking-[0.12em] text-steel">
						{t("Epoch timeline")}
					</span>
					<span className="text-[12px] font-semibold text-rtd-dark">
						{t("View epoch →")}
					</span>
				</div>
			</Card>
		</LinkWithQuery>
	);
}
