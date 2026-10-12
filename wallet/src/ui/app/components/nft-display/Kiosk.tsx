// Copyright (c) LinkU Labs, Inc.
// SPDX-License-Identifier: Apache-2.0
import { walletReadErrorMessage } from "_src/shared/rpc/read-error";
import { hasDisplayData, displayString } from "rtd-apps-core/src/rpc/display";
import { useGetKioskContents } from "rtd-apps-core/src/rpc/kiosk-hooks";
import { useWalletRpc } from "rtd-apps-core/src/rpc/WalletRpcContext";
import { collectibleKioskCap } from "../../../../shared/rpc/nft-assets";
import Alert from "../alert";
import type { WalletAssetObject } from "rtd-apps-core/src/rpc/WalletRpcContext";
import cl from "clsx";

import { useActiveAddress } from "../../hooks";
import { Text } from "../../shared/text";
import { NftImage, type NftImageProps } from "./NftImage";

type KioskProps = {
  object: WalletAssetObject;
  orientation?: "vertical" | "horizontal" | null;
} & Partial<NftImageProps>;

// used to prevent the top image from overflowing the bottom of the container
// (clip-path is used instead of overflow-hidden as it can be animated)
const clipPath =
  "[clip-path:inset(0_0_7px_0_round_12px)] group-hover:[clip-path:inset(0_0_0_0)]";

const timing =
  "transition-all group-hover:delay-[0.25s] duration-300 ease-[cubic-bezier(0.68,-0.55,0.265,1.55)]";
const cardStyles = [
  `scale-100 group-hover:scale-95 object-cover origin-bottom z-30 group-hover:translate-y-0 translate-y-2 group-hover:shadow-md`,
  `scale-[0.95] group-hover:-rotate-6 group-hover:-translate-x-5 group-hover:-translate-y-2 z-20 translate-y-0 group-hover:shadow-md`,
  `scale-[0.90] group-hover:rotate-6 group-hover:translate-x-5 group-hover:-translate-y-2 z-10 -translate-y-2 group-hover:shadow-xl`,
];

function getLabel(item?: WalletAssetObject) {
  if (!item) return;
  return (
    displayString(item, "name") ??
    displayString(item, "description") ??
    item.objectId
  );
}

export function Kiosk({ object, orientation, ...nftImageProps }: KioskProps) {
  const address = useActiveAddress();
  const {
    data: kioskData,
    isPending,
    isError,
    error,
  } = useGetKioskContents(address);
  const { packages } = useWalletRpc();

  const kioskId = collectibleKioskCap(object, packages)?.kioskId;
  const kiosk = kioskData?.kiosks.get(kioskId!);
  const itemsWithDisplay =
    kiosk?.items.filter((item) => hasDisplayData(item)) ?? [];

  const showCardStackAnimation =
    itemsWithDisplay.length > 1 && orientation !== "horizontal";
  const imagesToDisplay = orientation !== "horizontal" ? 3 : 1;
  const items = itemsWithDisplay.slice(0, imagesToDisplay);

  // get the label for the first item to show on hover
  const displayName = getLabel(items[0]);

  if (isPending) return null;
  if (isError) return <Alert>{walletReadErrorMessage(error)}</Alert>;
  if (!kiosk) return <Alert>当前快照未证明此 Kiosk 由当前账户持有</Alert>;

  return (
    <div className="relative hover:bg-transparent group rounded-xl transform-gpu overflow-visible w-36 h-36">
      <div className="absolute z-0">
        {itemsWithDisplay.length === 0 ? (
          <NftImage animateHover src={null} name="Kiosk" {...nftImageProps} />
        ) : (
          items.map((item, idx) => {
            const image = displayString(item, "image_url");
            return (
              <div
                key={item.objectId}
                className={cl(
                  "absolute rounded-xl border",
                  timing,
                  showCardStackAnimation ? cardStyles[idx] : "",
                )}
              >
                <div
                  className={`${idx === 0 && showCardStackAnimation ? clipPath : ""} ${timing}`}
                >
                  <NftImage
                    {...nftImageProps}
                    src={image}
                    animateHover={items.length <= 1}
                    name="Kiosk"
                  />
                </div>
              </div>
            );
          })
        )}
      </div>
      {orientation !== "horizontal" && (
        <div
          className={cl(
            timing,
            {
              "group-hover:-translate-x-0.5 group-hover:scale-95":
                showCardStackAnimation,
            },
            "bottom-1.5 absolute gap-3 flex items-center justify-end w-full overflow-hidden px-2",
          )}
        >
          {displayName ? (
            <div className="flex items-center justify-center group-hover:opacity-100 opacity-0 px-2 py-1.5 bg-white/90 rounded-md overflow-hidden">
              <Text
                variant="subtitleSmall"
                weight="semibold"
                mono
                color="steel-darker"
                truncate
              >
                {displayName}
              </Text>
            </div>
          ) : null}

          <div className="flex-shrink-0 flex items-center justify-center h-6 w-6 bg-gray-100 text-white rounded-md">
            <Text variant="subtitle" weight="medium">
              {kiosk?.items.length}
            </Text>
          </div>
        </div>
      )}
    </div>
  );
}
