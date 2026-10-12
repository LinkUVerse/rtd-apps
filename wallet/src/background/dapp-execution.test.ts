// Copyright (c) LinkU Labs, Inc.
// SPDX-License-Identifier: Apache-2.0
import { beforeEach, expect, it, vi } from "vitest";
import { executeDappPrepared, recoverDappExecution } from "./dapp-execution";
const m = vi.hoisted(() => ({
  context: vi.fn(),
  authorizedRequest: vi.fn(),
  consume: vi.fn(),
  execute: vi.fn(),
  recover: vi.fn(),
  get: vi.fn(),
  details: vi.fn(),
  recovered: vi.fn(),
  simulate: vi.fn(),
  sign: vi.fn(),
  authorize: vi.fn(),
  moveCreate: vi.fn(),
  moveActivate: vi.fn(),
  captureEgress: vi.fn(),
  runAction: vi.fn(),
  sealEgress: vi.fn(),
  sealRecovered: vi.fn(),
}));
vi.mock("./Transactions", () => ({
  default: {
    captureDappEgress: m.captureEgress,
    runDappAction: m.runAction,
    sealDappEgress: m.sealEgress,
    sealRecoveredDappExecution: m.sealRecovered,
  },
}));
vi.mock("../shared/rpc/transaction-move-dependencies", () => ({
  transactionMoveDependencies: () => ({ areas: [] }),
}));
// This file tests callback wiring with opaque fake bytes; actual SDK/native-control guard has separate tests.
vi.mock("../shared/rpc/transaction-move-admission", () => ({
  createTransactionMoveAuthorizer: (...args: unknown[]) => {
    m.moveCreate(...args);
    return {
      authorize: m.authorize,
      activate: m.moveActivate,
      runFinal: <T>(start: () => Promise<T>) => start(),
    };
  },
}));
vi.mock("./dapp-preparation", () => ({
  withAuthorizedDappRequest: (
    _args: unknown,
    op: (context: unknown) => unknown,
    options?: { readOnly?: true },
  ) => {
    m.authorizedRequest(_args, options);
    return op(m.context());
  },
  dappPreparedRegistry: { consume: m.consume },
}));
vi.mock("../shared/rpc/execution-coordinator", () => ({
  WalletExecutionCoordinator: class {
    execute = m.execute;
    recover = m.recover;
  },
}));
vi.mock("../shared/rpc/execution-journal", () => ({
  WalletExecutionJournal: class {
    get = m.get;
  },
}));
vi.mock("../shared/rpc/execution-reader", () => ({
  WalletExecutionReader: class {
    details = m.details;
  },
}));
vi.mock("../shared/rpc/transaction-reader", () => ({
  WalletTransactionReader: class {
    simulate = m.simulate;
  },
}));
vi.mock("../shared/rpc/dapp-recovered-result", () => ({
  recoveredDappResult: m.recovered,
}));
vi.mock("../shared/rpc/profile", () => ({ executionScopeKey: () => "scope" }));
const result = {
  state: "confirmed",
  recordId: "record",
  receipt: { digest: "digest", effectsBase64: "effects" },
};
beforeEach(() => {
  vi.resetAllMocks();
  m.captureEgress.mockResolvedValue(Object.freeze({}));
  m.runAction.mockImplementation((_id, _claim, _stage, start) => start());
  m.context.mockReturnValue({
    session: { bindingKey: "profile" },
    sender: "sender",
    account: { signData: m.sign },
    request: {
      origin: "https://dapp.example",
      binding: { mode: "execute", sourceHash: "hash" },
    },
    authorize: m.authorize,
  });
  m.consume.mockReturnValue({
    bindingKey: "profile",
    bytesBase64: "fixed-bytes",
    digest: "digest",
  });
  m.recovered.mockResolvedValue({
    digest: "digest",
    bytes: "fixed-bytes",
    signature: "original-signature",
    effects: "effects",
  });
  m.sign.mockResolvedValue("signature");
  m.simulate.mockResolvedValue({
    $kind: "Transaction",
    Transaction: { digest: "digest" },
  });
  m.execute.mockImplementation(async (input, callbacks) => {
    await callbacks.authorize();
    await callbacks.simulate(input.bytesBase64, input.accountAddress);
    await callbacks.signData(new Uint8Array([0, 0, 0]));
    return result;
  });
});
const run = () =>
  executeDappPrepared({
    accountId: "a",
    requestId: "r",
    approvalToken: "token",
  });
