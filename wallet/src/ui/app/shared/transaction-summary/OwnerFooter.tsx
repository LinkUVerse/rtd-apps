// Copyright (c) LinkU Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import ExplorerLink from '_src/ui/app/components/explorer-link';
import { ExplorerLinkType } from '_src/ui/app/components/explorer-link/ExplorerLinkType';
import { useActiveAddress } from '_src/ui/app/hooks';
import { useI18n } from '_src/ui/app/i18n';
import { formatAddress, isValidRtdAddress } from 'rtd-typescript/utils';

import { Text } from '../text';
import { SummaryCardFooter } from './Card';

export function OwnerFooter({ owner, ownerType }: { owner?: string; ownerType?: string }) {
	const { t } = useI18n();
	const address = useActiveAddress();
	const isOwner = address === owner;

	if (!owner) return null;
	const display =
		ownerType === 'Shared'
			? t('transaction.shared')
			: isValidRtdAddress(owner)
				? isOwner
					? t('transaction.you')
					: formatAddress(owner)
				: owner;

	return (
		<SummaryCardFooter>
			<Text variant="pBody" weight="medium" color="steel-dark">
				{t('transaction.owner')}
			</Text>
			<div className="flex justify-end">
				{isOwner ? (
					<Text variant="body" weight="medium" color="hero-dark">
						{display}
					</Text>
				) : (
					<ExplorerLink
						type={ExplorerLinkType.address}
						title={owner}
						address={owner}
						className="text-hero-dark text-body font-medium no-underline font-mono"
					>
						{display}
					</ExplorerLink>
				)}
			</div>
		</SummaryCardFooter>
	);
}
