// Copyright (c) LinkU Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import BigNumber from "bignumber.js";
import type { RtdClientTypes } from "rtd-typescript/client";
import { Transaction } from "rtd-typescript/transactions";
import { normalizeStructTag, RTD_TYPE_ARG } from "rtd-typescript/utils";

interface Options {
  coinType: string;
  to: string;
  amount: string;
  coinDecimals: number;
  isPayAllRtd: boolean;
  coins: readonly RtdClientTypes.Coin[];
}

function getCoinObjectRefs(coins: readonly RtdClientTypes.Coin[]) {
  if (coins.some((coin) => coin.owner.$kind !== "AddressOwner")) {
    throw new Error("gas payment 必须使用 address-owned coin");
  }
  return coins.map((coin) => ({
    objectId: coin.objectId,
    digest: coin.digest,
    version: coin.version,
  }));
}

export function createTokenTransferTransaction({
  to,
  amount,
  coins,
  coinType,
  coinDecimals,
  isPayAllRtd,
}: Options) {
  const tx = new Transaction();
  const type = normalizeStructTag(`0x2::coin::Coin<${coinType}>`);
  const selected = coins.filter((coin) => coin.type === type);
  if (!selected.length) throw new Error("没有可用于转账的 coin 对象");
  const native = normalizeStructTag(coinType) === RTD_TYPE_ARG;

  if (isPayAllRtd && native) {
    tx.transferObjects([tx.gas], to);
    tx.setGasPayment(getCoinObjectRefs(selected));

    return tx;
  }

  if (
    !Number.isInteger(coinDecimals) ||
    coinDecimals < 0 ||
    coinDecimals > 255 ||
    !/^(?:\d+(?:\.\d*)?|\.\d+)$/.test(amount.trim())
  ) {
    throw new Error("转账金额或精度不合法");
  }
  const atomic = new BigNumber(amount).shiftedBy(coinDecimals);
  if (
    !atomic.isInteger() ||
    atomic.lte(0) ||
    atomic.gt("18446744073709551615")
  ) {
    throw new Error("转账金额必须为正的 u64 原子单位整数");
  }
  const bigIntAmount = BigInt(atomic.toFixed(0));
  const [primaryCoin, ...mergeCoins] = selected;

  if (native) {
    tx.setGasPayment(getCoinObjectRefs(selected));
    const coin = tx.splitCoins(tx.gas, [bigIntAmount]);
    tx.transferObjects([coin], to);
  } else {
    const input = (coin: RtdClientTypes.Coin) => {
      if (coin.owner.$kind === "AddressOwner") return tx.objectRef(coin);
      if (coin.owner.$kind === "ConsensusAddressOwner")
        return tx.sharedObjectRef({
          objectId: coin.objectId,
          initialSharedVersion: coin.owner.ConsensusAddressOwner.startVersion,
          mutable: true,
        });
      throw new Error("转账 coin 所有权不兼容");
    };
    const primaryCoinInput = input(primaryCoin);
    if (mergeCoins.length) {
      // TODO: This could just merge a subset of coins that meet the balance requirements instead of all of them.
      tx.mergeCoins(primaryCoinInput, mergeCoins.map(input));
    }
    const coin = tx.splitCoins(primaryCoinInput, [bigIntAmount]);
    tx.transferObjects([coin], to);
  }

  return tx;
}
