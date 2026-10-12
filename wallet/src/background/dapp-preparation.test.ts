// Copyright (c) LinkU Labs, Inc.
// SPDX-License-Identifier: Apache-2.0
import { beforeEach, describe, expect, it, vi } from "vitest";
import { WalletReadSession } from "../shared/rpc/session";
import { Transaction } from "rtd-typescript/transactions";
import {
  prepareDappTransaction,
  dappPreparedRegistry,
  withAuthorizedDappRequest,
} from "./dapp-preparation";
import { bindDappRequest } from "../shared/rpc/dapp-request-binding";
import { profileFixture } from "../shared/rpc/profile-fixture";
import { validateNetworkProfile } from "../shared/rpc/profile";
import { walletAddress } from "../shared/rpc/asset-address";
import type { ApprovalRequest } from "../shared/messaging/messages/payloads/transactions/ApprovalRequest";
const mocks = vi.hoisted(() => ({
  get: vi.fn(),
  journalGet: vi.fn(),
  pending: vi.fn(),
  signal: vi.fn(),
  close: vi.fn(),
  permission: vi.fn(),
  prepare: vi.fn(),
  context: vi.fn(),
  executionAccount: vi.fn(),
  authorize: vi.fn(),
  authorizeLocal: vi.fn(),
}));
vi.mock("./Transactions", () => ({
  default: { getTransactionRequest: mocks.get, getRequestSignal: mocks.signal },
}));
vi.mock("./Permissions", () => ({
  default: { hasPermissions: mocks.permission },
}));
vi.mock("./execution", () => ({
  withExecutionAccount: (
    _id: string,
    op: (context: unknown) => unknown,
    signing: boolean,
    options: unknown,
  ) => {
    mocks.executionAccount(_id, signing, options);
    return op(mocks.context());
  },
}));
vi.mock("../shared/rpc/transaction-reader", () => ({
  WalletTransactionReader: class {
    prepare = mocks.prepare;
  },
}));
vi.mock("../shared/rpc/execution-journal", () => ({
  WalletExecutionJournal: class {
    get = mocks.journalGet;
    pending = mocks.pending;
  },
}));
vi.mock("../shared/rpc/execution-coordinator", () => ({
  BrowserExecutionLock: class {
    async run<T>(_scope: string, operation: () => Promise<T>) {
      return operation();
    }
  },
}));
const profile = validateNetworkProfile(profileFixture());
function testSession() {
  const session = new WalletReadSession(profile),
    close = session.close.bind(session);
  session.close = () => {
    mocks.close();
    close();
  };
  return session;
}
let request: ApprovalRequest;
let lifetime: AbortController;
beforeEach(async () => {
  vi.clearAllMocks();
  mocks.journalGet.mockReset().mockResolvedValue(null);
  mocks.pending.mockReset().mockResolvedValue(null);
  lifetime = new AbortController();
  mocks.signal.mockReturnValue(lifetime.signal);
  dappPreparedRegistry.clear();
  const tx = {
    type: "transaction" as const,
    data: new Transaction().serialize(),
    account: "0x7",
    chain: profile.walletStandardChain,
  };
  request = {
    id: "r",
    origin: "https://dapp.example",
    approved: null,
    createdDate: new Date().toISOString(),
    tx,
    binding: await bindDappRequest("r", "https://dapp.example", tx, profile),
  };
  mocks.get.mockImplementation(async () => structuredClone(request));
  mocks.permission.mockResolvedValue(true);
  mocks.authorize.mockResolvedValue(undefined);
  mocks.authorizeLocal.mockResolvedValue(undefined);
  mocks.context.mockReturnValue({
    session: testSession(),
    account: { address: Promise.resolve(walletAddress("0x7")) },
    authorize: mocks.authorize,
    authorizeLocal: mocks.authorizeLocal,
  });
  mocks.prepare.mockResolvedValue({
    digest: "prepared-digest",
    bytesBase64: "prepared-bytes",
    sender: walletAddress("0x7"),
    bindingKey: request.binding!.bindingKey,
  });
});
const run = () =>
  prepareDappTransaction({ requestId: "r", accountId: "account-7" });
