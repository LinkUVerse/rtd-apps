// Copyright (c) LinkU Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { assetAddress, useAssetQuery } from "./asset-hooks";

/** Entire configured Kiosk collection at the admitted asset snapshot. */
export function useGetKioskContents(
  owner?: string | null,
  options: { enabled?: boolean } = {},
) {
  const address = owner ? assetAddress(owner) : null;
  const query = useAssetQuery(
    "wallet-kiosks",
    address,
    !!address && options.enabled !== false,
    (reader, signal) => reader.kiosks(address!, signal),
  );
  const kiosks = query.isError ? undefined : query.data;
  return {
    ...query,
    data: kiosks && {
      kiosks: new Map(kiosks.map((kiosk) => [kiosk.kioskId, kiosk])),
      list: kiosks.flatMap((kiosk) => [...kiosk.items]),
      lookup: new Map(
        kiosks.flatMap((kiosk) =>
          kiosk.items.map((item) => [item.objectId, kiosk.kioskId] as const),
        ),
      ),
    },
  };
}
