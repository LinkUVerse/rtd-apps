// Copyright (c) LinkU Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { Text } from "_app/shared/text";
import { useI18n } from "_app/i18n";
import { IconTooltip } from "_app/shared/tooltip";
import LoadingIndicator from "_components/loading/LoadingIndicator";
import { useStakingView } from "rtd-apps-core/src/rpc/staking-hooks";
import { normalizeRtdAddress } from "rtd-typescript/utils";
import { useMemo } from "react";

import { formatStakingApy } from "./formatStakingApy";

const APY_DECIMALS = 3;

type DelegatedAPYProps = {
  stakedValidators: string[];
};

export function DelegatedAPY({ stakedValidators }: DelegatedAPYProps) {
  const { t } = useI18n();
  const { data, isPending, isError } = useStakingView();

  const averageNetworkAPY = useMemo(() => {
    if (!data || isError || !stakedValidators.length) return null;
    const addresses = [
      ...new Set(stakedValidators.map((value) => normalizeRtdAddress(value))),
    ];
    let total = 0;
    for (const address of addresses) {
      const validator = data.validators.find(
        (item) => item.active && item.address === address,
      );
      if (!validator || validator.apy.state !== "estimated") return null;
      total += validator.apy.fraction;
    }
    return formatStakingApy(total / addresses.length, APY_DECIMALS);
  }, [data, isError, stakedValidators]);

  if (isPending) {
    return (
      <div className="p-2 w-full flex justify-center items-center h-full">
        <LoadingIndicator />
      </div>
    );
  }

  return (
    <div className="flex gap-0.5 items-center">
      {averageNetworkAPY !== null ? (
        <>
          <Text variant="body" weight="semibold" color="steel-dark">
            {averageNetworkAPY}
          </Text>
          <Text variant="subtitle" weight="medium" color="steel-darker">
            {t("staking.apy")}
          </Text>
          <div className="text-steel items-baseline text-body flex">
            <IconTooltip
              tip={t("staking.averageApyDescription")}
              placement="top"
            />
          </div>
        </>
      ) : (
        <Text variant="subtitle" weight="medium" color="steel-dark">
          --
        </Text>
      )}
    </div>
  );
}
