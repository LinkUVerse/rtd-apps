// Copyright (c) LinkU Labs, Inc.
// SPDX-License-Identifier: Apache-2.0
import { walletReadAllowed, walletReadKeyParts } from "./read-admission";
import { useQuery } from "@tanstack/react-query";
import { createContext, createElement, useContext, useEffect, useRef, type ReactNode } from "react";
import { assetAddress } from "./asset-hooks";
import { useWalletRpc } from "./WalletRpcContext";

const StakingViewContext = createContext<{
  owner: string | undefined;
  query: ReturnType<typeof useStakingViewQuery>;
} | null>(null);

/** Keep one observer alive while navigating within the staking workflow. */
export function WalletStakingViewProvider({
  owner,
  children,
}: {
  owner: string | null;
  children: ReactNode;
}) {
  const address = owner ? assetAddress(owner) : undefined;
  const query = useStakingViewQuery(address, { enabled: !!address });
  return createElement(StakingViewContext.Provider, {
    value: { owner: address, query },
    children,
  });
}

export function useStakingView(
  owner?: string | null,
  options: { enabled?: boolean } = {},
) {
  const scope = useContext(StakingViewContext);
  const address = owner ? assetAddress(owner) : undefined;
  // The owner's complete view also contains the global validators and pools.
  // An explicitly different owner must retain its own query and cancellation.
  const shared = !!scope?.owner && (!address || address === scope.owner);
  const fallback = useStakingViewQuery(owner, {
    ...options,
    enabled: options.enabled !== false && !shared,
  });
  const query = shared && options.enabled !== false ? scope!.query : null;
  const currentShared = useRef(query);
  currentShared.current = query;
  const refetch = query?.refetch;
  useEffect(() => {
    const mounted = currentShared.current;
    // Keep the existing stale-on-mount policy, but never cancel a shared read
    // merely because another child joins it. The parent owns the polling timer.
    if (mounted?.isStale && mounted.fetchStatus === "idle")
      void mounted.refetch({ cancelRefetch: false });
  }, [refetch, address]);
  return query ?? fallback;
}

/** Current system plus all active/inactive pools, rates and optional owned positions at one S. */
function useStakingViewQuery(
  owner?: string | null,
  options: { enabled?: boolean } = {},
) {
  const address = owner ? assetAddress(owner) : undefined;
  const rpc = useWalletRpc();
  const query = useQuery({
    queryKey: [
      "wallet-staking",
      rpc.bindingKey,
      rpc.readSessionKey,
      ...walletReadKeyParts(rpc, "staking"),
      address ?? null,
    ],
    queryFn: ({ signal }) => {
      if (!rpc.readStakingView) throw new Error("质押查询服务尚未配置");
      return rpc.readStakingView(address, signal);
    },
    enabled:
      walletReadAllowed(rpc, "staking") &&
      options.enabled !== false &&
      (rpc.state !== "initializing" || rpc.hasFullnodeSession),
    retry: false,
    staleTime: 5_000,
    gcTime: 5_000,
    refetchInterval: (query) =>
      query.state.fetchStatus === "idle" ? 20_000 : false,
    refetchOnWindowFocus: (query) => query.state.fetchStatus === "idle",
    refetchOnReconnect: (query) => query.state.fetchStatus === "idle",
    meta: { skipPersistedCache: true, walletReadOperation: "staking" },
  });
  return {
    ...query,
    data:
      options.enabled === false ||
      !walletReadAllowed(rpc, "staking") ||
      query.isError
        ? undefined
        : query.data?.value,
    snapshot:
      options.enabled === false ||
      !walletReadAllowed(rpc, "staking") ||
      query.isError
        ? undefined
        : query.data?.snapshot,
  };
}
