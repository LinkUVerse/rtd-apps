// Copyright (c) LinkU Labs, Inc.
// SPDX-License-Identifier: Apache-2.0
import { useExplorerClientContext } from "~/rpc/explorer-client";
import { ExplorerRpcContext } from "rtd-apps-core/src/rpc/ExplorerRpcContext";
import type { ReactNode } from "react";

/** Keeps Explorer's existing Kit ownership outside the shared core and the wallet. */
export function ExplorerRpcBridge({ children }: { children: ReactNode }) {
  const { client, network } = useExplorerClientContext();
  return (
    <ExplorerRpcContext.Provider value={{ client, network }}>
      {children}
    </ExplorerRpcContext.Provider>
  );
}
