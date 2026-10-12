// Copyright (c) LinkU Labs, Inc.
// SPDX-License-Identifier: Apache-2.0
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { Subject } from "rxjs";
import { Transaction } from "rtd-typescript/transactions";
import transactions from "./Transactions";
import { accountsEvents } from "./accounts/events";
import { profileFixture } from "../shared/rpc/profile-fixture";
import type { ContentScriptConnection } from "./connections/ContentScriptConnection";
import type { ApprovalRequest } from "../shared/messaging/messages/payloads/transactions/ApprovalRequest";
const mocks = vi.hoisted(() => ({
  network: vi.fn(),
  on: vi.fn(),
  off: vi.fn(),
  get: vi.fn(),
  set: vi.fn(),
  show: vi.fn(),
  close: vi.fn(),
  captureEgress: vi.fn(),
  publishEgress: vi.fn(),
  runAction: vi.fn(),
}));
vi.mock("./dapp-egress-runtime", () => ({
  getDappEgressBroker: () => ({
    capture: mocks.captureEgress,
    publish: mocks.publishEgress,
    runBeforeAction: mocks.runAction,
  }),
}));
vi.mock("./NetworkEnv", () => ({
  default: { getActiveNetwork: mocks.network, on: mocks.on, off: mocks.off },
}));
vi.mock("webextension-polyfill", () => ({
  default: {
    runtime: { getURL: () => "chrome-extension://wallet/ui.html" },
    storage: { local: { get: mocks.get, set: mocks.set } },
  },
}));
vi.mock("./Window", () => ({
  Window: class {
    show = mocks.show;
    close = mocks.close;
  },
}));
const connection = {
  get onDisconnect() {
    return disconnect.asObservable();
  },
  origin: "https://dapp.example",
  originFavIcon: "https://dapp.example/icon.png",
  nativeSender: { documentId: "opaque-native" },
} as unknown as ContentScriptConnection;
let stored: Record<string, ApprovalRequest>;
let close: Subject<number>;
let disconnect: Subject<void>;
beforeEach(() => {
  vi.clearAllMocks();
  stored = {};
  close = new Subject();
  disconnect = new Subject();
  mocks.close.mockResolvedValue(undefined);
  mocks.captureEgress.mockResolvedValue(Object.freeze({}));
  mocks.publishEgress.mockResolvedValue(undefined);
  mocks.runAction.mockImplementation((_claim, _stage, signal, start) => {
    signal.throwIfAborted();
    return start();
  });
  vi.stubEnv(
    "WALLET_NETWORK_PROFILES",
    JSON.stringify({ local: profileFixture() }),
  );
  mocks.network.mockResolvedValue({ env: "local", customRpcUrl: null });
  mocks.get.mockImplementation(async () => ({
    transactions: structuredClone(stored),
  }));
  mocks.set.mockImplementation(async (value) => {
    stored = structuredClone(value.transactions);
  });
  mocks.show.mockResolvedValue(close);
});
afterEach(() => vi.unstubAllEnvs());
function execute(chain = "rtd:localnet") {
  return transactions.executeOrSignTransaction(
    {
      tx: {
        type: "transaction",
        data: new Transaction().serialize(),
        account: "0x7",
        chain,
      },
    },
    connection,
  );
}
describe("dApp请求真实后台入口", () => {
  it("错链在存储及打开批准窗口前拒绝", async () => {
    await expect(execute("rtd:mainnet")).rejects.toThrow("链");
    expect(mocks.set).not.toHaveBeenCalled();
    expect(mocks.show).not.toHaveBeenCalled();
  });
  it("缺少配置不能退回旧RPC批准", async () => {
    vi.stubEnv("WALLET_NETWORK_PROFILES", "{}");
    await expect(execute()).rejects.toThrow("未配置");
    expect(mocks.set).not.toHaveBeenCalled();
    expect(mocks.show).not.toHaveBeenCalled();
  });
  it("执行请求保留浏览器来源及后台profile绑定，关闭后清理请求", async () => {
    const result = execute();
    const rejected = expect(result).rejects.toThrow("Rejected");
    await vi.waitFor(() => expect(mocks.show).toHaveBeenCalledOnce());
    const request = Object.values(stored)[0];
    expect(request.binding).toMatchObject({
      requestId: request.id,
      origin: connection.origin,
      chain: "rtd:localnet",
      mode: "execute",
      account: `0x${"0".repeat(63)}7`,
    });
    expect(request.tx).toHaveProperty("chain", "rtd:localnet");
    close.next(1);
    await rejected;
    expect(stored).toEqual({});
  });
  it("sign入口也保留chain并标记只签名", async () => {
    const result = transactions.executeOrSignTransaction(
      {
        sign: {
          transaction: new Transaction().serialize(),
          account: "0x7",
          chain: "rtd:localnet",
        },
      },
      connection,
    );
    const rejected = expect(result).rejects.toThrow("Rejected");
    await vi.waitFor(() => expect(mocks.show).toHaveBeenCalledOnce());
    expect(Object.values(stored)[0].binding).toMatchObject({
      mode: "sign",
      chain: "rtd:localnet",
    });
    close.next(1);
    await rejected;
  });
  it("sign入口不能丢弃错误chain", async () => {
    await expect(
      transactions.executeOrSignTransaction(
        {
          sign: {
            transaction: new Transaction().serialize(),
            account: "0x7",
            chain: "rtd:mainnet",
          },
        },
        connection,
      ),
    ).rejects.toThrow("链");
    expect(mocks.show).not.toHaveBeenCalled();
  });
});

