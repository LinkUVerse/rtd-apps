// Copyright (c) LinkU Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { Text } from '_app/shared/text';
import { useFormatCoin } from 'rtd-apps-core';
import { RTD_TYPE_ARG } from 'rtd-typescript/utils';

//TODO create variant for different use cases like heading4, subtitle, bodySmall and different symbols color
interface CoinBalanceProps {
	amount: bigint | number | string;
	coinType?: string;
}

export function CoinBalance({ amount, coinType }: CoinBalanceProps) {
	const [formatted, symbol] = useFormatCoin(amount, coinType || RTD_TYPE_ARG);

	return Math.abs(Number(amount)) > 0 ? (
		<div className="flex gap-0.5 align-baseline flex-nowrap items-baseline">
			<Text variant="body" weight="semibold" color="gray-90">
				{formatted}
			</Text>
			<Text variant="subtitle" color="gray-90" weight="medium">
				{symbol}
			</Text>
		</div>
	) : null;
}
