// Copyright (c) LinkU Labs, Inc.
// SPDX-License-Identifier: Apache-2.0
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { bcs } from "rtd-typescript/bcs";
import { messageWithIntent } from "rtd-typescript/cryptography";
import { profileFixture } from "../shared/rpc/profile-fixture";
import { toBase64 } from "rtd-typescript/utils";
import { testKey, sender } from "../../tests/unit/rpc/execution-fixtures";
import { signDappPersonalMessage } from "./dapp-personal-message";
const m = vi.hoisted(() => ({
  get: vi.fn(),
  signal: vi.fn(),
  captureEgress: vi.fn(),
  runAction: vi.fn(),
  sealEgress: vi.fn(),
  account: vi.fn(),
  permission: vi.fn(),
  sign: vi.fn(),
  network: vi.fn(),
  netOn: vi.fn(),
  netOff: vi.fn(),
  on: vi.fn(),
  off: vi.fn(),
}));
vi.mock("./Transactions", () => ({
  default: {
    getTransactionRequest: m.get,
    getRequestSignal: m.signal,
    captureDappEgress: m.captureEgress,
    runDappAction: m.runAction,
    sealDappEgress: m.sealEgress,
  },
}));
vi.mock("./Permissions", () => ({ default: { hasPermissions: m.permission } }));
vi.mock("./accounts", () => ({ getAccountByID: m.account }));
vi.mock("./accounts/Account", () => ({ isSigningAccount: () => true }));
vi.mock("./accounts/events", () => ({
  accountsEvents: { on: m.on, off: m.off },
}));
vi.mock("./NetworkEnv", () => ({
  default: { getActiveNetwork: m.network, on: m.netOn, off: m.netOff },
}));
let life: AbortController, request: any;
const bytes = new TextEncoder().encode("message \u4e2d\u6587");
beforeEach(async () => {
  vi.resetAllMocks();
  vi.stubEnv(
    "WALLET_NETWORK_PROFILES",
    JSON.stringify({ local: profileFixture() }),
  );
  m.network.mockResolvedValue({ env: "local", customRpcUrl: null });
  m.captureEgress.mockResolvedValue(Object.freeze({}));
  m.runAction.mockImplementation((_id, _claim, _stage, start) => start());
  life = new AbortController();
  m.signal.mockReturnValue(life.signal);
  request = {
    id: "r",
    origin: "https://dapp.example",
    approved: null,
    createdDate: new Date().toISOString(),
    tx: {
      type: "sign-message",
      message: toBase64(bytes),
      accountAddress: sender,
    },
  };
  m.get.mockImplementation(async () => structuredClone(request));
  m.account.mockResolvedValue({
    id: "a",
    address: Promise.resolve(sender),
    isLocked: async () => false,
    toUISerialized: async () => ({ selected: true }),
    signData: m.sign,
  });
  m.permission.mockResolvedValue(true);
  m.sign.mockResolvedValue(
    (await testKey.signPersonalMessage(bytes)).signature,
  );
});
afterEach(() => {
  life.abort();
  vi.unstubAllEnvs();
});
const run = () => signDappPersonalMessage({ accountId: "a", requestId: "r" });
it("signs BCS vector with PersonalMessage Intent and verifies locally without network", async () => {
  expect(await run()).toMatchObject({ messageBytes: toBase64(bytes) });
  expect(m.sign).toHaveBeenCalledWith(
    messageWithIntent(
      "PersonalMessage",
      bcs.vector(bcs.u8()).serialize(bytes).toBytes(),
    ),
  );
  expect(m.network).toHaveBeenCalledOnce();
  expect(m.permission).toHaveBeenCalledTimes(3);
  expect(m.off).toHaveBeenCalledTimes(3);
});
it("duplicate approval never signs twice", async () => {
  await run();
  await expect(run()).rejects.toThrow("已进入签名");
  expect(m.sign).toHaveBeenCalledOnce();
});
it("changed message during signing cannot release signature", async () => {
  const signature = (await testKey.signPersonalMessage(bytes)).signature;
  m.sign.mockImplementation(async () => {
    request.tx.message = toBase64(new Uint8Array([1]));
    return signature;
  });
  await expect(run()).rejects.toThrow("失效");
});
it("revoked permission does not sign", async () => {
  m.permission.mockResolvedValue(false);
  await expect(run()).rejects.toThrow("权限");
  expect(m.sign).not.toHaveBeenCalled();
});
it("disconnect during signing refuses late signature", async () => {
  const signature = (await testKey.signPersonalMessage(bytes)).signature;
  m.sign.mockImplementation(async () => {
    life.abort(new Error("disconnect"));
    return signature;
  });
  await expect(run()).rejects.toThrow("disconnect");
});
it("wrong-message signature fails actual cryptographic verification", async () => {
  m.sign.mockResolvedValue(
    (await testKey.signPersonalMessage(new Uint8Array([1]))).signature,
  );
  await expect(run()).rejects.toThrow();
});
it("expired request is rejected before signing", async () => {
  request.createdDate = new Date(0).toISOString();
  await expect(run()).rejects.toThrow("失效");
  expect(m.sign).not.toHaveBeenCalled();
});