it("connection disconnect invalidates request signal, cleans storage and closes popup", async () => {
  const result = execute();
  const rejected = expect(result).rejects.toThrow("断开");
  await vi.waitFor(() => expect(mocks.show).toHaveBeenCalledOnce());
  const id = Object.keys(stored)[0];
  const signal = transactions.getRequestSignal(id);
  disconnect.next();
  await rejected;
  expect(signal.aborted).toBe(true);
  expect(stored).toEqual({});
  expect(mocks.close).toHaveBeenCalledOnce();
  expect(() => transactions.getRequestSignal(id)).toThrow("失效");
  expect(disconnect.observed).toBe(false);
});
it("disconnect during async profile selection never opens approval", async () => {
  let resolve!: (value: unknown) => void;
  mocks.network.mockImplementation(
    () =>
      new Promise((r) => {
        resolve = r;
      }),
  );
  const result = execute();
  const rejected = expect(result).rejects.toThrow("断开");
  disconnect.next();
  resolve({ env: "local", customRpcUrl: null });
  await rejected;
  expect(mocks.show).not.toHaveBeenCalled();
  expect(stored).toEqual({});
  expect(disconnect.observed).toBe(false);
});
it("a persisted request without a live source connection is rejected after worker restart", () => {
  expect(() => transactions.getRequestSignal("old-persisted-id")).toThrow(
    "连接已失效",
  );
});

