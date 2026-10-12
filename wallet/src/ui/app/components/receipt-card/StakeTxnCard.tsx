// Copyright (c) LinkU Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { ValidatorLogo } from "_app/staking/validators/ValidatorLogo";
import { TxnAmount } from "_components/receipt-card/TxnAmount";
import {
  NUM_OF_EPOCH_BEFORE_STAKING_REWARDS_REDEEMABLE,
  NUM_OF_EPOCH_BEFORE_STAKING_REWARDS_STARTS,
} from "_src/shared/constants";
import { CountDownTimer } from "_src/ui/app/shared/countdown-timer";
import { useI18n } from "_src/ui/app/i18n";
import { Text } from "_src/ui/app/shared/text";
import { IconTooltip } from "_src/ui/app/shared/tooltip";
import { formatStakingApy } from "../../shared/delegated-apy/formatStakingApy";
import { useStakingView } from "rtd-apps-core/src/rpc/staking-hooks";
import { estimatedEpochStart } from "rtd-apps-core/src/rpc/staking-view";
import type { WalletStakeEvent } from "rtd-apps-core/src/rpc/transaction-view";
import { RTD_TYPE_ARG } from "rtd-typescript/utils";

import { Card } from "../../shared/transaction-summary/Card";

type StakeTxnCardProps = {
  event: Extract<WalletStakeEvent, { kind: "stake" }>;
};

function epochAfter(epoch: string, delta: number): string | null {
  const next = BigInt(epoch) + BigInt(delta);
  return next <= 0xffffffffffffffffn ? next.toString() : null;
}
// Event facts remain visible even if current staking enrichment is unavailable.
export function StakeTxnCard({ event }: StakeTxnCardProps) {
  const { t } = useI18n();
  const validatorAddress = event.validatorAddress;
  const stakedAmount = event.amount;
  const { data: view, isError } = useStakingView();
  const current = isError ? undefined : view;
  const validator = current?.validators.find(
    (v) => v.active && v.address === validatorAddress,
  );
  const apy =
    validator?.apy.state === "estimated" ? validator.apy.fraction : null;
  const startEarningRewardsEpoch = epochAfter(
    event.epoch,
    NUM_OF_EPOCH_BEFORE_STAKING_REWARDS_STARTS,
  );
  const redeemableRewardsEpoch = epochAfter(
    event.epoch,
    NUM_OF_EPOCH_BEFORE_STAKING_REWARDS_REDEEMABLE,
  );
  const timeBeforeStakeRewardsStarts =
    current && startEarningRewardsEpoch !== null
      ? estimatedEpochStart(current, startEarningRewardsEpoch)
      : null;
  const timeBeforeStakeRewardsRedeemable =
    current && redeemableRewardsEpoch !== null
      ? estimatedEpochStart(current, redeemableRewardsEpoch)
      : null;
  const rewardsStarted =
    current &&
    !current.safeMode &&
    startEarningRewardsEpoch !== null &&
    BigInt(current.epoch) >= BigInt(startEarningRewardsEpoch);

  return (
    <Card>
      <div className="flex flex-col divide-y divide-solid divide-gray-40 divide-x-0">
        {validatorAddress && (
          <div className="mb-3.5 w-full divide-y divide-gray-40 divide-solid">
            <ValidatorLogo
              validatorAddress={validatorAddress}
              showAddress
              iconSize="md"
              size="body"
              activeEpoch={event.epoch}
            />
          </div>
        )}
        {stakedAmount && (
          <TxnAmount
            amount={stakedAmount}
            coinType={RTD_TYPE_ARG}
            label={t("staking.stake")}
          />
        )}
        <div className="flex flex-col">
          <div className="flex justify-between w-full py-3.5">
            <div className="flex gap-1 items-baseline justify-center text-steel">
              <Text variant="body" weight="medium" color="steel-darker">
                {t("staking.currentApy")}
              </Text>
              <IconTooltip tip={t("staking.apyDescription")} />
            </div>
            <Text variant="body" weight="medium" color="steel-darker">
              {formatStakingApy(apy)}
            </Text>
          </div>
        </div>
        <div className="flex flex-col">
          <div className="flex justify-between w-full py-3.5">
            <div className="flex gap-1 items-baseline text-steel">
              <Text variant="body" weight="medium" color="steel-darker">
                {rewardsStarted
                  ? t("staking.rewardsStarted")
                  : t("staking.rewardsStart")}
              </Text>
            </div>

            {timeBeforeStakeRewardsStarts !== null &&
            timeBeforeStakeRewardsStarts > Date.now() ? (
              <CountDownTimer
                timestamp={timeBeforeStakeRewardsStarts}
                variant="body"
                color="steel-darker"
                weight="medium"
                label={t("staking.in")}
                endLabel="--"
              />
            ) : (
              <Text variant="body" weight="medium" color="steel-darker">
                {startEarningRewardsEpoch !== null && !current?.safeMode
                  ? t("staking.epochNumber", {
                      count: startEarningRewardsEpoch,
                    })
                  : "--"}
              </Text>
            )}
          </div>
          <div className="flex justify-between w-full">
            <div className="flex gap-1 flex-1 items-baseline text-steel">
              <Text variant="pBody" weight="medium" color="steel-darker">
                {t("staking.rewardsRedeemable")}
              </Text>
            </div>
            <div className="flex-1 flex justify-end gap-1 items-center">
              {timeBeforeStakeRewardsRedeemable !== null &&
              timeBeforeStakeRewardsRedeemable > Date.now() ? (
                <CountDownTimer
                  timestamp={timeBeforeStakeRewardsRedeemable}
                  variant="body"
                  color="steel-darker"
                  weight="medium"
                  label={t("staking.in")}
                  endLabel="--"
                />
              ) : (
                <Text variant="body" weight="medium" color="steel-darker">
                  {redeemableRewardsEpoch !== null && !current?.safeMode
                    ? t("staking.epochNumber", {
                        count: redeemableRewardsEpoch,
                      })
                    : "--"}
                </Text>
              )}
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
}
