// Copyright (c) LinkU Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { Card } from "_app/shared/card";
import Alert from "_components/alert";
import LoadingIndicator from "_components/loading/LoadingIndicator";
import { Text } from "_src/ui/app/shared/text";
import { IconTooltip } from "_src/ui/app/shared/tooltip";
import { useI18n } from "_src/ui/app/i18n";
import { formatPercentageDisplay } from "rtd-apps-core/src/utils/formatPercentageDisplay";
import { useStakingView } from "rtd-apps-core/src/rpc/staking-hooks";
import { stakeSharePercent } from "rtd-apps-core/src/rpc/staking-view";
import { useSearchParams } from "react-router-dom";

import { useActiveAddress } from "../../hooks/useActiveAddress";
import { StakeAmount } from "../home/StakeAmount";
import { ValidatorLogo } from "../validators/ValidatorLogo";

import { formatStakingApy } from "../../shared/delegated-apy/formatStakingApy";

type ValidatorFormDetailProps = {
  validatorAddress: string;
  unstake?: boolean;
};

export function ValidatorFormDetail({
  validatorAddress,
  unstake,
}: ValidatorFormDetailProps) {
  const { t } = useI18n();
  const accountAddress = useActiveAddress();

  const [searchParams] = useSearchParams();
  const stakeIdParams = searchParams.get("staked");
  const {
    data: view,
    isPending,
    isError,
  } = useStakingView(accountAddress || undefined, {
    enabled: !!accountAddress,
  });
  const position = view?.positions?.find(
    (item) => item.objectId === stakeIdParams,
  );
  // A withdrawal belongs to the owned position's pool, never an arbitrary URL validator.
  const validatorData = view?.validators.find((validator) =>
    unstake
      ? validator.poolId === position?.poolId
      : validator.active && validator.address === validatorAddress,
  );
  const totalValidatorStake = validatorData?.stakeBalance ?? null;
  const totalStake =
    view?.positions && validatorData
      ? unstake
        ? (position?.principal ?? null)
        : view.positions
            .filter((item) => item.poolId === validatorData.poolId)
            .reduce((sum, item) => sum + BigInt(item.principal), 0n)
      : null;
  const totalValidatorsStake =
    view?.validators
      .filter((validator) => validator.active)
      .reduce((sum, validator) => sum + BigInt(validator.stakeBalance), 0n) ??
    0n;
  const totalStakePercentage = validatorData?.active
    ? stakeSharePercent(validatorData.stakeBalance, totalValidatorsStake)
    : null;
  const apy =
    validatorData?.apy.state === "estimated"
      ? validatorData.apy.fraction
      : null;

  if (accountAddress && isPending) {
    return (
      <div className="p-2 w-full flex justify-center items-center h-full">
        <LoadingIndicator />
      </div>
    );
  }
  if (
    isError ||
    !view?.positions ||
    !validatorData ||
    totalStake === null ||
    (unstake && (!position || position.validatorAddress !== validatorAddress))
  ) {
    return (
      <div className="p-2">
        <Alert>
          <div className="mb-1 font-semibold">
            {t("staking.validatorLoadError")}
          </div>
        </Alert>
      </div>
    );
  }

  return (
    <div className="w-full">
      {validatorData && (
        <Card
          titleDivider
          header={
            <div className="flex py-2.5 px-3.75 gap-2 items-center">
              <ValidatorLogo
            view={view}
                validatorAddress={validatorAddress}
                iconSize="sm"
                size="body"
              />
            </div>
          }
          footer={
            !unstake && (
              <>
                <Text variant="body" weight="medium" color="steel-darker">
                  {t("staking.yourStakedRtd")}
                </Text>

                <StakeAmount balance={totalStake} variant="body" />
              </>
            )
          }
        >
          <div className="flex flex-col gap-3.5">
            <div className="flex gap-2 items-center justify-between">
              <div className="flex gap-1 items-center text-steel">
                <Text variant="body" weight="medium" color="steel-darker">
                  {t("staking.apy")}
                </Text>
                <IconTooltip noFullWidth tip={t("staking.apyDescription")} />
              </div>

              <Text variant="body" weight="semibold" color="gray-90">
                {formatStakingApy(apy)}
              </Text>
            </div>
            <div className="flex gap-2 items-center justify-between">
              <div className="flex gap-1 items-center text-steel">
                <Text variant="body" weight="medium" color="steel-darker">
                  {t("staking.stakeShare")}
                </Text>
                <IconTooltip
                  noFullWidth
                  tip={t("staking.stakeShareDescription")}
                />
              </div>

              <Text variant="body" weight="semibold" color="gray-90">
                {formatPercentageDisplay(totalStakePercentage)}
              </Text>
            </div>

            {!unstake && (
              <div className="flex gap-2 items-center justify-between mb-3.5">
                <div className="flex gap-1 items-center text-steel">
                  <Text variant="body" weight="medium" color="steel-darker">
                    {t("staking.totalStaked")}
                  </Text>
                  <IconTooltip
                    noFullWidth
                    tip={t("staking.totalStakedDescription")}
                  />
                </div>
                <StakeAmount balance={totalValidatorStake} variant="body" />
              </div>
            )}
          </div>
        </Card>
      )}
    </div>
  );
}