it("concurrent popup requests survive storage mutations and independent close", async () => {
  const firstClose = new Subject<number>();
  const secondClose = new Subject<number>();
  mocks.show
    .mockResolvedValueOnce(firstClose)
    .mockResolvedValueOnce(secondClose);
  const first = execute();
  const second = execute();
  let rejected = 0;
  const rejectFirst = Promise.resolve(
    expect(first).rejects.toThrow("Rejected"),
  ).then(() => rejected++);
  const rejectSecond = Promise.resolve(
    expect(second).rejects.toThrow("Rejected"),
  ).then(() => rejected++);
  await vi.waitFor(() => expect(mocks.show).toHaveBeenCalledTimes(2));
  expect(Object.keys(stored)).toHaveLength(2);
  await vi.waitFor(() => {
    expect(firstClose.observed).toBe(true);
    expect(secondClose.observed).toBe(true);
  });
  firstClose.next(1);
  // Binding hashes can finish in either order; close the actual first popup.
  await Promise.race([rejectFirst, rejectSecond]);
  expect(rejected).toBe(1);
  expect(Object.keys(stored)).toHaveLength(1);
  expect(transactions.getRequestSignal(Object.keys(stored)[0]).aborted).toBe(
    false,
  );
  secondClose.next(2);
  await Promise.all([rejectFirst, rejectSecond]);
  expect(rejected).toBe(2);
  expect(stored).toEqual({});
});
it("rejects wrong personal-message chain before storage or popup", async () => {
  await expect(
    transactions.signMessage(
      { message: "AQ==", accountAddress: "0x7", chain: "rtd:mainnet" },
      connection,
    ),
  ).rejects.toThrow("消息请求链与当前钱包网络不匹配");
  expect(mocks.set).not.toHaveBeenCalled();
  expect(mocks.show).not.toHaveBeenCalled();
});
it("stores explicit personal-message chain unchanged for approval revalidation", async () => {
  const result = transactions.signMessage(
    { message: "AQ==", accountAddress: "0x7", chain: "rtd:localnet" },
    connection,
  );
  result.catch(() => {});
  await vi.waitFor(() => expect(mocks.show).toHaveBeenCalled());
  expect(Object.values(stored)[0].tx).toMatchObject({
    type: "sign-message",
    chain: "rtd:localnet",
  });
  disconnect.next();
  await expect(result).rejects.toThrow();
});
it("disconnect during personal-message chain lookup cannot create an approval", async () => {
  let release!: (value: any) => void;
  mocks.network.mockReturnValue(
    new Promise((resolve) => {
      release = resolve;
    }),
  );
  const result = transactions.signMessage(
    { message: "AQ==", accountAddress: "0x7", chain: "rtd:localnet" },
    connection,
  );
  result.catch(() => {});
  await vi.waitFor(() => expect(mocks.network).toHaveBeenCalled());
  disconnect.next();
  release({ env: "local", customRpcUrl: null });
  await expect(result).rejects.toThrow("断开");
  // Cleanup may persist an empty collection; no pending request may be stored.
  expect(stored).toEqual({});
  expect(
    mocks.set.mock.calls.every(
      ([value]) => Object.keys(value.transactions).length === 0,
    ),
  ).toBe(true);
  expect(mocks.show).not.toHaveBeenCalled();
});
it("explicit cancellation invalidates the live approval signal and closes only its popup", async () => {
  const controller = new AbortController();
  const result = transactions.executeOrSignTransaction(
    {
      sign: {
        account: "0x7",
        chain: "rtd:localnet",
        transaction: new Transaction().serialize(),
      },
    },
    connection,
    controller.signal,
  );
  result.catch(() => {});
  await vi.waitFor(() => expect(mocks.show).toHaveBeenCalledTimes(1));
  const id = Object.keys(stored)[0],
    lifetime = transactions.getRequestSignal(id);
  controller.abort(new Error("caller cancelled"));
  await expect(result).rejects.toThrow("caller cancelled");
  expect(lifetime.aborted).toBe(true);
  expect(stored).toEqual({});
  expect(mocks.close).toHaveBeenCalledTimes(1);
});
it("pre-aborted transaction never reads network or opens approval", async () => {
  const controller = new AbortController();
  controller.abort(new Error("cancel before request"));
  await expect(
    transactions.executeOrSignTransaction(
      {
        sign: {
          account: "0x7",
          chain: "rtd:localnet",
          transaction: new Transaction().serialize(),
        },
      },
      connection,
      controller.signal,
    ),
  ).rejects.toThrow("cancel before request");
  expect(mocks.network).not.toHaveBeenCalled();
  expect(mocks.show).not.toHaveBeenCalled();
});

