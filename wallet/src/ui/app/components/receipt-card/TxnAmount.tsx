// Copyright (c) LinkU Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { Heading } from '_src/ui/app/shared/heading';
import { Text } from '_src/ui/app/shared/text';
import { useFormatCoin } from 'rtd-apps-core';

type TxnAmountProps = {
	amount: string | number;
	coinType: string;
	label: string;
	approximation?: boolean;
};

// dont show amount if it is 0
// This happens when a user sends a transaction to self;
export function TxnAmount({
	amount,
	coinType,
	label,
	approximation,
}: TxnAmountProps) {
	const [formatAmount, symbol] = useFormatCoin(
		Math.abs(Number(amount)),
		coinType,
	);
	return Number(amount) !== 0 ? (
		<div className="flex min-w-0 justify-between w-full items-center gap-4 py-3 first:pt-0">
			<span className="shrink-0 whitespace-nowrap">
				<Text variant="body" weight="medium" color="steel-darker">
					{label}
				</Text>
			</span>
			<div className="flex min-w-0 items-center justify-end gap-1 overflow-hidden whitespace-nowrap tabular-nums">
				<Heading variant="heading2" weight="semibold" color="gray-90">
					{approximation ? '~' : ''}
					{formatAmount}
				</Heading>
				<Text variant="body" weight="medium" color="steel-darker">
					{symbol}
				</Text>
			</div>
		</div>
	) : null;
}
