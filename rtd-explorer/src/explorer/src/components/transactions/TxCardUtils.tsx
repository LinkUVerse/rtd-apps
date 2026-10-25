// Copyright (c) LinkU Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { getTotalGasUsed } from "rtd-apps-core";
import { X12, Dot12 } from "rtd-apps-icons";
import type { ExplorerRpcClient as RtdClient } from "~/rpc/ExplorerRpcClient";
import type { RtdTransactionBlockResponse } from "~/types/explorerViewModels";

import { RtdAmount } from "../Table/RtdAmount";
import { TxTimeType } from "../tx-time/TxTimeType";
import { HighlightedTableCol } from "~/components/Table/HighlightedTableCol";
import type { Translate } from "~/i18n";
import { AddressLink, TransactionLink } from "~/ui/InternalLink";

const identity: Translate = (source) => source;

// Generate table data from the transaction data
export const genTableDataFromTxData = (
	results: RtdTransactionBlockResponse[],
	t: Translate = identity,
) => ({
	data: results.map((transaction) => {
		const status = transaction.effects?.status.status;
		const sender = transaction.transaction?.data.sender;

		return {
			date: (
				<HighlightedTableCol>
					<TxTimeType timestamp={Number(transaction.timestampMs || 0)} />
				</HighlightedTableCol>
			),
			digest: (
				<HighlightedTableCol first>
					<TransactionLink
						digest={transaction.digest}
						before={
							status === "success" ? (
								<Dot12 className="text-success" />
							) : (
								<X12 className="text-issue-dark" />
							)
						}
					/>
				</HighlightedTableCol>
			),
			txns: (
				<div>
					{transaction.transaction?.data.transaction.kind === "ProgrammableTransaction"
						? transaction.transaction.data.transaction.transactions.length
						: "--"}
				</div>
			),
			gas: <RtdAmount amount={transaction.effects && getTotalGasUsed(transaction.effects)} />,
			sender: (
				<HighlightedTableCol>{sender ? <AddressLink address={sender} /> : "-"}</HighlightedTableCol>
			),
		};
	}),
	columns: [
		{
			header: t("Digest"),
			accessorKey: "digest",
		},
		{
			header: t("Sender"),
			accessorKey: "sender",
		},
		{
			header: t("Txns"),
			accessorKey: "txns",
		},
		{
			header: t("Gas"),
			accessorKey: "gas",
		},
		{
			header: t("Time"),
			accessorKey: "date",
		},
	],
});

const dedupe = (arr: string[]) => Array.from(new Set(arr));

export const getDataOnTxDigests = (client: RtdClient, transactions: string[]) =>
	client
		.multiGetTransactionBlocks({
			digests: dedupe(transactions),
			options: {
				showInput: true,
				showEffects: true,
				showEvents: true,
			},
		})
		.then((transactions) =>
			// Remove failed transactions
			transactions.filter((item) => item),
		);