it("network switch closes unapproved window and removes its request", async () => {
  const result = execute();
  const rejected = expect(result).rejects.toThrow("网络已改变");
  await vi.waitFor(() => expect(mocks.show).toHaveBeenCalledOnce());
  const cancel = mocks.on.mock.calls.find(([event]) => event === "changed")![1];
  cancel();
  await rejected;
  expect(stored).toEqual({});
  expect(mocks.close).toHaveBeenCalledOnce();
  expect(mocks.off).toHaveBeenCalledWith("changed", cancel);
});
it("network switch during initial profile lookup prevents late approval creation", async () => {
  let release!: (value: unknown) => void;
  mocks.network.mockImplementationOnce(
    () =>
      new Promise((resolve) => {
        release = resolve;
      }),
  );
  const result = execute();
  const rejected = expect(result).rejects.toThrow("网络已改变");
  const cancel = mocks.on.mock.calls.find(([event]) => event === "changed")![1];
  cancel();
  release({ env: "local", customRpcUrl: null });
  await rejected;
  expect(mocks.show).not.toHaveBeenCalled();
  expect(stored).toEqual({});
  expect(mocks.off).toHaveBeenCalledWith("changed", cancel);
});

it.each(["accountsChanged", "activeAccountChanged"] as const)(
  "account event %s invalidates the unapproved request",
  async (event) => {
    const result = execute();
    const rejected = expect(result).rejects.toThrow("账户授权会话已改变");
    await vi.waitFor(() => expect(mocks.show).toHaveBeenCalledOnce());
    if (event === "accountsChanged") accountsEvents.emit(event);
    else accountsEvents.emit(event, { accountID: "another-account" });
    await rejected;
    expect(stored).toEqual({});
    expect(mocks.close).toHaveBeenCalledOnce();
  },
);

it("unlock status alone leaves an unapproved request available for fresh signing authorization", async () => {
  const result = execute();
  const rejected = expect(result).rejects.toThrow("Rejected");
  await vi.waitFor(() => expect(close.observed).toBe(true));
  accountsEvents.emit("accountStatusChanged", {
    accountID: "requested-account",
  });
  expect(Object.keys(stored)).toHaveLength(1);
  expect(mocks.close).not.toHaveBeenCalled();
  close.next(1);
  await rejected;
});

