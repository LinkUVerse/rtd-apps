// Copyright (c) LinkU Labs, Inc.
// SPDX-License-Identifier: Apache-2.0
import {
  walletReadAllowed,
  walletReadKeyParts,
} from "rtd-apps-core/src/rpc/read-admission";

import {
  useWalletRpc,
  type WalletRpc,
} from "rtd-apps-core/src/rpc/WalletRpcContext";
import { useQuery } from "@tanstack/react-query";

export function getAllCoinsQueryKey(
  rpc: WalletRpc,
  coinType: string,
  address?: string | null,
) {
  return [
    "wallet-fresh-coins",
    rpc.bindingKey,
    rpc.readSessionKey,
    ...walletReadKeyParts(rpc, "freshCoins"),
    address,
    coinType,
  ] as const;
}

export async function fetchAllCoins(
  rpc: WalletRpc,
  coinType: string,
  address: string,
  signal?: AbortSignal,
) {
  return rpc.readFreshCoins(address, coinType, signal);
}

export function getAllCoinsQueryOptions(
  rpc: WalletRpc,
  coinType: string,
  address?: string | null,
) {
  return {
    queryKey: getAllCoinsQueryKey(rpc, coinType, address),
    queryFn: ({ signal }: { signal: AbortSignal }) =>
      fetchAllCoins(rpc, coinType, address!, signal),
    enabled:
      walletReadAllowed(rpc, "freshCoins") &&
      !!address &&
      rpc.state === "configured",
    retry: false,
    staleTime: 0,
    gcTime: 0,
    meta: { skipPersistedCache: true, walletReadOperation: "freshCoins" },
  };
}

/** Spending references always come from the live Fullnode, never the asset snapshot. */
export function useGetAllCoins(coinType: string, address?: string | null) {
  const rpc = useWalletRpc();
  const query = useQuery(getAllCoinsQueryOptions(rpc, coinType, address));
  return {
    ...query,
    data:
      !walletReadAllowed(rpc, "freshCoins") || query.isError
        ? undefined
        : query.data,
  };
}
