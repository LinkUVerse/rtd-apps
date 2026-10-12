// Copyright (c) LinkU Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { walletReadErrorMessage } from "_src/shared/rpc/read-error";
import { useActiveAddress } from "_app/hooks/useActiveAddress";
import { Button } from "_app/shared/ButtonUI";
import { Collapsible } from "_app/shared/collapse";
import { Link } from "_app/shared/Link";
import { ExplorerLinkType } from "_components/explorer-link/ExplorerLinkType";
import { LabelValueItem } from "_components/LabelValueItem";
import { LabelValuesContainer } from "_components/LabelValuesContainer";
import Loading from "_components/loading";
import { NFTDisplayCard } from "_components/nft-display";
import { useGetNFTMeta, useNFTBasicData, useOwnedNFT } from "_hooks";
import { useBuyNLargeAssets } from "_src/ui/app/components/buynlarge/useBuyNLargeAssets";
import { useExplorerLink } from "_src/ui/app/hooks/useExplorerLink";
import { useUnlockedGuard } from "_src/ui/app/hooks/useUnlockedGuard";
import { useI18n } from "_src/ui/app/i18n";
import PageTitle from "_src/ui/app/shared/PageTitle";
import { Text } from "_src/ui/app/shared/text";
import Alert from "_components/alert";
import { ArrowRight16, ArrowUpRight12 } from "rtd-apps-icons";
import { formatAddress } from "rtd-typescript/utils";
import cl from "clsx";
import { Navigate, useNavigate, useSearchParams } from "react-router-dom";

import { nftAttributeRows } from "_src/shared/rpc/nft-attributes";
import { nftTransferEligible } from "_src/shared/rpc/nft-assets";

