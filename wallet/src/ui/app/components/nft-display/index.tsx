// Copyright (c) LinkU Labs, Inc.
// SPDX-License-Identifier: Apache-2.0
import { walletReadErrorMessage } from "_src/shared/rpc/read-error";

import { Heading } from "_app/shared/heading";
import { useI18n } from "_app/i18n";
import Loading from "_components/loading";
import { NftImage, type NftImageProps } from "_components/nft-display/NftImage";
import { useFileExtensionType } from "_hooks";
import { useGetObject } from "rtd-apps-core/src/rpc/asset-hooks";
import { collectibleKioskCap } from "../../../../shared/rpc/nft-assets";
import Alert from "../alert";
import {
  useWalletRpc,
  type WalletAssetObject,
} from "rtd-apps-core/src/rpc/WalletRpcContext";
import { displayString } from "rtd-apps-core/src/rpc/display";
import { formatAddress } from "rtd-typescript/utils";
import { cva } from "class-variance-authority";
import type { VariantProps } from "class-variance-authority";

import { useResolveVideo } from "../../hooks/useResolveVideo";
import { Text } from "../../shared/text";
import { Kiosk } from "./Kiosk";

const nftDisplayCardStyles = cva(
  "flex flex-nowrap items-center h-full relative",
  {
    variants: {
      animateHover: {
        true: "group",
      },
      wideView: {
        true: "bg-gray-40 p-2.5 rounded-lg gap-2.5 flex-row-reverse justify-between",
        false: "",
      },
      orientation: {
        horizontal: "flex truncate",
        vertical: "flex-col",
      },
    },
    defaultVariants: {
      wideView: false,
      orientation: "vertical",
    },
  },
);

export interface NFTDisplayCardProps extends VariantProps<
  typeof nftDisplayCardStyles
> {
  objectId: string;
  hideLabel?: boolean;
  size: NftImageProps["size"];
  borderRadius?: NftImageProps["borderRadius"];
  playable?: boolean;
  isLocked?: boolean;
}

export function NFTDisplayCard(props: NFTDisplayCardProps) {
  const { data, isError, error, isPending } = useGetObject(props.objectId);
  return (
    <NFTDisplayCardView
      {...props}
      objectData={isError ? undefined : data}
      isError={isError}
      error={error}
      isPending={!!props.objectId && isPending}
    />
  );
}

/** The parent owns the admitted collection and removes it on failure or scope change.
 * Render that exact object without adding a second query or an independent cache. */
export function NFTDisplayCardFromObject({
  object,
  ...props
}: Omit<NFTDisplayCardProps, "objectId"> & { object: WalletAssetObject }) {
  return (
    <NFTDisplayCardView
      {...props}
      objectId={object.objectId}
      objectData={object}
      isError={false}
      error={null}
      isPending={false}
    />
  );
}

function NFTDisplayCardView({
  objectId,
  hideLabel,
  size,
  wideView,
  animateHover,
  borderRadius = "md",
  playable,
  orientation,
  isLocked,
  objectData,
  isError,
  error,
  isPending,
}: NFTDisplayCardProps & {
  objectData?: WalletAssetObject | null;
  isError: boolean;
  error: unknown;
  isPending: boolean;
}) {
  const { t } = useI18n();
  const nftName = displayString(objectData, "name") || formatAddress(objectId);
  const nftImageUrl = displayString(objectData, "image_url") || "";
  const video = useResolveVideo(objectData);
  const fileExtensionType = useFileExtensionType(nftImageUrl);
  const { packages } = useWalletRpc();
  const isOwnerToken = !!collectibleKioskCap(objectData, packages);
  const shouldShowLabel = !wideView && orientation !== "horizontal";

  return (
    <div
      className={nftDisplayCardStyles({ animateHover, wideView, orientation })}
    >
      <Loading loading={isPending}>
        {isError ? (
          <Alert>{walletReadErrorMessage(error)}</Alert>
        ) : objectData && isOwnerToken ? (
          <Kiosk
            object={objectData}
            borderRadius={borderRadius}
            size={size}
            orientation={orientation}
            playable={playable}
            showLabel={shouldShowLabel}
          />
        ) : (
          <NftImage
            name={nftName}
            src={nftImageUrl}
            animateHover={animateHover}
            showLabel={shouldShowLabel}
            borderRadius={borderRadius}
            size={size}
            isLocked={isLocked}
            video={video}
          />
        )}
        {wideView && !isError && (
          <div className="flex flex-col gap-1 flex-1 min-w-0 ml-1">
            <Heading variant="heading6" color="gray-90" truncate>
              {nftName}
            </Heading>
            <div className="text-gray-75 text-body font-medium">
              {nftImageUrl ? (
                `${fileExtensionType.name} ${fileExtensionType.type}`
              ) : (
                <span className="uppercase font-normal text-bodySmall">
                  {t("nft.noMedia")}
                </span>
              )}
            </div>
          </div>
        )}

        {!isError &&
          (orientation === "horizontal" ? (
            <div className="flex-1 text-steel-dark overflow-hidden max-w-full ml-2">
              {nftName}
            </div>
          ) : !isOwnerToken && !hideLabel ? (
            <div className="w-10/12 absolute bottom-2 bg-white/90 rounded-lg left-1/2 -translate-x-1/2 flex items-center justify-center opacity-0 group-hover:opacity-100">
              <div className="mt-0.5 px-2 py-1 overflow-hidden">
                <Text
                  variant="subtitleSmall"
                  weight="semibold"
                  mono
                  color="steel-darker"
                  truncate
                >
                  {nftName}
                </Text>
              </div>
            </div>
          ) : null)}
      </Loading>
    </div>
  );
}
