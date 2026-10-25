// Copyright (c) LinkU Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { createContext, useContext } from "react";
import { useQuery } from "@tanstack/react-query";

/**
 * Structural surface of the Explorer's gRPC/GraphQL read facade. Kept loose so
 * this shared core package does not depend on the Explorer app's implementation.
 */
export type ExplorerRpcClientSurface = {
  getLatestRtdSystemState: (options?: { signal?: AbortSignal }) => Promise<any>;
  [method: string]: any;
};

/** Existing Explorer hooks only. Wallet consumers must use WalletRpcContext. */
export const ExplorerRpcContext = createContext<{
  client: ExplorerRpcClientSurface;
  network: string;
} | null>(null);

export function useExplorerRpcContext() {
  const value = useContext(ExplorerRpcContext);
  if (!value) throw new Error("缺少 Explorer 数据客户端 Provider");
  return value;
}

export function useExplorerRpcClient() {
  return useExplorerRpcContext().client;
}

export function useExplorerSystemState() {
  const { client, network } = useExplorerRpcContext();
  return useQuery({
    queryKey: ["explorer-system-state", network],
    queryFn: () => client.getLatestRtdSystemState(),
  });
}
