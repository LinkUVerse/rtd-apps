// Copyright (c) LinkU Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import type { Transaction } from 'rtd-typescript/transactions';
import { fromBase64, normalizeStructTag, toBase64 } from 'rtd-typescript/utils';
import { bcs } from 'rtd-typescript/bcs';
import type { WalletRpc } from 'rtd-apps-core/src/rpc/WalletRpcContext';
import { walletAddress } from './asset-address';
import { exactBcs, KIOSK_BCS } from './kiosk-reader';

/** Check the actual fixed transaction arguments, never an unused Pure input. */
export async function assertApprovedRecipient(
  tx: ReturnType<Transaction['getData']>,
  recipient: string,
  packages: WalletRpc['packages'],
  readObject: WalletRpc['readFreshObject'],
): Promise<void> {
  const address = walletAddress(recipient);
  const pureAddress = bcs.Address.serialize(address).toBase64();
  const hasOriginByteP2P = tx.commands.some(command => command.$kind === 'MoveCall' &&
    command.MoveCall.module === 'ob_kiosk' &&
    ['p2p_transfer', 'p2p_transfer_and_create_target_kiosk'].includes(command.MoveCall.function));
  if (hasOriginByteP2P && tx.commands.length !== 1)
    throw new Error('名称收款OriginByte混合调用不支持');
  const transfers = tx.commands.filter(command => command.$kind === 'TransferObjects');
  if (transfers.length) {
    if (!transfers.every(command => {
      if (command.$kind !== 'TransferObjects' || command.TransferObjects.address.$kind !== 'Input') return false;
      const input = tx.inputs[command.TransferObjects.address.Input];
      return input?.$kind === 'Pure' && input.Pure.bytes === pureAddress;
    })) throw new Error('名称收款地址未包含在批准交易中');
    return;
  }
  // Wallet's OriginByte builder emits exactly one P2P command. Do not admit arbitrary Move calls.
  const command = tx.commands[0];
  if (tx.commands.length !== 1 || command?.$kind !== 'MoveCall' || !packages.originByte)
    throw new Error('名称收款地址未包含在批准交易中');
  const call = command.MoveCall;
  if (walletAddress(call.package) !== walletAddress(packages.originByte.executionPackage) ||
      call.module !== 'ob_kiosk' || call.typeArguments.length !== 1 || call.arguments.length !== 3 ||
      !['p2p_transfer', 'p2p_transfer_and_create_target_kiosk'].includes(call.function))
    throw new Error('名称收款OriginByte调用不匹配');
  const inputs = call.arguments.map(arg => arg.$kind === 'Input' ? tx.inputs[arg.Input] : undefined);
  const source = inputs[0]?.$kind === 'Object' && inputs[0].Object.$kind === 'SharedObject'
    ? inputs[0].Object.SharedObject : null;
  const item = inputs[2];
  if (!source?.mutable || item?.$kind !== 'Pure') throw new Error('名称收款OriginByte参数无效');
  const itemId = exactBcs(bcs.Address, fromBase64(item.Pure.bytes));
  if (toBase64(bcs.Address.serialize(itemId).toBytes()) !== item.Pure.bytes)
    throw new Error('名称收款OriginByte对象参数无效');
  const target = inputs[1];
  if (call.function === 'p2p_transfer_and_create_target_kiosk') {
    if (target?.$kind !== 'Pure' || target.Pure.bytes !== pureAddress)
      throw new Error('名称收款地址未包含在批准交易中');
    return;
  }
  const shared = target?.$kind === 'Object' && target.Object.$kind === 'SharedObject'
    ? target.Object.SharedObject : null;
  if (!shared?.mutable || shared.objectId === source.objectId)
    throw new Error('名称收款Kiosk参数无效');
  const object = await readObject(shared.objectId);
  if (!object || object.objectId !== shared.objectId || object.type !== normalizeStructTag('0x2::kiosk::Kiosk') ||
      object.owner.$kind !== 'Shared' || object.owner.Shared.initialSharedVersion !== shared.initialSharedVersion)
    throw new Error('名称收款Kiosk当前对象不匹配');
  const contents = exactBcs(KIOSK_BCS, object.content);
  if (contents.id !== shared.objectId || contents.owner !== address || !contents.allow_extensions)
    throw new Error('名称收款Kiosk当前所有者或扩展状态已改变');
}
