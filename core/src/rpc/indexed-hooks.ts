// Copyright (c) LinkU Labs, Inc.
// SPDX-License-Identifier: Apache-2.0
import { walletReadAllowed, walletReadKeyParts } from "./read-admission";

import { useQuery } from "@tanstack/react-query";
import { useWalletRpc } from "./WalletRpcContext";
import type { IndexedEventFilter, IndexedListOptions } from "./indexed-types";

type Options = Omit<IndexedListOptions, "signal">;
export function useSentTransactions(sender: string | null, options: Options) {
  const rpc = useWalletRpc();
  const query = useQuery({
    queryKey: [
      "wallet-indexed-transactions",
      rpc.bindingKey,
      rpc.readSessionKey,
      ...walletReadKeyParts(rpc, "sentTransactions"),
      sender,
      options,
    ],
    queryFn: ({ signal }) => {
      if (!rpc.readSentTransactions)
        throw new Error("当前网络未配置原生GraphQL发送记录查询");
      return rpc.readSentTransactions(sender!, { ...options, signal });
    },
    enabled:
      walletReadAllowed(rpc, "sentTransactions") &&
      !!sender &&
      rpc.state !== "initializing",
    retry: false,
    gcTime: 0,
    meta: { skipPersistedCache: true, walletReadOperation: "sentTransactions" },
  });
  return {
    ...query,
    data:
      !walletReadAllowed(rpc, "sentTransactions") || query.isError
        ? undefined
        : query.data,
  };
}
export function useIndexedEvents(
  filter: IndexedEventFilter | null,
  options: Options,
) {
  const rpc = useWalletRpc();
  const operation = filter?.type ? "eventsByType" : "eventsByModule";
  const query = useQuery({
    queryKey: [
      "wallet-indexed-events",
      rpc.bindingKey,
      rpc.readSessionKey,
      ...walletReadKeyParts(rpc, operation),
      filter,
      options,
    ],
    queryFn: ({ signal }) => {
      if (!rpc.readIndexedEvents)
        throw new Error("当前网络未配置原生GraphQL事件查询");
      return rpc.readIndexedEvents(filter!, { ...options, signal });
    },
    enabled:
      walletReadAllowed(rpc, operation) &&
      !!filter &&
      rpc.state !== "initializing",
    retry: false,
    gcTime: 0,
    meta: { skipPersistedCache: true, walletReadOperation: operation },
  });
  return {
    ...query,
    data:
      !walletReadAllowed(rpc, operation) || query.isError
        ? undefined
        : query.data,
  };
}
