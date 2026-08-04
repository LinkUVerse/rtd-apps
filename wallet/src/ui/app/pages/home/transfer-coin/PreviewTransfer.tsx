// Copyright (c) LinkU Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { Text } from '_app/shared/text';
import { useI18n } from '_app/i18n';
import { TxnAddress } from '_components/receipt-card/TxnAddress';
import { TxnAmount } from '_components/receipt-card/TxnAmount';
import { parseAmount } from '_helpers';
import { useActiveAddress } from '_src/ui/app/hooks/useActiveAddress';
import { GAS_SYMBOL } from '_src/ui/app/redux/slices/rtd-objects/Coin';
import { useCoinMetadata } from 'rtd-apps-core';

export type PreviewTransferProps = {
	coinType: string;
	to: string;
	amount: string;
	approximation?: boolean;
	gasBudget?: string;
};

export function PreviewTransfer({
	coinType,
	to,
	amount,
	approximation,
	gasBudget,
}: PreviewTransferProps) {
	const { t } = useI18n();
	const accountAddress = useActiveAddress();
	const { data: metadata } = useCoinMetadata(coinType);
	const amountWithoutDecimals = parseAmount(amount, metadata?.decimals ?? 0);

	return (
		<div className="divide-y divide-solid divide-steel/20 divide-x-0 flex flex-col px-2.5 w-full">
			<TxnAmount
				amount={amountWithoutDecimals.toString()}
				label={t('transfer.sending')}
				coinType={coinType}
				approximation={approximation}
			/>
			<TxnAddress address={accountAddress || ''} label={t('transfer.from')} />
			<TxnAddress address={to} label={t('transfer.to')} />
			<div className="pt-3.5 mb-5 flex w-full gap-2 justify-between">
				<div className="flex gap-1">
					<Text variant="body" color="gray-80" weight="medium">
						{t('transfer.estimatedGas')}
					</Text>
				</div>
				<Text variant="body" color="gray-90" weight="medium">
					{gasBudget} {GAS_SYMBOL}
				</Text>
			</div>
		</div>
	);
}
