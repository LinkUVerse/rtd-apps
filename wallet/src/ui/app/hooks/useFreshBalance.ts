// Copyright (c) LinkU Labs, Inc.
// SPDX-License-Identifier: Apache-2.0
import {
  walletReadAllowed,
  walletReadKeyParts,
} from "rtd-apps-core/src/rpc/read-admission";
import { useQuery } from "@tanstack/react-query";
import { normalizeStructTag } from "rtd-typescript/utils";
import { useWalletRpc } from "rtd-apps-core/src/rpc/WalletRpcContext";
import { walletAddress } from "_src/shared/rpc/asset-address";

export function useFreshBalance(coinType: string, address?: string | null) {
  const rpc = useWalletRpc();
  const owner = address ? walletAddress(address) : null;
  const type = normalizeStructTag(coinType);
  const query = useQuery({
    queryKey: [
      "wallet-fresh-balance",
      rpc.bindingKey,
      rpc.readSessionKey,
      ...walletReadKeyParts(rpc, "freshBalance"),
      owner,
      type,
    ],
    queryFn: ({ signal }) => rpc.readFreshBalance(owner!, type, signal),
    enabled:
      walletReadAllowed(rpc, "freshBalance") &&
      rpc.hasFullnodeSession &&
      !!owner,
    retry: false,
    staleTime: 0,
    gcTime: 0,
    meta: { skipPersistedCache: true, walletReadOperation: "freshBalance" },
  });
  return {
    ...query,
    data:
      !walletReadAllowed(rpc, "freshBalance") || query.isError
        ? undefined
        : query.data,
  };
}
