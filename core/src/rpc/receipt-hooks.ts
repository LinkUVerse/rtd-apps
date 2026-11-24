// Copyright (c) LinkU Labs, Inc.
// SPDX-License-Identifier: Apache-2.0
import { walletReadAllowed, walletReadKeyParts } from "./read-admission";

import { useQuery } from "@tanstack/react-query";
import { useEffect } from "react";
import { useWalletRpc } from "./WalletRpcContext";
import type { WalletTransactionDetails } from "./WalletRpcContext";

// A read session rotates while a receipt stays open. Keep the last verified
// detail for the same chain/digest so the card does not vanish on rotation.
const detailCache = new Map<string, WalletTransactionDetails>();
const DETAIL_CACHE_LIMIT = 50;

export function useWalletTransactionDetails(digest?: string | null) {
  const rpc = useWalletRpc();
  const cacheKey = digest ? `${rpc.bindingKey}|${digest}` : null;
  const query = useQuery({
    queryKey: [
      "wallet-transaction-details",
      rpc.bindingKey,
      rpc.readSessionKey,
      ...walletReadKeyParts(rpc, "receipts"),
      digest,
    ],
    queryFn: ({ signal }) => rpc.readTransactionDetails(digest!, signal),
    enabled:
      walletReadAllowed(rpc, "receipts") && rpc.hasFullnodeSession && !!digest,
    retry: false,
    gcTime: 0,
    // A detail read can fail after an earlier success (for example when the
    // fullnode prunes an epoch). Keep the last verified detail on screen until
    // the user asks to refresh again.
    placeholderData: (previous) =>
      previous ?? (cacheKey ? detailCache.get(cacheKey) : undefined),
    meta: { skipPersistedCache: true, walletReadOperation: "receipts" },
  });
  useEffect(() => {
    if (!cacheKey || !query.data) return;
    detailCache.set(cacheKey, query.data);
    if (detailCache.size > DETAIL_CACHE_LIMIT) {
      const oldest = detailCache.keys().next().value;
      if (oldest) detailCache.delete(oldest);
    }
  }, [cacheKey, query.data]);
  return { ...query, data: query.data };
}
