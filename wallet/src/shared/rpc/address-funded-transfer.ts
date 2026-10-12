// Copyright (c) LinkU Labs, Inc.
// SPDX-License-Identifier: Apache-2.0
import { Transaction } from "rtd-typescript/transactions";
import type { RtdClientTypes } from "rtd-typescript/client";
import { normalizeStructTag, RTD_TYPE_ARG } from "rtd-typescript/utils";

/** Explicit native funding. Final preparation must formally simulate the complete bytes. */
export function addressFundedTransfer(options: {
  sender: string;
  to: string;
  coinType: string;
  amount: bigint;
  addressBalance: bigint;
  coins: readonly RtdClientTypes.Coin[];
  payAll: boolean;
}) {
  const { to, amount, addressBalance, coins, payAll } = options;
  const type = normalizeStructTag(options.coinType),
    native = type === RTD_TYPE_ARG;
  if (
    addressBalance <= 0n ||
    addressBalance > 0xffffffffffffffffn ||
    amount <= 0n ||
    amount > 0xffffffffffffffffn
  )
    throw new Error("转账资金必须是有效的u64原子金额");
  if (payAll && !native) throw new Error("只有RTD使用扣除gas后的全部发送");
  const selected = coins.filter(
    (coin) => coin.type === normalizeStructTag(`0x2::coin::Coin<${type}>`),
  );
  const tx = new Transaction();
  const withdraw = (value: bigint) =>
    tx.moveCall({
      target: "0x2::coin::redeem_funds",
      typeArguments: [type],
      arguments: [tx.withdrawal({ amount: value, type })],
    });
  const object = (coin: RtdClientTypes.Coin) => {
    if (coin.owner.$kind === "AddressOwner") return tx.objectRef(coin);
    if (coin.owner.$kind === "ConsensusAddressOwner")
      return tx.sharedObjectRef({
        objectId: coin.objectId,
        initialSharedVersion: coin.owner.ConsensusAddressOwner.startVersion,
        mutable: true,
      });
    throw new Error("转账Coin所有权不兼容");
  };
  if (native) {
    if (selected.some((coin) => coin.owner.$kind !== "AddressOwner"))
      throw new Error("原生混合资金包含不能参与gas选择的coin");
    // Leave gas payment unresolved: the native resolver selects real coins plus
    // an epoch-bound coin reservation for the address balance. An explicit []
    // would constrain final preparation to address-balance gas instead.
    tx.transferObjects(
      payAll ? [tx.gas] : [tx.splitCoins(tx.gas, [amount])[0]],
      to,
    );
  } else {
    const fromAddress = addressBalance < amount ? addressBalance : amount;
    const primary = withdraw(fromAddress);
    if (fromAddress < amount) {
      if (!selected.length) throw new Error("可发送余额不足");
      tx.mergeCoins(primary, selected.map(object));
      tx.transferObjects([tx.splitCoins(primary, [amount])[0]], to);
      // A freshly redeemed/merged Coin cannot be left unconsumed in the PTB.
      tx.transferObjects([primary], options.sender);
      return tx;
    }
    tx.transferObjects([primary], to);
  }
  return tx;
}
