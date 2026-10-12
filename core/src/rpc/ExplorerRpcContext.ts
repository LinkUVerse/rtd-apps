// Copyright (c) LinkU Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { createContext, useContext } from "react";
import { useQuery } from "@tanstack/react-query";
import type { RtdJsonRpcClient } from "rtd-typescript/jsonRpc";

/** Existing Explorer hooks only. Wallet consumers must use WalletRpcContext. */
export const ExplorerRpcContext = createContext<{
  client: RtdJsonRpcClient;
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
