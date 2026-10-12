// Copyright (c) LinkU Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import BottomMenuLayout, { Content } from "_app/shared/bottom-menu-layout";
import { Button } from "_app/shared/ButtonUI";
import { Card } from "_app/shared/card";
import { CardItem } from "_app/shared/card/CardItem";
import { Text } from "_app/shared/text";
import { IconTooltip } from "_app/shared/tooltip";
import Alert from "_components/alert";
import LoadingIndicator from "_components/loading/LoadingIndicator";
import { useAppSelector } from "_hooks";
import { useGetAllBalances } from "_src/ui/app/hooks/useGetAllBalances";
import { ampli } from "_src/shared/analytics/ampli";
import { API_ENV } from "_src/shared/api-env";
import { MIN_NUMBER_RTD_TO_STAKE } from "_src/shared/constants";
import FaucetRequestButton from "_src/ui/app/shared/faucet/FaucetRequestButton";
import { useI18n } from "_src/ui/app/i18n";
import { useStakingView } from "rtd-apps-core/src/rpc/staking-hooks";
import { useCoinMetadata } from "rtd-apps-core/src/rpc/coin";
import { ArrowLeft16, StakeAdd16, StakeRemove16 } from "rtd-apps-icons";
import { MIST_PER_RTD, RTD_TYPE_ARG } from "rtd-typescript/utils";
import { useMemo } from "react";

import { useActiveAddress } from "../../hooks/useActiveAddress";
import { Heading } from "../../shared/heading";
import { StakeAmount } from "../home/StakeAmount";

import { formatStakingApy } from "../../shared/delegated-apy/formatStakingApy";

type DelegationDetailCardProps = {
  validatorAddress: string | null;
  stakedId: string;
};

