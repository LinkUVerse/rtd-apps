// Copyright (c) LinkU Labs, Inc.
// SPDX-License-Identifier: Apache-2.0
import { useAppsBackend } from "rtd-apps-core/src/hooks/useAppsBackend";
import { useWalletRpc } from "rtd-apps-core/src/rpc/WalletRpcContext";
import type { Transaction } from "rtd-typescript/transactions";
import { useQuery } from "@tanstack/react-query";
import { usePreparedTransaction } from "../../hooks/usePreparedTransaction";
import { walletExternalServicesEnabled } from "_src/shared/external-services";
import {
  RequestType,
  type DappPreflightRequest,
  type DappPreflightResponse,
  type Network,
} from "./types";
export function useDappPreflight({
  requestType,
  origin,
  transaction,
  requestId,
  network,
}: {
  requestType: RequestType;
  origin?: string;
  transaction?: Transaction;
  requestId: string;
  network: Network;
}) {
  const { request } = useAppsBackend();
  const rpc = useWalletRpc();
  const needsTransaction = requestType === RequestType.SIGN_TRANSACTION;
  const preparation = usePreparedTransaction(
    walletExternalServicesEnabled && needsTransaction ? transaction?.getData().sender : null,
    walletExternalServicesEnabled && needsTransaction ? transaction : null,
  );
  const prepared = preparation.data;
  const query = useQuery({
    queryKey: [
      "dapp-preflight",
      rpc.bindingKey,
      rpc.readSessionKey,
      requestId,
      requestType,
      origin,
      network,
      prepared?.digest,
      walletExternalServicesEnabled,
    ],
    queryFn: async ({ signal }) => {
      // Explicit refetch bypasses enabled; enforce the build policy at I/O too.
      if (!walletExternalServicesEnabled)
        throw new Error("应用安全预检外部服务未启用");
      if (!origin) throw new Error("No origin provided");
      const body: DappPreflightRequest = { network, requestType, origin };
      if (needsTransaction) {
        if (!prepared) throw new Error("交易准备结果不可用");
        body.transactionBytes = prepared.bytesBase64;
      }
      const result = await request<DappPreflightResponse>(
        "v1/dapp-preflight",
        {},
        {
          method: "POST",
          body: JSON.stringify(body),
          headers: { "Content-Type": "application/json" },
          signal,
        },
      );
      signal.throwIfAborted();
      return result;
    },
    enabled: walletExternalServicesEnabled && !!origin && (!needsTransaction || !!prepared),
    staleTime: 5 * 60 * 1000,
    gcTime: 0,
    retry: false,
    meta: { skipPersistedCache: true },
  });
  const isError = !walletExternalServicesEnabled || query.isError || (needsTransaction && preparation.isError);
  return {
    ...query,
    isPending: walletExternalServicesEnabled && query.isPending,
    isError,
    data: isError ? undefined : query.data,
  };
}
