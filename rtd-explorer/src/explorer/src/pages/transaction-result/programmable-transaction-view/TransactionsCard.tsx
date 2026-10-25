// Copyright (c) LinkU Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import type { RtdTransaction } from "~/types/explorerViewModels";

import { Transaction } from "./Transaction";
import { ProgrammableTxnBlockCard } from "~/components/transactions/ProgTxnBlockCard";
import { CollapsibleSection } from "~/ui/collapsible/CollapsibleSection";
import { useI18n } from "~/i18n";

type TransactionsCardProps = {
	transactions: RtdTransaction[];
};

export function TransactionsCard({ transactions }: TransactionsCardProps) {
	const { t } = useI18n();
	if (!transactions?.length) {
		return null;
	}

	const expandableItems = transactions.map((transaction, index) => {
		const [[type, data]] = Object.entries(transaction);

		return (
			<CollapsibleSection defaultOpen key={index} title={type}>
				<div data-testid="transactions-card-content">
					<Transaction key={index} type={type} data={data} />
				</div>
			</CollapsibleSection>
		);
	});

	return (
		<ProgrammableTxnBlockCard
			initialClose
			items={expandableItems}
			itemsLabel={transactions.length > 1 ? t("Transactions") : t("Transaction")}
			count={transactions.length}
		/>
	);
}
