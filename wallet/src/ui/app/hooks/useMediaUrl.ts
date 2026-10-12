// Copyright (c) LinkU Labs, Inc.
// SPDX-License-Identifier: Apache-2.0
import { assetMediaUrl } from "../../../shared/rpc/nft-assets";
export const parseIpfsUrl = (url: string) =>
  url.replace(/^ipfs:\/\//, "https://ipfs.io/ipfs/");
export default function useMediaUrl(json: Record<string, unknown> | null) {
  return assetMediaUrl(json);
}
