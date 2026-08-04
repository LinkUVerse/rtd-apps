// Copyright (c) LinkU Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { useTransactionData, useTransactionGasBudget } from '_src/ui/app/hooks';
import { useI18n } from '_src/ui/app/i18n';
import { GAS_SYMBOL } from '_src/ui/app/redux/slices/rtd-objects/Coin';
import { type Transaction } from 'rtd-typescript/transactions';
import { formatAddress } from 'rtd-typescript/utils';

import { DescriptionItem, DescriptionList } from './DescriptionList';
import { SummaryCard } from './SummaryCard';

interface Props {
	sender?: string;
	transaction: Transaction;
}

export function GasFees({ sender, transaction }: Props) {
	const { t } = useI18n();
	const { data: transactionData } = useTransactionData(sender, transaction);
	const { data: gasBudget, isPending, isError } = useTransactionGasBudget(sender, transaction);
	const isSponsored =
		transactionData?.gasData.owner && transactionData.sender !== transactionData.gasData.owner;
	return (
		<SummaryCard
			header={t('approval.estimatedGas')}
			badge={
				isSponsored ? (
					<div className="theme-card rounded-full px-1.5 py-0.5 text-captionSmallExtra font-medium uppercase text-success">
						{t('approval.sponsored')}
					</div>
				) : null
			}
			initialExpanded
		>
			<DescriptionList>
				<DescriptionItem title={t('approval.youPay')}>
					{isPending
						? t('approval.estimating')
						: isError
							? t('approval.estimationFailed')
							: `${isSponsored ? 0 : gasBudget} ${GAS_SYMBOL}`}
				</DescriptionItem>
				{isSponsored && (
					<>
						<DescriptionItem title={t('approval.sponsorPays')}>
							{gasBudget ? `${gasBudget} ${GAS_SYMBOL}` : '-'}
						</DescriptionItem>
						<DescriptionItem title={t('approval.sponsor')}>
							{formatAddress(transactionData!.gasData.owner!)}
						</DescriptionItem>
					</>
				)}
			</DescriptionList>
		</SummaryCard>
	);
}