function changeNetwork() {
  const listener = m.netOn.mock.calls.find(
    ([event]) => event === "changed",
  )?.[1];
  expect(listener).toBeTypeOf("function");
  listener();
}
it("network change while reading initial account prevents signing and removes listeners", async () => {
  const account = await m.account();
  m.account.mockImplementation(async () => {
    changeNetwork();
    return account;
  });
  await expect(run()).rejects.toThrow("授权会话已改变");
  expect(m.sign).not.toHaveBeenCalled();
  expect(m.netOff).toHaveBeenCalledWith("changed", expect.any(Function));
});
it("network change while signing discards the late locally verified signature", async () => {
  const signature = (await testKey.signPersonalMessage(bytes)).signature;
  m.sign.mockImplementation(async () => {
    changeNetwork();
    return signature;
  });
  await expect(run()).rejects.toThrow("授权会话已改变");
  expect(m.sign).toHaveBeenCalledOnce();
  expect(m.network).toHaveBeenCalledOnce();
});
it("account lookup failure still removes network and account listeners", async () => {
  m.account.mockRejectedValue(new Error("lookup failed"));
  await expect(run()).rejects.toThrow("lookup failed");
  expect(m.netOff).toHaveBeenCalledOnce();
  expect(m.off).toHaveBeenCalledTimes(3);
});
it("a different account id cannot authorize a message even with the same address", async () => {
  const account = await m.account();
  m.account.mockResolvedValue({ ...account, id: "other" });
  await expect(run()).rejects.toThrow("不支持");
  expect(m.sign).not.toHaveBeenCalled();
});
it.each(["", "x".repeat(201)])(
  "invalid request id is rejected before lifetime or account access",
  async (requestId) => {
    await expect(
      signDappPersonalMessage({ accountId: "a", requestId }),
    ).rejects.toThrow("标识无效");
    expect(m.signal).not.toHaveBeenCalled();
    expect(m.account).not.toHaveBeenCalled();
  },
);
it("validates explicit current chain locally before and after signing", async () => {
  request.tx.chain = "rtd:localnet";
  m.network.mockResolvedValue({ env: "local", customRpcUrl: null });
  expect(await run()).toMatchObject({ messageBytes: toBase64(bytes) });
  expect(m.network).toHaveBeenCalledTimes(4);
});
it("rejects explicit wrong chain without signing", async () => {
  request.tx.chain = "rtd:mainnet";
  m.network.mockResolvedValue({ env: "local", customRpcUrl: null });
  await expect(run()).rejects.toThrow("消息请求链与当前钱包网络不匹配");
  expect(m.sign).not.toHaveBeenCalled();
});
it("rejects chain changed in stored request while signing", async () => {
  request.tx.chain = "rtd:localnet";
  m.network.mockResolvedValue({ env: "local", customRpcUrl: null });
  m.sign.mockImplementation(async () => {
    request.tx.chain = "rtd:mainnet";
    return (await testKey.signPersonalMessage(bytes)).signature;
  });
  await expect(run()).rejects.toThrow("消息批准请求已失效");
});
it.each([null, "", 1, "sui:localnet", "rtd:bad chain"])(
  "rejects malformed explicit message chain %s before signing",
  async (chain) => {
    request.tx.chain = chain;
    await expect(run()).rejects.toThrow("链格式");
    expect(m.sign).not.toHaveBeenCalled();
  },
);
it("uses the configured custom profile chain without a remote lookup", async () => {
  request.tx.chain = "rtd:custom-local";
  m.network.mockResolvedValue({
    env: "customRPC",
    customRpcUrl: "https://full.example.invalid",
    profile: {
      ...profileFixture(),
      walletStandardChain: "rtd:custom-local",
      fullnode: { url: "https://full.example.invalid", transport: "grpc-web" },
    },
  });
  expect(await run()).toMatchObject({ messageBytes: toBase64(bytes) });
});
