// Copyright (c) LinkU Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { ReceiptIdentifier } from '_components/receipt-card/ReceiptIdentifier';
import { ExplorerLinkType } from '_components/explorer-link/ExplorerLinkType';
import { useActiveAddress } from '_src/ui/app/hooks';
import { useI18n } from '_src/ui/app/i18n';
import { isValidRtdAddress } from 'rtd-typescript/utils';

import { Text } from '../text';
import { SummaryCardFooter } from './Card';

export function OwnerFooter({ owner, ownerType }: { owner?: string; ownerType?: string }) {
	const { t } = useI18n();
	const address = useActiveAddress();
	const isOwner = address === owner;

	if (!owner) return null;
	const isAddress = isValidRtdAddress(owner);

	return (
		<SummaryCardFooter>
			<Text variant="pBody" weight="medium" color="steel-dark">
				{t('transaction.owner')}
			</Text>
			<div className="flex min-w-0 justify-end">
				{ownerType === 'Shared' || !isAddress ? (
					<Text variant="body" weight="medium" color="hero-dark">
						{ownerType === 'Shared' ? t('transaction.shared') : owner}
					</Text>
				) : (
					<ReceiptIdentifier
						value={owner}
						type="address"
						prefix={isOwner ? t('transaction.you') : undefined}
						explorerLink={{ type: ExplorerLinkType.address, address: owner }}
					/>
				)}
			</div>
		</SummaryCardFooter>
	);
}
