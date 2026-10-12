// Copyright (c) LinkU Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { Card } from "_app/shared/card";
import { Text } from "_app/shared/text";
import NumberInput from "_components/number-input";
import {
  NUM_OF_EPOCH_BEFORE_STAKING_REWARDS_REDEEMABLE,
  NUM_OF_EPOCH_BEFORE_STAKING_REWARDS_STARTS,
} from "_src/shared/constants";
import { CountDownTimer } from "_src/ui/app/shared/countdown-timer";
import { useI18n } from "_src/ui/app/i18n";
import { estimatedCurrentEpochEnd, estimatedEpochStart } from "rtd-apps-core/src/rpc/staking-view";
import type { WalletStakingView } from "rtd-apps-core/src/rpc/staking-types";
import { useFormatCoin } from "rtd-apps-core/src/rpc/coin";
import { Field, Form, useFormikContext } from "formik";
import { memo, useCallback } from "react";

import { type FormValues } from "./StakingCard";

const HIDE_MAX = true;

export type StakeFromProps = {
  coinBalance: bigint;
  coinType: string;
  view: WalletStakingView;
};

function StakeForm({ coinBalance, coinType, view }: StakeFromProps) {
  const { t } = useI18n();
  const { setFieldValue } = useFormikContext<FormValues>();

  const [maxToken, symbol, queryResult] = useFormatCoin(coinBalance, coinType);

  const setMaxToken = useCallback(() => {
    if (!maxToken) return;
    setFieldValue("amount", maxToken);
  }, [maxToken, setFieldValue]);

  const startEarningRewardsEpoch = (
    BigInt(view.epoch) + BigInt(NUM_OF_EPOCH_BEFORE_STAKING_REWARDS_STARTS)
  ).toString();
  const redeemableRewardsEpoch = (
    BigInt(view.epoch) + BigInt(NUM_OF_EPOCH_BEFORE_STAKING_REWARDS_REDEEMABLE)
  ).toString();
  const currentEpochEnd = estimatedCurrentEpochEnd(view);
  const timeBeforeStakeRewardsStarts = currentEpochEnd === null ? null : estimatedEpochStart(
    view,
    startEarningRewardsEpoch,
  );
  const timeBeforeStakeRewardsRedeemable = currentEpochEnd === null ? null : estimatedEpochStart(
    view,
    redeemableRewardsEpoch,
  );

  return (
    <Form
      className="flex flex-1 flex-col flex-nowrap items-center"
      autoComplete="off"
    >
      <div className="flex flex-col justify-between items-center mb-3 mt-3.5 w-full gap-1.5">
        <Text variant="caption" color="gray-85" weight="semibold">
          {t("staking.enterAmount")}
        </Text>
        <Text variant="bodySmall" color="steel" weight="medium">
          {t("staking.available", { amount: maxToken, symbol })}
        </Text>
      </div>
      <Card
        variant="gray"
        titleDivider
        header={
          <div className="theme-surface flex w-full p-2.5">
            <Field
              data-testid="stake-amount-input"
              component={NumberInput}
              allowNegative={false}
              name="amount"
              className="w-full border-none bg-transparent text-heading4 font-semibold text-hero-dark placeholder:font-semibold placeholder:text-gray-70"
              decimals
              suffix={` ${symbol}`}
              autoFocus
            />
            {!HIDE_MAX ? (
              <button
                className="theme-surface flex h-6 w-11 cursor-pointer items-center justify-center rounded-2xl border border-solid border-gray-60 text-bodySmall font-medium text-steel-darker hover:border-steel-dark hover:text-steel-darker disabled:cursor-auto disabled:opacity-50"
                onClick={setMaxToken}
                disabled={queryResult.isPending}
                type="button"
              >
                {t("common.max")}
              </button>
            ) : null}
          </div>
        }
        footer={
          <div className="py-px flex justify-between w-full">
            <Text variant="body" weight="medium" color="steel-darker">
              {t("transaction.gasFees")}
            </Text>
            <Text variant="body" weight="medium" color="steel-darker">
              {t("staking.gasOnReview")}
            </Text>
          </div>
        }
      >
        <div className="pb-3.75 flex justify-between w-full">
          <Text variant="body" weight="medium" color="steel-darker">
            {t("staking.rewardsStart")}
          </Text>
          {timeBeforeStakeRewardsStarts !== null &&
          timeBeforeStakeRewardsStarts > Date.now() ? (
            <CountDownTimer
              timestamp={timeBeforeStakeRewardsStarts}
              validUntil={currentEpochEnd ?? undefined}
              variant="body"
              color="steel-darker"
              weight="semibold"
              label={t("staking.in")}
              endLabel={t("staking.scheduleUnavailable")}
            />
          ) : (
            <Text variant="body" weight="medium" color="steel-darker">
              {t("staking.scheduleUnavailable")}
            </Text>
          )}
        </div>
        <div className="pb-3.75 flex justify-between item-center w-full">
          <div className="flex-1">
            <Text variant="pBody" weight="medium" color="steel-darker">
              {t("staking.rewardsRedeemable")}
            </Text>
          </div>
          <div className="flex-1 flex justify-end gap-1 items-center">
            {timeBeforeStakeRewardsRedeemable !== null &&
            timeBeforeStakeRewardsRedeemable > Date.now() ? (
              <CountDownTimer
                timestamp={timeBeforeStakeRewardsRedeemable}
                validUntil={currentEpochEnd ?? undefined}
                variant="body"
                color="steel-darker"
                weight="semibold"
                label={t("staking.in")}
                endLabel={t("staking.scheduleUnavailable")}
              />
            ) : (
              <Text variant="body" weight="medium" color="steel-darker">
                {t("staking.scheduleUnavailable")}
              </Text>
            )}
          </div>
        </div>
      </Card>
      <p className="mt-4 text-bodySmall">{t("staking.rewardsDescription")}</p>
    </Form>
  );
}

export default memo(StakeForm);
