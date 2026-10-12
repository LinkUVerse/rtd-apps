// Copyright (c) LinkU Labs, Inc.
// SPDX-License-Identifier: Apache-2.0
import {
  walletReadAllowed,
  walletReadKeyParts,
} from "rtd-apps-core/src/rpc/read-admission";
import { useQuery } from "@tanstack/react-query";
import { useWalletRpc } from "rtd-apps-core/src/rpc/WalletRpcContext";
import { walletAddress } from "_src/shared/rpc/asset-reader";

export function useGetAllBalances(owner: string) {
  const rpc = useWalletRpc();
  const address = owner ? walletAddress(owner) : null;
  const readBlocked =
    !rpc.hasFullnodeSession || !walletReadAllowed(rpc, "freshBalance");
  const query = useQuery({
    queryKey: [
      "wallet-current-balances",
      rpc.bindingKey,
      rpc.readSessionKey,
      ...walletReadKeyParts(rpc, "freshBalance"),
      address,
    ],
    queryFn: ({ signal }) => {
      if (!rpc.readFreshBalances) throw new Error("余额查询服务尚未配置");
      return rpc.readFreshBalances(address!, signal);
    },
    enabled: !readBlocked && !!address && rpc.hasFullnodeSession,
    staleTime: 5_000,
    refetchInterval: (query) =>
      query.state.fetchStatus === "idle" ? 20_000 : false,
    refetchOnWindowFocus: (query) => query.state.fetchStatus === "idle",
    refetchOnReconnect: (query) => query.state.fetchStatus === "idle",
    retry: false,
    // Keep the existing fresh window across a brief page switch in this session.
    gcTime: 5_000,
    // Current funds must be read again after a cold start; never hydrate indexed balances.
    meta: { skipPersistedCache: true, walletReadOperation: "freshBalance" },
  });
  return {
    ...query,
    // Disabled queries stay pending/idle. Present admission separately so local
    // account controls do not depend on a network query ever being enabled.
    readBlocked,
    readChecking:
      readBlocked &&
      (rpc.readAdmission?.reasons?.freshBalance
        ? rpc.readAdmission.reasons.freshBalance === "checking"
        : rpc.readAdmission?.phase === "checking"),
    data: readBlocked || query.isError ? undefined : query.data,
  };
}
