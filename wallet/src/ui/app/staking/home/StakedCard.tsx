// Copyright (c) LinkU Labs, Inc.
// SPDX-License-Identifier: Apache-2.0
import { useI18n } from "_src/ui/app/i18n";
import { CountDownTimer } from "_src/ui/app/shared/countdown-timer";
import { estimatedEpochStart } from "rtd-apps-core/src/rpc/staking-view";
import { IconTooltip } from "_src/ui/app/shared/tooltip";
import { useFormatCoin } from "rtd-apps-core/src/rpc/coin";
import type {
  StakePosition,
  WalletStakingView,
} from "rtd-apps-core/src/rpc/staking-types";
import { RTD_TYPE_ARG, formatAddress } from "rtd-typescript/utils";
import { Link } from "react-router-dom";
import { ValidatorLogo } from "../validators/ValidatorLogo";
import { ChevronRight12 } from "rtd-apps-icons";
import * as styles from "../Staking.module.scss";

export function StakeCard({
  position,
  view,
}: {
  position: StakePosition;
  view: WalletStakingView;
}) {
  const { t } = useI18n();
  const reward =
    position.reward.state === "estimated" ? position.reward.amount : undefined;
  // Retired pools show the estimated redeemable total only when its reward is known.
  const displayedAmount =
    position.poolState === "inactive"
      ? reward === undefined
        ? undefined
        : BigInt(position.principal) + BigInt(reward)
      : position.principal;
  const [principal, symbol] = useFormatCoin(displayedAmount, RTD_TYPE_ARG);
  const [formattedReward] = useFormatCoin(reward, RTD_TYPE_ARG);
  const estimatedStart =
    position.status === "pending"
      ? estimatedEpochStart(view, position.activationEpoch)
      : null;
  const status =
    position.poolState === "unresolved"
      ? t("common.syncError")
      : position.poolState === "inactive"
        ? t("staking.inactive")
        : position.status === "pending"
          ? t("staking.epochNumber", { count: position.activationEpoch })
          : `${reward === undefined ? "--" : formattedReward} ${symbol}`;
  const label =
    position.status === "pending"
      ? t("staking.startsEarning")
      : t("staking.rewards");
  return (
    <Link
      data-testid="stake-card"
      to={`/stake/delegation-detail?${new URLSearchParams({ staked: position.objectId, ...(position.validatorAddress ? { validator: position.validatorAddress } : {}) })}`}
      className={styles.stakeCard}
    >
      <div className={styles.positionHeader}>
        {position.validatorAddress ? (
          <ValidatorLogo
            view={view}
            validatorAddress={position.validatorAddress}
            size="subtitle"
            iconSize="md"
            activeEpoch={position.requestEpoch}
          />
        ) : (
          <span className={styles.poolAddress}>
            {formatAddress(position.poolId)}
          </span>
        )}
        <ChevronRight12 className={styles.chevron} aria-hidden="true" />
      </div>
      <div className={styles.positionMetrics}>
        <div className={styles.principal}>
          <span className={styles.metricLabel}>
            {t(
              position.poolState === "inactive"
                ? "staking.estimatedWithdraw"
                : "staking.yourStake",
            )}
          </span>
          <div className={styles.positionAmount}>
            <strong>{displayedAmount === undefined ? "--" : principal}</strong>
            <span>{symbol}</span>
          </div>
        </div>
        <div className={styles.reward}>
          <div className={styles.rewardLabel}>
            <span>{label}</span>
            <IconTooltip
              tip={t("staking.objectDescription")}
              placement="top"
              noFullWidth
            />
          </div>
          <div className={styles.positionStatus}>
            {estimatedStart !== null && estimatedStart > Date.now() ? (
              <span>
                {t("staking.estimatedActivation")}{" "}
                <CountDownTimer
                  timestamp={estimatedStart}
                  variant="bodySmall"
                />
              </span>
            ) : null}
            {view.safeMode ? `${status} · ${t("staking.safeMode")}` : status}
          </div>
        </div>
      </div>
    </Link>
  );
}
