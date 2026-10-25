// Copyright (c) LinkU Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import type { CheckpointPage } from "~/types/explorerViewModels";
import { Text } from "@linku/ui";

import { TxTimeType } from "../tx-time/TxTimeType";
import { HighlightedTableCol } from "~/components/Table/HighlightedTableCol";
import type { Translate } from "~/i18n";
import { CheckpointLink, CheckpointSequenceLink } from "~/ui/InternalLink";

const identity: Translate = (source) => source;

// Generate table data from the checkpoints data
export const genTableDataFromCheckpointsData = (
	data: CheckpointPage,
	t: Translate = identity,
) => ({
	data: data?.data.map((checkpoint) => ({
		digest: (
			<HighlightedTableCol first>
				<CheckpointLink digest={checkpoint.digest} />
			</HighlightedTableCol>
		),
		time: <TxTimeType timestamp={Number(checkpoint.timestampMs)} />,
		sequenceNumber: <CheckpointSequenceLink sequence={checkpoint.sequenceNumber} />,
		transactionBlockCount: (
			<Text variant="bodySmall/medium" color="steel-darker">
				{checkpoint.transactions.length}
			</Text>
		),
	})),
	columns: [
		{
			header: () => t("Digest"),
			accessorKey: "digest",
		},
		{
			header: () => t("Sequence Number"),
			accessorKey: "sequenceNumber",
		},
		{
			header: () => t("Time"),
			accessorKey: "time",
		},
		{
			header: () => t("Transaction Block Count"),
			accessorKey: "transactionBlockCount",
		},
	],
});
