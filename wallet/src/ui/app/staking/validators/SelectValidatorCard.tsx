// Copyright (c) LinkU Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { Content, Menu } from "_app/shared/bottom-menu-layout";
import { Button } from "_app/shared/ButtonUI";
import { Text } from "_app/shared/text";
import Alert from "_components/alert";
import LoadingIndicator from "_components/loading/LoadingIndicator";
import { ampli } from "_src/shared/analytics/ampli";
import { useI18n, type MessageKey } from "_src/ui/app/i18n";
import { formatPercentageDisplay } from "rtd-apps-core/src/utils/formatPercentageDisplay";
import { useStakingView } from "rtd-apps-core/src/rpc/staking-hooks";
import { stakeSharePercent } from "rtd-apps-core/src/rpc/staking-view";
import { useWalletRpc } from "rtd-apps-core/src/rpc/WalletRpcContext";
import { ArrowRight16 } from "rtd-apps-icons";
import cl from "clsx";
import { useEffect, useMemo, useState } from "react";

import { ValidatorListItem } from "./ValidatorListItem";

import { formatStakingApy } from "../../shared/delegated-apy/formatStakingApy";

type SortKeys = "name" | "stakeShare" | "apy";
const sortKeys: Record<SortKeys, MessageKey> = {
  name: "staking.sortName",
  stakeShare: "staking.stakeShare",
  apy: "staking.apy",
};

type Validator = {
  name: string;
  address: string;
  apy: number | null;
  stakeShare: number | null;
};

export function SelectValidatorCard({
  view,
  snapshotKey,
}: {
  view?: import("rtd-apps-core/src/rpc/staking-types").WalletStakingView;
  snapshotKey?: string;
} = {}) {
  const { t } = useI18n();
  const [selectedValidator, setSelectedValidator] = useState<Validator | null>(
    null,
  );
  const [sortKey, setSortKey] = useState<SortKeys | null>(null);
  const [sortAscending, setSortAscending] = useState(true);
  const query = useStakingView(undefined, { enabled: !view });
  const data = view ?? query.data;
  const isPending = !view && query.isPending;
  const isError = !view && query.isError;
  const rpc = useWalletRpc();
  const stakingSnapshotKey = view ? snapshotKey : query.snapshot?.cacheKey;
  useEffect(() => {
    setSelectedValidator(null);
  }, [rpc.readSessionKey]);
  useEffect(() => {
    // This is an address choice, not a prepared transaction. A refreshed proof
    // can preserve it while that validator is still active in the current view.
    setSelectedValidator((selected) =>
      !isError &&
      data?.validators.some(
        (validator) =>
          validator.active && validator.address === selected?.address,
      )
        ? selected
        : null,
    );
  }, [data, isError, stakingSnapshotKey]);

  const selectValidator = (validator: Validator) => {
    setSelectedValidator((state) =>
      state?.address !== validator.address ? validator : null,
    );
  };

  const handleSortByKey = (key: SortKeys) => {
    if (key === sortKey) {
      setSortAscending(!sortAscending);
    }
    setSortKey(key);
  };

  const randomizedValidators = useMemo(() => {
    const active =
      data?.validators.filter((validator) => validator.active) ?? [];
    const total = active.reduce(
      (sum, validator) => sum + BigInt(validator.stakeBalance),
      0n,
    );
    const list: Validator[] = active.map((validator) => ({
      name: validator.name,
      address: validator.address,
      apy:
        validator.apy.state === "estimated"
          ? validator.apy.fraction * 100
          : null,
      stakeShare: stakeSharePercent(validator.stakeBalance, total),
    }));
    // Preserve randomized discovery order without reshuffling on selection or sorting.
    for (let i = list.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [list[i], list[j]] = [list[j], list[i]];
    }
    return list;
  }, [data]);
  const validatorList = useMemo(() => {
    const list = [...randomizedValidators];
    if (sortKey)
      list.sort((a, b) => {
        if (sortKey === "name")
          return (
            (sortAscending ? 1 : -1) *
            a.name.localeCompare(b.name, "en", {
              sensitivity: "base",
              numeric: true,
            })
          );
        const left = a[sortKey],
          right = b[sortKey];
        if (left === null) return right === null ? 0 : 1;
        if (right === null) return -1;
        return (sortAscending ? 1 : -1) * (left - right);
      });
    return list;
  }, [randomizedValidators, sortKey, sortAscending]);
  const selected = validatorList.find(
    (validator) => validator.address === selectedValidator?.address,
  );

  if (isPending) {
    return (
      <div className="p-2 w-full flex justify-center items-center h-full">
        <LoadingIndicator />
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className="p-2">
        <Alert>
          <div className="mb-1 font-semibold">{t("common.somethingWrong")}</div>
        </Alert>
      </div>
    );
  }

  return (
    <div className="flex flex-col w-full h-full -my-5">
      <Content className="flex flex-col w-full items-center">
        <div className="theme-surface sticky -top-5 z-50 mt-0 flex w-full flex-col items-center pb-2.5 pt-5">
          <div className="flex items-start w-full mb-2">
            <Text variant="subtitle" weight="medium" color="steel-darker">
              {t("staking.sortBy")}
            </Text>
            <div className="flex items-center ml-2 gap-1.5">
              {Object.entries(sortKeys).map(([key, value]) => {
                return (
                  <button
                    key={key}
                    className="bg-transparent border-0 p-0 flex gap-1 cursor-pointer"
                    onClick={() => handleSortByKey(key as SortKeys)}
                  >
                    <Text
                      variant="caption"
                      weight="medium"
                      color={sortKey === key ? "hero" : "steel-darker"}
                    >
                      {t(value)}
                    </Text>
                    {sortKey === key && (
                      <ArrowRight16
                        className={cl(
                          "text-captionSmall font-thin text-hero",
                          sortAscending ? "rotate-90" : "-rotate-90",
                        )}
                      />
                    )}
                  </button>
                );
              })}
            </div>
          </div>
          <div className="flex items-start w-full">
            <Text variant="subtitle" weight="medium" color="steel-darker">
              {t("staking.selectValidator")}
            </Text>
          </div>
        </div>
        <div className="flex items-start flex-col w-full mt-1 flex-1">
          {data &&
            validatorList.map((validator) => (
              <div
                data-testid="validator-list-item"
                className="cursor-pointer w-full relative"
                key={validator.address}
                onClick={() => selectValidator(validator)}
              >
                <ValidatorListItem
                  view={data}
                  selected={selectedValidator?.address === validator.address}
                  validatorAddress={validator.address}
                  value={
                    sortKey === "apy"
                      ? formatStakingApy(
                          validator.apy === null ? null : validator.apy / 100,
                          2,
                          "-",
                        )
                      : formatPercentageDisplay(
                          sortKey === "stakeShare"
                            ? validator.stakeShare
                            : null,
                          "-",
                        )
                  }
                />
              </div>
            ))}
        </div>
      </Content>
      {selected && (
        <Menu
          stuckClass="staked-cta"
          className="w-full px-0 pb-5 mx-0 -bottom-5"
        >
          <Button
            data-testid="select-validator-cta"
            size="tall"
            variant="primary"
            to={`/stake/new?address=${encodeURIComponent(selected.address)}`}
            onClick={() =>
              selected.apy !== null &&
              ampli.selectedValidator({
                validatorName: selected.name,
                validatorAddress: selected.address,
                validatorAPY: selected.apy,
              })
            }
            text={t("staking.selectAmount")}
            after={<ArrowRight16 />}
          />
        </Menu>
      )}
    </div>
  );
}
