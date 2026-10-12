// Copyright (c) LinkU Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import type { WalletAssetObject } from "rtd-apps-core/src/rpc/WalletRpcContext";
import { displayString } from "rtd-apps-core/src/rpc/display";

import { useRecognizedPackages } from "./useRecognizedPackages";

export function useResolveVideo(object?: WalletAssetObject | null) {
  const recognizedPackages = useRecognizedPackages();

  if (!object) return null;

  const objectType = object.type;
  const isRecognized =
    objectType && recognizedPackages.includes(objectType.split("::")[0]);

  if (!isRecognized) return null;

  return displayString(object, "video_url");
}
