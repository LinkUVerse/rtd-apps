// Copyright (c) LinkU Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { Transaction } from 'rtd-typescript/transactions';
import { deriveDynamicFieldID, normalizeStructTag } from 'rtd-typescript/utils';
import type { WalletRpc, WalletFreshObject, WalletAssetSnapshot } from 'rtd-apps-core/src/rpc/WalletRpcContext';
import type { WalletOriginByteKiosk } from 'rtd-apps-core/src/rpc/kiosk-types';
import { exactBcs, KIOSK_BCS, KIOSK_ITEM_BCS } from './kiosk-reader';
import { originByteOwnerToken } from './originbyte-kiosk';

async function freshKiosk(rpc: WalletRpc, id: string, owner: string, signal: AbortSignal) {
  const object = await rpc.readFreshObject(id, signal);
  if (!object || object.objectId !== id || object.type !== normalizeStructTag('0x2::kiosk::Kiosk') || object.owner.$kind !== 'Shared')
    throw new Error('OriginByte Kiosk 当前对象或共享所有权已改变');
  const content = exactBcs(KIOSK_BCS, object.content);
  if (content.id !== id || content.owner !== owner || !content.allow_extensions)
    throw new Error('OriginByte Kiosk 当前所有者或扩展状态已改变');
  return { objectId:id, initialSharedVersion:object.owner.Shared.initialSharedVersion, mutable:true };
}

/** Adds the fixed reviewed P2P call; the caller must resolve and checks-enabled simulate it. */
export async function appendOriginByteTransfer(
  tx: Transaction, rpc: WalletRpc, snapshot: WalletAssetSnapshot,
  discovery: WalletOriginByteKiosk, item: WalletFreshObject,
  sender: string, recipient: string, signal: AbortSignal,
) {
  if (!rpc.packages.originByte) throw new Error('当前网络未配置 OriginByte 执行包');
  const recorded = discovery.items.find((value) => value.objectId === item.objectId);
  if (discovery.owner !== sender || !recorded || !recorded.originByteRegistered || recorded.originByteExclusive ||
      recorded.isLocked || recorded.listing?.isExclusive)
    throw new Error('OriginByte 藏品尚未登记、已锁定或处于独占授权状态');
  const tokenObject = await rpc.readFreshObject(discovery.ownerTokenId, signal);
  const token = tokenObject && originByteOwnerToken(tokenObject, sender, rpc.packages);
  if (!token || token.objectId !== discovery.ownerTokenId || token.kioskId !== discovery.kioskId) throw new Error('OriginByte 发现凭据已改变');
  const fieldId = deriveDynamicFieldID(discovery.kioskId,
    '0x2::dynamic_object_field::Wrapper<0x2::kiosk::Item>', KIOSK_ITEM_BCS.serialize({id:item.objectId}).toBytes());
  if (item.owner.$kind !== 'ObjectOwner' || item.owner.ObjectOwner !== fieldId)
    throw new Error('藏品已离开 OriginByte Kiosk');
  const source = await freshKiosk(rpc, discovery.kioskId, sender, signal);
  const recipients = await snapshot.kiosks(recipient, signal);
  if (recipients.snapshot.cacheKey !== snapshot.proof.cacheKey || recipients.snapshot.bindingKey !== rpc.bindingKey)
    throw new Error('收款 Kiosk 不属于同一准入快照');
  const targets = recipients.value.filter((kiosk): kiosk is WalletOriginByteKiosk => kiosk.kind === 'originbyte');
  targets.sort((a,b) => a.kioskId.localeCompare(b.kioskId));
  if (targets.some((kiosk) => kiosk.owner !== recipient || kiosk.kioskId === discovery.kioskId))
    throw new Error('OriginByte 收款 Kiosk 所有者不符');
  if (targets.length) {
    const target = await freshKiosk(rpc, targets[0].kioskId, recipient, signal);
    tx.moveCall({target:`${rpc.packages.originByte.executionPackage}::ob_kiosk::p2p_transfer`,
      typeArguments:[item.type], arguments:[tx.sharedObjectRef(source), tx.sharedObjectRef(target), tx.pure.id(item.objectId)]});
  } else {
    tx.moveCall({target:`${rpc.packages.originByte.executionPackage}::ob_kiosk::p2p_transfer_and_create_target_kiosk`,
      typeArguments:[item.type], arguments:[tx.sharedObjectRef(source), tx.pure.address(recipient), tx.pure.id(item.objectId)]});
  }
}
