// Copyright (c) LinkU Labs, Inc.
// SPDX-License-Identifier: Apache-2.0
import { useWalletRpc } from "rtd-apps-core/src/rpc/WalletRpcContext";
import { walletReadErrorMessage } from "_src/shared/rpc/read-error";

import { useActiveAddress } from "_app/hooks/useActiveAddress";
import { useBlockedObjectList } from "_app/hooks/useBlockedObjectList";
import { useI18n } from "_app/i18n";
import Alert from "_components/alert";
import FiltersPortal from "_components/filters-tags";
import Loading from "_components/loading";
import LoadingSpinner from "_components/loading/LoadingIndicator";
import { setToSessionStorage } from "_src/background/storage-utils";
import { AssetFilterTypes, useGetNFTs } from "_src/ui/app/hooks/useGetNFTs";
import PageTitle from "_src/ui/app/shared/PageTitle";
import { normalizeStructTag } from "rtd-typescript/utils";
import { useMemo } from "react";
import { useParams } from "react-router-dom";

import { useHiddenAssets } from "../hidden-assets/HiddenAssetsProvider";
import AssetsOptionsMenu from "./AssetsOptionsMenu";
import NonVisualAssets from "./NonVisualAssets";
import VisualAssets from "./VisualAssets";

function NftsPage() {
  const { t } = useI18n();
  const rpc = useWalletRpc();
  const accountAddress = useActiveAddress();
  const { data: blockedObjectList, riskState } = useBlockedObjectList();
  const {
    data: ownedAssets,
    isLoading,
    error,
    isPending,
    isError,
  } = useGetNFTs(accountAddress);

  const handleFilterChange = async (tag: any) => {
    await setToSessionStorage<string>("NFTS_PAGE_NAVIGATION", tag.link);
  };
  const { filterType } = useParams();
  const filteredNFTs = useMemo(() => {
    let filteredData = ownedAssets?.visual;
    if (filterType) {
      filteredData = ownedAssets?.[filterType as AssetFilterTypes] ?? [];
    }
    return filteredData?.filter((ownedAsset) => {
      if (!ownedAsset.type) {
        return true;
      }
      const normalizedType = normalizeStructTag(ownedAsset.type);
      return !blockedObjectList?.includes(normalizedType);
    });
  }, [ownedAssets, filterType, blockedObjectList]);
  const { hiddenAssetIds } = useHiddenAssets();

  if (isLoading) {
    return (
      <div className="mt-1 flex w-full justify-center">
        <LoadingSpinner />
      </div>
    );
  }

  const tags = [
    { name: t("assets.visual"), link: "nfts" },
    { name: t("assets.other"), link: "nfts/other" },
  ];

  return (
    <div className="flex min-h-full flex-col flex-nowrap items-center gap-4">
      <PageTitle
        title={t("assets.title")}
        after={hiddenAssetIds.length ? <AssetsOptionsMenu /> : null}
      />
      {riskState !== "ready" ? (
        <Alert>
          {t(
            riskState === "disabled"
              ? "nft.riskUnavailable"
              : riskState === "error"
                ? "nft.riskFailed"
                : "nft.riskLoading",
          )}
        </Alert>
      ) : null}
      {!!ownedAssets?.other.length && (
        <FiltersPortal
          firstLastMargin
          tags={tags}
          callback={handleFilterChange}
        />
      )}
      <Loading loading={isPending}>
        {isError ? (
          <Alert>
            <div>
              <strong>{t("common.syncError")}</strong>
            </div>
            <small>
              {rpc.state === "unconfigured" || rpc.state === "invalid"
                ? rpc.message
                : walletReadErrorMessage(error)}
            </small>
          </Alert>
        ) : null}
        {!isError &&
          (filteredNFTs?.length ? (
            filterType === AssetFilterTypes.other ? (
              <NonVisualAssets items={filteredNFTs} />
            ) : (
              <VisualAssets items={filteredNFTs} />
            )
          ) : (
            <div className="flex flex-1 items-center self-center text-caption font-semibold text-steel-darker">
              {t("assets.noAssets")}
            </div>
          ))}
      </Loading>
    </div>
  );
}

export default NftsPage;
