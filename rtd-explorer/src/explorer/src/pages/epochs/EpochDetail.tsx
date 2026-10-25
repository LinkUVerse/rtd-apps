// Copyright (c) LinkU Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { useFormatCoin } from "rtd-apps-core";
import { useExplorerQuery, useExplorerClientContext, useExplorerClient } from "~/rpc/explorer-client";
import { RTD_TYPE_ARG } from "rtd-typescript/utils";
import { LoadingIndicator } from "@linku/ui";
import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import { useParams } from "react-router-dom";

import { EpochProgress } from "./stats/EpochProgress";
import { EpochStats } from "./stats/EpochStats";
import { ValidatorStatus } from "./stats/ValidatorStatus";
import { validatorsTableData } from "../validators/Validators";
import { PageLayout } from "~/components/Layout/PageLayout";
import { CheckpointsTable } from "~/components/checkpoints/CheckpointsTable";
import { useI18n } from "~/i18n";
import { Banner } from "~/ui/Banner";
import { Stats, type StatsProps } from "~/ui/Stats";
import { TableCard } from "~/ui/TableCard";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "~/ui/Tabs";
import { getEpochStorageFundFlow } from "~/utils/getStorageFundFlow";

function RtdStats({
	amount,
	...props
}: Omit<StatsProps, "children"> & {
	amount: bigint | number | string | undefined | null;
}) {
	const [formattedAmount, symbol] = useFormatCoin(amount, RTD_TYPE_ARG);

	return (
		<Stats postfix={formattedAmount && symbol} {...props}>
			{formattedAmount || "--"}
		</Stats>
	);
}

export default function EpochDetail() {
	const { id } = useParams();
	const { t } = useI18n();
	const client = useExplorerClient();
	const {network} = useExplorerClientContext();
	const { data: systemState } = useExplorerQuery("getLatestRtdSystemState");
	const { data, isPending, isError } = useQuery({
		queryKey: ["epoch", network, id],
		queryFn: async ({signal}) => client.getEpoch({ id: id!, signal }),
	});

	const epochData = data;
	const isCurrentEpoch = useMemo(
		() => systemState?.epoch === epochData?.epoch,
		[systemState, epochData],
	);

	const validatorsTable = useMemo(() => {
		if (!epochData?.validators) return null;
		// todo: enrich this historical validator data when we have
		// at-risk / pending validators for historical epochs
		return validatorsTableData(
			[...epochData.validators].sort(() => 0.5 - Math.random()),
			[],
			[],
			null,
			t,
		);
	}, [epochData, t]);

	if (isPending) return <PageLayout content={<LoadingIndicator />} />;

	if (isError || !epochData)
		return (
			<PageLayout
				content={
					<Banner variant="error" fullWidth>
						{t("There was an issue retrieving data for epoch {id}.", { id: id ?? "" })}
					</Banner>
				}
			/>
		);

	const { fundInflow, fundOutflow, netInflow } = getEpochStorageFundFlow(epochData.endOfEpochInfo);

	// cursor should be the sequence number of the last checkpoint + 1  if we want to query with desc. order
	const initialCursorPlusOne = epochData.endOfEpochInfo?.lastCheckpointId
		? (BigInt(epochData.endOfEpochInfo.lastCheckpointId) + 1n).toString()
		: undefined;

	return (
		<PageLayout
			content={
				<div className="flex flex-col space-y-16">
					<div className="grid grid-flow-row gap-4 sm:gap-2 md:flex md:gap-6">
						<div className="flex min-w-[136px] max-w-[240px]">
							<EpochProgress
								epoch={epochData.epoch}
								inProgress={isCurrentEpoch}
								start={Number(epochData.epochStartTimestamp)}
								end={Number(epochData.endOfEpochInfo?.epochEndTimestamp ?? 0)}
							/>
						</div>

						<EpochStats label={t("Rewards")}>
							<RtdStats
								label={t("Total Stake")}
								tooltip=""
								amount={epochData.endOfEpochInfo?.totalStake}
							/>
							<RtdStats
								label={t("Stake Subsidies")}
								amount={epochData.endOfEpochInfo?.stakeSubsidyAmount}
							/>
							<RtdStats
								label={t("Stake Rewards")}
								amount={epochData.endOfEpochInfo?.totalStakeRewardsDistributed}
							/>
							<RtdStats label={t("Gas Fees")} amount={epochData.endOfEpochInfo?.totalGasFees} />
						</EpochStats>

						<EpochStats label={t("Storage Fund Balance")}>
							<RtdStats label={t("Fund Size")} amount={epochData.endOfEpochInfo?.storageFundBalance} />
							<RtdStats label={t("Net Inflow")} amount={netInflow} />
							<RtdStats label={t("Fund Inflow")} amount={fundInflow} />
							<RtdStats label={t("Fund Outflow")} amount={fundOutflow} />
						</EpochStats>

						{isCurrentEpoch ? <ValidatorStatus /> : null}
					</div>

					<Tabs size="lg" defaultValue="checkpoints">
						<TabsList>
							<TabsTrigger value="checkpoints">{t("Checkpoints")}</TabsTrigger>
							<TabsTrigger value="validators">{t("Participating Validators")}</TabsTrigger>
						</TabsList>
						<TabsContent value="checkpoints">
							<CheckpointsTable
								initialCursor={initialCursorPlusOne}
								maxCursor={epochData.firstCheckpointId}
								initialLimit={20}
							/>
						</TabsContent>
						<TabsContent value="validators">
							{validatorsTable ? (
								<TableCard
									data={validatorsTable.data}
									columns={validatorsTable.columns}
									sortTable
								/>
							) : null}
						</TabsContent>
					</Tabs>
				</div>
			}
		/>
	);
}
