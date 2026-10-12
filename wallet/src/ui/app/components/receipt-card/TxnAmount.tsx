// Copyright (c) LinkU Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { Heading } from "_src/ui/app/shared/heading";
import { Text } from "_src/ui/app/shared/text";
import { CoinFormat, useFormatCoin } from "rtd-apps-core/src/rpc/coin";

type TxnAmountProps = {
  amount: string | number | bigint;
  coinType: string;
  label: string;
  approximation?: boolean;
  format?: CoinFormat;
};

// dont show amount if it is 0
// This happens when a user sends a transaction to self;
export function TxnAmount({
  amount,
  coinType,
  label,
  approximation,
  format = CoinFormat.ROUNDED,
}: TxnAmountProps) {
  const atomic = BigInt(amount);
  const [formatAmount, symbol] = useFormatCoin(
    atomic < 0n ? -atomic : atomic,
    coinType,
    format,
  );
  return atomic !== 0n ? (
    <div className="flex min-w-0 justify-between w-full items-center gap-4 py-3 first:pt-0">
      <span className="shrink-0 whitespace-nowrap">
        <Text variant="body" weight="medium" color="steel-darker">
          {label}
        </Text>
      </span>
      <div
        className={
          format === CoinFormat.FULL
            ? "flex min-w-0 flex-wrap items-center justify-end gap-1 tabular-nums [&>div]:min-w-0 [&>div]:break-all [&>div]:text-right"
            : "flex min-w-0 items-center justify-end gap-1 overflow-hidden whitespace-nowrap tabular-nums"
        }
      >
        <Heading variant="heading2" weight="semibold" color="gray-90">
          {approximation ? "~" : ""}
          {formatAmount}
        </Heading>
        <Text variant="body" weight="medium" color="steel-darker">
          {symbol}
        </Text>
      </div>
    </div>
  ) : null;
}
