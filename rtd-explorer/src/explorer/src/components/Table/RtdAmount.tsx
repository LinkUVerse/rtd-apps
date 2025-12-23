// Copyright (c) LinkU Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { CoinFormat, useFormatCoin } from "rtd-apps-core";
import { RTD_TYPE_ARG } from "rtd-typescript/utils";
import { Text } from "@linku/ui";

export function RtdAmount({
	amount,
	full = false,
}: {
	amount?: bigint | number | string | null;
	full?: boolean;
}) {
	const [formattedAmount, coinType] = useFormatCoin(
		amount,
		RTD_TYPE_ARG,
		full ? CoinFormat.FULL : CoinFormat.ROUNDED,
	);
	if (!amount) return <Text variant="bodySmall/medium">--</Text>;

	return (
		<div className="leading-1 flex items-end gap-0.5">
			<Text variant="bodySmall/medium" color="steel-darker">
				{formattedAmount}
			</Text>
			<Text variant="captionSmall/normal" color="steel-dark">
				{coinType}
			</Text>
		</div>
	);
}
