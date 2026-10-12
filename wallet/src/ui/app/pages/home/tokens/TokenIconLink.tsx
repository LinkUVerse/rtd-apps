// Copyright (c) LinkU Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { LargeButton } from "_app/shared/LargeButton";
import { useI18n } from "_app/i18n";
import { ampli } from "_src/shared/analytics/ampli";
import { Text } from "_src/ui/app/shared/text";
import { useStakingView } from "rtd-apps-core/src/rpc/staking-hooks";
import { stakingTotals } from "rtd-apps-core/src/rpc/staking-view";
import { useFormatCoin } from "rtd-apps-core/src/rpc/coin";
import { WalletActionStake24 } from "rtd-apps-icons";
import { RTD_TYPE_ARG } from "rtd-typescript/utils";
import { useMemo } from "react";

export function TokenIconLink({
  accountAddress,
  disabled,
}: {
  accountAddress: string;
  disabled: boolean;
}) {
  const { t } = useI18n();
  const { data, isPending, isError } = useStakingView(accountAddress, {
    enabled: !!accountAddress,
  });
  const totalActivePendingStake = useMemo(
    () => (data?.positions ? stakingTotals(data.positions).principal : null),
    [data],
  );

  const [formatted, symbol, queryResult] = useFormatCoin(
    totalActivePendingStake ?? undefined,
    RTD_TYPE_ARG,
  );

  return (
    <LargeButton
      to="/stake"
      spacing="sm"
      center={!totalActivePendingStake}
      disabled={disabled || isError || totalActivePendingStake === null}
      onClick={() => {
        ampli.clickedStakeRtd({
          isCurrentlyStaking:
            totalActivePendingStake !== null && totalActivePendingStake > 0n,
          sourceFlow: "Home page",
        });
      }}
      loading={isPending || queryResult.isPending}
      before={<WalletActionStake24 />}
      data-testid={`stake-button-${formatted}-${symbol}`}
    >
      <div className="flex flex-col">
        <Text variant="pBody" weight="semibold">
          {isError
            ? t("common.syncError")
            : totalActivePendingStake
              ? t("staking.currentlyStaked")
              : t("staking.stakeAndEarn")}
        </Text>

        {!!totalActivePendingStake && (
          <Text variant="pBody" weight="semibold">
            {formatted} {symbol}
          </Text>
        )}
      </div>
    </LargeButton>
  );
}
