import { encodePreparedTransaction } from '_src/shared/rpc/prepared-wire';
// Copyright (c) LinkU Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { createMessage } from "_messages";
import { NEVER, of } from "rxjs";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { BackgroundClient } from ".";

const { connectToBackgroundService } = vi.hoisted(() => ({
  connectToBackgroundService: vi.fn(),
}));

vi.mock("_messaging/PortStream", () => ({
  PortStream: { connectToBackgroundService },
}));
vi.mock("_redux/store/thunk-extras", () => ({
  thunkExtras: { background: {} },
}));
vi.mock("_redux/slices/app", () => ({
  changeActiveNetwork: vi.fn(),
  setActiveOrigin: vi.fn(),
}));
vi.mock("_redux/slices/permissions", () => ({ setPermissions: vi.fn() }));
vi.mock("_redux/slices/transaction-requests", () => ({
  setTransactionRequests: vi.fn(),
}));
vi.mock("../experimentation/feature-gating", () => ({
  growthbook: { setAttributes: vi.fn(), setFeatures: vi.fn() },
}));
vi.mock("../helpers/query-client-keys", () => ({
  accountsQueryKey: ["accounts"],
}));
vi.mock("../helpers/queryClient", () => ({
  queryClient: { invalidateQueries: vi.fn() },
}));
vi.mock("../hooks/useAccountSources", () => ({
  accountSourcesQueryKey: ["accountSources"],
}));

function createPortStream(
  sendMessage: ReturnType<typeof vi.fn>,
  connected = true,
) {
  return {
    connected,
    onDisconnect: NEVER,
    onMessage: NEVER,
    sendMessage,
  };
}

describe("BackgroundClient port reconnection", () => {
  beforeEach(() => {
    connectToBackgroundService.mockReset();
  });

  it("reconnects and retries when Edge invalidates a port before onDisconnect is delivered", async () => {
    const disconnectedPort = createPortStream(
      vi.fn(() => {
        throw new Error("Attempting to use a disconnected port object");
      }),
    );
    const replacementSend = vi.fn((message) =>
      of(createMessage({ type: "done" }, message.id)),
    );
    const replacementPort = createPortStream(replacementSend);
    connectToBackgroundService.mockReturnValue(replacementPort);
    const client = new BackgroundClient();
    Reflect.set(client, "_portStream", disconnectedPort);

    await expect(
      client.setAutoLockMinutes({ minutes: 30 }),
    ).resolves.toMatchObject({
      payload: { type: "done" },
    });

    expect(connectToBackgroundService).toHaveBeenCalledOnce();
    expect(replacementSend).toHaveBeenCalledOnce();
    expect(replacementSend.mock.calls[0][0].payload).toEqual({
      type: "method-payload",
      method: "setAutoLockMinutes",
      args: { minutes: 30 },
    });
  });

  it("does not retry unrelated postMessage errors", () => {
    const port = createPortStream(
      vi.fn(() => {
        throw new Error("The message could not be cloned");
      }),
    );
    const client = new BackgroundClient();
    Reflect.set(client, "_portStream", port);

    expect(() => client.setAutoLockMinutes({ minutes: 30 })).toThrow(
      "The message could not be cloned",
    );
    expect(connectToBackgroundService).not.toHaveBeenCalled();
  });
  it("已确认记录使用独立readonly命令／回执，不转execute或sign请求", async () => {
    const args = {
      accountId: "account",
      bindingKey: "full-binding",
      digest: "digest",
    };
    const send = vi.fn((message) =>
      of(
        createMessage(
          {
            type: "method-payload",
            method: "readStoredReceiptResponse",
            args: { result: null },
          },
          message.id,
        ),
      ),
    );
    const client = new BackgroundClient();
    Reflect.set(client, "_portStream", createPortStream(send));
    expect(await client.readStoredReceipt(args)).toBeNull();
    expect(send).toHaveBeenCalledOnce();
    expect(send.mock.calls[0][0].payload).toEqual({
      type: "method-payload",
      method: "readStoredReceipt",
      args,
    });
  });
  it("已确认记录的错误响应不能当空记录", async () => {
    const send = vi.fn((message) =>
      of(createMessage({ type: "done" }, message.id)),
    );
    const client = new BackgroundClient();
    Reflect.set(client, "_portStream", createPortStream(send));
    await expect(
      client.readStoredReceipt({
        accountId: "account",
        bindingKey: "binding",
        digest: "digest",
      }),
    ).rejects.toThrow("响应不兼容");
    expect(send).toHaveBeenCalledOnce();
  });
});