export function DelegationDetailCard({
  validatorAddress,
  stakedId,
}: DelegationDetailCardProps) {
  const { t } = useI18n();
  const accountAddress = useActiveAddress();
  const {
    data: system,
    isPending,
    isError,
  } = useStakingView(accountAddress, { enabled: !!accountAddress });
  const balances = useGetAllBalances(accountAddress || "");
  const { data: metadata } = useCoinMetadata(RTD_TYPE_ARG);
  const apiEnv = useAppSelector(({ app }) => app.apiEnv);
  const delegationData = system?.positions?.find(
    (position) => position.objectId === stakedId,
  );
  const validatorData = system?.validators.find(
    (validator) => validator.poolId === delegationData?.poolId,
  );
  const totalStake = delegationData ? BigInt(delegationData.principal) : null;
  const rtdEarned =
    delegationData?.reward.state === "estimated"
      ? delegationData.reward.amount
      : null;
  const apy = formatStakingApy(
    validatorData?.apy.state === "estimated"
      ? validatorData.apy.fraction
      : null,
  );
  const commission = validatorData
    ? (Number(validatorData.commissionBps) / 100).toFixed(2)
    : "--";
  const delegationId = delegationData?.objectId;
  const hasInactiveValidatorDelegation =
    delegationData?.poolState === "inactive";
  const showRequestMoreRtdToken = useMemo(() => {
    if (
      !balances.data ||
      balances.isError ||
      metadata?.decimals === undefined ||
      apiEnv === API_ENV.mainnet
    )
      return false;
    const balance =
      balances.data.find((coin) => coin.coinType === RTD_TYPE_ARG)?.balance ??
      "0";
    return (
      BigInt(balance) <
      BigInt(MIN_NUMBER_RTD_TO_STAKE) * 10n ** BigInt(metadata.decimals)
    );
  }, [balances.data, balances.isError, metadata?.decimals, apiEnv]);
  const stakeByValidatorAddress = `/stake/new?${new URLSearchParams({ address: delegationData?.validatorAddress ?? "", staked: stakedId })}`;

  if (isPending) {
    return (
      <div className="p-2 w-full flex justify-center items-center h-full">
        <LoadingIndicator />
      </div>
    );
  }

  if (
    isError ||
    !delegationData ||
    !system ||
    (validatorAddress !== null &&
      delegationData.validatorAddress !== validatorAddress)
  ) {
    return (
      <div className="p-2">
        <Alert>
          <div className="mb-1 font-semibold">{t("common.somethingWrong")}</div>
        </Alert>
      </div>
    );
  }

  return (
    <div className="flex flex-col flex-nowrap flex-grow h-full">
      <BottomMenuLayout>
        <Content>
          <div className="justify-center w-full flex flex-col items-center">
            {system.safeMode && <Alert>{t("staking.safeMode")}</Alert>}
            {hasInactiveValidatorDelegation ? (
              <div className="mb-3">
                <Alert>{t("staking.inactiveWarning")}</Alert>
              </div>
            ) : null}
            <div className="w-full flex">
              <Card
                header={
                  <div className="grid grid-cols-2 divide-x divide-solid divide-gray-45 divide-y-0 w-full">
                    <CardItem title={t("staking.yourStake")}>
                      <StakeAmount balance={totalStake} variant="heading5" />
                    </CardItem>

                    <CardItem title={t("staking.earned")}>
                      <StakeAmount
                        balance={rtdEarned}
                        variant="heading5"
                        isEarnedRewards
                      />
                    </CardItem>
                  </div>
                }
                padding="none"
              >
                <div className="divide-x flex divide-solid divide-gray-45 divide-y-0">
                  <CardItem
                    title={
                      <div className="flex text-steel-darker gap-1 items-start">
                        {t("staking.apy")}
                        <div className="text-steel">
                          <IconTooltip
                            tip={t("staking.apyFull")}
                            placement="top"
                          />
                        </div>
                      </div>
                    }
                  >
                    <div className="flex gap-0.5 items-baseline">
                      <Heading
                        variant="heading4"
                        weight="semibold"
                        color="gray-90"
                        leading="none"
                      >
                        {apy}
                      </Heading>
                    </div>
                  </CardItem>

                  <CardItem
                    title={
                      <div className="flex text-steel-darker gap-1">
                        {t("staking.commission")}
                        <div className="text-steel">
                          <IconTooltip
                            tip={t("staking.commissionDescription")}
                            placement="top"
                          />
                        </div>
                      </div>
                    }
                  >
                    <div className="flex gap-0.5 items-baseline">
                      <Heading
                        variant="heading4"
                        weight="semibold"
                        color="gray-90"
                        leading="none"
                      >
                        {commission}
                      </Heading>

                      <Text
                        variant="subtitleSmall"
                        weight="medium"
                        color="steel-dark"
                      >
                        %
                      </Text>
                    </div>
                  </CardItem>
                </div>
              </Card>
            </div>
            <div className="flex gap-2.5 w-full my-3.75">
              {delegationData.poolState === "active" ? (
                <Button
                  size="tall"
                  variant="outline"
                  to={stakeByValidatorAddress}
                  before={<StakeAdd16 />}
                  text={t("staking.stakeRtd")}
                  onClick={() => {
                    ampli.clickedStakeRtd({
                      isCurrentlyStaking: true,
                      sourceFlow: "Delegation detail card",
                    });
                  }}
                  disabled={
                    showRequestMoreRtdToken ||
                    balances.isError ||
                    !balances.data ||
                    !metadata
                  }
                />
              ) : null}

              {Boolean(totalStake) && delegationId && (
                <Button
                  data-testid="unstake-button"
                  size="tall"
                  variant="outline"
                  to={stakeByValidatorAddress + "&unstake=true"}
                  onClick={() => {
                    if (delegationData.validatorAddress)
                      ampli.clickedUnstakeRtd({
                        stakedAmount: Number(totalStake! / MIST_PER_RTD),
                        validatorAddress: delegationData.validatorAddress!,
                      });
                  }}
                  text={t("staking.unstakeRtd")}
                  before={<StakeRemove16 />}
                />
              )}
            </div>
          </div>
        </Content>

        {/* show faucet request button on devnet or testnet whenever there is only one coin  */}
        {showRequestMoreRtdToken ? (
          <div className="flex flex-col gap-4 items-center">
            <div className="w-8/12 text-center">
              <Text variant="pSubtitle" weight="medium" color="steel-darker">
                {t("staking.minimumRequired", {
                  amount: MIN_NUMBER_RTD_TO_STAKE,
                })}
              </Text>
            </div>
            <FaucetRequestButton size="tall" />
          </div>
        ) : (
          <Button
            size="tall"
            variant="secondary"
            to="/stake"
            before={<ArrowLeft16 />}
            text={t("common.back")}
          />
        )}
      </BottomMenuLayout>
    </div>
  );
}
