// Copyright (c) LinkU Labs, Inc.
// SPDX-License-Identifier: Apache-2.0
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { fromBase64, toBase64 } from "rtd-typescript/utils";
import {
  Transaction,
  TransactionDataBuilder,
} from "rtd-typescript/transactions";
import { verifyTransactionSignature } from "rtd-typescript/verify";
import { messageWithIntent } from "rtd-typescript/cryptography";
import { signDappPrepared } from "./dapp-signing";
import {
  executionFixture,
  sender,
  testKey,
} from "../../tests/unit/rpc/execution-fixtures";
import { profileFixture } from "../shared/rpc/profile-fixture";
import {
  validateNetworkProfile,
  networkBindingKey,
} from "../shared/rpc/profile";
import { WalletReadSession } from "../shared/rpc/session";
import { backgroundNetworkAdmission } from "../../tests/unit/rpc/network-admission-fixture";
vi.mock("../shared/rpc/network-admission-store", async () => {
  const { backgroundNetworkAdmission: store } =
    await import("../../tests/unit/rpc/network-admission-fixture");
  return {
    WalletNetworkAdmissionStore: class {
      runIfClear<T>(...args: Parameters<typeof store.runIfClear<T>>) {
        return store.runIfClear<T>(...args);
      }
      assertClear(...args: Parameters<typeof store.assertClear>) {
        return store.assertClear(...args);
      }
      begin(...args: Parameters<typeof store.begin>) {
        return store.begin(...args);
      }
      complete(...args: Parameters<typeof store.complete>) {
        return store.complete(...args);
      }
    },
  };
});
const sessions: WalletReadSession[] = [];
afterEach(() => {
  sessions.splice(0).forEach((s) => s.close());
});
const mocks = vi.hoisted(() => ({
  context: vi.fn(),
  consume: vi.fn(),
  pending: vi.fn(),
  simulate: vi.fn(),
  sign: vi.fn(),
  verify: vi.fn(),
  authorize: vi.fn(),
  lock: vi.fn(),
  captureEgress: vi.fn(),
  runAction: vi.fn(),
  sealEgress: vi.fn(),
}));
vi.mock("./Transactions", () => ({
  default: {
    captureDappEgress: mocks.captureEgress,
    runDappAction: mocks.runAction,
    sealDappEgress: mocks.sealEgress,
  },
}));
vi.mock("./dapp-preparation", () => ({
  withAuthorizedDappRequest: (
    _args: unknown,
    op: (context: unknown) => unknown,
  ) => op(mocks.context()),
  dappPreparedRegistry: { consume: mocks.consume },
}));
vi.mock("../shared/rpc/execution-coordinator", () => ({
  BrowserExecutionLock: class {
    run = mocks.lock;
  },
}));
vi.mock("../shared/rpc/execution-journal", () => ({
  WalletExecutionJournal: class {
    pending = mocks.pending;
  },
}));
vi.mock("../shared/rpc/transaction-reader", () => ({
  WalletTransactionReader: class {
    simulate = mocks.simulate;
  },
}));
vi.mock("../shared/rpc/execution-reader", async (original) => ({
  ...(await original<typeof import("../shared/rpc/execution-reader")>()),
  WalletExecutionReader: class {
    verifySignature = mocks.verify;
  },
}));
let fixture: Awaited<ReturnType<typeof executionFixture>>;
const profile = validateNetworkProfile(profileFixture());
beforeEach(async () => {
  vi.resetAllMocks();
  backgroundNetworkAdmission.clear();
  mocks.captureEgress.mockResolvedValue(Object.freeze({}));
  mocks.runAction.mockImplementation((_id, _claim, _stage, start) => start());
  fixture = await executionFixture();
  const session = new WalletReadSession(profile);
  sessions.push(session);
  mocks.context.mockReturnValue({
    session,
    account: { signData: mocks.sign },
    sender,
    request: {
      origin: "https://example.com",
      binding: { mode: "sign", sourceHash: "source" },
    },
    authorize: mocks.authorize,
  });
  mocks.consume.mockReturnValue({
    bytesBase64: fixture.bytesBase64,
    digest: fixture.digest,
  });
  mocks.lock.mockImplementation((_scope, operation) => operation());
  mocks.pending.mockResolvedValue(null);
  mocks.sign.mockResolvedValue("signed");
  mocks.simulate.mockResolvedValue({
    $kind: "Transaction",
    Transaction: { digest: fixture.digest },
  });
});
const run = () =>
  signDappPrepared({ accountId: "a", requestId: "r", approvalToken: "token" });
