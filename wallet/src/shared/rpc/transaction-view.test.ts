// Copyright (c) LinkU Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { describe, expect, it } from "vitest";
import { bcs } from "rtd-typescript/bcs";
import { parseGrpcTransactionResponse } from "rtd-typescript/grpc";
import {
  normalizeRtdAddress,
  normalizeStructTag,
  toBase58,
} from "rtd-typescript/utils";
import {
  receiptBalanceChanges,
  receiptGas,
  receiptObjectEffects,
  receiptStakeEvents,
  StakeEventBcs,
  UnstakeEventBcs,
} from "rtd-apps-core/src/rpc/transaction-view";
import type { WalletReceiptTransaction } from "rtd-apps-core/src/rpc/WalletRpcContext";
import {
  executionFixture,
  sender,
} from "../../../tests/unit/rpc/execution-fixtures";
async function transaction(): Promise<WalletReceiptTransaction> {
  const fixture = await executionFixture();
  return parseGrpcTransactionResponse(fixture.result(), {
    include: {
      effects: true,
      transaction: true,
      bcs: true,
      events: true,
      balanceChanges: true,
      objectTypes: true,
    },
  }).Transaction!;
}
describe("现代收据精度与业务事实", () => {
  it("按地址和规范币种汇总i128，不凭金额正负猜收件人", async () => {
    const tx = await transaction();
    tx.balanceChanges = [
      { address: "0xb", coinType: "0x2::rtd::RTD", amount: "9007199254740993" },
      {
        address: normalizeRtdAddress("0xb"),
        coinType: normalizeStructTag("0x2::rtd::RTD"),
        amount: "1",
      },
      {
        address: "0xc",
        coinType: "0x2::rtd::RTD",
        amount: "-9007199254740994",
      },
    ];
    const changes = receiptBalanceChanges(tx, ["0x2"])!;
    expect(changes[normalizeRtdAddress("0xb")][0]).toMatchObject({
      amount: "9007199254740994",
      unRecognizedToken: false,
    });
    expect(changes[normalizeRtdAddress("0xc")][0]).not.toHaveProperty(
      "recipient",
    );
  });
  it("gas只计算一次storageRebate，赞助不改变真实费用", async () => {
    const tx = await transaction();
    tx.effects.gasUsed = {
      computationCost: "9007199254740993",
      storageCost: "12",
      storageRebate: "15",
      nonRefundableStorageFee: "5",
    };
    tx.transaction.gasData.owner = normalizeRtdAddress("0x8");
    expect(receiptGas(tx)).toMatchObject({
      totalGas: "9007199254740990",
      isSponsored: true,
      owner: normalizeRtdAddress("0x8"),
    });
  });
  it("对象归属从effects BCS导出，不能被protobuf显示字段覆盖", async () => {
    const tx = await transaction();
    const effects = bcs.TransactionEffects.parse(tx.effects.bcs!);
    const objectId = normalizeRtdAddress("0x9");
    effects.V2!.changedObjects = [
      [
        objectId,
        {
          inputState: { NotExist: true, $kind: "NotExist" },
          outputState: {
            ObjectWrite: [
              toBase58(new Uint8Array(32).fill(9)),
              {
                AddressOwner: normalizeRtdAddress("0xa"),
                $kind: "AddressOwner",
              },
            ],
            $kind: "ObjectWrite",
          },
          idOperation: { Created: true, $kind: "Created" },
        },
      ],
    ];
    tx.effects.bcs = bcs.TransactionEffects.serialize(effects).toBytes();
    tx.effects.changedObjects = [];
    expect(receiptObjectEffects(tx)).toEqual([
      {
        objectId,
        objectType: null,
        operation: "Created",
        inputOwner: null,
        outputOwner: normalizeRtdAddress("0xa"),
        outputState: "ObjectWrite",
        version: "12",
        objectDigest: toBase58(new Uint8Array(32).fill(9)),
      },
    ]);
  });
  it("全部本账户质押事件使用BCS，忽略错误JSON及其它账户事件", async () => {
    const tx = await transaction();
    const stake = (who: string) =>
      StakeEventBcs.serialize({
        poolId: "0x5",
        validatorAddress: "0x6",
        stakerAddress: who,
        epoch: "7",
        amount: "9007199254740993",
      }).toBytes();
    const unstake = UnstakeEventBcs.serialize({
      poolId: "0x5",
      validatorAddress: "0x6",
      stakerAddress: sender,
      stakeActivationEpoch: "7",
      unstakingEpoch: "9",
      principalAmount: "9007199254740993",
      rewardAmount: "7",
    }).toBytes();
    tx.events = [
      {
        packageId: "0x8",
        module: "app",
        sender,
        eventType: "0x3::validator::StakingRequestEvent",
        bcs: stake(sender),
        json: { amount: 1 },
      },
      {
        packageId: "0x8",
        module: "app",
        sender,
        eventType: "0x3::validator::StakingRequestEvent",
        bcs: stake("0xa"),
        json: null,
      },
      {
        packageId: "0x3",
        module: "validator",
        sender,
        eventType: "0x3::validator::UnstakingRequestEvent",
        bcs: unstake,
        json: { principal_amount: 1 },
      },
    ];
    const events = receiptStakeEvents(tx, sender);
    expect(events).toHaveLength(2);
    expect(events[0]).toMatchObject({
      kind: "stake",
      amount: "9007199254740993",
      index: 0,
    });
    expect(events[1]).toMatchObject({
      kind: "unstake",
      principalAmount: "9007199254740993",
      rewardAmount: "7",
      index: 2,
    });
  });
  it("已知质押事件缺BCS或附加字节拒绝，不能回退到JSON", async () => {
    const tx = await transaction();
    tx.events = [
      {
        packageId: "0x3",
        module: "validator",
        sender,
        eventType: "0x3::validator::StakingRequestEvent",
        bcs: new Uint8Array(),
        json: { amount: 1 },
      },
    ];
    expect(() => receiptStakeEvents(tx, sender)).toThrow();
  });
});
