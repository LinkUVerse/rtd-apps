// Copyright (c) LinkU Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { FEATURES } from "_src/shared/experimentation/features";
import { useFeatureValue } from "@growthbook/growthbook-react";
import { useWalletAccountHistory } from "rtd-apps-core/src/rpc/history-hooks";

export function useQueryTransactionsByAddress(address: string | null) {
  const interval = useFeatureValue(
    FEATURES.WALLET_ACTIVITY_REFETCH_INTERVAL,
    20_000,
  );
  return useWalletAccountHistory(address, interval);
}
