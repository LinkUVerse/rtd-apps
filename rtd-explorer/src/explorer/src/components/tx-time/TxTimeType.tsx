// Copyright (c) LinkU Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { useTimeAgo } from "rtd-apps-core";
import { format, formatDistanceToNowStrict } from "date-fns";

import { useDateLocale, useI18n } from "~/i18n";

type Prop = {
	timestamp: number | undefined;
};

export function TxTimeType({ timestamp }: Prop) {
	const timeAgo = useTimeAgo({
		timeFrom: timestamp || null,
		shortedTimeLabel: true,
	});
	const { locale } = useI18n();
	const dateLocale = useDateLocale();

	if (!timestamp) {
		return (
			<section>
				<div className="w-20 text-caption">{timeAgo}</div>
			</section>
		);
	}

	const display =
		locale === "zh"
			? formatDistanceToNowStrict(timestamp, { addSuffix: true, locale: dateLocale })
			: timeAgo;
	const fullDate = format(timestamp, "PPpp", { locale: dateLocale });

	return (
		<section title={fullDate}>
			<div className="w-20 text-caption">{display}</div>
		</section>
	);
}
