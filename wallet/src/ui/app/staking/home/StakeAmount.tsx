// Copyright (c) LinkU Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { Heading } from "_app/shared/heading";
import { Text } from "_app/shared/text";
import { useFormatCoin } from "rtd-apps-core/src/rpc/coin";
import { RTD_TYPE_ARG } from "rtd-typescript/utils";

//TODO unify StakeAmount and CoinBalance
interface StakeAmountProps {
  balance: bigint | number | string | null;
  variant: "heading5" | "body";
  isEarnedRewards?: boolean;
}

export function StakeAmount({
  balance,
  variant,
  isEarnedRewards,
}: StakeAmountProps) {
  const [formatted, symbol] = useFormatCoin(balance ?? undefined, RTD_TYPE_ARG);
  // Handle case of 0 balance
  const zeroBalanceColor = !!balance;
  const earnRewardColor =
    isEarnedRewards && (zeroBalanceColor ? "success-dark" : "gray-60");
  const colorAmount = variant === "heading5" ? "gray-90" : "steel-darker";
  const colorSymbol = variant === "heading5" ? "steel" : "steel-darker";

  return (
    <div className="flex gap-0.5 align-baseline flex-nowrap items-baseline">
      {variant === "heading5" ? (
        <Heading
          variant="heading5"
          as="div"
          weight="semibold"
          color={earnRewardColor || colorAmount}
        >
          {balance === null ? "--" : formatted}
        </Heading>
      ) : (
        <Text
          variant={variant}
          weight="semibold"
          color={earnRewardColor || colorAmount}
        >
          {balance === null ? "--" : formatted}
        </Text>
      )}

      <Text
        variant={variant === "heading5" ? "bodySmall" : "body"}
        color={earnRewardColor || colorSymbol}
        weight="medium"
      >
        {symbol}
      </Text>
    </div>
  );
}
