// Copyright (c) LinkU Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import ExplorerLink from '_components/explorer-link';
import { ExplorerLinkType } from '_components/explorer-link/ExplorerLinkType';
import { useI18n } from '_app/i18n';
import { formatAddress, isValidRtdNSName } from 'rtd-typescript/utils';

type TxnAddressLinkProps = {
	address: string;
	fullAddress?: boolean;
};

export function TxnAddressLink({ address, fullAddress = false }: TxnAddressLinkProps) {
	const { t } = useI18n();

	return (
		<ExplorerLink
			type={ExplorerLinkType.address}
			address={address}
			title={t('common.viewOnExplorer')}
			showIcon={false}
			className={fullAddress ? 'break-all' : undefined}
		>
			{fullAddress || isValidRtdNSName(address) ? address : formatAddress(address)}
		</ExplorerLink>
	);
}
