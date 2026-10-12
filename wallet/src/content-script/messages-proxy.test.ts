// Copyright (c) LinkU Labs, Inc.
// SPDX-License-Identifier: Apache-2.0
import { beforeEach, expect, it, vi } from "vitest";
import { Subject } from "rxjs";

const state = vi.hoisted(() => ({
  stream: undefined as any,
  ports: [] as any[],
  gates: [] as any[],
}));
vi.mock("_messaging/WindowMessageStream", () => ({
  WindowMessageStream: class {
    constructor() {
      return state.stream;
    }
  },
}));
vi.mock("_messaging/PortStream", () => ({
  PortStream: {
    connectToBackgroundService: vi.fn(() => {
      const port = {
        connected: true,
        onMessage: new Subject(),
        onDisconnect: new Subject(),
        sendMessage: vi.fn(),
      };
      state.ports.push(port);
      return port;
    }),
  },
}));
vi.mock("./dapp-egress-client", () => ({
  createDappEgressClient: vi.fn(() => {
    let resolve!: () => void;
    let reject!: (error: Error) => void;
    const gate = {
      closed: false,
      ready: new Promise<void>((ok, bad) => {
        resolve = ok;
        reject = bad;
      }),
      resolve: () => resolve(),
      reject: (error: Error) => reject(error),
      close: vi.fn(() => {
        gate.closed = true;
      }),
      beginRequest: vi.fn(() => {
        if (gate.closed) throw new Error("closed");
      }),
      finishRequest: vi.fn(),
    };
    state.gates.push(gate);
    return gate;
  }),
}));
import { setupMessagesProxy } from "./messages-proxy";

const request = (id: string) => ({
  id,
  payload: { type: "sign-transaction-request", transaction: {} },
});
const flush = async () => {
  await Promise.resolve();
  await Promise.resolve();
  await Promise.resolve();
};
function disconnect(port: any) {
  port.connected = false;
  port.onDisconnect.next();
}
beforeEach(() => {
  state.stream = { messages: new Subject(), send: vi.fn() };
  state.ports = [];
  state.gates = [];
  setupMessagesProxy();
});

it("waits for private pairing before forwarding a sensitive request", async () => {
  state.stream.messages.next(request("one"));
  expect(state.ports[0].sendMessage).not.toHaveBeenCalled();
  state.gates[0].resolve();
  await flush();
  expect(state.gates[0].beginRequest).toHaveBeenCalledWith("one");
  expect(state.ports[0].sendMessage).toHaveBeenCalledExactlyOnceWith(
    request("one"),
  );
});

it("reconnects an idle worker for a new request without replaying the previous request", async () => {
  state.gates[0].resolve();
  state.stream.messages.next(request("one"));
  await flush();
  disconnect(state.ports[0]);
  state.stream.messages.next(request("two"));
  expect(state.gates).toHaveLength(2);
  expect(state.ports).toHaveLength(2);
  expect(state.ports[1].sendMessage).not.toHaveBeenCalled();
  state.gates[1].resolve();
  await flush();
  expect(state.ports[0].sendMessage).toHaveBeenCalledTimes(1);
  expect(state.ports[1].sendMessage).toHaveBeenCalledExactlyOnceWith(
    request("two"),
  );
});

it("replaces a closed private pair even when the public port remains connected", async () => {
  state.gates[0].resolve();
  state.stream.messages.next(request("one"));
  await flush();
  state.gates[0].close();
  state.stream.messages.next(request("two"));
  state.gates[1].resolve();
  await flush();
  expect(state.ports).toHaveLength(1);
  expect(state.gates[1].beginRequest).toHaveBeenCalledWith("two");
  expect(state.ports[0].sendMessage).toHaveBeenCalledTimes(2);
});

it("shares one fresh pair across concurrent new requests", async () => {
  state.gates[0].close();
  state.stream.messages.next(request("one"));
  state.stream.messages.next(request("two"));
  expect(state.gates).toHaveLength(2);
  state.gates[1].resolve();
  await flush();
  expect(state.gates[1].beginRequest.mock.calls).toEqual([["one"], ["two"]]);
  expect(state.ports[0].sendMessage).toHaveBeenCalledTimes(2);
});

it("fails closed if a worker disconnects during private pairing", async () => {
  state.stream.messages.next(request("one"));
  disconnect(state.ports[0]);
  state.gates[0].resolve();
  await flush();
  expect(state.ports[0].sendMessage).not.toHaveBeenCalled();
  expect(state.stream.send).toHaveBeenCalledWith(
    expect.objectContaining({
      id: "one",
      payload: expect.objectContaining({ error: true }),
    }),
  );
});

it("does not send or silently retry when the new private pairing fails", async () => {
  state.gates[0].close();
  state.stream.messages.next(request("one"));
  state.gates[1].reject(new Error("pair refused"));
  await flush();
  expect(state.gates).toHaveLength(2);
  expect(state.ports[0].sendMessage).not.toHaveBeenCalled();
  expect(state.stream.send).toHaveBeenCalledTimes(1);
});

it("ignores delayed disconnect events from an obsolete public port", async () => {
  state.gates[0].resolve();
  state.stream.messages.next(request("one"));
  await flush();
  disconnect(state.ports[0]);
  state.stream.messages.next(request("two"));
  state.ports[0].onDisconnect.next();
  expect(state.gates[1].close).not.toHaveBeenCalled();
  state.gates[1].resolve();
  await flush();
  expect(state.ports[1].sendMessage).toHaveBeenCalledTimes(1);
});

it("never forwards a sensitive success through the public response stream", async () => {
  state.gates[0].resolve();
  state.stream.messages.next(request("one"));
  await flush();
  state.ports[0].onMessage.next({
    id: "one",
    payload: {
      type: "sign-transaction-response",
      bytes: "abc",
      signature: "sig",
    },
  });
  expect(state.stream.send).not.toHaveBeenCalled();
});
