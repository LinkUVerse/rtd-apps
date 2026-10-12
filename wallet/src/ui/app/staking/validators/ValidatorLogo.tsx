// Copyright (c) LinkU Labs, Inc.
// SPDX-License-Identifier: Apache-2.0
import { Heading } from "_app/shared/heading";
import { ImageIcon } from "_app/shared/image-icon";
import { Text } from "_app/shared/text";
import { Badge } from "_src/ui/app/shared/Badge";
import { useI18n } from "_src/ui/app/i18n";
import { useStakingView } from "rtd-apps-core/src/rpc/staking-hooks";
import { formatAddress, normalizeRtdAddress } from "rtd-typescript/utils";
import cl from "clsx";
import { useMemo } from "react";

interface ValidatorLogoProps {
  view?: import("rtd-apps-core/src/rpc/staking-types").WalletStakingView;
  validatorAddress: string;
  showAddress?: boolean;
  stacked?: boolean;
  isTitle?: boolean;
  size: "body" | "subtitle";
  iconSize: "sm" | "md";
  showActiveStatus?: boolean;
  activeEpoch?: string;
}

export function ValidatorLogo({
  view,
  validatorAddress,
  showAddress,
  iconSize,
  isTitle,
  size,
  stacked,
  showActiveStatus = false,
  activeEpoch,
}: ValidatorLogoProps) {
  const { t } = useI18n();
  const query = useStakingView(undefined, { enabled: !view });
  const data = view ?? query.data;
  const isPending = !view && query.isPending;
  const isError = !view && query.isError;

  const validatorMeta = useMemo(() => {
    if (!data) return null;

    return (
      data.validators.find(
        (validator) =>
          validator.active &&
          validator.address === normalizeRtdAddress(validatorAddress),
      ) ||
      data.validators.find(
        (validator) =>
          validator.address === normalizeRtdAddress(validatorAddress),
      ) ||
      null
    );
  }, [validatorAddress, data]);

  const activation = validatorMeta?.activationEpoch;
  const current = data ? BigInt(data.epoch) : null;
  const newValidator =
    !!validatorMeta?.active &&
    activation !== null &&
    activation !== undefined &&
    current !== null &&
    current > 0n &&
    current >= BigInt(activation) &&
    current - BigInt(activation) <= 1n;
  const isAtRisk =
    validatorMeta?.atRiskEpochs !== null &&
    validatorMeta?.atRiskEpochs !== undefined;

  if (isPending) {
    return <div className="flex justify-center items-center">...</div>;
  }
  // for inactive validators, show the epoch number
  const age =
    activeEpoch &&
    /^(0|[1-9]\d*)$/.test(activeEpoch) &&
    current !== null &&
    current >= BigInt(activeEpoch)
      ? (current - BigInt(activeEpoch)).toString()
      : null;
  const fallBackText =
    age !== null
      ? t("staking.stakedEpochsAgo", { count: age })
      : formatAddress(validatorAddress);
  const validatorName = isError
    ? t("common.syncError")
    : validatorMeta?.name || fallBackText;

  return (
    <div
      className={cl(
        "w-full flex justify-start font-semibold",
        stacked ? "flex-col items-start" : "flex-row items-center",
        isTitle ? "gap-2.5" : "gap-2",
      )}
    >
      <ImageIcon
        src={validatorMeta?.imageUrl || null}
        label={validatorMeta?.name || ""}
        fallback={validatorMeta?.name || ""}
        size={iconSize}
        rounded="full"
      />
      <div className="flex flex-col gap-1.5 overflow-hidden">
        <div className="flex">
          {isTitle ? (
            <Heading as="h4" variant="heading4" color="steel-darker" truncate>
              {validatorName}
            </Heading>
          ) : (
            <div className="line-clamp-2 break-all">
              <Text color="gray-90" variant={size} weight="semibold">
                {validatorName}
              </Text>
            </div>
          )}

          {showActiveStatus && (
            <div className="ml-1 flex gap-1">
              {newValidator && (
                <Badge label={t("staking.newValidator")} variant="success" />
              )}
              {isAtRisk && (
                <Badge label={t("staking.atRisk")} variant="warning" />
              )}
            </div>
          )}
        </div>
        {showAddress && (
          <Text variant="body" color="steel-dark" mono>
            {formatAddress(validatorAddress)}
          </Text>
        )}
      </div>
    </div>
  );
}
