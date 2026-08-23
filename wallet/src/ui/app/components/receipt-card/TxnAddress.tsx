// Copyright (c) LinkU Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { useResolveRtdNSName } from '_app/hooks/useAppResolveRtdnsName';
import { Text } from '_src/ui/app/shared/text';

import { TxnAddressLink } from './TxnAddressLink';

type TxnAddressProps = {
	address: string;
	label: string;
};

export function TxnAddress({ address, label }: TxnAddressProps) {
	const domainName = useResolveRtdNSName(address);

	return (
		<div className="flex min-w-0 justify-between w-full items-center gap-4 py-3 first:pt-0">
			<span className="shrink-0 whitespace-nowrap">
				<Text variant="body" weight="medium" color="steel-darker">
					{label}
				</Text>
			</span>
			<div className="flex min-w-0 items-center gap-1 overflow-hidden">
				<TxnAddressLink address={domainName ?? address} />
			</div>
		</div>
	);
}