describe("后台dApp只签名固定批准bytes", () => {
  it("赞助交易只返回发送方对完整批准bytes的签名，gas和有效期不重建", async () => {
    const sponsored = Transaction.from(fixture.bytes);
    sponsored.setGasOwner("0x9");
    sponsored.setExpiration({ Epoch: "9007199254740993" });
    const before = sponsored.getData();
    const bytes = await sponsored.build();
    const bytesBase64 = toBase64(bytes);
    const digest = TransactionDataBuilder.getDigestFromBytes(bytes);
    const signed = await testKey.signTransaction(bytes);
    mocks.consume.mockReturnValue(Object.freeze({ bytesBase64, digest }));
    mocks.simulate.mockResolvedValue({
      $kind: "Transaction",
      Transaction: { digest },
    });
    mocks.sign.mockResolvedValue(signed.signature);
    const result = await run();
    expect(result).toEqual({ bytes: bytesBase64, signature: signed.signature });
    expect(mocks.simulate).toHaveBeenCalledExactlyOnceWith(bytesBase64, sender);
    expect(mocks.sign).toHaveBeenCalledExactlyOnceWith(
      messageWithIntent("TransactionData", bytes),
    );
    expect(mocks.verify).toHaveBeenCalledExactlyOnceWith(
      bytesBase64,
      sender,
      signed.signature,
      mocks.context().session.signal,
    );
    await verifyTransactionSignature(
      fromBase64(result.bytes),
      result.signature,
      {
        address: sender,
      },
    );
    const after = Transaction.from(result.bytes).getData();
    expect(after.sender).toBe(sender);
    expect(after.gasData).toEqual(before.gasData);
    expect(after.expiration).toEqual(before.expiration);
    expect(mocks.pending).toHaveBeenCalledTimes(1);
  });
  it("同bytes正式模拟、TransactionData Intent签名和验签后返回，不广播", async () => {
    expect(await run()).toEqual({
      bytes: fixture.bytesBase64,
      signature: "signed",
    });
    expect(mocks.consume).toHaveBeenCalledWith(
      "token",
      expect.objectContaining({ accountId: "a", requestId: "r", mode: "sign" }),
    );
    expect(mocks.simulate).toHaveBeenCalledWith(fixture.bytesBase64, sender);
    expect(mocks.sign).toHaveBeenCalledWith(
      messageWithIntent("TransactionData", fromBase64(fixture.bytesBase64)),
    );
    expect(mocks.verify).toHaveBeenCalledWith(
      fixture.bytesBase64,
      sender,
      "signed",
      expect.any(AbortSignal),
    );
    expect(mocks.authorize).toHaveBeenCalledTimes(9);
  });
  it("execute请求不得挪用sign命令", async () => {
    const ctx = mocks.context();
    ctx.request.binding.mode = "execute";
    await expect(run()).rejects.toThrow("只签名");
    expect(mocks.consume).not.toHaveBeenCalled();
  });
  it("凭据失效不签名", async () => {
    mocks.consume.mockImplementation(() => {
      throw new Error("凭据失效");
    });
    await expect(run()).rejects.toThrow("失效");
    expect(mocks.sign).not.toHaveBeenCalled();
  });
  it("摘要不匹配不进入锁或签名", async () => {
    mocks.consume.mockReturnValue({
      bytesBase64: fixture.bytesBase64,
      digest: "changed",
    });
    await expect(run()).rejects.toThrow("摘要");
    expect(mocks.lock).not.toHaveBeenCalled();
  });
  it("已有pending禁止新签名", async () => {
    mocks.pending.mockResolvedValue({ digest: "pending" });
    await expect(run()).rejects.toThrow("未确定");
    expect(mocks.simulate).not.toHaveBeenCalled();
    expect(mocks.sign).not.toHaveBeenCalled();
  });
  it("正式模拟失败禁止签名", async () => {
    mocks.simulate.mockResolvedValue({ $kind: "FailedTransaction" });
    await expect(run()).rejects.toThrow("模拟");
    expect(mocks.sign).not.toHaveBeenCalled();
  });
  it.each([1, 2, 3, 4, 5, 6, 7, 8, 9])(
    "授权第%d边界撤销不返回签名",
    async (boundary) => {
      let count = 0;
      mocks.authorize.mockImplementation(async () => {
        if (++count === boundary) throw new Error("撤权");
      });
      await expect(run()).rejects.toThrow("撤权");
      if (boundary <= 5) expect(mocks.sign).not.toHaveBeenCalled();
    },
  );
  it("验签失败不能返回结果", async () => {
    mocks.verify.mockRejectedValue(new Error("验签失败"));
    await expect(run()).rejects.toThrow("验签");
  });
});

it.each([1, 2])("最终动作第%d边界新增持久Fault不返回签名", async (boundary) => {
  const original = backgroundNetworkAdmission.runIfClear.bind(
    backgroundNetworkAdmission,
  );
  let count = 0;
  const hook = vi
    .spyOn(backgroundNetworkAdmission, "runIfClear")
    .mockImplementation(async (p, areas, start) => {
      if (++count === boundary) {
        const area = { kind: "identity", role: "fullnode" } as const;
        const ticket = await backgroundNetworkAdmission.begin(p, [area]);
        await backgroundNetworkAdmission.complete(p, ticket, [
          { ...area, reason: "chain-mismatch" },
        ]);
      }
      return original(p, areas, start);
    });
  try {
    await expect(run()).rejects.toMatchObject({ reason: "quarantined" });
    expect(mocks.sign).toHaveBeenCalledTimes(boundary === 1 ? 0 : 1);
    expect(count).toBe(boundary);
  } finally {
    hook.mockRestore();
  }
});
