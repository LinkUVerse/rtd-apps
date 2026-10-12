// Copyright (c) LinkU Labs, Inc.
// SPDX-License-Identifier: Apache-2.0
import type { WalletTransactionDetails } from 'rtd-apps-core/src/rpc/WalletRpcContext';
import { parseSerializedSignature } from 'rtd-typescript/cryptography';
import { verifyTransactionSignature } from 'rtd-typescript/verify';
import { fromBase64, toBase64 } from 'rtd-typescript/utils';
import { approvedTransaction } from './execution-reader';
import { assertExecutionReceipt, type WalletExecutionReceipt } from './execution-journal';
import { walletAddress } from './asset-address';
import type { DappConfirmedResult } from './dapp-execution-result';

/** Recover only the ordinary self-funded transaction format supported by this entry. */
export async function recoveredDappResult(
  details: WalletTransactionDetails | null,
  receipt: WalletExecutionReceipt,
  bindingKey: string,
  sender: string,
  expectedBytes?: string,
): Promise<DappConfirmedResult> {
  assertExecutionReceipt(receipt);
  if (!details || details.bindingKey !== bindingKey) throw new Error('原交易详情暂不可用');
  const tx = details.transaction;
  if (!(tx.bcs instanceof Uint8Array) || !tx.effects?.bcs) throw new Error('原交易bytes缺失');
  const bytes = toBase64(tx.bcs);
  const approved = approvedTransaction(bytes, sender);
  if (tx.digest !== receipt.digest || approved.digest !== receipt.digest ||
      (expectedBytes !== undefined && bytes !== expectedBytes) ||
      walletAddress(approved.transaction.gasData.owner) !== walletAddress(sender) ||
      toBase64(tx.effects.bcs) !== receipt.effectsBase64 || tx.status.success !== receipt.success ||
      tx.epoch !== receipt.epoch || (receipt.checkpoint !== null && tx.checkpoint !== null && tx.checkpoint !== receipt.checkpoint)) {
    throw new Error('恢复详情与原交易记录不一致');
  }
  // This entry never authorizes sponsor or multisig flows. Do not guess signatures[0].
  if (tx.signatures.length !== 1) throw new Error('原交易签名集合不属于当前授权模式');
  const [signature] = tx.signatures;
  if (typeof signature !== 'string' || signature.length > 1024 || toBase64(fromBase64(signature)) !== signature) {
    throw new Error('原交易签名格式无效');
  }
  if (!['ED25519', 'Secp256k1', 'Secp256r1'].includes(parseSerializedSignature(signature).signatureScheme)) {
    throw new Error('原交易签名不属于当前支持的账户类型');
  }
  await verifyTransactionSignature(approved.bytes, signature, { address: walletAddress(sender) });
  return { digest: receipt.digest, bytes, signature, effects: receipt.effectsBase64 };
}
