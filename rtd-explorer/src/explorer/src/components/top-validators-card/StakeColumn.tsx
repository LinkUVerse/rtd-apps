// Copyright (c) LinkU Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { useFormatCoin, CoinFormat, formatBalance } from "rtd-apps-core";
import { RTD_TYPE_ARG } from "rtd-typescript/utils";
import { Text } from "@linku/ui";

type StakeColumnProps = {
	stake: bigint | number | string;
	hideCoinSymbol?: boolean;
	inMIST?: boolean;
};

export function StakeColumn({ stake, hideCoinSymbol, inMIST = false }: StakeColumnProps) {
	const coinFormat = hideCoinSymbol ? CoinFormat.FULL : CoinFormat.ROUNDED;
	const [amount, symbol] = useFormatCoin(stake, RTD_TYPE_ARG, coinFormat);
	return (
		<div className="flex items-end gap-0.5">
			<Text variant="bodySmall/medium" color="steel-darker">
				{inMIST ? formatBalance(stake, 0, coinFormat) : amount}
			</Text>
			{!hideCoinSymbol && (
				<Text variant="captionSmall/medium" color="steel-dark">
					{inMIST ? "MIST" : symbol}
				</Text>
			)}
		</div>
	);
}
