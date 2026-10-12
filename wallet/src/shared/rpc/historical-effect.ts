import type { WalletRpc } from 'rtd-apps-core/src/rpc/WalletRpcContext';
import type { WalletObjectEffect } from 'rtd-apps-core/src/rpc/transaction-view';

export async function readHistoricalEffect(rpc: WalletRpc, effect: WalletObjectEffect, signal: AbortSignal) {
  if (!rpc.readHistoricalObjects || effect.version === null || !effect.objectDigest ||
      !['ObjectWrite', 'PackageWrite'].includes(effect.outputState)) throw new Error('历史对象选择器不可用');
  const result = await rpc.readHistoricalObjects([{ objectId: effect.objectId, version: effect.version }], signal);
  signal.throwIfAborted();
  if (result.bindingKey !== rpc.bindingKey || result.values.length !== 1) throw new Error('历史对象响应作用域不匹配');
  const object = result.values[0];
  if (object instanceof Error) throw object;
  if (!object || object.objectId !== effect.objectId || object.version !== effect.version || object.digest !== effect.objectDigest)
    throw new Error('历史对象与交易effects不匹配');
  return object;
}
