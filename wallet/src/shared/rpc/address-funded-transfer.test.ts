import { describe, expect, it, vi } from "vitest";
import {
  normalizeRtdAddress,
  normalizeStructTag,
  RTD_TYPE_ARG,
  toBase58,
} from "rtd-typescript/utils";
import type {
  WalletRpc,
  WalletPreparedTransaction,
} from "rtd-apps-core/src/rpc/WalletRpcContext";
import { addressFundedTransfer } from "./address-funded-transfer";
import { prepareCoinTransfer } from "./coin-transfer-preparation";
import { Transaction } from "rtd-typescript/transactions";
import { toBase64 } from "rtd-typescript/utils";

const sender = normalizeRtdAddress("0xb"),
  to = normalizeRtdAddress("0xa");
const options = {
  sender,
  to,
  coinType: RTD_TYPE_ARG,
  amount: 900n,
  addressBalance: 1000n,
  coins: [],
  payAll: false,
};
const withdrawals = (tx: ReturnType<typeof addressFundedTransfer>) =>
  tx
    .getData()
    .inputs.flatMap((input) =>
      input.FundsWithdrawal ? [input.FundsWithdrawal.reservation] : [],
    );
describe("地址资金与Coin混合准备", () => {
  it.each(["all", "omitted", "version", "digest"])(
    "混合发送全部检查最终bytes中的完整Coin引用：%s", async (mode) => {
      const coins = ["0xc", "0xd"].map((id) => ({
        objectId: normalizeRtdAddress(id), version: "11",
        digest: toBase58(new Uint8Array(32).fill(9)), balance: "500",
        type: normalizeStructTag(`0x2::coin::Coin<${RTD_TYPE_ARG}>`),
        owner: { $kind: "AddressOwner" as const, AddressOwner: sender },
      }));
      const resolved = new Transaction();
      resolved.setSender(sender);
      resolved.setGasOwner(sender);
      resolved.setGasPrice(1);
      resolved.setGasBudget(100);
      resolved.setGasPayment(coins.filter((_, index) => mode !== "omitted" || index === 0)
        .map((coin, index) => ({ ...coin,
          version: mode === "version" && index === 1 ? "12" : coin.version,
          digest: mode === "digest" && index === 1
            ? toBase58(new Uint8Array(32).fill(8)) : coin.digest,
        })));
      resolved.transferObjects([resolved.gas], to);
      const bytes = await resolved.build();
      const prepare = vi.fn().mockResolvedValue({
        bindingKey: "b", readSessionKey: "s", sender,
        bytesBase64: toBase64(bytes), digest: await resolved.getDigest(),
      });
      const rpc = { bindingKey: "b", readSessionKey: "s",
        readFreshCoins: vi.fn().mockResolvedValue(coins),
        readFreshBalance: vi.fn().mockResolvedValue({ coinType: RTD_TYPE_ARG,
          balance: "2000", coinBalance: "1000", addressBalance: "1000" }),
        prepareTransaction: prepare,
      } as unknown as WalletRpc;
      const promise = prepareCoinTransfer(rpc, {
        sender, to, coinType: RTD_TYPE_ARG, amount: "2000", coinDecimals: 0, isPayAllRtd: true,
      });
      if (mode === "all") expect((await promise).bytesBase64).toBe(toBase64(bytes));
      else await expect(promise).rejects.toThrow("未覆盖所有Coin或其版本已改变");
      expect(prepare).toHaveBeenCalledTimes(1);
    },
  );
  it("原生地址资金交由Fullnode选择reservation，避免固定空gas payment", () => {
    const tx = addressFundedTransfer(options);
    expect(tx.getData().gasData.payment).toBeNull();
    expect(withdrawals(tx)).toEqual([]);
    expect(tx.getData().commands.map((command) => command.$kind)).toEqual([
      "SplitCoins",
      "TransferObjects",
    ]);
  });
  it("发送全部使用最终GasCoin，预算和reservation由正式模拟确定", () => {
    const tx = addressFundedTransfer({
      ...options,
      amount: 1000n,
      payAll: true,
    });
    expect(tx.getData().gasData.payment).toBeNull();
    expect(tx.getData().gasData.budget).toBeNull();
    expect(withdrawals(tx)).toEqual([]);
    expect(tx.getData().commands[0].TransferObjects?.objects).toEqual([
      { $kind: "GasCoin", GasCoin: true },
    ]);
  });
  it("混合原生资金自动选择；非原生redeem的剩余Coin必须返回发送人", () => {
    const coin = {
      objectId: normalizeRtdAddress("0xc"),
      version: "1",
      digest: toBase58(new Uint8Array(32).fill(1)),
      balance: "500",
      type: normalizeStructTag(`0x2::coin::Coin<${RTD_TYPE_ARG}>`),
      owner: { $kind: "AddressOwner" as const, AddressOwner: sender },
    };
    const tx = addressFundedTransfer({ ...options, coins: [coin] });
    expect(tx.getData().gasData.payment).toBeNull();
    expect(withdrawals(tx)).toEqual([]);
    expect(tx.getData().commands.map((command) => command.$kind)).toEqual([
      "SplitCoins",
      "TransferObjects",
    ]);
    const type = normalizeStructTag("0x3::token::TOKEN");
    const token = {
      ...coin,
      type: normalizeStructTag(`0x2::coin::Coin<${type}>`),
    };
    const mixed = addressFundedTransfer({
      ...options,
      coinType: type,
      addressBalance: 400n,
      coins: [token],
    });
    expect(mixed.getData().commands.map((command) => command.$kind)).toEqual([
      "MoveCall",
      "MergeCoins",
      "SplitCoins",
      "TransferObjects",
      "TransferObjects",
    ]);
  });
  it("批准结果只能来自最终资金交易的正式准备", async () => {
    const prepared = {
      bindingKey: "b",
      readSessionKey: "s",
      sender,
      gasBudget: "100",
      bytesBase64: "final",
      digest: "final",
    } as WalletPreparedTransaction;
    const prepare = vi.fn().mockResolvedValue(prepared);
    const rpc = {
      bindingKey: "b",
      readSessionKey: "s",
      readFreshCoins: vi.fn().mockResolvedValue([]),
      readFreshBalance: vi
        .fn()
        .mockResolvedValue({
          coinType: RTD_TYPE_ARG,
          balance: "1000",
          coinBalance: "0",
          addressBalance: "1000",
        }),
      prepareTransaction: prepare,
    } as unknown as WalletRpc;
    const input = {
      sender,
      to,
      coinType: RTD_TYPE_ARG,
      amount: "1000",
      coinDecimals: 0,
      isPayAllRtd: true,
    };
    const result = await prepareCoinTransfer(rpc, input);
    expect(result.bytesBase64).toBe("final");
    expect(prepare).toHaveBeenCalledTimes(1);
    expect(prepare.mock.calls[0][0].getData().gasData.payment).toBeNull();
    prepare.mockRejectedValueOnce(new Error("reservation is unsupported"));
    await expect(prepareCoinTransfer(rpc, input)).rejects.toThrow(
      "reservation is unsupported",
    );
    prepare.mockClear();
    await expect(
      prepareCoinTransfer(rpc, { ...input, amount: "999" }),
    ).rejects.toThrow("余额或发送全部金额已改变");
    expect(prepare).not.toHaveBeenCalled();
  });
});
