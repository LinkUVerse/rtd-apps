// Copyright (c) LinkU Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { FEATURES } from "_src/shared/experimentation/features";
import {
  readActivity,
  writeActivity,
  type CachedActivity,
} from "_src/shared/rpc/activity-cache";
import { useFeatureValue } from "@growthbook/growthbook-react";
import { useWalletAccountHistory } from "rtd-apps-core/src/rpc/history-hooks";
import { useWalletRpc } from "rtd-apps-core/src/rpc/WalletRpcContext";
import { useEffect, useState } from "react";

/**
 * Activity reads plus a display-only cache of the newest verified page. The
 * cached rows are shown only until the verified read settles: a fresh page
 * replaces them (and is saved for the next visit); a failed read discards them,
 * so the error is never hidden behind old rows.
 */
export function useQueryTransactionsByAddress(address: string | null) {
  const interval = useFeatureValue(
    FEATURES.WALLET_ACTIVITY_REFETCH_INTERVAL,
    20_000,
  );
  const rpc = useWalletRpc();
  const history = useWalletAccountHistory(address, interval);
  const bindingKey = rpc.bindingKey;
  const key = address && bindingKey ? `${bindingKey}|${address}` : null;
  const [cached, setCached] = useState<{
    key: string | null;
    value: CachedActivity | undefined;
  }>({ key: null, value: undefined });
  useEffect(() => {
    if (!key || !address) return;
    let live = true;
    void readActivity(bindingKey, address).then((value) => {
      if (live) setCached({ key, value });
    });
    return () => {
      live = false;
    };
  }, [key, bindingKey, address]);
  const fresh = history.data;
  useEffect(() => {
    // Save only the first (newest) page of a verified result for this account.
    if (!fresh || !address || fresh.address.toLowerCase() !== address.toLowerCase())
      return;
    if (fresh.bindingKey !== bindingKey) return;
    void writeActivity(bindingKey, address, fresh);
  }, [fresh, address, bindingKey]);
  const fromCache =
    !fresh && !history.error && cached.key === key ? cached.value : undefined;
  return {
    ...history,
    /** Rows of the last visit, shown while the first verified read is in flight. */
    cached: fromCache,
  };
}
