// Copyright (c) LinkU Labs, Inc.
// SPDX-License-Identifier: Apache-2.0
/** Wallet Standard v2 execution output; effects are canonical base64 BCS from the confirmed receipt. */
export interface DappConfirmedResult {
  readonly digest: string;
  readonly bytes: string;
  readonly signature: string;
  readonly effects: string;
}
export function walletStandardExecutionResult(
  result: DappConfirmedResult,
): DappConfirmedResult {
  for (const key of ["digest", "bytes", "signature", "effects"] as const)
    if (typeof result?.[key] !== "string" || !result[key])
      throw new Error("钱包执行结果缺少必要字段");
  return {
    digest: result.digest,
    bytes: result.bytes,
    signature: result.signature,
    effects: result.effects,
  };
}
