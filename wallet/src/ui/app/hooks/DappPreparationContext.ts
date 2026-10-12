// Copyright (c) LinkU Labs, Inc.
// SPDX-License-Identifier: Apache-2.0
import { createContext } from "react";
import type { WalletPreparedTransaction } from "rtd-apps-core/src/rpc/WalletRpcContext";
export interface DappApproval {
  readonly accountId: string;
  readonly requestId: string;
  readonly approvalToken: string;
  readonly expiresAt: number;
}
export type ApprovalPreparedTransaction = WalletPreparedTransaction & {
  readonly dappApproval?: DappApproval;
};
export const DappPreparationContext = createContext<{
  readonly requestId: string;
  readonly accountId: string | undefined;
  readonly prepare: (
    signal: AbortSignal,
  ) => Promise<ApprovalPreparedTransaction>;
} | null>(null);


/** Share only in-flight background preparation within one immutable request scope.
 * React effect replay cancels a UI observer, not the authorized background request.
 * Every observer still rejects its own late result after cancellation.
 */
export function coalesceDappPreparation<T>(operation: () => Promise<T>) {
  let pending: Promise<T> | undefined;
  return async (signal: AbortSignal): Promise<T> => {
    signal.throwIfAborted();
    if (!pending) {
      const current = operation();
      pending = current;
      void current.finally(() => { if (pending === current) pending = undefined; }).catch(() => undefined);
    }
    const result = await pending;
    signal.throwIfAborted();
    return result;
  };
}