async function sealedMessageRequest(signal?: AbortSignal) {
  const promise = transactions.signMessage(
    { accountAddress: "0x7", message: "AQ==", chain: "rtd:localnet" },
    connection,
    signal,
    "public-request",
  );
  promise.catch(() => undefined);
  await vi.waitFor(() => expect(mocks.show).toHaveBeenCalledOnce());
  const id = Object.keys(stored)[0],
    lifetime = transactions.getRequestSignal(id);
  const profile = (
    await import("../shared/rpc/profile")
  ).validateNetworkProfile(profileFixture());
  const claim = await transactions.captureDappEgress(
    id,
    profile,
    `0x${"0".repeat(63)}7`,
    [],
  );
  const value = { messageBytes: "AQ==", signature: "AA==" };
  transactions.sealDappEgress(id, claim, {
    type: "sign-message-request",
    return: value,
  });
  return { promise, id, lifetime, claim, value };
}
it("retains source/signal/request until final gate acknowledgement and uses the sealed result", async () => {
  const ack = Promise.withResolvers<void>();
  mocks.publishEgress.mockReturnValue(ack.promise);
  const r = await sealedMessageRequest();
  transactions.handleMessage({
    type: "transaction-request-response",
    txID: r.id,
    approved: true,
    txResult: { messageBytes: "malicious-ui-value", signature: "other" },
  });
  await vi.waitFor(() => expect(mocks.publishEgress).toHaveBeenCalledOnce());
  expect(r.lifetime.aborted).toBe(false);
  expect(disconnect.observed).toBe(true);
  expect(stored[r.id]).toBeDefined();
  expect(mocks.close).not.toHaveBeenCalled();
  expect(mocks.publishEgress).toHaveBeenCalledWith(
    r.claim,
    {
      id: "public-request",
      payload: { type: "sign-message-request", return: r.value },
    },
    r.lifetime,
  );
  ack.resolve();
  expect(await r.promise).toEqual(r.value);
  expect(r.lifetime.aborted).toBe(true);
  expect(stored).toEqual({});
  expect(disconnect.observed).toBe(false);
});
it.each(["disconnect", "caller", "network"])(
  "cancellation during actual delivery keeps lifetime active until failure: %s",
  async (kind) => {
    mocks.publishEgress.mockImplementation(
      (_claim, _message, signal: AbortSignal) =>
        new Promise((_ok, reject) => {
          signal.addEventListener("abort", () => reject(signal.reason), {
            once: true,
          });
        }),
    );
    const controller = new AbortController(),
      r = await sealedMessageRequest(controller.signal);
    transactions.handleMessage({
      type: "transaction-request-response",
      txID: r.id,
      approved: true,
    });
    await vi.waitFor(() => expect(mocks.publishEgress).toHaveBeenCalled());
    if (kind === "disconnect") disconnect.next();
    else if (kind === "caller")
      controller.abort(new Error("public caller cancellation"));
    else mocks.on.mock.calls.find(([event]) => event === "changed")![1]();
    await expect(r.promise).rejects.toThrow();
    expect(r.lifetime.aborted).toBe(true);
    expect(stored).toEqual({});
    expect(mocks.close).toHaveBeenCalledOnce();
    expect(mocks.captureEgress).toHaveBeenCalledOnce();
    expect(mocks.publishEgress).toHaveBeenCalledOnce();
  },
);
it("UI approval without a producer-owned sealed result cannot publish", async () => {
  const promise = transactions.signMessage(
    { accountAddress: "0x7", message: "AQ==", chain: "rtd:localnet" },
    connection,
    undefined,
    "public-request",
  );
  promise.catch(() => undefined);
  await vi.waitFor(() => expect(mocks.show).toHaveBeenCalled());
  const id = Object.keys(stored)[0];
  transactions.handleMessage({
    type: "transaction-request-response",
    txID: id,
    approved: true,
    txResult: { messageBytes: "AQ==", signature: "AA==" },
  });
  await expect(promise).rejects.toThrow("后台未提供");
  expect(mocks.publishEgress).not.toHaveBeenCalled();
});
it("producer ownership cannot be recaptured, borrowed or resealed", async () => {
  const r = await sealedMessageRequest();
  const profile = (
    await import("../shared/rpc/profile")
  ).validateNetworkProfile(profileFixture());
  await expect(
    transactions.captureDappEgress(r.id, profile, `0x${"0".repeat(63)}7`, []),
  ).rejects.toThrow();
  expect(() =>
    transactions.sealDappEgress(
      r.id,
      {},
      { type: "sign-message-request", return: r.value },
    ),
  ).toThrow();
  expect(() =>
    transactions.sealDappEgress(r.id, r.claim, {
      type: "sign-message-request",
      return: r.value,
    }),
  ).toThrow();
  expect(() =>
    transactions.runDappAction(
      r.id,
      r.claim,
      "sign",
      async () => "must-not-run",
    ),
  ).toThrow();
  disconnect.next();
  await expect(r.promise).rejects.toThrow();
});

