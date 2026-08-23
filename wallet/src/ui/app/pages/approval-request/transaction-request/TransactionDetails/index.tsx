// Copyright (c) LinkU Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { useTransactionData } from '_src/ui/app/hooks';
import { useI18n } from '_src/ui/app/i18n';
import { Tab as HeadlessTab, type TabProps } from '@headlessui/react';
import { type Transaction } from 'rtd-typescript/transactions';

import { SummaryCard } from '../SummaryCard';
import { Command } from './Command';
import { Input } from './Input';

interface Props {
	sender?: string;
	transaction: Transaction;
}

const Tab = (props: TabProps<'div'>) => (
	<HeadlessTab
		className="min-h-11 whitespace-nowrap border-0 border-b border-transparent ui-selected:border-hero text-steel-darker px-1 py-2 -mb-px border-solid ui-selected:text-hero-dark text-body font-semibold bg-transparent outline-none cursor-pointer focus-visible:ring-2 focus-visible:ring-hero/40"
		{...props}
	/>
);

export function TransactionDetails({ sender, transaction }: Props) {
	const { t } = useI18n();
	const {
		data: transactionData,
		isPending,
		isError,
	} = useTransactionData(sender, transaction);
	if (
		transactionData?.commands.length === 0 &&
		transactionData.inputs.length === 0
	) {
		return null;
	}
	return (
		<SummaryCard header={t('approval.transactionDetails')} initialExpanded>
			{isPending || isError ? (
				<div className="ml-0 text-steel-darker text-pBodySmall font-medium">
					{isPending ? t('approval.gathering') : t('approval.gatherFailed')}
				</div>
			) : transactionData ? (
				<div>
					<HeadlessTab.Group>
						<HeadlessTab.List className="flex gap-6 border-0 border-b border-solid border-gray-45 mb-6">
							{!!transactionData.commands.length && (
								<Tab>{t('approval.commands')}</Tab>
							)}
							{!!transactionData.inputs.length && (
								<Tab>{t('approval.inputs')}</Tab>
							)}
						</HeadlessTab.List>
						<HeadlessTab.Panels>
							{!!transactionData.commands.length && (
								<HeadlessTab.Panel className="flex flex-col gap-6">
									{/* TODO: Rename components: */}
									{transactionData.commands.map((command, index) => (
										<Command key={index} command={command} />
									))}
								</HeadlessTab.Panel>
							)}
							{!!transactionData.inputs.length && (
								<HeadlessTab.Panel className="flex flex-col gap-2">
									{transactionData.inputs.map((input, index) => (
										<Input key={index} input={input} />
									))}
								</HeadlessTab.Panel>
							)}
						</HeadlessTab.Panels>
					</HeadlessTab.Group>
				</div>
			) : (
				''
			)}
		</SummaryCard>
	);
}
