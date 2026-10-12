// Copyright (c) LinkU Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { useResolveRtdNSName } from '_app/hooks/useAppResolveRtdnsName';
import { Text } from '_src/ui/app/shared/text';

import { TxnAddressLink } from './TxnAddressLink';

type TxnAddressProps = {
	address: string;
	label: string;
	recipientName?: string;
	fullAddress?: boolean;
};

export function TxnAddress({ address, label, recipientName, fullAddress = false }: TxnAddressProps) {
	// A name is a label; the approved address remains the link destination and visible value.
	// A prepared recipient already contains its name, so no reverse lookup is necessary.
	const reverseName = useResolveRtdNSName(recipientName ? undefined : address);
	const domainName = recipientName ?? reverseName;

	return (
		<div className="flex min-w-0 justify-between w-full items-center gap-4 py-3 first:pt-0">
			<span className="shrink-0 whitespace-nowrap">
				<Text variant="body" weight="medium" color="steel-darker">
					{label}
				</Text>
			</span>
			<div className="flex min-w-0 flex-col items-end gap-1 text-right">
				{domainName && <span className="break-all">{domainName}</span>}
				<TxnAddressLink address={address} fullAddress={fullAddress || !!domainName} />
			</div>
		</div>
	);
}
