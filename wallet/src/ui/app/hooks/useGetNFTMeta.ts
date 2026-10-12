// Copyright (c) LinkU Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { useGetObject } from "rtd-apps-core/src/rpc/asset-hooks";
import { displayString, hasDisplayData } from "rtd-apps-core/src/rpc/display";
import { useMemo } from "react";

export type NFTMetadata = {
  name: string | null;
  description: string | null;
  imageUrl: string | null;
  link: string | null;
  projectUrl: string | null;
  creator: string | null;
};

export function useGetNFTMeta(objectID: string) {
  const resp = useGetObject(objectID);
  const nftMeta = useMemo(() => {
    if (resp.isError || !hasDisplayData(resp.data)) return null;
    return {
      name: displayString(resp.data, "name"),
      description: displayString(resp.data, "description"),
      imageUrl: displayString(resp.data, "image_url"),
      link: displayString(resp.data, "link"),
      projectUrl: displayString(resp.data, "project_url"),
      creator: displayString(resp.data, "creator"),
    };
  }, [resp.data, resp.isError]);
  return {
    ...resp,
    isPending: !!objectID && resp.isPending,
    data: nftMeta,
  };
}
