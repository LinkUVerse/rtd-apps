// Copyright (c) LinkU Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import ExplorerLink from '_components/explorer-link';
import { ExplorerLinkType } from '_components/explorer-link/ExplorerLinkType';
import { formatAddress, isValidRtdNSName } from 'rtd-typescript/utils';

type TxnAddressLinkProps = {
	address: string;
};

export function TxnAddressLink({ address }: TxnAddressLinkProps) {
	return (
		<ExplorerLink
			type={ExplorerLinkType.address}
			address={address}
			title="View on Rtd Explorer"
			showIcon={false}
		>
			{isValidRtdNSName(address) ? address : formatAddress(address)}
		</ExplorerLink>
	);
}
