// Copyright (c) LinkU Labs, Inc.
// SPDX-License-Identifier: Apache-2.0
import { walletReadAllowed, walletReadKeyParts } from "./read-admission";

import { useQuery } from "@tanstack/react-query";
import { isValidRtdAddress, normalizeRtdAddress } from "rtd-typescript/utils";
import {
  useWalletRpc,
  type WalletRpc,
  type WalletHistoryCoverage,
} from "./WalletRpcContext";

export type RecipientInspection =
  | { readonly kind: "object"; readonly address: string }
  | {
      readonly kind: "history-observed" | "no-supported-activity";
      readonly address: string;
      readonly checkpointLo: number;
      readonly checkpointHi: number;
      readonly coverage: WalletHistoryCoverage;
    };

/** Read-only warning. Neither absence of a current object nor any history result authorizes sending. */
export async function inspectRecipient(
  rpc: WalletRpc,
  value: string,
  callerSignal?: AbortSignal,
): Promise<RecipientInspection> {
  if (!isValidRtdAddress(value)) throw new Error("收件人地址无效");
  const address = normalizeRtdAddress(value);
  const signal = AbortSignal.any([
    AbortSignal.timeout(20_000),
    ...(callerSignal ? [callerSignal] : []),
  ]);
  signal.throwIfAborted();
  const object = await rpc.readFreshObject(address, signal);
  signal.throwIfAborted();
  if (object) {
    if (object.objectId !== address) throw new Error("收件人对象响应不匹配");
    return { kind: "object", address };
  }
  // The first page is enough: the recipient only needs to know whether any
  // supported activity exists in the fixed window.
  const history = await rpc.readAccountHistory(address, signal, {
    continuation: null,
  });
  signal.throwIfAborted();
  if (
    history.address !== address ||
    history.bindingKey !== rpc.bindingKey ||
    history.readSessionKey !== rpc.readSessionKey
  )
    throw new Error("收件人历史响应绑定不匹配");
  return {
    kind: history.transactions.length
      ? "history-observed"
      : "no-supported-activity",
    address,
    checkpointLo: history.checkpointLo,
    checkpointHi: history.checkpointHi,
    coverage: history.coverage,
  };
}

export function useRecipientInspection(value: string) {
  const rpc = useWalletRpc();
  const address = isValidRtdAddress(value) ? normalizeRtdAddress(value) : null;
  const query = useQuery({
    queryKey: [
      "wallet-recipient-inspection",
      rpc.bindingKey,
      rpc.readSessionKey,
      ...walletReadKeyParts(rpc, "recipient"),
      address,
    ],
    queryFn: ({ signal }) => inspectRecipient(rpc, address!, signal),
    enabled:
      walletReadAllowed(rpc, "recipient") &&
      !!address &&
      (rpc.hasFullnodeSession || rpc.state !== "initializing"),
    retry: false,
    staleTime: 0,
    gcTime: 0,
    refetchOnWindowFocus: false,
    meta: { skipPersistedCache: true, walletReadOperation: "recipient" },
  });
  return {
    ...query,
    data:
      !walletReadAllowed(rpc, "recipient") || query.isError
        ? undefined
        : query.data,
    inspectingAddress: !!address,
  };
}
