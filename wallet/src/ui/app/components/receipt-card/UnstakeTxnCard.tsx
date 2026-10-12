// Copyright (c) LinkU Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { ValidatorLogo } from "_app/staking/validators/ValidatorLogo";
import { TxnAmount } from "_components/receipt-card/TxnAmount";
import { Text } from "_src/ui/app/shared/text";
import { useI18n } from "_src/ui/app/i18n";
import { useFormatCoin } from "rtd-apps-core/src/rpc/coin";
import type { WalletStakeEvent } from "rtd-apps-core/src/rpc/transaction-view";
import { RTD_TYPE_ARG } from "rtd-typescript/utils";

import { Card } from "../../shared/transaction-summary/Card";

type UnStakeTxnCardProps = {
  event: Extract<WalletStakeEvent, { kind: "unstake" }>;
};

export function UnStakeTxnCard({ event }: UnStakeTxnCardProps) {
  const { t } = useI18n();
  const principalAmount = BigInt(event.principalAmount);
  const rewardAmount = BigInt(event.rewardAmount);
  const validatorAddress = event.validatorAddress;
  const totalAmount = principalAmount + rewardAmount;
  const [formatPrinciple, symbol] = useFormatCoin(
    principalAmount,
    RTD_TYPE_ARG,
  );
  const [formatRewards] = useFormatCoin(rewardAmount, RTD_TYPE_ARG);

  return (
    <Card>
      <div className="flex flex-col divide-y divide-solid divide-gray-40 divide-x-0">
        {validatorAddress && (
          <div className="mb-3.5 w-full">
            <ValidatorLogo
              validatorAddress={validatorAddress}
              showAddress
              iconSize="md"
              size="body"
            />
          </div>
        )}
        {totalAmount !== 0n && (
          <TxnAmount
            amount={totalAmount}
            coinType={RTD_TYPE_ARG}
            label={t("common.total")}
          />
        )}

        <div className="flex justify-between w-full py-3.5">
          <div className="flex gap-1 items-baseline text-steel">
            <Text variant="body" weight="medium" color="steel-darker">
              {t("staking.yourStakedRtd")}
            </Text>
          </div>

          <div className="flex gap-1 items-baseline text-steel">
            <Text variant="body" weight="medium" color="steel-darker">
              {formatPrinciple} {symbol}
            </Text>
          </div>
        </div>

        <div className="flex justify-between w-full py-3.5">
          <div className="flex gap-1 items-baseline text-steel">
            <Text variant="body" weight="medium" color="steel-darker">
              {t("staking.rewardsEarned")}
            </Text>
          </div>

          <div className="flex gap-1 items-baseline text-steel">
            <Text variant="body" weight="medium" color="steel-darker">
              {formatRewards} {symbol}
            </Text>
          </div>
        </div>
      </div>
    </Card>
  );
}
