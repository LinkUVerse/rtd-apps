import type { AssetSnapshotProof } from 'rtd-apps-core/src/rpc/WalletRpcContext';

/** A chain receipt and GraphQL visibility are independent facts. */
export function receiptIndexCovered(proof: AssetSnapshotProof, bindingKey: string, checkpoint: string): boolean {
  if (proof.bindingKey !== bindingKey) throw new Error('资产快照不属于当前网络');
  for (const value of [proof.checkpoint, checkpoint]) {
    if (!/^(0|[1-9]\d*)$/.test(value) || value.length > 20 || BigInt(value) > 0xffffffffffffffffn)
      throw new Error('交易或资产检查点无效');
  }
  return BigInt(proof.checkpoint) >= BigInt(checkpoint);
}
