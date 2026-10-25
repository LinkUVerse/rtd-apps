// Copyright (c) LinkU Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { format, formatDistance } from "date-fns";
import { Heading, Text } from "@linku/ui";
import clsx from "clsx";

import { useDateLocale, useI18n } from "~/i18n";
import { getElapsedTime, useEpochProgress } from "~/pages/epochs/utils";
import { Card } from "~/ui/Card";
import { ProgressBar } from "~/ui/ProgressBar";

export type EpochProgressProps = {
	epoch?: string;
	start: number;
	end?: number;
	inProgress?: boolean;
};

export function EpochProgress({ epoch, start, end, inProgress }: EpochProgressProps) {
	const { t } = useI18n();
	const dateLocale = useDateLocale();
	const { progress, end: progressEnd } = useEpochProgress();

	const elapsedTime = !inProgress && start && end ? getElapsedTime(start, end) : undefined;
	const remainingLabel = progressEnd
		? progressEnd > Date.now()
			? t("Ends in {time}", {
					time: formatDistance(progressEnd, new Date(), { locale: dateLocale }),
			  })
			: t("Ending soon")
		: null;

	return (
		<Card bg={inProgress ? "highlight" : "default"} spacing="lg" rounded="2xl">
			<div className="flex flex-col space-y-12">
				<div className={clsx(inProgress ? "space-y-4" : "space-y-6")}>
					<div className="flex flex-col gap-2">
						<Heading color="steel-darker" variant="heading3/semibold">
							{inProgress
								? t("Epoch {epoch} in progress", { epoch: epoch ?? "" })
								: t("Epoch {epoch}", { epoch: epoch ?? "" })}
						</Heading>
						{elapsedTime && (
							<Heading variant="heading6/medium" color="steel-darker">
								{elapsedTime}
							</Heading>
						)}
					</div>
					<div>
						<Text variant="pSubtitleSmall/normal" uppercase color="steel-darker">
							{t("Start")}
						</Text>
						<Text variant="pSubtitle/semibold" color="steel-darker">
							{format(start, "PPpp", { locale: dateLocale })}
						</Text>
					</div>
					{!inProgress && end ? (
						<div>
							<Text variant="pSubtitleSmall/normal" uppercase color="steel-darker">
								{t("End")}
							</Text>
							<Text variant="pSubtitle/semibold" color="steel-darker">
								{format(end, "PPpp", { locale: dateLocale })}
							</Text>
						</div>
					) : null}
				</div>
				{inProgress ? (
					<div className="space-y-2">
						<Heading variant="heading6/medium" color="steel-darker">
							{remainingLabel ?? "—"}
						</Heading>
						<ProgressBar animate progress={progress || 0} />
					</div>
				) : null}
			</div>
		</Card>
	);
}
