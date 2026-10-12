// Copyright (c) LinkU Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { walletReadErrorMessage } from "_src/shared/rpc/read-error";
import { useBlockedObjectList } from "_app/hooks/useBlockedObjectList";
import { useI18n } from "_app/i18n";
import Alert from "_components/alert";
import { ErrorBoundary } from "_components/error-boundary";
import Loading from "_components/loading";
import LoadingSpinner from "_components/loading/LoadingIndicator";
import { NFTDisplayCardFromObject } from "_components/nft-display";
import { ampli } from "_src/shared/analytics/ampli";
import { Button } from "_src/ui/app/shared/ButtonUI";
import PageTitle from "_src/ui/app/shared/PageTitle";
import { useMultiGetObjects } from "rtd-apps-core/src/rpc/asset-hooks";
import { displayString } from "rtd-apps-core/src/rpc/display";
import { collectibleKioskCap } from "../../../../../shared/rpc/nft-assets";
import type { WalletAssetObject } from "rtd-apps-core/src/rpc/WalletRpcContext";
import { useWalletRpc } from "rtd-apps-core/src/rpc/WalletRpcContext";
import { EyeClose16 } from "rtd-apps-icons";
import { normalizeStructTag } from "rtd-typescript/utils";
import { useMemo } from "react";
import { Link } from "react-router-dom";

import { useHiddenAssets } from "./HiddenAssetsProvider";

function HiddenNftsPage() {
  const { hiddenAssetIds, showAsset } = useHiddenAssets();
  const { t } = useI18n();
  const { packages } = useWalletRpc();
  const { data: blockedObjectList } = useBlockedObjectList();

  const { data, isLoading, isPending, isError, error } =
    useMultiGetObjects(hiddenAssetIds);
  const itemErrors =
    data?.flatMap((item, index) =>
      item instanceof Error ? [{ id: hiddenAssetIds[index], error: item }] : [],
    ) ?? [];
  const filteredAndSortedNfts = useMemo(
    () =>
      isError
        ? []
        : (data ?? [])
            .filter(
              (item): item is WalletAssetObject => !(item instanceof Error),
            )
            .filter(
              (item) =>
                !blockedObjectList?.includes(normalizeStructTag(item.type)),
            )
            .sort((a, b) =>
              (displayString(a, "name") ?? "").localeCompare(
                displayString(b, "name") ?? "",
              ),
            ),
    [data, isError, blockedObjectList],
  );

  if (isLoading) {
    return (
      <div className="mt-1 flex w-full justify-center">
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col flex-nowrap items-center gap-4">
      <PageTitle title={t("assets.hidden")} back="/nfts" />
      <Loading loading={isPending && Boolean(hiddenAssetIds.length)}>
        {isError ? (
          <Alert>
            <div>
              <strong>{t("common.syncError")}</strong>
            </div>
            <small>{walletReadErrorMessage(error)}</small>
          </Alert>
        ) : null}
        {itemErrors.map((item) => (
          <Alert key={item.id}>
            {item.id}: {walletReadErrorMessage(item.error)}
            <Button
              variant="secondary"
              text={t("common.undo")}
              onClick={() => showAsset(item.id)}
            />
          </Alert>
        ))}
        {!isError &&
          (filteredAndSortedNfts?.length ? (
            <div className="flex flex-col w-full divide-y divide-solid divide-gray-40 divide-x-0 gap-2">
              {filteredAndSortedNfts.map((nft) => {
                const { objectId, type } = nft;
                return (
                  <div
                    className="flex justify-between items-center pt-2 pr-1"
                    key={objectId}
                  >
                    <Link
                      to={
                        collectibleKioskCap(nft, packages)
                          ? `/kiosk?${new URLSearchParams({
                              kioskId: collectibleKioskCap(nft, packages)!
                                .kioskId,
                            })}`
                          : `/nft-details?${new URLSearchParams({
                              objectId,
                            }).toString()}`
                      }
                      onClick={() => {
                        ampli.clickedCollectibleCard({
                          objectId,
                          collectibleType: type!,
                        });
                      }}
                      className="no-underline relative truncate"
                    >
                      <ErrorBoundary>
                        <NFTDisplayCardFromObject
                          object={nft}
                          size="xs"
                          orientation="horizontal"
                        />
                      </ErrorBoundary>
                    </Link>
                    <div className="h-8 w-8">
                      <Button
                        variant="secondaryRtd"
                        size="icon"
                        aria-label={t("assets.show")}
                        onClick={() => {
                          showAsset(objectId);
                        }}
                        after={<EyeClose16 />}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          ) : !itemErrors.length ? (
            <div className="flex flex-1 items-center self-center text-caption font-semibold text-steel-darker">
              {t("assets.noAssets")}
            </div>
          ) : null)}
      </Loading>
    </div>
  );
}

export default HiddenNftsPage;
