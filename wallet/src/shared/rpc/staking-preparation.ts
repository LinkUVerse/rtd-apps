// Copyright (c) LinkU Labs, Inc.
// SPDX-License-Identifier: Apache-2.0
import type {
  WalletPreparedTransaction,
  WalletRpc,
} from "rtd-apps-core/src/rpc/WalletRpcContext";
import { Transaction } from "rtd-typescript/transactions";
import { normalizeStructTag, RTD_TYPE_ARG } from "rtd-typescript/utils";
import { walletAddress } from "./asset-address";
import { STAKED_RTD_BCS, SYSTEM_WRAPPER_BCS, stakingBcs } from "./staking-bcs";

export type StakingInput =
  | {
      readonly kind: "stake";
      readonly sender: string;
      readonly amount: string;
      readonly validator: string;
    }
  | {
      readonly kind: "withdraw";
      readonly sender: string;
      readonly objectId: string;
    };
export interface PreparedStaking extends WalletPreparedTransaction {
  readonly input: Readonly<StakingInput>;
  /** Fresh principal is a fact; rewards and final redeemed amount remain simulation/execution facts. */
  readonly withdrawal: {
    readonly principal: string;
    readonly poolId: string;
    readonly activationEpoch: string;
  } | null;
}
const SYSTEM_ID = walletAddress("0x5");

export async function prepareStaking(
  rpc: WalletRpc,
  input: StakingInput,
  callerSignal?: AbortSignal,
): Promise<PreparedStaking> {
  const signal = AbortSignal.any([
    AbortSignal.timeout(20_000),
    ...(callerSignal ? [callerSignal] : []),
  ]);
  signal.throwIfAborted();
  const bindingKey = rpc.bindingKey,
    readSessionKey = rpc.readSessionKey;
  const sender = walletAddress(input.sender);
  const normalized: StakingInput = Object.freeze(
    input.kind === "stake"
      ? {
          kind: "stake",
          sender,
          amount: input.amount,
          validator: walletAddress(input.validator),
        }
      : { kind: "withdraw", sender, objectId: walletAddress(input.objectId) },
  );
  if (
    normalized.kind === "stake" &&
    (!/^[1-9][0-9]{0,19}$/.test(normalized.amount) ||
      BigInt(normalized.amount) > 0xffffffffffffffffn)
  )
    throw new Error("质押数量必须是正 u64 原子单位整数");
  const system = await rpc.readFreshObject(SYSTEM_ID, signal);
  if (
    !system ||
    system.objectId !== SYSTEM_ID ||
    system.type !== normalizeStructTag("0x3::rtd_system::RtdSystemState") ||
    system.owner.$kind !== "Shared"
  )
    throw new Error("当前系统共享对象不可用");
  const wrapper = stakingBcs(SYSTEM_WRAPPER_BCS, system.content);
  if (
    wrapper.id !== SYSTEM_ID ||
    (wrapper.version !== "1" && wrapper.version !== "2")
  )
    throw new Error("当前系统对象版本不兼容");
  const tx = new Transaction();
  const systemArg = tx.sharedObjectRef({
    objectId: SYSTEM_ID,
    initialSharedVersion: system.owner.Shared.initialSharedVersion,
    mutable: true,
  });
  let withdrawal: PreparedStaking["withdrawal"] = null;
  if (normalized.kind === "stake") {
    const balance = await rpc.readFreshBalance(sender, RTD_TYPE_ARG, signal);
    signal.throwIfAborted();
    if (
      balance.coinType !== RTD_TYPE_ARG ||
      BigInt(normalized.amount) > BigInt(balance.balance)
    )
      throw new Error("当前可质押余额不足，请重新预览");
    // GasCoin resolution may include epoch-bound address-balance reservations.
    // The final formal simulation determines whether amount + gas is affordable.
    const [coin] = tx.splitCoins(tx.gas, [tx.pure.u64(normalized.amount)]);
    tx.moveCall({
      target: "0x3::rtd_system::request_add_stake",
      arguments: [systemArg, coin, tx.pure.address(normalized.validator)],
    });
  } else {
    const stake = await rpc.readFreshObject(normalized.objectId, signal);
    if (
      !stake ||
      stake.objectId !== normalized.objectId ||
      stake.type !== normalizeStructTag("0x3::staking_pool::StakedRtd")
    )
      throw new Error("质押仓位不存在或类型已改变");
    const owned =
      stake.owner.$kind === "AddressOwner"
        ? stake.owner.AddressOwner === sender
        : stake.owner.$kind === "ConsensusAddressOwner" &&
          stake.owner.ConsensusAddressOwner.owner === sender;
    if (!owned) throw new Error("当前账户不拥有该质押仓位");
    const decoded = stakingBcs(STAKED_RTD_BCS, stake.content);
    if (decoded.id !== stake.objectId || BigInt(decoded.principal.value) === 0n)
      throw new Error("当前质押仓位内容不合法");
    withdrawal = Object.freeze({
      principal: decoded.principal.value,
      poolId: decoded.pool_id,
      activationEpoch: decoded.stake_activation_epoch,
    });
    const stakeArg =
      stake.owner.$kind === "ConsensusAddressOwner"
        ? tx.sharedObjectRef({
            objectId: stake.objectId,
            initialSharedVersion:
              stake.owner.ConsensusAddressOwner.startVersion,
            mutable: true,
          })
        : tx.objectRef(stake);
    // Pending and retired stakes are admissible inputs. The current system contract decides withdrawability.
    tx.moveCall({
      target: "0x3::rtd_system::request_withdraw_stake",
      arguments: [systemArg, stakeArg],
    });
  }
  signal.throwIfAborted();
  const prepared = await rpc.prepareTransaction(tx, sender, signal);
  signal.throwIfAborted();
  if (
    prepared.bindingKey !== bindingKey ||
    prepared.readSessionKey !== readSessionKey ||
    prepared.sender !== sender ||
    rpc.bindingKey !== bindingKey ||
    rpc.readSessionKey !== readSessionKey
  )
    throw new Error("质押预览所属的钱包会话已改变");
  return Object.freeze({ ...prepared, input: normalized, withdrawal });
}

/** Confirm exactly the bytes that were reviewed; never rebuild or silently change gas. */
export async function revalidateStaking(
  rpc: WalletRpc,
  prepared: PreparedStaking,
  sender: string,
  signal?: AbortSignal,
) {
  signal?.throwIfAborted();
  if (
    prepared.bindingKey !== rpc.bindingKey ||
    prepared.readSessionKey !== rpc.readSessionKey ||
    prepared.sender !== walletAddress(sender)
  )
    throw new Error("质押授权的钱包会话已改变，请重新预览");
  const simulation = await rpc.simulateTransaction(
    prepared.bytesBase64,
    prepared.sender,
    signal,
  );
  signal?.throwIfAborted();
  if (
    rpc.bindingKey !== prepared.bindingKey ||
    rpc.readSessionKey !== prepared.readSessionKey ||
    simulation.$kind !== "Transaction" ||
    simulation.Transaction.digest !== prepared.digest
  )
    throw new Error("原批准交易模拟未通过，请重新预览并授权");
  return prepared;
}
