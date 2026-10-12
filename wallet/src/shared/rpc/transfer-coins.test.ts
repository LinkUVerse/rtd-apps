// Copyright (c) LinkU Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { bcs } from "rtd-typescript/bcs";
import type { RtdClientTypes } from "rtd-typescript/client";
import {
  normalizeRtdAddress,
  normalizeStructTag,
  RTD_TYPE_ARG,
  toBase58,
} from "rtd-typescript/utils";
import { describe, expect, it } from "vitest";
import { createTokenTransferTransaction } from "../../ui/app/pages/home/transfer-coin/utils/transaction";

function coin(type = RTD_TYPE_ARG, id = "0xc"): RtdClientTypes.Coin {
  return {
    objectId: normalizeRtdAddress(id),
    version: "11",
    digest: toBase58(new Uint8Array(32).fill(9)),
    balance: "10000000000000000",
    type: normalizeStructTag(`0x2::coin::Coin<${type}>`),
    owner: { $kind: "AddressOwner", AddressOwner: normalizeRtdAddress("0xb") },
  };
}
const defaults = {
  coinType: RTD_TYPE_ARG,
  to: "0xa",
  amount: "1",
  coinDecimals: 0,
  isPayAllRtd: false,
};
describe("新 coin 模型在真实 SDK Transaction 中的使用", () => {
  it("RTD gas payment 保留完整引用，金额不经过浮点 Number", () => {
    const tx = createTokenTransferTransaction({
      ...defaults,
      amount: "9007199254740993",
      coins: [coin()],
    });
    expect(tx.getData().gasData.payment).toEqual([
      { objectId: coin().objectId, version: "11", digest: coin().digest },
    ]);
    const amount = tx.getData().inputs[0];
    expect(amount.Pure).toBeDefined();
    expect(bcs.u64().fromBase64(amount.Pure!.bytes)).toBe("9007199254740993");
  });
  it("非 RTD 使用已读取的版本／摘要，合并多个币且不混入其它类型", () => {
    const type = "0x3::test::TEST";
    const first = coin(type),
      second = coin(type, "0xd");
    const tx = createTokenTransferTransaction({
      ...defaults,
      coinType: type,
      coins: [first, coin(), second],
    });
    expect(
      tx
        .getData()
        .inputs.filter((i) => i.Object)
        .map((i) => i.Object?.ImmOrOwnedObject),
    ).toEqual([
      {
        objectId: first.objectId,
        version: first.version,
        digest: first.digest,
      },
      {
        objectId: second.objectId,
        version: second.version,
        digest: second.digest,
      },
    ]);
    expect(tx.getData().commands.map((c) => c.$kind)).toEqual([
      "MergeCoins",
      "SplitCoins",
      "TransferObjects",
    ]);
  });
  it("规范化 RTD type 不会错误进入普通 token 分支", () => {
    const tx = createTokenTransferTransaction({
      ...defaults,
      coinType: normalizeStructTag(RTD_TYPE_ARG),
      coins: [coin()],
    });
    expect(tx.getData().gasData.payment).toHaveLength(1);
  });
  it("全部 RTD 使用 GasCoin，不能将 Coin<T> type 当旧 coinType", () => {
    const tx = createTokenTransferTransaction({
      ...defaults,
      isPayAllRtd: true,
      coins: [coin()],
    });
    expect(tx.getData().commands.map((c) => c.$kind)).toEqual([
      "TransferObjects",
    ]);
    expect(tx.getData().gasData.payment).toHaveLength(1);
  });
  it("空集合／只含其它类型明确失败", () => {
    for (const coins of [[], [coin("0x3::other::OTHER")]])
      expect(() =>
        createTokenTransferTransaction({ ...defaults, coins }),
      ).toThrow("没有可用于转账");
  });
  it.each(["0", "-1", "1.1", "abc", "18446744073709551616"])(
    "不将非法金额 %s 舍入或转成零",
    (amount) => {
      expect(() =>
        createTokenTransferTransaction({
          ...defaults,
          amount,
          coins: [coin()],
        }),
      ).toThrow();
    },
  );
  it("共识持有的普通 token 保留 shared startVersion，不能作为 owned gas reference", () => {
    const token = coin("0x3::test::TEST");
    token.owner = {
      $kind: "ConsensusAddressOwner",
      ConsensusAddressOwner: {
        owner: normalizeRtdAddress("0xb"),
        startVersion: "5",
      },
    };
    const tx = createTokenTransferTransaction({
      ...defaults,
      coinType: "0x3::test::TEST",
      coins: [token],
    });
    expect(tx.getData().inputs[0].Object?.SharedObject).toMatchObject({
      objectId: token.objectId,
      initialSharedVersion: "5",
      mutable: true,
    });
    const gas = coin();
    gas.owner = token.owner;
    expect(() =>
      createTokenTransferTransaction({ ...defaults, coins: [gas] }),
    ).toThrow("address-owned");
  });
});
