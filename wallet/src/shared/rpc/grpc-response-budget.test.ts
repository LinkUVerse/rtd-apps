// Copyright (c) LinkU Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { describe, expect, it, vi } from "vitest";
import { GrpcTypes, RtdGrpcClient } from "rtd-typescript/grpc";
import {
  boundedGrpcResponse,
  boundedGrpcFetch,
  GRPC_MESSAGE_BYTES,
  GRPC_TRAILER_BYTES,
  GRPC_CALL_BYTES,
} from "./grpc-response-budget";

function header(length: number, flag = 0) {
  const result = new Uint8Array(5);
  result[0] = flag;
  new DataView(result.buffer).setUint32(1, length);
  return result;
}
function frame(body: Uint8Array, flag = 0) {
  return Uint8Array.from([...header(body.length, flag), ...body]);
}
function fixture(
  chunks: Uint8Array[],
  contentType = "application/grpc-web+proto",
) {
  const cancel = vi.fn();
  let pulls = 0;
  const stream = new ReadableStream<Uint8Array>(
    {
      pull(controller) {
        pulls++;
        const chunk = chunks.shift();
        if (chunk) controller.enqueue(chunk);
        else controller.close();
      },
      cancel,
    },
    { highWaterMark: 0 },
  );
  return {
    response: new Response(stream, {
      headers: { "content-type": contentType },
    }),
    cancel,
    pulls: () => pulls,
  };
}
const trailers = frame(new TextEncoder().encode("grpc-status: 0\r\n"), 128);

async function sdk(response: Response, streaming = false) {
  const client = new RtdGrpcClient({
    network: "localnet",
    baseUrl: "https://localhost",
    format: "binary",
    mvr: { url: "" },
    fetch: boundedGrpcFetch(vi.fn(async () => response)),
  });
  if (streaming) {
    const call = client.ledgerService.listTransactions({});
    const values = [];
    for await (const value of call.responses) values.push(value);
    await call;
    return values;
  }
  return (await client.ledgerService.getServiceInfo({})).response;
}

