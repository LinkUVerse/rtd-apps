// Copyright (c) LinkU Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { Card } from "_app/shared/card";
import { Text } from "_app/shared/text";
import { CountDownTimer } from "_src/ui/app/shared/countdown-timer";
import { useI18n } from "_src/ui/app/i18n";
import { estimatedCurrentEpochEnd } from "rtd-apps-core/src/rpc/staking-view";
import type {
  StakePosition,
  WalletStakingView,
} from "rtd-apps-core/src/rpc/staking-types";
import { useFormatCoin } from "rtd-apps-core/src/rpc/coin";
import { RTD_TYPE_ARG } from "rtd-typescript/utils";
import { Form } from "formik";

import { GAS_SYMBOL } from "../../redux/slices/rtd-objects/Coin";
import { Heading } from "../../shared/heading";

export type StakeFromProps = {
  position: StakePosition;
  view: WalletStakingView;
};
export function UnStakeForm({ position, view }: StakeFromProps) {
  const { t } = useI18n();
  const stakingReward =
    position.reward.state === "estimated"
      ? position.reward.amount
      : position.reward.reason === "pending"
        ? "0"
        : undefined;
  const [rewards, rewardSymbol] = useFormatCoin(stakingReward, RTD_TYPE_ARG);
  const [totalRtd] = useFormatCoin(
    stakingReward === undefined
      ? undefined
      : BigInt(stakingReward) + BigInt(position.principal),
    RTD_TYPE_ARG,
  );
  const [tokenBalance] = useFormatCoin(position.principal, RTD_TYPE_ARG);
  const currentEpochEndTime = estimatedCurrentEpochEnd(view);

  return (
    <Form
      className="flex flex-1 flex-col flex-nowrap"
      autoComplete="off"
      noValidate
    >
      <Card
        titleDivider
        header={
          <div className="theme-surface flex w-full justify-between px-4 py-3">
            <Text variant="body" weight="medium" color="steel-darker">
              {t("staking.currentEpochEnds")}
            </Text>
            <div className="flex gap-0.5 ml-auto">
              {currentEpochEndTime !== null &&
              currentEpochEndTime > Date.now() ? (
                <CountDownTimer
                  timestamp={currentEpochEndTime}
                  variant="body"
                  color="steel-dark"
                  weight="medium"
                  endLabel={t("staking.scheduleUnavailable")}
                />
              ) : (
                <Text variant="body" weight="medium" color="steel-dark">
                  {t("staking.scheduleUnavailable")}
                </Text>
              )}
            </div>
          </div>
        }
        footer={
          <div className="flex gap-0.5 justify-between w-full">
            <Text variant="pBodySmall" weight="medium" color="steel-darker">
              {t("staking.estimatedWithdraw")}
            </Text>
            <div className="flex gap-0.5 ml-auto">
              <Heading
                variant="heading4"
                weight="semibold"
                color="steel-darker"
                leading="none"
              >
                {stakingReward === undefined ? "--" : totalRtd}
              </Heading>
              <Text variant="bodySmall" weight="medium" color="steel-dark">
                {GAS_SYMBOL}
              </Text>
            </div>
          </div>
        }
      >
        <div className="pb-3.75 flex flex-col  w-full gap-2">
          <div className="flex gap-0.5 justify-between w-full">
            <Text variant="body" weight="medium" color="steel-darker">
              {t("staking.yourStake")}
            </Text>
            <Text variant="body" weight="medium" color="steel-darker">
              {tokenBalance} {GAS_SYMBOL}
            </Text>
          </div>
          <div className="flex gap-0.5 justify-between w-full">
            <Text variant="body" weight="medium" color="steel-darker">
              {t("staking.rewardsEarned")}
            </Text>
            <Text variant="body" weight="medium" color="steel-darker">
              {stakingReward === undefined ? "--" : rewards} {rewardSymbol}
            </Text>
          </div>
        </div>
      </Card>
      <div className="mt-4">
        <Card variant="gray">
          <div className=" w-full flex justify-between">
            <Text variant="body" weight="medium" color="steel-darker">
              {t("transaction.gasFees")}
            </Text>

            <Text variant="body" weight="medium" color="steel-dark">
              {t("staking.gasOnReview")}
            </Text>
          </div>
        </Card>
      </div>
    </Form>
  );
}
