// Copyright (c) LinkU Labs, Inc.
// SPDX-License-Identifier: Apache-2.0
import { walletReadAllowed, walletReadKeyParts } from "./read-admission";

import { useQuery } from "@tanstack/react-query";
import { useWalletRpc } from "./WalletRpcContext";

export function useWalletTransactionDetails(digest?: string | null) {
  const rpc = useWalletRpc();
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
    // An absent recent receipt is not proof of rejection or permission to resend.
    refetchInterval: (query) =>
      (query.state.data === null ||
        query.state.data?.transaction.checkpoint === null) &&
      query.state.dataUpdateCount + query.state.errorUpdateCount < 10
        ? 2_000
        : false,
    meta: { skipPersistedCache: true, walletReadOperation: "receipts" },
  });
  return {
    ...query,
    data:
      !walletReadAllowed(rpc, "receipts") || query.isError
        ? undefined
        : query.data,
  };
}
