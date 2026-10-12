// Copyright (c) LinkU Labs, Inc.
// SPDX-License-Identifier: Apache-2.0
import {
  DAppKitProvider,
  createDAppKit,
  useCurrentAccount,
  useDAppKit,
  type DAppKit,
} from "rtd-dapp-kit-react";
import { useMutation, type UseMutationResult } from "@tanstack/react-query";
import type { ReactNode } from "react";
import type { Transaction } from "rtd-typescript/transactions";
import type { ExplorerRpcClient } from "./ExplorerRpcClient";
import { useExplorerClient, useExplorerClientContext } from "./explorer-client";

// The Kit has no disposal API; reuse one instance per stable client instead of leaking render-created instances.
const kits = new WeakMap<
  ExplorerRpcClient,
  Map<boolean, DAppKit<string[], ExplorerRpcClient>>
>();
export function ExplorerWalletProvider({
  children,
  enableUnsafeBurner = false,
}: {
  children: ReactNode;
  enableUnsafeBurner?: boolean;
}) {
  const { client, network } = useExplorerClientContext();
  let clientKits = kits.get(client);
  if (!clientKits) {
    clientKits = new Map();
    kits.set(client, clientKits);
  }
  let kit = clientKits.get(enableUnsafeBurner);
  if (!kit) {
    kit = createDAppKit({
      networks: [client.network],
      createClient: () => client,
      autoConnect: true,
      slushWalletConfig: null,
      enableBurnerWallet: enableUnsafeBurner,
      storageKey: `rtd-explorer:wallet:v2:${encodeURIComponent(network)}:${enableUnsafeBurner ? "burner" : "standard"}`,
    });
    clientKits.set(enableUnsafeBurner, kit);
  }
  return <DAppKitProvider dAppKit={kit}>{children}</DAppKitProvider>;
}
export type ExplorerSignInput = {
  transaction: Transaction;
  signal?: AbortSignal;
};
export type ExplorerSignResult = Awaited<
  ReturnType<DAppKit<string[], ExplorerRpcClient>["signTransaction"]>
>;
export function useExplorerSignTransaction(): UseMutationResult<
  ExplorerSignResult,
  Error,
  ExplorerSignInput
> {
  const kit = useDAppKit<DAppKit<string[], ExplorerRpcClient>>();
  const account = useCurrentAccount();
  const client = useExplorerClient();
  return useMutation<ExplorerSignResult, Error, ExplorerSignInput>({
    mutationFn: async ({ transaction, signal }) => {
      if (!account) throw new Error("请先连接钱包账户");
      if (
        !["localnet", "devnet", "testnet", "mainnet"].includes(client.network)
      )
        throw new Error("自定义网络缺少明确的钱包链绑定");
      return kit.signTransaction({
        transaction,
        account,
        network: client.network,
        signal,
      });
    },
  });
}