it("passes original bytes and browser origin into durable coordinator, returns modern fields", async () => {
  expect(await run()).toEqual({
    state: "confirmed",
    digest: "digest",
    bytes: "fixed-bytes",
    signature: "signature",
    effects: "effects",
  });
  expect(m.execute.mock.calls[0][0]).toEqual({
    accountId: "a",
    accountAddress: "sender",
    requestId: "r",
    originRef: "https://dapp.example",
    bindingKey: "profile",
    bytesBase64: "fixed-bytes",
    digest: "digest",
  });
  expect(m.moveCreate).toHaveBeenCalledWith(
    m.context().session,
    "fixed-bytes",
    "sender",
    m.authorize,
  );
  expect(m.moveActivate).toHaveBeenCalledOnce();
  expect(m.moveActivate.mock.invocationCallOrder[0]).toBeLessThan(
    m.simulate.mock.invocationCallOrder[0],
  );
  expect(m.simulate).toHaveBeenCalledWith("fixed-bytes", "sender");
  expect(m.sign).toHaveBeenCalledOnce();
  expect(m.authorizedRequest).toHaveBeenCalledWith(
    expect.anything(),
    undefined,
  );
});
it("rejects a sign-only request before token consumption", async () => {
  m.context().request.binding.mode = "sign";
  await expect(run()).rejects.toThrow("执行操作");
  expect(m.consume).not.toHaveBeenCalled();
});
it("pending response retains original digest and never returns a signature", async () => {
  m.execute.mockResolvedValue({
    state: "pending",
    digest: "digest",
    recordId: "record",
  });
  expect(await run()).toEqual({
    state: "pending",
    digest: "digest",
    recordId: "record",
  });
  expect(m.sign).not.toHaveBeenCalled();
});
it("another pending transaction is not attributed to this request", async () => {
  m.execute.mockResolvedValue({
    state: "pending",
    digest: "another-digest",
    recordId: "other",
  });
  await expect(run()).rejects.toThrow("另有未确定");
  expect(m.sign).not.toHaveBeenCalled();
});
it("an existing terminal record cannot cause new signing or invented signature", async () => {
  m.execute.mockResolvedValue(result);
  expect(await run()).toMatchObject({
    state: "confirmed",
    signature: "original-signature",
  });
  expect(m.details).toHaveBeenCalledWith("digest", undefined);
  expect(m.sign).not.toHaveBeenCalled();
});
it("simulation digest mismatch prevents signing", async () => {
  m.simulate.mockResolvedValue({
    $kind: "Transaction",
    Transaction: { digest: "wrong" },
  });
  await expect(run()).rejects.toThrow("模拟");
  expect(m.sign).not.toHaveBeenCalled();
});
it("post-execution revoked permission prevents releasing a signature", async () => {
  m.authorize
    .mockResolvedValueOnce(undefined)
    .mockRejectedValueOnce(new Error("撤权"));
  await expect(run()).rejects.toThrow("撤权");
  expect(m.execute).toHaveBeenCalledOnce();
});

const recover = () => recoverDappExecution({ accountId: "a", requestId: "r" });
const recordId = JSON.stringify(["scope", "r"]);
function record(state = "dispatch-pending") {
  return {
    id: recordId,
    requestId: "r",
    accountId: "a",
    accountAddress: "sender",
    originRef: "https://dapp.example",
    bindingKey: "profile",
    state,
    digest: "digest",
    receipt: result.receipt,
  };
}
it("missing journal request returns null without building or signing", async () => {
  expect(await recover()).toBeNull();
  expect(m.sign).not.toHaveBeenCalled();
  expect(m.execute).not.toHaveBeenCalled();
});
it("recovers exact pending request by readonly lookup and returns original signature", async () => {
  m.get.mockResolvedValue(record());
  m.recover.mockResolvedValue({ ...result, recordId });
  expect(await recover()).toMatchObject({
    state: "confirmed",
    signature: "original-signature",
  });
  expect(m.authorizedRequest).toHaveBeenCalledWith(expect.anything(), {
    readOnly: true,
  });
  expect(m.sign).not.toHaveBeenCalled();
  expect(m.execute).not.toHaveBeenCalled();
  expect(m.consume).not.toHaveBeenCalled();
  expect(m.captureEgress).not.toHaveBeenCalled();
  expect(m.sealRecovered).toHaveBeenCalledWith(
    "r",
    expect.objectContaining({
      digest: "digest",
      signature: "original-signature",
    }),
  );
});
it("preserves pending when the original receipt is still unknown", async () => {
  m.get.mockResolvedValue(record());
  m.recover.mockResolvedValue({ state: "pending", recordId, digest: "digest" });
  expect(await recover()).toEqual({
    state: "pending",
    digest: "digest",
    recordId,
  });
  expect(m.details).not.toHaveBeenCalled();
  expect(m.sign).not.toHaveBeenCalled();
});
it("rejects another origin journal before lookup", async () => {
  m.get.mockResolvedValue({ ...record(), originRef: "https://other.example" });
  await expect(recover()).rejects.toThrow("不属于");
  expect(m.recover).not.toHaveBeenCalled();
});
it("existing terminal record only reads its original details", async () => {
  m.get.mockResolvedValue(record("confirmed-success"));
  expect(await recover()).toMatchObject({ state: "confirmed" });
  expect(m.recover).not.toHaveBeenCalled();
  expect(m.execute).not.toHaveBeenCalled();
});
it("revoked authorization after reading details prevents signature release", async () => {
  m.get.mockResolvedValue(record("confirmed-success"));
  m.authorize
    .mockResolvedValueOnce(undefined)
    .mockRejectedValueOnce(new Error("revoked"));
  await expect(recover()).rejects.toThrow("revoked");
  expect(m.sign).not.toHaveBeenCalled();
});

it("new Move guard activation rejection prevents simulation and signing", async () => {
  m.moveActivate.mockRejectedValueOnce(new Error("Move contract blocked"));
  await expect(run()).rejects.toThrow("Move contract blocked");
  expect(m.simulate).not.toHaveBeenCalled();
  expect(m.sign).not.toHaveBeenCalled();
});
it("existing terminal coordinator branch never activates new Move guard", async () => {
  m.execute.mockImplementationOnce(async (_input, callbacks) => {
    await callbacks.authorize();
    return result;
  });
  await expect(run()).resolves.toMatchObject({ state: "confirmed" });
  expect(m.moveActivate).not.toHaveBeenCalled();
  expect(m.simulate).not.toHaveBeenCalled();
  expect(m.sign).not.toHaveBeenCalled();
});
