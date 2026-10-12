// Copyright (c) LinkU Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import type { GrpcTypes } from "rtd-typescript/grpc";
import { TransactionDataBuilder } from "rtd-typescript/transactions";
import { toBase64 } from "rtd-typescript/utils";
import {
  assertExecutionReceipt,
  type WalletExecutionReceipt,
} from "./execution-journal";
import { validateFinalSimulation } from "./transaction-reader";

export const RECEIPT_READ_MASK = [
  "digest",
  "transaction",
  "signatures",
  "effects",
  "checkpoint",
  "balance_changes",
];
function u64(value: unknown): bigint {
  if (typeof value !== "bigint" || value < 0n || value > 0xffffffffffffffffn)
    throw new Error("交易回执数值字段不完整");
  return value;
}
export async function validateTransactionReceipt(
  raw: GrpcTypes.ExecutedTransaction | undefined,
  digest: string,
  expectedBytes?: Uint8Array,
  signatures?: readonly string[],
  source: WalletExecutionReceipt["source"] = "fullnode",
): Promise<WalletExecutionReceipt> {
  if (!raw?.transaction?.bcs?.value || raw.digest !== digest)
    throw new Error("执行回执摘要／bytes不完整");
  const bytes = raw.transaction.bcs.value;
  if (
    TransactionDataBuilder.getDigestFromBytes(bytes) !== digest ||
    (expectedBytes && toBase64(bytes) !== toBase64(expectedBytes))
  )
    throw new Error("执行回执与已批准交易不一致");
  if (
    !raw.signatures.length ||
    raw.signatures.some((sig) => !sig.bcs?.value?.length)
  )
    throw new Error("执行回执签名不完整");
  if (
    signatures &&
    JSON.stringify(
      raw.signatures.map((sig) => toBase64(sig.bcs!.value!)).sort(),
    ) !== JSON.stringify([...signatures].sort())
  )
    throw new Error("执行回执签名与提交签名不一致");
  const parsed = await validateFinalSimulation(
    { transaction: raw, commandOutputs: [] },
    bytes,
  );
  const tx = parsed.Transaction ?? parsed.FailedTransaction!;
  const receipt = Object.freeze({
    digest,
    success: tx.status.success,
    epoch: u64(raw.effects?.epoch).toString(),
    checkpoint:
      raw.checkpoint === undefined ? null : u64(raw.checkpoint).toString(),
    effectsBase64: toBase64(raw.effects!.bcs!.value!),
    source,
  });
  assertExecutionReceipt(receipt);
  return receipt;
}
