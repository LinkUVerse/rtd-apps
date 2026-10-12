// Copyright (c) LinkU Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { useQuery } from "@tanstack/react-query";
import { useWalletRpc } from "rtd-apps-core/src/rpc/WalletRpcContext";
import { readStoredReceipt, type StoredReceiptRequest } from "./stored-receipt";

export function useWalletStoredReceipt(
  digest: string | null,
  account: { id: string; address: string } | null,
  background: {
    readStoredReceipt: (
      args: Omit<StoredReceiptRequest, "accountAddress">,
    ) => Promise<import("./execution-journal").WalletStoredReceipt | null>;
  },
) {
  const rpc = useWalletRpc();
  return useQuery({
    queryKey: [
      "wallet-stored-receipt",
      rpc.bindingKey,
      rpc.readSessionKey,
      account?.id,
      account?.address,
      digest,
    ],
    enabled: rpc.hasFullnodeSession && !!account && !!digest,
    queryFn: ({ signal }) =>
      readStoredReceipt(
        background,
        {
          accountId: account!.id,
          accountAddress: account!.address,
          bindingKey: rpc.bindingKey,
          digest: digest!,
        },
        AbortSignal.any([signal, AbortSignal.timeout(10_000)]),
      ),
    retry: false,
    gcTime: 0,
    staleTime: 0,
    refetchInterval: (query) =>
      query.state.data === null && query.state.dataUpdateCount + query.state.errorUpdateCount < 10
        ? 2_000
        : false,
    meta: { skipPersistedCache: true },
  });
}
