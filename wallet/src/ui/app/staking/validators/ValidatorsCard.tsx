// Copyright (c) LinkU Labs, Inc.
// SPDX-License-Identifier: Apache-2.0
import { walletReadErrorMessage } from "_src/shared/rpc/read-error";

import BottomMenuLayout, {
  Content,
  Menu,
} from "_app/shared/bottom-menu-layout";
import { Button } from "_app/shared/ButtonUI";
import { Card, CardItem } from "_app/shared/card";
import { Text } from "_app/shared/text";
import Alert from "_components/alert";
import LoadingIndicator from "_components/loading/LoadingIndicator";
import { ampli } from "_src/shared/analytics/ampli";
import { useI18n } from "_src/ui/app/i18n";
import { useStakingView } from "rtd-apps-core/src/rpc/staking-hooks";
import { stakingTotals } from "rtd-apps-core/src/rpc/staking-view";
import { Plus12 } from "rtd-apps-icons";
import { useMemo } from "react";

import { useActiveAddress } from "../../hooks/useActiveAddress";
import { StakeAmount } from "../home/StakeAmount";
import { StakeCard } from "../home/StakedCard";

export function ValidatorsCard() {
  const { t } = useI18n();
  const accountAddress = useActiveAddress();
  const {
    data: system,
    isPending,
    isError,
    error,
  } = useStakingView(accountAddress, { enabled: !!accountAddress });
  const delegations = system?.positions;
  const totals = useMemo(
    () => (delegations ? stakingTotals(delegations) : null),
    [delegations],
  );
  const totalStake = totals?.principal ?? null;
  const totalEarnTokenReward = totals?.rewards ?? null;
  const numberOfValidators = totals?.validators ?? null;
  const hasInactiveValidatorDelegation = delegations?.some(
    (position) => position.poolState === "inactive",
  );

  if (isPending) {
    return (
      <div className="p-2 w-full flex justify-center items-center h-full">
        <LoadingIndicator />
      </div>
    );
  }

  if (isError || !system || !delegations) {
    return (
      <div className="p-2 w-full flex justify-center items-center h-full mb-2">
        <Alert>
          <strong>{walletReadErrorMessage(error)}</strong>
        </Alert>
      </div>
    );
  }

  return (
    <div className="flex flex-col flex-nowrap h-full w-full">
      <BottomMenuLayout>
        <Content>
          <div className="mb-4">
            {hasInactiveValidatorDelegation ? (
              <div className="mb-3">
                <Alert>{t("staking.inactiveValidatorsWarning")}</Alert>
              </div>
            ) : null}
            <div className="grid grid-cols-2 gap-2.5 mb-4">
              {system &&
                delegations
                  ?.filter((position) => position.poolState !== "active")
                  .map((delegation) => (
                    <StakeCard
                      position={delegation}
                      view={system}
                      key={delegation.objectId}
                    />
                  ))}
            </div>
            <Card
              padding="none"
              header={
                <div className="py-2.5 flex px-3.75 justify-center w-full">
                  <Text
                    variant="captionSmall"
                    weight="semibold"
                    color="steel-darker"
                  >
                    {t(
                      (numberOfValidators ?? 0) > 1
                        ? "staking.validatorsCountPlural"
                        : "staking.validatorsCount",
                      { count: numberOfValidators ?? "--" },
                    )}
                  </Text>
                </div>
              }
            >
              <div className="flex divide-x divide-solid divide-gray-45 divide-y-0">
                <CardItem title={t("staking.yourStake")}>
                  <StakeAmount balance={totalStake} variant="heading5" />
                </CardItem>
                <CardItem title={t("staking.earned")}>
                  <StakeAmount
                    balance={totalEarnTokenReward}
                    variant="heading5"
                    isEarnedRewards
                  />
                </CardItem>
              </div>
            </Card>

            <div className="grid grid-cols-2 gap-2.5 mt-4">
              {system &&
                delegations
                  ?.filter((position) => position.poolState === "active")
                  .map((delegation) => (
                    <StakeCard
                      position={delegation}
                      view={system}
                      key={delegation.objectId}
                    />
                  ))}
            </div>
          </div>
        </Content>
        <Menu stuckClass="staked-cta" className="w-full px-0 pb-0 mx-0">
          <Button
            size="tall"
            variant="secondary"
            to="new"
            onClick={() =>
              ampli.clickedStakeRtd({
                isCurrentlyStaking: true,
                sourceFlow: "Validator card",
              })
            }
            before={<Plus12 />}
            text={t("staking.stakeRtd")}
          />
        </Menu>
      </BottomMenuLayout>
    </div>
  );
}
