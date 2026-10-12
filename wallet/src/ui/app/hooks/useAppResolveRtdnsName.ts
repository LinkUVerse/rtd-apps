// Copyright (c) LinkU Labs, Inc.
// SPDX-License-Identifier: Apache-2.0
import { useFeatureIsOn } from "@growthbook/growthbook-react";
import { normalizeRtdNSName } from "rtd-typescript/utils";

import { useDefaultRtdNSName } from "rtd-apps-core/src/rpc/name-hooks";

export function useResolveRtdNSName(address?: string) {
  const enableNewRtdnsFormat = useFeatureIsOn(
    "wallet-enable-new-rtdns-name-format",
  );
  const { data } = useDefaultRtdNSName(address);
  return data
    ? normalizeRtdNSName(data, enableNewRtdnsFormat ? "at" : "dot")
    : undefined;
}