async function recoveryExecutionRequest(seal = true) {
  const promise = transactions.executeOrSignTransaction(
    {
      tx: {
        type: "transaction",
        data: new Transaction().serialize(),
        account: "0x7",
        chain: "rtd:localnet",
      },
    },
    connection,
    undefined,
    "public-execution",
  );
  promise.catch(() => undefined);
  await vi.waitFor(() => expect(mocks.show).toHaveBeenCalledOnce());
  const id = Object.keys(stored)[0];
  const profile = (
    await import("../shared/rpc/profile")
  ).validateNetworkProfile(profileFixture());
  const claim = await transactions.captureDappEgress(
    id,
    profile,
    `0x${"0".repeat(63)}7`,
    [],
  );
  const result = {
    digest: "A".repeat(43),
    bytes: "AQ==",
    signature: "AA==",
    effects: "AQ==",
  };
  if (seal)
    transactions.sealDappEgress(id, claim, {
      type: "execute-transaction-response",
      result,
    });
  return { promise, id, claim, result };
}
it.each([true, false])(
  "recovery reuses the original execution grant, with prior sealed result=%s",
  async (sealed) => {
    const r = await recoveryExecutionRequest(sealed);
    transactions.sealRecoveredDappExecution(r.id, r.result);
    transactions.sealRecoveredDappExecution(r.id, { ...r.result });
    transactions.handleMessage({
      type: "transaction-request-response",
      txID: r.id,
      approved: true,
    });
    expect(await r.promise).toEqual(r.result);
    expect(mocks.captureEgress).toHaveBeenCalledOnce();
    expect(mocks.publishEgress).toHaveBeenCalledExactlyOnceWith(
      r.claim,
      {
        id: "public-execution",
        payload: { type: "execute-transaction-response", result: r.result },
      },
      expect.any(AbortSignal),
    );
  },
);
it.each(["digest", "bytes", "signature", "effects"] as const)(
  "recovery cannot replace original %s",
  async (field) => {
    const r = await recoveryExecutionRequest();
    const changed = {
      ...r.result,
      [field]: field === "digest" ? "B".repeat(43) : "Ag==",
    };
    expect(() =>
      transactions.sealRecoveredDappExecution(r.id, changed),
    ).toThrow("不一致");
    expect(mocks.captureEgress).toHaveBeenCalledOnce();
    disconnect.next();
    await expect(r.promise).rejects.toThrow();
  },
);
it("recovery cannot reuse a message-signing grant", async () => {
  const r = await sealedMessageRequest();
  expect(() =>
    transactions.sealRecoveredDappExecution(r.id, {
      digest: "A".repeat(43),
      bytes: "AQ==",
      signature: "AA==",
      effects: "AQ==",
    }),
  ).toThrow("授权已失效");
  disconnect.next();
  await expect(r.promise).rejects.toThrow();
});
it("recovery cannot recreate an original grant after caller disconnect", async () => {
  const r = await recoveryExecutionRequest();
  disconnect.next();
  await expect(r.promise).rejects.toThrow();
  expect(() =>
    transactions.sealRecoveredDappExecution(r.id, r.result),
  ).toThrow();
  expect(mocks.captureEgress).toHaveBeenCalledOnce();
  expect(mocks.publishEgress).not.toHaveBeenCalled();
});

// C131: orphan requests restored after their original listener has ended.
async function restoredOrphanRequest() {
  const promise = execute();
  const rejected = expect(promise).rejects.toThrow("Rejected");
  await vi.waitFor(() => expect(mocks.show).toHaveBeenCalledOnce());
  const original = structuredClone(Object.values(stored)[0]);
  close.next(1);
  await rejected;
  expect(stored).toEqual({});
  stored[original.id] = original;
  return original;
}
it("normal false response removes only the restored orphan request", async () => {
  const original = await restoredOrphanRequest();
  const other = { ...structuredClone(original), id: "other-retained-request" };
  stored[other.id] = other;
  await transactions.handleMessage({
    type: "transaction-request-response",
    txID: original.id,
    approved: false,
  });
  expect(stored).toEqual({ [other.id]: other });
  expect(mocks.publishEgress).not.toHaveBeenCalled();
  expect(mocks.captureEgress).not.toHaveBeenCalled();
});
it("orphan true response cannot publish or delete the retained request", async () => {
  const original = await restoredOrphanRequest();
  await transactions.handleMessage({
    type: "transaction-request-response",
    txID: original.id,
    approved: true,
  });
  expect(stored).toEqual({ [original.id]: original });
  expect(mocks.publishEgress).not.toHaveBeenCalled();
  expect(mocks.captureEgress).not.toHaveBeenCalled();
});
it("closing an unknown orphan id preserves other retained requests", async () => {
  const original = await restoredOrphanRequest();
  await transactions.handleMessage({
    type: "transaction-request-response",
    txID: "missing-request",
    approved: false,
  });
  expect(stored).toEqual({ [original.id]: original });
  expect(mocks.publishEgress).not.toHaveBeenCalled();
  expect(mocks.captureEgress).not.toHaveBeenCalled();
});
