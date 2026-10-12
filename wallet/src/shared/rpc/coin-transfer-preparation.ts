// Copyright (c) LinkU Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import type {
  WalletPreparedTransaction,
  WalletRpc,
} from "rtd-apps-core/src/rpc/WalletRpcContext";
import { createTokenTransferTransaction } from "../../ui/app/pages/home/transfer-coin/utils/transaction";
import { walletAddress } from "./asset-address";
import { domainLabels } from "./name-reader";
import { dynamicType } from "./dynamic-fields";
import BigNumber from "bignumber.js";
import { addressFundedTransfer } from "./address-funded-transfer";
import { Transaction } from "rtd-typescript/transactions";

export interface CoinTransferInput {
  sender: string;
  to: string;
  coinType: string;
  amount: string;
  coinDecimals: number;
  isPayAllRtd: boolean;
  recipientName?: string;
}
export interface PreparedCoinTransfer extends WalletPreparedTransaction {
  readonly input: Readonly<CoinTransferInput>;
}

export function assertCoinTransferDraft(
  rpc: WalletRpc,
  prepared: PreparedCoinTransfer,
  input: CoinTransferInput,
) {
  if (
    prepared.bindingKey !== rpc.bindingKey ||
    prepared.readSessionKey !== rpc.readSessionKey ||
    prepared.input.sender !== walletAddress(input.sender) ||
    prepared.input.to !== walletAddress(input.to) ||
    prepared.input.coinType !== dynamicType(input.coinType) ||
    prepared.input.amount !== input.amount ||
    prepared.input.coinDecimals !== input.coinDecimals ||
    prepared.input.isPayAllRtd !== input.isPayAllRtd ||
    prepared.input.recipientName !== input.recipientName
  )
    throw new Error("转账内容或钱包会话已改变，请重新预览");
}

export async function prepareCoinTransfer(
  rpc: WalletRpc,
  input: CoinTransferInput,
  signal?: AbortSignal,
): Promise<PreparedCoinTransfer> {
  const normalized = Object.freeze({
    ...input,
    sender: walletAddress(input.sender),
    to: walletAddress(input.to),
    coinType: dynamicType(input.coinType),
  });
  signal?.throwIfAborted();
  if (normalized.recipientName) {
    domainLabels(normalized.recipientName);
    const resolution = await rpc.resolveRecipientName(
      normalized.recipientName,
      signal,
    );
    if (
      !resolution ||
      !Number.isFinite(resolution.validUntilMonotonicMs) ||
      performance.now() >= resolution.validUntilMonotonicMs ||
      resolution.address !== normalized.to ||
      resolution.snapshot.bindingKey !== rpc.bindingKey ||
      resolution.readSessionKey !== rpc.readSessionKey
    )
      throw new Error("收款名称的目标或会话已改变，请重新预览");
  }
  const coins = await rpc.readFreshCoins(
    normalized.sender,
    normalized.coinType,
    signal,
  );
  signal?.throwIfAborted();
  const funds = await rpc.readFreshBalance(
    normalized.sender,
    normalized.coinType,
    signal,
  );
  signal?.throwIfAborted();
  if (
    funds.coinType !== normalized.coinType ||
    BigInt(funds.coinBalance) !==
      coins.reduce((total, coin) => total + BigInt(coin.balance), 0n)
  )
    throw new Error("资金在读取期间发生变化，请重新预览");
  const atomic = new BigNumber(normalized.amount).shiftedBy(
    normalized.coinDecimals,
  );
  if (
    !Number.isInteger(normalized.coinDecimals) ||
    normalized.coinDecimals < 0 ||
    normalized.coinDecimals > 255 ||
    !/^(?:\d+(?:\.\d*)?|\.\d+)$/.test(normalized.amount.trim()) ||
    !atomic.isInteger() ||
    atomic.lte(0) ||
    atomic.gt("18446744073709551615")
  )
    throw new Error("转账金额必须为正的u64原子单位整数");
  const amount = BigInt(atomic.toFixed(0));
  if (
    amount > BigInt(funds.balance) ||
    (normalized.isPayAllRtd && amount !== BigInt(funds.balance))
  )
    throw new Error("余额或发送全部金额已改变，请重新预览");
  let transaction;
  if (BigInt(funds.addressBalance) > 0n) {
    const options = {
      sender: normalized.sender,
      to: normalized.to,
      coinType: normalized.coinType,
      amount,
      addressBalance: BigInt(funds.addressBalance),
      coins,
      payAll: normalized.isPayAllRtd,
    };
    transaction = addressFundedTransfer(options);
  } else transaction = createTokenTransferTransaction({ ...normalized, coins });
  const prepared = await rpc.prepareTransaction(
    transaction,
    normalized.sender,
    signal,
  );
  if (
    prepared.bindingKey !== rpc.bindingKey ||
    prepared.readSessionKey !== rpc.readSessionKey ||
    prepared.sender !== normalized.sender
  )
    throw new Error("转账预览属于不同钱包会话");
  if (normalized.isPayAllRtd && BigInt(funds.addressBalance) > 0n && coins.length) {
    // Native automatic gas selection is capped by max_gas_payment_objects.
    // A successful GasCoin transfer does not prove that every observed coin was selected.
    const payment = Transaction.from(prepared.bytesBase64).getData().gasData.payment;
    if (coins.some((coin) => !payment?.some((reference) =>
      reference.objectId === coin.objectId &&
      reference.version === coin.version &&
      reference.digest === coin.digest
    )))
      throw new Error("发送全部的最终交易未覆盖所有Coin或其版本已改变，请重新预览");
  }
  signal?.throwIfAborted();
  return Object.freeze({ ...prepared, input: normalized });
}

/** Called immediately before signing; never refresh coins, rebuild bytes, or replace approval. */
export async function revalidateCoinTransfer(
  rpc: WalletRpc,
  prepared: PreparedCoinTransfer,
  sender: string,
  signal?: AbortSignal,
) {
  if (
    prepared.bindingKey !== rpc.bindingKey ||
    prepared.readSessionKey !== rpc.readSessionKey ||
    prepared.sender !== walletAddress(sender)
  )
    throw new Error("转账授权的钱包会话已改变，请重新预览");
  let nameValidUntil: number | undefined;
  if (prepared.input.recipientName) {
    const resolution = await rpc.resolveRecipientName(
      prepared.input.recipientName,
      signal,
    );
    if (
      !resolution ||
      !Number.isFinite(resolution.validUntilMonotonicMs) ||
      performance.now() >= resolution.validUntilMonotonicMs ||
      resolution.address !== prepared.input.to ||
      resolution.snapshot.bindingKey !== prepared.bindingKey ||
      resolution.readSessionKey !== prepared.readSessionKey
    )
      throw new Error("收款名称的目标或会话已改变，请重新预览");
    nameValidUntil = resolution.validUntilMonotonicMs;
  }
  signal?.throwIfAborted();
  const result = await rpc.simulateTransaction(
    prepared.bytesBase64,
    prepared.sender,
    signal,
  );
  if (
    result.$kind !== "Transaction" ||
    result.Transaction.digest !== prepared.digest
  )
    throw new Error("已授权的交易模拟未通过，请重新预览并授权");
  signal?.throwIfAborted();
  if (nameValidUntil !== undefined && performance.now() >= nameValidUntil)
    throw new Error("收款名称校验已过期，请重新预览");
  return prepared;
}
