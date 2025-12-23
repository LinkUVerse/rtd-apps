// Copyright (c) LinkU Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { getTotalGasUsed } from "rtd-apps-core";
import { X12, Dot12 } from "rtd-apps-icons";
import { type RtdClient, type RtdTransactionBlockResponse } from "rtd-typescript/client";

import { RtdAmount } from "../Table/RtdAmount";
import { TxTimeType } from "../tx-time/TxTimeType";
import { HighlightedTableCol } from "~/components/Table/HighlightedTableCol";
import { AddressLink, TransactionLink } from "~/ui/InternalLink";

// Generate table data from the transaction data
export const genTableDataFromTxData = (results: RtdTransactionBlockResponse[]) => ({
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
			header: "Digest",
			accessorKey: "digest",
		},
		{
			header: "Sender",
			accessorKey: "sender",
		},
		{
			header: "Txns",
			accessorKey: "txns",
		},
		{
			header: "Gas",
			accessorKey: "gas",
		},
		{
			header: "Time",
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
