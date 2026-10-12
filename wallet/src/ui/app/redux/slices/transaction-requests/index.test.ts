// Copyright (c) LinkU Labs, Inc.
// SPDX-License-Identifier: Apache-2.0
import { beforeEach, expect, it, vi } from "vitest";
import { respondToTransactionRequest } from "./index";
vi.mock("_src/ui/app/helpers/errorMessages", () => ({
  getSignerOperationErrorMessage: (error: Error) => error.message,
}));
const background = {
  signDappPrepared: vi.fn(),
  signDappPersonalMessage: vi.fn(),
  executeDappPrepared: vi.fn(),
  recoverDappExecution: vi.fn(),
  sendTransactionRequestResponse: vi.fn(),
};
const signer = {
  signTransactionBlock: vi.fn(),
  signAndExecuteTransactionBlock: vi.fn(),
  signMessage: vi.fn(),
};
const request = {
  id: "r",
  tx: {
    type: "transaction",
    justSign: true,
    data: "must-not-be-rebuilt",
    account: "0x7",
  },
};
const approval = () => ({
  accountId: "a",
  requestId: "r",
  approvalToken: "token",
  expiresAt: Date.now() + 60000,
});
beforeEach(() => {
  vi.resetAllMocks();
  request.tx.justSign = true;
  background.signDappPrepared.mockResolvedValue({
    bytes: "original-bytes",
    signature: "signature",
  });
});
async function run(approved: boolean, dappApproval = approval()) {
  return respondToTransactionRequest({
    txRequestID: "r",
    approved,
    dappApproval,
  })(
    vi.fn(),
    () =>
      ({
        transactionRequests: { ids: ["r"], entities: { r: request } },
      }) as any,
    { background } as any,
  );
}
it("only-sign uses backend token and adapts returned bytes without rebuilding source", async () => {
  await run(true);
  expect(background.signDappPrepared).toHaveBeenCalledWith({
    accountId: "a",
    requestId: "r",
    approvalToken: "token",
  });
  expect(signer.signTransactionBlock).not.toHaveBeenCalled();
  expect(signer.signAndExecuteTransactionBlock).not.toHaveBeenCalled();
  expect(background.sendTransactionRequestResponse).toHaveBeenCalledWith(
    "r",
    true,
    undefined,
    undefined,
    { transactionBlockBytes: "original-bytes", signature: "signature" },
  );
});
it("rejection does not sign", async () => {
  await run(false);
  expect(background.signDappPrepared).not.toHaveBeenCalled();
});
it("expired token reports failure without old signer fallback", async () => {
  await run(true, { ...approval(), expiresAt: 1 });
  expect(background.signDappPrepared).not.toHaveBeenCalled();
  expect(signer.signTransactionBlock).not.toHaveBeenCalled();
  expect(background.sendTransactionRequestResponse.mock.calls[0][3]).toContain(
    "失效",
  );
});
it("backend failure returns an error without old signer fallback", async () => {
  background.signDappPrepared.mockRejectedValue(new Error("权限撤销"));
  await run(true);
  expect(signer.signTransactionBlock).not.toHaveBeenCalled();
  expect(background.sendTransactionRequestResponse.mock.calls[0][3]).toBe(
    "权限撤销",
  );
});

it("execute submits only approval token and returns modern fields", async () => {
  request.tx.justSign = false;
  background.executeDappPrepared.mockResolvedValue({
    state: "confirmed",
    bytes: "fixed",
    signature: "sig",
    digest: "digest",
    effects: "effects",
  });
  await run(true);
  expect(background.executeDappPrepared).toHaveBeenCalledWith({
    accountId: "a",
    requestId: "r",
    approvalToken: "token",
  });
  expect(signer.signAndExecuteTransactionBlock).not.toHaveBeenCalled();
  expect(background.sendTransactionRequestResponse.mock.calls[0][2]).toEqual({
    bytes: "fixed",
    signature: "sig",
    digest: "digest",
    effects: "effects",
  });
});
it("pending reports original digest without retry or legacy execution", async () => {
  request.tx.justSign = false;
  background.executeDappPrepared.mockResolvedValue({
    state: "pending",
    digest: "original-digest",
    recordId: "record",
  });
  const action = await run(true);
  expect(action.payload).toMatchObject({ approved: null });
  expect(background.executeDappPrepared).toHaveBeenCalledOnce();
  expect(signer.signAndExecuteTransactionBlock).not.toHaveBeenCalled();
  expect(background.sendTransactionRequestResponse).not.toHaveBeenCalled();
});

it("personal message uses request-bound background signing, without old signer", async () => {
  background.signDappPersonalMessage.mockResolvedValue({
    messageBytes: "message",
    signature: "sig",
  });
  const messageRequest = {
    id: "m",
    tx: { type: "sign-message", message: "message", accountAddress: "0x7" },
  };
  await respondToTransactionRequest({
    txRequestID: "m",
    approved: true,
    accountId: "a",
  })(
    vi.fn(),
    () =>
      ({
        transactionRequests: { ids: ["m"], entities: { m: messageRequest } },
      }) as any,
    { background } as any,
  );
  expect(background.signDappPersonalMessage).toHaveBeenCalledWith({
    requestId: "m",
    accountId: "a",
  });
  expect(signer.signMessage).not.toHaveBeenCalled();
  expect(background.sendTransactionRequestResponse.mock.calls[0][2]).toEqual({
    messageBytes: "message",
    signature: "sig",
  });
});

it('lost execution response preserves the original request for recovery', async () => {
  request.tx.justSign = false;
  background.executeDappPrepared.mockRejectedValue(new Error('port disconnected'));
  const action = await run(true);
  expect(action.payload).toMatchObject({ approved: null });
  expect(background.sendTransactionRequestResponse).not.toHaveBeenCalled();
});
it('recovery sends the original verified result and never consumes a new approval token', async () => {
  request.tx.justSign = false;
  background.recoverDappExecution.mockResolvedValue({ state: 'confirmed', bytes: 'original', digest: 'digest', signature: 'old-signature', effects: 'effects' });
  await respondToTransactionRequest({ txRequestID: 'r', approved: true, accountId: 'a', recoverOnly: true })(vi.fn(),
    () => ({ transactionRequests: { ids: ['r'], entities: { r: request } } }) as any, { background } as any);
  expect(background.recoverDappExecution).toHaveBeenCalledExactlyOnceWith({ accountId: 'a', requestId: 'r' });
  expect(background.executeDappPrepared).not.toHaveBeenCalled(); expect(background.signDappPrepared).not.toHaveBeenCalled();
  expect(background.sendTransactionRequestResponse.mock.calls[0][2]).toEqual({ bytes: 'original', digest: 'digest', signature: 'old-signature', effects: 'effects' });
});
