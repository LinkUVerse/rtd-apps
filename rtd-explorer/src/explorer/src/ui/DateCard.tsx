// Copyright (c) LinkU Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { formatDate } from "rtd-apps-core";
import { Text } from "@linku/ui";

export type DateCardProps = {
	date: Date | number;
};

// TODO - add format options
export function DateCard({ date }: DateCardProps) {
	const dateStr = formatDate(date, ["month", "day", "year", "hour", "minute"]);

	if (!dateStr) {
		return null;
	}

	return (
		<Text variant="bodySmall/semibold" color="steel-dark">
			<time dateTime={new Date(date).toISOString()}>{dateStr}</time>
		</Text>
	);
}
