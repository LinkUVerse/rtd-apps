// Copyright (c) LinkU Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { Link } from "react-router-dom";
import { Text } from "_src/ui/app/shared/text";
import { useI18n } from "_app/i18n";
import type { WalletAssetObject } from "rtd-apps-core/src/rpc/WalletRpcContext";
import { formatAddress, parseStructTag } from "rtd-typescript/utils";

export default function NonVisualAssets({
  items,
}: {
  items: WalletAssetObject[];
}) {
  const { t } = useI18n();
  return (
    <div className="flex flex-col items-center gap-4 w-full flex-1">
      {items?.length ? (
        <div className="flex flex-col flex-wrap w-full divide-y divide-solid divide-gray-40 divide-x-0 gap-3">
          {items.map((item) => {
            const { address, module, name } = parseStructTag(item.type!);
            return (
              <div className="grid grid-cols-3 pt-3" key={item.objectId}>
                <Link
                  className="text-hero-dark no-underline"
                  to={`/nft-details?${new URLSearchParams({ objectId: item.objectId })}`}
                >
                  <Text variant="pBody">{formatAddress(item.objectId!)}</Text>
                </Link>

                <div className="break-all col-span-2">
                  <Text
                    variant="pBodySmall"
                    weight="normal"
                    mono
                    color="steel"
                    title={item.type ?? ""}
                  >
                    {`${formatAddress(address)}::${module}::${name}`}
                  </Text>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="flex flex-1 items-center self-center text-caption font-semibold text-steel-darker">
          {t("assets.noAssets")}
        </div>
      )}
    </div>
  );
}
