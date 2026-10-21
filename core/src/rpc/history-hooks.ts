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
    // A refresh — manual, on focus or from the interval — must not blank the
    // list: the previous page stays rendered until the new one arrives, and the
    // reader returns whole windows newest-first, so new transactions appear at
    // the head. Switching accounts drops it, so one address's rows never show
    // under another.
    placeholderData: (previous, previousQuery) =>
      previousQuery?.queryKey.at(-1) === address ? previous : undefined,
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