it("本地账户栅栏失败，不读取dApp请求或发出身份探测", async () => {
  mocks.authorizeLocal.mockRejectedValue(new Error("本地账户已改变"));
  await expect(run()).rejects.toThrow("本地账户已改变");
  expect(mocks.get).not.toHaveBeenCalled();
  expect(mocks.authorize).not.toHaveBeenCalled();
  expect(mocks.prepare).not.toHaveBeenCalled();
});
it("每个dApp授权边界只做一次完整身份核验，必须等待完成", async () => {
  let release!: () => void;
  const gate = new Promise<void>((resolve) => { release = resolve; });
  mocks.authorize.mockImplementationOnce(() => gate);
  const operation = vi.fn(async ({ authorize }) => { await authorize(); });
  const pending = withAuthorizedDappRequest({ requestId: "r", accountId: "account-7" }, operation);
  await vi.waitFor(() => expect(mocks.authorize).toHaveBeenCalledOnce());
  expect(mocks.authorizeLocal).toHaveBeenCalledOnce();
  expect(mocks.permission).toHaveBeenCalledOnce();
  expect(operation).not.toHaveBeenCalled();
  release();
  await pending;
  expect(mocks.authorize).toHaveBeenCalledTimes(2);
  expect(mocks.authorizeLocal).toHaveBeenCalledTimes(2);
  expect(mocks.permission).toHaveBeenCalledTimes(2);
});
it("本地核验通过不能替代完整网络身份失败", async () => {
  mocks.authorize.mockRejectedValue(new Error("chain-mismatch"));
  await expect(run()).rejects.toThrow("chain-mismatch");
  expect(mocks.authorizeLocal).toHaveBeenCalledOnce();
  expect(mocks.permission).toHaveBeenCalledOnce();
  expect(mocks.prepare).not.toHaveBeenCalled();
});
it("外部gas owner单签执行在准备和批准token之前明确拒绝", async () => {
  const transaction = new Transaction();
  transaction.setGasOwner("0x8");
  if (request.tx.type !== "transaction") throw new Error();
  request.tx.data = await transaction.toJSON();
  request.tx.justSign = false;
  request.binding = await bindDappRequest(
    request.id,
    request.origin,
    request.tx,
    profile,
  );
  const register = vi.spyOn(dappPreparedRegistry, "register");
  await expect(run()).rejects.toThrow("赞助交易需要完整多方签名授权");
  expect(mocks.prepare).not.toHaveBeenCalled();
  expect(mocks.pending).not.toHaveBeenCalled();
  expect(mocks.journalGet).not.toHaveBeenCalled();
  expect(register).not.toHaveBeenCalled();
  register.mockRestore();
});
it("外部gas owner只签名仍能准备原始完整交易", async () => {
  const transaction = new Transaction();
  transaction.setGasOwner("0x8");
  if (request.tx.type !== "transaction") throw new Error();
  request.tx.data = await transaction.toJSON();
  request.tx.justSign = true;
  request.binding = await bindDappRequest(
    request.id,
    request.origin,
    request.tx,
    profile,
  );
  await expect(run()).resolves.toMatchObject({ requestId: request.id });
  expect(mocks.prepare).toHaveBeenCalledOnce();
  expect(mocks.prepare.mock.calls[0][0].getData().gasData.owner).toBe(
    walletAddress("0x8"),
  );
});
it("只读恢复只跳过交易网络守卫，仍保持账户和请求权限复核", async () => {
  await withAuthorizedDappRequest(
    { requestId: "r", accountId: "account-7" },
    async ({ authorize }) => {
      await authorize();
    },
    { readOnly: true },
  );
  expect(mocks.executionAccount).toHaveBeenCalledWith("account-7", true, {
    verifyTransactionNetwork: false,
  });
  expect(mocks.permission).toHaveBeenCalledTimes(2);
  expect(mocks.authorize).toHaveBeenCalledTimes(2);
  expect(mocks.authorizeLocal).toHaveBeenCalledTimes(2);
  expect(mocks.prepare).not.toHaveBeenCalled();
  mocks.permission.mockResolvedValue(false);
  await expect(
    withAuthorizedDappRequest(
      { requestId: "r", accountId: "account-7" },
      async () => {},
      { readOnly: true },
    ),
  ).rejects.toThrow("权限");
});
describe("后台dApp交易准备授权", () => {
  it("只从持久请求构建并在返回前复核权限与账户", async () => {
    expect(await run()).toMatchObject({
      requestId: "r",
      binding: request.binding,
      prepared: { digest: "prepared-digest" },
    });
    expect(mocks.get).toHaveBeenCalledTimes(2);
    expect(mocks.permission).toHaveBeenCalledTimes(2);
    expect(mocks.permission).toHaveBeenCalledWith(
      request.origin,
      ["viewAccount", "suggestTransactions"],
      undefined,
      walletAddress("0x7"),
    );
    expect(mocks.prepare.mock.calls[0][0].serialize()).toBe(
      request.tx.type === "transaction" && request.tx.data,
    );
    expect(mocks.authorize).toHaveBeenCalledTimes(2);
    expect(mocks.authorizeLocal).toHaveBeenCalledTimes(2);
    expect(mocks.executionAccount).toHaveBeenCalledWith("account-7", true, {
      verifyTransactionNetwork: true,
      preparationRequestId: "r",
    });
  });
  it.each([
    "missing",
    "approved",
    "expired",
    "future",
    "invalid-date",
    "legacy",
    "wrong-origin",
    "wrong-account",
  ])("准备前拒绝%s请求", async (kind) => {
    if (kind === "missing") mocks.get.mockResolvedValue(null);
    if (kind === "approved") request.approved = true;
    if (kind === "expired")
      request.createdDate = new Date(Date.now() - 10800001).toISOString();
    if (kind === "future")
      request.createdDate = new Date(Date.now() + 60000).toISOString();
    if (kind === "invalid-date") request.createdDate = "bad";
    if (kind === "legacy") request.binding = undefined;
    if (kind === "wrong-origin") request.origin = "https://other.example";
    if (kind === "wrong-account")
      mocks.context.mockReturnValue({
        session: testSession(),
        account: { address: Promise.resolve(walletAddress("0x8")) },
        authorize: mocks.authorize,
        authorizeLocal: mocks.authorizeLocal,
      });
    await expect(run()).rejects.toThrow();
    expect(mocks.prepare).not.toHaveBeenCalled();
  });
  it("权限撤销不发出准备请求", async () => {
    mocks.permission.mockResolvedValue(false);
    await expect(run()).rejects.toThrow("权限");
    expect(mocks.prepare).not.toHaveBeenCalled();
  });
  it("准备中权限撤销不能返回迟到预览", async () => {
    mocks.permission.mockResolvedValueOnce(true).mockResolvedValueOnce(false);
    await expect(run()).rejects.toThrow("权限");
    expect(mocks.prepare).toHaveBeenCalledOnce();
  });
  it("准备中账户失效拒绝结果", async () => {
    mocks.prepare.mockImplementation(async () => {
      mocks.authorize.mockRejectedValue(new Error("账户切换"));
      return {};
    });
    await expect(run()).rejects.toThrow("账户切换");
  });
  it("即使新请求自行带合法绑定也不能替换正在准备的原文", async () => {
    mocks.prepare.mockImplementation(async () => {
      const tx = new Transaction();
      tx.setSender("0x7");
      if (request.tx.type !== "transaction") throw new Error();
      request.tx.data = tx.serialize();
      request.binding = await bindDappRequest(
        request.id,
        request.origin,
        request.tx,
        profile,
      );
      return {};
    });
    await expect(run()).rejects.toThrow("准备期间");
  });
});

