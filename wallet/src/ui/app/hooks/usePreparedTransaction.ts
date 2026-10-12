// Copyright (c) LinkU Labs, Inc.
// SPDX-License-Identifier: Apache-2.0
import { useContext } from "react";
import {
  DappPreparationContext,
  type ApprovalPreparedTransaction,
} from "./DappPreparationContext";
import { useQuery } from "@tanstack/react-query";
import { Transaction } from "rtd-typescript/transactions";
import { useWalletRpc } from "rtd-apps-core/src/rpc/WalletRpcContext";
import { walletAddress } from "_src/shared/rpc/asset-address";

/** One immutable Fullnode preparation shared by all preview consumers. Never persists signing bytes. */
export function usePreparedTransaction(
  sender?: string | null,
  transaction?: Transaction | null,
) {
  const rpc = useWalletRpc();
  const dapp = useContext(DappPreparationContext);
  // serialize() emits legacy v1 and rejects FundsWithdrawal. Capture the modern
  // synchronous snapshot; asynchronous serialization/resolution belongs to preparation.
  const serialized = transaction ? JSON.stringify(transaction.getData(),
    (_key, value) => typeof value === "bigint" ? value.toString() : value) : undefined;
  const owner = sender ? walletAddress(sender) : null;
  const query = useQuery({
    queryKey: [
      "wallet-transaction-preview",
      rpc.bindingKey,
      // dApp preparation belongs to the background session. Frontend admission
      // must not start a second preparation while its first request holds the lock.
      dapp ? null : rpc.readSessionKey,
      owner,
      serialized,
      ...(dapp ? [dapp.requestId, dapp.accountId] : []),
    ],
    queryFn: async ({ signal }) => {
      // Capture the same serialized input used for the query key, not a subsequently mutated Transaction.
      const prepared: ApprovalPreparedTransaction = dapp
        ? await dapp.prepare(signal)
        : await rpc.prepareTransaction(
            Transaction.from(serialized!),
            owner!,
            signal,
          );
      signal.throwIfAborted();
      if (
        prepared.bindingKey !== rpc.bindingKey ||
        (!dapp && prepared.readSessionKey !== rpc.readSessionKey) ||
        prepared.sender !== owner
      )
        throw new Error("交易预览的钱包会话或发送账户不匹配");
      return prepared;
    },
    enabled:
      (!dapp || !!dapp.accountId) &&
      !!serialized &&
      !!owner &&
      (rpc.state !== "initializing" || rpc.hasFullnodeSession),
    staleTime: Infinity,
    gcTime: 0,
    retry: false,
    meta: { skipPersistedCache: true },
  });
  // Refetch errors cannot leave a previous successful preview available for approval.
  return { ...query, data: query.isError ? undefined : query.data };
}
