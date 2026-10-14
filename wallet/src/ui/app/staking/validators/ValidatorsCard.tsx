// Copyright (c) LinkU Labs, Inc.
// SPDX-License-Identifier: Apache-2.0
import { walletReadErrorMessage } from "_src/shared/rpc/read-error";

import BottomMenuLayout, {
  Content,
  Menu,
} from "_app/shared/bottom-menu-layout";
import { Button } from "_app/shared/ButtonUI";
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
import * as styles from "../Staking.module.scss";

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
      <div
        className={styles.loading}
        role="status"
        aria-label={t("common.loading")}
      >
        <LoadingIndicator />
      </div>
    );
  }

  if (isError || !system || !delegations) {
    return (
      <div className={styles.notice} role="alert">
        <Alert>
          <strong>{walletReadErrorMessage(error)}</strong>
        </Alert>
      </div>
    );
  }

  return (
    <div className={styles.overview}>
      <BottomMenuLayout className={styles.layout}>
        <Content className={styles.content}>
          <div className={styles.sections}>
            {hasInactiveValidatorDelegation ? (
              <div className={styles.notice} role="status">
                <Alert mode="warning">
                  {t("staking.inactiveValidatorsWarning")}
                </Alert>
              </div>
            ) : null}
            <section
              className={styles.summary}
              aria-label={t("staking.overview")}
            >
              <div className={styles.summaryHeading}>
                <h2>{t("staking.overview")}</h2>
                <span className={styles.validatorCount}>
                  {t(
                    (numberOfValidators ?? 0) > 1
                      ? "staking.validatorsCountPlural"
                      : "staking.validatorsCount",
                    { count: numberOfValidators ?? "--" },
                  )}
                </span>
              </div>
              <div className={styles.totals}>
                <div className={styles.total}>
                  <span>{t("staking.yourStake")}</span>
                  <StakeAmount balance={totalStake} variant="heading5" />
                </div>
                <div className={styles.total}>
                  <span>{t("staking.earned")}</span>
                  <StakeAmount
                    balance={totalEarnTokenReward}
                    variant="heading5"
                    isEarnedRewards
                  />
                </div>
              </div>
            </section>

            <h2 className={styles.sectionHeading}>
              {t("staking.currentlyStaked")}
            </h2>
            <div className={styles.positions}>
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
            <div className={styles.positions}>
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
        <Menu stuckClass="staked-cta" className={styles.footer}>
          <Button
            size="tall"
            variant="primary"
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