describe("dApp background preparation bridge", () => {
  it("sends only request and account identifiers", async () => {
    const result = {
      requestId: "r",
      binding: { mode: "sign" },
      prepared: { digest: "d", simulation: { $kind: "Transaction", Transaction: { effects: { bcs: new Uint8Array([1, 2]) } } } },
    };
    const send = vi.fn((message) =>
      of(
        createMessage(
          {
            type: "method-payload",
            method: "prepareDappTransactionResponse",
            args: { result: { ...result, prepared: JSON.parse(JSON.stringify(encodePreparedTransaction(result.prepared as any))) } },
          } as any,
          message.id,
        ),
      ),
    );
    const client = new BackgroundClient();
    Reflect.set(client, "_portStream", createPortStream(send));
    expect(
      await client.prepareDappTransaction({ requestId: "r", accountId: "a" }),
    ).toEqual(result);
    expect(send.mock.calls[0][0].payload).toEqual({
      type: "method-payload",
      method: "prepareDappTransaction",
      args: { requestId: "r", accountId: "a" },
    });
  });
  it("rejects a response from a different command", async () => {
    const client = new BackgroundClient();
    Reflect.set(
      client,
      "_portStream",
      createPortStream(
        vi.fn((message) => of(createMessage({ type: "done" }, message.id))),
      ),
    );
    await expect(
      client.prepareDappTransaction({ requestId: "r", accountId: "a" }),
    ).rejects.toThrow("不兼容");
  });
});

describe("dApp fixed bytes signing bridge", () => {
  it("sends approval token, never replacement transaction bytes", async () => {
    const result = { bytes: "fixed", signature: "signed" };
    const send = vi.fn((message) =>
      of(
        createMessage(
          {
            type: "method-payload",
            method: "signDappPreparedResponse",
            args: { result },
          },
          message.id,
        ),
      ),
    );
    const client = new BackgroundClient();
    Reflect.set(client, "_portStream", createPortStream(send));
    const args = { requestId: "r", accountId: "a", approvalToken: "token" };
    expect(await client.signDappPrepared(args)).toEqual(result);
    expect(send.mock.calls[0][0].payload).toEqual({
      type: "method-payload",
      method: "signDappPrepared",
      args,
    });
  });
  it("rejects wrong response type", async () => {
    const client = new BackgroundClient();
    Reflect.set(
      client,
      "_portStream",
      createPortStream(
        vi.fn((message) => of(createMessage({ type: "done" }, message.id))),
      ),
    );
    await expect(
      client.signDappPrepared({
        requestId: "r",
        accountId: "a",
        approvalToken: "token",
      }),
    ).rejects.toThrow("不兼容");
  });
});

it('dApp recovery carries only request/account identity and never an execution token or signature', async () => {
  const send = vi.fn((message) => of(createMessage({
    type: 'method-payload', method: 'recoverDappExecutionResponse', args: { result: null },
  }, message.id)));
  const client = new BackgroundClient();
  Reflect.set(client, '_portStream', createPortStream(send));
  expect(await client.recoverDappExecution({ accountId: 'a', requestId: 'r' })).toBeNull();
  expect(send).toHaveBeenCalledOnce();
  expect(send.mock.calls[0][0].payload).toEqual({
    type: 'method-payload', method: 'recoverDappExecution', args: { accountId: 'a', requestId: 'r' },
  });
});
