// Copyright (c) LinkU Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { Text } from '_app/shared/text';
import { useI18n } from '_app/i18n';
import { formatAddress } from 'rtd-typescript/utils';

type TxnTypeProps = {
	address: string;
	moveCallFnName?: string;
	isTransfer: boolean;
	isSender: boolean;
};

export function TxnTypeLabel({
	address,
	moveCallFnName,
	isTransfer,
	isSender,
}: TxnTypeProps) {
	const { t } = useI18n();
	const transferLabel = isSender ? t('transfer.to') : t('transfer.from');
	const label = isTransfer ? transferLabel : t('transaction.action');
	const content = isTransfer
		? formatAddress(address)
		: moveCallFnName?.replace(/_/g, ' ');

	return content ? (
		<div className="flex min-w-0 gap-1 mt-1">
			<Text color="steel-darker" weight="semibold" variant="subtitle">
				{label}:
			</Text>
			<div className="min-w-0 flex-1 break-words">
				<Text
					color="steel-darker"
					weight="normal"
					variant="subtitle"
					mono={isTransfer}
				>
					{content}
				</Text>
			</div>
		</div>
	) : null;
}