describe("binary gRPC response hard budget", () => {
  it("rejects an oversized declaration after header only and cancels before reading body", async () => {
    const f = fixture([header(GRPC_MESSAGE_BYTES + 1), new Uint8Array(1)]);
    await expect(sdk(f.response)).rejects.toMatchObject({
      code: "RESOURCE_EXHAUSTED",
    });
    expect(f.pulls()).toBe(1);
    expect(f.cancel).toHaveBeenCalledTimes(1);
  });
  it("rejects split header before reading its declared payload", async () => {
    const h = header(0xffffffff);
    const f = fixture([h.subarray(0, 2), h.subarray(2), new Uint8Array(1)]);
    await expect(sdk(f.response)).rejects.toMatchObject({
      code: "RESOURCE_EXHAUSTED",
    });
    expect(f.pulls()).toBe(2);
    expect(f.cancel).toHaveBeenCalledTimes(1);
  });
  it("bounds trailer declarations separately", async () => {
    const f = fixture([header(GRPC_TRAILER_BYTES + 1, 128)]);
    await expect(sdk(f.response)).rejects.toMatchObject({
      code: "RESOURCE_EXHAUSTED",
    });
    expect(f.cancel).toHaveBeenCalledTimes(1);
  });
  it("accepts exact message declaration then reports truncation without allocating declared payload", async () => {
    const f = fixture([header(GRPC_MESSAGE_BYTES)]);
    await expect(sdk(f.response)).rejects.toMatchObject({ code: "DATA_LOSS" });
  });
  it("preserves binary unary protobuf and terminal trailers across arbitrary chunk boundaries", async () => {
    const bytes = Uint8Array.from([
      ...frame(
        GrpcTypes.GetServiceInfoResponse.toBinary({ checkpointHeight: 42n }),
      ),
      ...trailers,
    ]);
    const f = fixture(Array.from(bytes, (byte) => Uint8Array.of(byte)));
    expect(await sdk(f.response)).toMatchObject({ checkpointHeight: 42n });
    expect(f.cancel).not.toHaveBeenCalled();
  });
  it("preserves streaming messages and normal terminal status", async () => {
    const f = fixture([
      frame(GrpcTypes.ListTransactionsResponse.toBinary({})),
      frame(GrpcTypes.ListTransactionsResponse.toBinary({})),
      trailers,
    ]);
    expect(await sdk(f.response, true)).toHaveLength(2);
  });
  it.each([1, 129, 255])(
    "rejects unsupported frame flag %s before payload",
    async (flag) => {
      const f = fixture([header(1, flag)]);
      await expect(sdk(f.response)).rejects.toMatchObject({
        code: "DATA_LOSS",
      });
      expect(f.cancel).toHaveBeenCalledTimes(1);
    },
  );
  it("rejects text response rather than interpreting base64 as binary frames", async () => {
    const f = fixture([], "application/grpc-web-text+proto");
    await expect(sdk(f.response)).rejects.toMatchObject({ code: "DATA_LOSS" });
    expect(f.cancel).toHaveBeenCalledTimes(1);
  });
  it("keeps header-only upstream error status and percent-decoded message", async () => {
    const f = fixture([]);
    f.response.headers.set("grpc-status", "14");
    f.response.headers.set("grpc-message", "upstream%20unavailable");
    await expect(sdk(f.response)).rejects.toMatchObject({
      code: "UNAVAILABLE",
      message: "upstream unavailable",
    });
    expect(f.pulls()).toBe(0);
  });
  it("does not read JSON or error-page bodies", () => {
    const f = fixture([], "application/json");
    expect(boundedGrpcResponse(f.response)).toBe(f.response);
    expect(f.pulls()).toBe(0);
  });
  it("rejects truncated header", async () => {
    const f = fixture([new Uint8Array([0, 0])]);
    await expect(sdk(f.response)).rejects.toMatchObject({ code: "DATA_LOSS" });
  });
  it("rejects data after terminal trailers", async () => {
    const f = fixture([trailers, header(0)]);
    await expect(sdk(f.response)).rejects.toMatchObject({ code: "DATA_LOSS" });
  });
  it("cancel propagates once without another body read", async () => {
    const f = fixture([header(0), header(0)]);
    const reader = boundedGrpcResponse(f.response).body!.getReader();
    await reader.read();
    await reader.cancel("closed");
    expect(f.cancel).toHaveBeenCalledOnce();
    expect(f.pulls()).toBe(1);
  });
  it("abort while body reader is stalled rejects immediately and cancels original source", async () => {
    const cancel = vi.fn();
    const abort = new AbortController();
    const source = new ReadableStream<Uint8Array>(
      { pull() {}, cancel },
      { highWaterMark: 0 },
    );
    const response = boundedGrpcResponse(
      new Response(source, {
        headers: { "content-type": "application/grpc-web" },
      }),
      abort.signal,
    );
    const reading = response.body!.getReader().read();
    abort.abort(new DOMException("stop", "AbortError"));
    await expect(reading).rejects.toMatchObject({ name: "AbortError" });
    expect(cancel).toHaveBeenCalledOnce();
  });
  it("actual fetch starts synchronously within final gate", async () => {
    const fetch = vi.fn(async () => new Response(null));
    const wrapped = boundedGrpcFetch(fetch);
    const pending = wrapped("https://localhost");
    expect(fetch).toHaveBeenCalledOnce();
    await pending;
  });
  it("bounds cumulative call bytes using reused legal chunks, without a total-body buffer", async () => {
    const chunk = new Uint8Array(1024 * 1024);
    chunk.set(header(chunk.length - 5));
    const f = fixture(
      Array.from({ length: GRPC_CALL_BYTES / chunk.length + 1 }, () => chunk),
    );
    const reader = boundedGrpcResponse(f.response).body!.getReader();
    for (let i = 0; i < GRPC_CALL_BYTES / chunk.length; i++)
      await reader.read();
    await expect(reader.read()).rejects.toMatchObject({
      code: "RESOURCE_EXHAUSTED",
    });
    expect(f.cancel).toHaveBeenCalledOnce();
  });
});
