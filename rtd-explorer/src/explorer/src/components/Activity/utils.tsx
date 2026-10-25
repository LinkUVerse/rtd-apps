// Copyright (c) LinkU Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { type ExplorerEpochPage } from "~/rpc/epoch-schema";
import { Text } from "@linku/ui";

import { RtdAmount } from "../Table/RtdAmount";
import { TxTimeType } from "../tx-time/TxTimeType";
import { HighlightedTableCol } from "~/components/Table/HighlightedTableCol";
import type { Translate } from "~/i18n";
import { CheckpointSequenceLink, EpochLink } from "~/ui/InternalLink";
import { getEpochStorageFundFlow } from "~/utils/getStorageFundFlow";

const identity: Translate = (source) => source;

// Generate table data from the epochs data
export const genTableDataFromEpochsData = (
	results: ExplorerEpochPage,
	t: Translate = identity,
) => ({
	data: results?.data.map((epoch) => ({
		epoch: (
			<HighlightedTableCol first>
				<EpochLink epoch={epoch.epoch.toString()} />
			</HighlightedTableCol>
		),
		transactions: <Text variant="bodySmall/medium">{epoch.epochTotalTransactions}</Text>,
		stakeRewards: <RtdAmount amount={epoch.endOfEpochInfo?.totalStakeRewardsDistributed} />,
		checkpointSet: (
			<div>
				<CheckpointSequenceLink sequence={epoch.firstCheckpointId.toString()} />
				{" - "}
				<CheckpointSequenceLink
					sequence={epoch.endOfEpochInfo?.lastCheckpointId.toString() ?? ""}
				/>
			</div>
		),
		storageNetInflow: (
			<div className="pl-3">
				<RtdAmount amount={getEpochStorageFundFlow(epoch.endOfEpochInfo).netInflow} />
			</div>
		),
		time: <TxTimeType timestamp={Number(epoch.endOfEpochInfo?.epochEndTimestamp ?? 0)} />,
	})),
	columns: [
		{
			header: t("Epoch"),
			accessorKey: "epoch",
		},
		{
			header: t("Transaction Blocks"),
			accessorKey: "transactions",
		},
		{
			header: t("Stake Rewards"),
			accessorKey: "stakeRewards",
		},
		{
			header: t("Checkpoint Set"),
			accessorKey: "checkpointSet",
		},
		{
			header: t("Storage Net Inflow"),
			accessorKey: "storageNetInflow",
		},
		{
			header: t("Epoch End"),
			accessorKey: "time",
		},
	],
});
