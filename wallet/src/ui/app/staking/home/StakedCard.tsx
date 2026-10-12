// Copyright (c) LinkU Labs, Inc.
// SPDX-License-Identifier: Apache-2.0
import { useI18n } from "_src/ui/app/i18n";
import { CountDownTimer } from "_src/ui/app/shared/countdown-timer";
import { estimatedEpochStart } from "rtd-apps-core/src/rpc/staking-view";
import { IconTooltip } from "_src/ui/app/shared/tooltip";
import { Text } from "_src/ui/app/shared/text";
import { useFormatCoin } from "rtd-apps-core/src/rpc/coin";
import type {
  StakePosition,
  WalletStakingView,
} from "rtd-apps-core/src/rpc/staking-types";
import { RTD_TYPE_ARG, formatAddress } from "rtd-typescript/utils";
import { Link } from "react-router-dom";
import { ValidatorLogo } from "../validators/ValidatorLogo";

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
      className="no-underline"
    >
      <div className="theme-surface flex flex-col gap-2 p-3 rounded-2xl border border-solid border-gray-45 h-36">
        {position.validatorAddress ? (
          <ValidatorLogo
            view={view}
            validatorAddress={position.validatorAddress}
            size="subtitle"
            iconSize="md"
            stacked
            activeEpoch={position.requestEpoch}
          />
        ) : (
          <Text variant="body" color="steel-dark">
            {formatAddress(position.poolId)}
          </Text>
        )}
        <Text variant="body" color="gray-90" weight="semibold">
          {displayedAmount === undefined ? "--" : principal} {symbol}
        </Text>
        <div className="text-subtitle font-medium flex gap-1">
          {label}
          <IconTooltip tip={t("staking.objectDescription")} placement="top" />
        </div>
        <div className="text-bodySmall">
          {estimatedStart !== null && estimatedStart > Date.now() ? (
            <span>
              {t("staking.estimatedActivation")}{" "}
              <CountDownTimer timestamp={estimatedStart} variant="bodySmall" />
            </span>
          ) : null}
          {view.safeMode
            ? `${status} · ${t("staking.safeMode")}`
            : status}
        </div>
      </div>
    </Link>
  );
}