it("disconnect while preparing closes session and refuses late preview", async () => {
  const original = mocks.prepare.getMockImplementation();
  mocks.prepare.mockImplementation(async () => {
    lifetime.abort(new Error("disconnected"));
    return original!();
  });
  await expect(run()).rejects.toThrow("disconnected");
  expect(mocks.close).toHaveBeenCalledOnce();
});
it("connection abort listener is released after preparation", async () => {
  const remove = vi.spyOn(lifetime.signal, "removeEventListener");
  await run();
  expect(remove).toHaveBeenCalledWith("abort", expect.any(Function));
  lifetime.abort();
  expect(mocks.close).not.toHaveBeenCalled();
});

it("pending same-chain account prevents new preparation", async () => {
  mocks.pending.mockResolvedValue({ digest: "pending" });
  await expect(run()).rejects.toThrow("待确认");
  expect(mocks.prepare).not.toHaveBeenCalled();
});
it("仅交易准备请求在身份检查前开启同scope preflight，真实构建guard仍运行", async () => {
  await run();
  expect(mocks.executionAccount).toHaveBeenCalledWith("account-7", true, {
    verifyTransactionNetwork: true,
    preparationRequestId: "r",
  });
  expect(mocks.pending).toHaveBeenCalledTimes(2);
  expect(mocks.prepare).toHaveBeenCalledOnce();
});
it("existing request receipt prevents preparing different bytes for the same request", async () => {
  mocks.journalGet.mockResolvedValue({ digest: "confirmed" });
  await expect(run()).rejects.toThrow("已有执行记录");
  expect(mocks.prepare).not.toHaveBeenCalled();
});
it("new pending appearing during prepare prevents registering an approval", async () => {
  mocks.pending
    .mockResolvedValueOnce(null)
    .mockResolvedValueOnce({ digest: "pending" });
  const register = vi.spyOn(dappPreparedRegistry, "register");
  await expect(run()).rejects.toThrow("待确认");
  expect(register).not.toHaveBeenCalled();
});
it("journal read failure prevents a new build", async () => {
  mocks.journalGet.mockRejectedValue(new Error("storage unavailable"));
  await expect(run()).rejects.toThrow("storage unavailable");
  expect(mocks.prepare).not.toHaveBeenCalled();
});
