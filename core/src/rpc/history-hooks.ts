// Copyright (c) LinkU Labs, Inc.
// SPDX-License-Identifier: Apache-2.0
import { walletReadAllowed, walletReadKeyParts } from "./read-admission";

import { useQuery } from "@tanstack/react-query";
import { useWalletRpc } from "./WalletRpcContext";

export function useWalletAccountHistory(
  address?: string | null,
  refreshInterval = 20_000,
) {
  const rpc = useWalletRpc();
  const query = useQuery({
    queryKey: [
      "wallet-account-history",
      rpc.bindingKey,
      rpc.readSessionKey,
      ...walletReadKeyParts(rpc, "history"),
      address,
    ],
    queryFn: ({ signal }) => rpc.readAccountHistory(address!, signal),
    enabled:
      walletReadAllowed(rpc, "history") && rpc.hasFullnodeSession && !!address,
    retry: false,
    gcTime: 10_000,
    staleTime: 10_000,
    refetchInterval: refreshInterval,
    meta: { skipPersistedCache: true, walletReadOperation: "history" },
  });
  return {
    ...query,
    data:
      !walletReadAllowed(rpc, "history") || query.isError
        ? undefined
        : query.data,
  };
}