function NFTDetailsPage() {
  const { t } = useI18n();
  const [searchParams] = useSearchParams();
  const nftId = searchParams.get("objectId");
  const accountAddress = useActiveAddress();
  const {
    data: objectData,
    isPending: isNftLoading,
    kioskItem,
    isError,
    error,
  } = useOwnedNFT(nftId || "", accountAddress);
  const isTransferable = nftTransferEligible(objectData, kioskItem);
  const { nftFields, fileExtensionType, filePath } =
    useNFTBasicData(objectData);
  const isContainedInKiosk = !!kioskItem;

  const navigate = useNavigate();
  const bnl = useBuyNLargeAssets();

  const attributes = nftAttributeRows(nftFields);
  const { data: nftDisplayData, isPending: isPendingDisplay } = useGetNFTMeta(
    nftId || "",
  );
  const objectExplorerLink = useExplorerLink({
    type: ExplorerLinkType.object,
    objectID: nftId || "",
  });
  const ownerAddress =
    (objectData?.owner &&
      typeof objectData?.owner === "object" &&
      (objectData.owner.$kind === "AddressOwner"
        ? objectData.owner.AddressOwner
        : objectData.owner.$kind === "ConsensusAddressOwner"
          ? objectData.owner.ConsensusAddressOwner.owner
          : "")) ||
    "";
  const ownerExplorerLink = useExplorerLink({
    type: ExplorerLinkType.address,
    address: ownerAddress,
  });
  const isGuardLoading = useUnlockedGuard();
  const isPending = isNftLoading || isPendingDisplay || isGuardLoading;

  const buyNLargeConfig = bnl.find(
    (item) => item?.objectType === objectData?.type,
  );
  const isBuyNLarge = !!buyNLargeConfig;

  return (
    <div
      className={cl("flex flex-1 flex-col flex-nowrap gap-5", {
        "items-center": isPending,
      })}
    >
      <Loading loading={isPending}>
        {isError ? (
          <Alert>{walletReadErrorMessage(error)}</Alert>
        ) : objectData ? (
          <>
            <PageTitle
              title={isBuyNLarge ? buyNLargeConfig?.sheetTitle : undefined}
              back
            />
            <div className="flex flex-1 flex-col flex-nowrap items-stretch gap-8">
              <div className="flex flex-col flex-nowrap items-center gap-3 self-center">
                {isBuyNLarge ? (
                  <div className="text-center">
                    <Text color="steel-darker" weight="medium">
                      {buyNLargeConfig?.sheetDescription}
                    </Text>
                  </div>
                ) : null}
                <NFTDisplayCard
                  objectId={nftId!}
                  size="xl"
                  borderRadius="xl"
                  playable
                />
                {nftId && !isBuyNLarge ? (
                  <Link
                    color="steelDark"
                    weight="semibold"
                    size="captionSmall"
                    href={objectExplorerLink || ""}
                    text={t("nft.viewExplorer")}
                    after={<ArrowUpRight12 />}
                  />
                ) : null}
              </div>
              {!isBuyNLarge ? (
                <>
                  <LabelValuesContainer>
                    {ownerExplorerLink ? (
                      <LabelValueItem
                        label={t("nft.owner")}
                        value={
                          <Link
                            color="rtdDark"
                            weight="medium"
                            size="body"
                            mono
                            href={ownerExplorerLink}
                            text={formatAddress(ownerAddress)}
                            title={t("nft.viewExplorer")}
                          />
                        }
                      />
                    ) : null}
                    <LabelValueItem
                      label={t("nft.objectId")}
                      value={
                        nftId ? (
                          <Link
                            color="rtdDark"
                            weight="medium"
                            size="body"
                            mono
                            href={objectExplorerLink || ""}
                            text={formatAddress(nftId)}
                            title={t("nft.viewExplorer")}
                          />
                        ) : null
                      }
                    />
                    <LabelValueItem
                      label={t("nft.mediaType")}
                      value={
                        filePath &&
                        fileExtensionType.name &&
                        fileExtensionType.type
                          ? `${fileExtensionType.name} ${fileExtensionType.type}`
                          : "-"
                      }
                    />
                  </LabelValuesContainer>
                  <Collapsible defaultOpen title={t("nft.details")}>
                    <LabelValuesContainer>
                      <LabelValueItem
                        label={t("nft.name")}
                        value={nftDisplayData?.name}
                      />
                      <LabelValueItem
                        label={t("nft.description")}
                        value={nftDisplayData?.description}
                        multiline
                      />
                      <LabelValueItem
                        label={t("nft.creator")}
                        value={nftDisplayData?.creator}
                      />
                      <LabelValueItem
                        label={t("nft.link")}
                        value={nftDisplayData?.link}
                      />
                      <LabelValueItem
                        label={t("nft.website")}
                        value={nftDisplayData?.projectUrl}
                      />
                    </LabelValuesContainer>
                  </Collapsible>
                  {attributes.length ? (
                    <Collapsible title={t("nft.attributes")} defaultOpen>
                      <LabelValuesContainer>
                        {attributes.map((attribute, idx) => (
                          <LabelValueItem
                            key={`${idx}:${attribute.name}`}
                            label={attribute.name}
                            value={attribute.value}
                          />
                        ))}
                      </LabelValuesContainer>
                    </Collapsible>
                  ) : null}

                  {isContainedInKiosk && kioskItem?.isLocked ? (
                    <div className="flex flex-col gap-2 mb-3">
                      <Button
                        after={<ArrowUpRight12 />}
                        variant="outline"
                        href="https://docs.rtd.io/build/rtd-kiosk"
                        text={t("nft.learnKiosks")}
                      />
                      <Button
                        after={<ArrowUpRight12 />}
                        variant="outline"
                        href={`https://rtd.hyperspace.xyz/wallet/rtd/${accountAddress}?tokenAddress=${nftId}`}
                        text={t("nft.marketplace")}
                      />
                    </div>
                  ) : (
                    <div className="mb-3 flex flex-1 items-end">
                      <Button
                        variant="primary"
                        size="tall"
                        disabled={!isTransferable}
                        to={`/nft-transfer/${nftId}`}
                        title={
                          isTransferable
                            ? undefined
                            : t("nft.transferUnavailable")
                        }
                        text={t("nft.send")}
                        after={<ArrowRight16 />}
                      />
                    </div>
                  )}
                </>
              ) : (
                <Button
                  variant="secondary"
                  onClick={() => navigate(-1)}
                  text={t("common.okay")}
                />
              )}
            </div>
          </>
        ) : (
          <Navigate to="/nfts" replace={true} />
        )}
      </Loading>
    </div>
  );
}

export default NFTDetailsPage;
