// Copyright (c) LinkU Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { toBase64 } from "rtd-typescript/utils";
import type { WalletTransactionDetails } from "rtd-apps-core/src/rpc/WalletRpcContext";
import { walletAddress } from "./asset-address";
import {
  assertExecutionReceipt,
  type WalletStoredReceipt,
} from "./execution-journal";
import { assertGenesisDigest } from "./profile";

export interface StoredReceiptRequest {
  readonly accountId: string;
  readonly accountAddress: string;
  readonly bindingKey: string;
  readonly digest: string;
}
export async function readStoredReceipt(
  reader: {
    readStoredReceipt: (
      args: Omit<StoredReceiptRequest, "accountAddress">,
    ) => Promise<WalletStoredReceipt | null>;
  },
  request: StoredReceiptRequest,
  signal: AbortSignal,
): Promise<WalletStoredReceipt | null> {
  assertGenesisDigest(request.digest);
  signal.throwIfAborted();
  // Timeout/unmount affects only this read. The command has no journal or execution mutations.
  let onAbort = () => {};
  const aborted = new Promise<never>((_resolve, reject) => {
    onAbort = () => reject(signal.reason);
    signal.addEventListener("abort", onAbort, { once: true });
    if (signal.aborted) onAbort();
  });
  try {
    const result = await Promise.race([
      reader.readStoredReceipt({
        accountId: request.accountId,
        bindingKey: request.bindingKey,
        digest: request.digest,
      }),
      aborted,
    ]);
    signal.throwIfAborted();
    if (result) {
      if (
        result.bindingKey !== request.bindingKey ||
        walletAddress(result.accountAddress) !==
          walletAddress(request.accountAddress) ||
        result.receipt.digest !== request.digest
      )
        throw new Error("已确认交易记录不属于当前链账户／摘要");
      assertExecutionReceipt(result.receipt);
    }
    return result;
  } finally {
    signal.removeEventListener("abort", onAbort);
  }
}
/** A valid durable chain terminal state survives a temporarily unavailable rich detail endpoint. */
export function selectReceiptFacts(
  details: WalletTransactionDetails | null | undefined,
  stored: WalletStoredReceipt | null | undefined,
) {
  const receipt = stored?.receipt;
  if (receipt) assertExecutionReceipt(receipt);
  const transaction = details?.transaction;
  const conflict = !!(
    receipt &&
    transaction &&
    (transaction.digest !== receipt.digest ||
      transaction.status.success !== receipt.success ||
      transaction.epoch !== receipt.epoch ||
      (receipt.checkpoint !== null &&
        transaction.checkpoint !== null &&
        transaction.checkpoint !== receipt.checkpoint) ||
      toBase64(transaction.effects.bcs!) !== receipt.effectsBase64)
  );
  return {
    transaction: conflict ? undefined : transaction,
    confirmed: receipt ? receipt.success : transaction?.status.success,
    receipt,
    conflict,
  };
}
