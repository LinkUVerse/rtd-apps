// Copyright (c) LinkU Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import type {
  WalletFreshObject,
  WalletPreparedTransaction,
  WalletRpc,
} from "rtd-apps-core/src/rpc/WalletRpcContext";
import {
  Transaction,
  type TransactionObjectArgument,
} from "rtd-typescript/transactions";
import {
  deriveDynamicFieldID,
  normalizeStructTag,
  toBase64,
} from "rtd-typescript/utils";
import { appendOriginByteTransfer } from "./originbyte-transfer";
import { walletAddress } from "./asset-address";
import { dynamicType } from "./dynamic-fields";
import { domainLabels } from "./name-reader";
import { KIOSK_BCS, KIOSK_ITEM_BCS, nativeKioskCap } from "./kiosk-reader";

// Includes source/recipient collections and the final resolver/simulation;
// leaf deadlines, caller cancellation and approval authority remain independent.
const NFT_PREPARATION_TIMEOUT_MS = 120_000;

export interface NftTransferInput {
  sender: string;
  to: string;
  objectId: string;
  objectType: string;
  recipientName?: string;
}
export interface PreparedNftTransfer extends WalletPreparedTransaction {
  readonly input: Readonly<NftTransferInput>;
  readonly route:
    | "direct"
    | "framework-kiosk"
    | "personal-kiosk"
    | "originbyte-kiosk";
}
function ownedBy(object: WalletFreshObject, sender: string) {
  return object.owner.$kind === "AddressOwner"
    ? object.owner.AddressOwner === sender
    : object.owner.$kind === "ConsensusAddressOwner" &&
        object.owner.ConsensusAddressOwner.owner === sender;
}
/** Consensus-owned objects use shared startVersion, never an ImmOrOwnedObject reference. */
function ownedInput(tx: Transaction, object: WalletFreshObject) {
  return object.owner.$kind === "ConsensusAddressOwner"
    ? tx.sharedObjectRef({
        objectId: object.objectId,
        initialSharedVersion: object.owner.ConsensusAddressOwner.startVersion,
        mutable: true,
      })
    : tx.objectRef(object);
}
async function checkName(
  rpc: WalletRpc,
  input: Readonly<NftTransferInput>,
  signal?: AbortSignal,
) {
  if (!input.recipientName) return;
  domainLabels(input.recipientName);
  const result = await rpc.resolveRecipientName(input.recipientName, signal);
  if (
    !result ||
    !Number.isFinite(result.validUntilMonotonicMs) ||
    performance.now() >= result.validUntilMonotonicMs ||
    result.address !== input.to ||
    result.snapshot.bindingKey !== rpc.bindingKey ||
    result.readSessionKey !== rpc.readSessionKey
  )
    throw new Error("收款名称的目标或会话已改变，请重新预览");
  return result.validUntilMonotonicMs;
}
export async function prepareNftTransfer(
  rpc: WalletRpc,
  input: NftTransferInput,
  callerSignal?: AbortSignal,
): Promise<PreparedNftTransfer> {
  const signal = AbortSignal.any([
    AbortSignal.timeout(NFT_PREPARATION_TIMEOUT_MS),
    ...(callerSignal ? [callerSignal] : []),
  ]);
  signal.throwIfAborted();
  const bindingKey = rpc.bindingKey;
  const readSessionKey = rpc.readSessionKey;
  const normalized = Object.freeze({
    ...input,
    sender: walletAddress(input.sender),
    to: walletAddress(input.to),
    objectId: walletAddress(input.objectId),
    objectType: dynamicType(input.objectType),
  });
  if (
    normalized.to === normalized.sender ||
    normalized.to === normalized.objectId
  )
    throw new Error("收款地址不能是当前账户或藏品本身");
  await checkName(rpc, normalized, signal);
  const item = await rpc.readFreshObject(normalized.objectId, signal);
  if (
    !item ||
    item.objectId !== normalized.objectId ||
    item.type !== normalized.objectType
  )
    throw new Error("藏品已改变或不存在，请刷新后重新预览");
  const tx = new Transaction();
  let route: PreparedNftTransfer["route"] = "direct";
  if (ownedBy(item, normalized.sender)) {
    tx.transferObjects([ownedInput(tx, item)], normalized.to);
  } else if (item.owner.$kind === "ObjectOwner") {
    // The admitted snapshot discovers capabilities. Only fresh Fullnode objects supply transaction inputs.
    const snapshot = await rpc.openAssetSnapshot(signal);
    const discovered = await snapshot.kiosks(normalized.sender, signal);
    if (
      snapshot.proof.bindingKey !== bindingKey ||
      discovered.snapshot.cacheKey !== snapshot.proof.cacheKey
    )
      throw new Error("Kiosk 发现结果属于不同快照");
    const matches = discovered.value.filter((kiosk) =>
      kiosk.items.some((candidate) => candidate.objectId === item.objectId),
    );
    if (matches.length !== 1)
      throw new Error("当前快照未唯一证明此藏品的 Kiosk 持有关系");
    const discovery = matches[0];
    if (discovery.kind === "originbyte") {
      await appendOriginByteTransfer(
        tx,
        rpc,
        snapshot,
        discovery,
        item,
        normalized.sender,
        normalized.to,
        signal,
      );
      route = "originbyte-kiosk";
    } else {
      const listed = discovery.items.find(
        (candidate) => candidate.objectId === item.objectId,
      )!;
      if (listed.isLocked || listed.listing?.isExclusive)
        throw new Error("藏品已锁定或独占挂牌，不能直接取出");
      const capObject = await rpc.readFreshObject(
        discovery.ownerCap.objectId,
        signal,
      );
      if (!capObject || !ownedBy(capObject, normalized.sender))
        throw new Error("Kiosk 能力已转移或不存在");
      const cap = nativeKioskCap(capObject, rpc.packages);
      if (
        !cap ||
        cap.kioskId !== discovery.kioskId ||
        cap.isPersonal !== discovery.ownerCap.isPersonal
      )
        throw new Error("Kiosk 能力指向已改变");
      const fieldId = deriveDynamicFieldID(
        cap.kioskId,
        "0x2::dynamic_object_field::Wrapper<0x2::kiosk::Item>",
        KIOSK_ITEM_BCS.serialize({ id: item.objectId }).toBytes(),
      );
      if (item.owner.ObjectOwner !== fieldId)
        throw new Error("藏品已离开当前 Kiosk");
      const kiosk = await rpc.readFreshObject(cap.kioskId, signal);
      if (
        !kiosk ||
        kiosk.type !== normalizeStructTag(`${rpc.packages.kiosk}::kiosk::Kiosk`)
      )
        throw new Error("Kiosk 当前对象类型不匹配");
      const content = KIOSK_BCS.parse(kiosk.content);
      if (
        content.id !== cap.kioskId ||
        toBase64(KIOSK_BCS.serialize(content).toBytes()) !==
          toBase64(kiosk.content)
      )
        throw new Error("Kiosk 当前对象内容不匹配");
      let kioskArg: TransactionObjectArgument;
      if (kiosk.owner.$kind === "Shared") {
        kioskArg = tx.sharedObjectRef({
          objectId: kiosk.objectId,
          initialSharedVersion: kiosk.owner.Shared.initialSharedVersion,
          mutable: true,
        });
      } else if (ownedBy(kiosk, normalized.sender)) {
        kioskArg = ownedInput(tx, kiosk);
      } else throw new Error("Kiosk 当前所有权不支持转出");
      const capArg = ownedInput(tx, capObject);
      // Same ABI as the SDK generated contracts; no client lookup, named package resolution or network fallback.
      const borrowed = cap.isPersonal
        ? tx.moveCall({
            target: `${rpc.packages.personalKiosk}::personal_kiosk::borrow_val`,
            arguments: [capArg],
          })
        : null;
      const ownerCap = borrowed ? borrowed[0] : capArg;
      const taken = tx.moveCall({
        target: `${rpc.packages.kiosk}::kiosk::take`,
        typeArguments: [item.type],
        arguments: [kioskArg, ownerCap, tx.pure.id(item.objectId)],
      });
      tx.transferObjects([taken[0]], normalized.to);
      if (borrowed)
        tx.moveCall({
          target: `${rpc.packages.personalKiosk}::personal_kiosk::return_val`,
          arguments: [capArg, borrowed[0], borrowed[1]],
        });
      route = cap.isPersonal ? "personal-kiosk" : "framework-kiosk";
    }
  } else throw new Error("当前账户没有可用于转出的藏品所有权");
  signal.throwIfAborted();
  // Fullnode resolver and checks-enabled simulation establish dynamic abilities and current Kiosk rules.
  const prepared = await rpc.prepareTransaction(tx, normalized.sender, signal);
  signal.throwIfAborted();
  if (
    prepared.bindingKey !== bindingKey ||
    prepared.readSessionKey !== readSessionKey ||
    prepared.sender !== normalized.sender ||
    rpc.bindingKey !== bindingKey ||
    rpc.readSessionKey !== readSessionKey
  )
    throw new Error("藏品预览属于不同钱包会话");
  return Object.freeze({ ...prepared, input: normalized, route });
}

/** Never rebuild references or replace reviewed bytes when confirming. */
export async function revalidateNftTransfer(
  rpc: WalletRpc,
  prepared: PreparedNftTransfer,
  sender: string,
  signal?: AbortSignal,
) {
  signal?.throwIfAborted();
  if (
    prepared.bindingKey !== rpc.bindingKey ||
    prepared.readSessionKey !== rpc.readSessionKey ||
    prepared.sender !== walletAddress(sender)
  )
    throw new Error("藏品授权的钱包会话已改变，请重新预览");
  const nameValidUntil = await checkName(rpc, prepared.input, signal);
  const simulation = await rpc.simulateTransaction(
    prepared.bytesBase64,
    prepared.sender,
    signal,
  );
  signal?.throwIfAborted();
  if (
    simulation.$kind !== "Transaction" ||
    simulation.Transaction.digest !== prepared.digest
  )
    throw new Error("已授权的交易模拟未通过，请重新预览并授权");
  if (nameValidUntil !== undefined && performance.now() >= nameValidUntil)
    throw new Error("收款名称校验已过期，请重新预览");
  return prepared;
}
