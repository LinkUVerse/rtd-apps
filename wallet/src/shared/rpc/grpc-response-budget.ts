// Copyright (c) LinkU Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { RpcError } from "@protobuf-ts/runtime-rpc";

export const GRPC_MESSAGE_BYTES = 64 * 1024 * 1024;
export const GRPC_TRAILER_BYTES = 64 * 1024;
export const GRPC_CALL_BYTES = 128 * 1024 * 1024;

/** Inspect binary frame headers before the SDK buffers a declared message body. */
export function boundedGrpcResponse(
  response: Response,
  signal?: AbortSignal | null,
): Response {
  const contentType = response.headers
    .get("content-type")
    ?.split(";")[0]
    .trim()
    .toLowerCase();
  if (!response.body || !contentType?.startsWith("application/grpc-web"))
    return response;
  if (
    contentType !== "application/grpc-web" &&
    contentType !== "application/grpc-web+proto"
  ) {
    void response.body.cancel().catch(() => {});
    throw new RpcError("钱包仅接受binary gRPC响应", "DATA_LOSS");
  }
  if (
    response.headers.has("grpc-status") &&
    response.headers.get("grpc-status") !== "0"
  ) {
    void response.body.cancel().catch(() => {});
    return response;
  }
  const reader = response.body.getReader();
  const header = new Uint8Array(5);
  let headerBytes = 0,
    remaining = 0,
    total = 0,
    trailers = false,
    ended = false;
  let output: ReadableStreamDefaultController<Uint8Array>;
  const dispose = () => signal?.removeEventListener("abort", aborted);
  const cancel = (reason?: unknown) => {
    if (ended) return;
    ended = true;
    dispose();
    // Cancellation may be held by an upstream source; it must not hold rejection of this call.
    void reader.cancel(reason).catch(() => {});
  };
  const fail = (reason: unknown) => {
    cancel(reason);
    output.error(reason);
  };
  const aborted = () => {
    if (!ended) fail(signal!.reason);
  };
  const body = new ReadableStream<Uint8Array>(
    {
      start(controller) {
        output = controller;
        if (signal?.aborted) aborted();
        else signal?.addEventListener("abort", aborted, { once: true });
      },
      async pull(controller) {
        if (ended) return;
        try {
          const chunk = await reader.read();
          if (ended) return;
          if (chunk.done) {
            if (headerBytes !== 0 || remaining !== 0)
              throw new RpcError("gRPC响应帧不完整", "DATA_LOSS");
            ended = true;
            dispose();
            reader.releaseLock();
            controller.close();
            return;
          }
          total += chunk.value.byteLength;
          if (total > GRPC_CALL_BYTES)
            throw new RpcError("gRPC响应超过单调用预算", "RESOURCE_EXHAUSTED");
          let offset = 0;
          while (offset < chunk.value.byteLength) {
            if (remaining > 0) {
              const take = Math.min(remaining, chunk.value.byteLength - offset);
              remaining -= take;
              offset += take;
            } else {
              if (trailers)
                throw new RpcError("gRPC终态后仍有数据", "DATA_LOSS");
              const take = Math.min(
                5 - headerBytes,
                chunk.value.byteLength - offset,
              );
              header.set(
                chunk.value.subarray(offset, offset + take),
                headerBytes,
              );
              offset += take;
              headerBytes += take;
              if (headerBytes === 5) {
                if (header[0] !== 0 && header[0] !== 128)
                  throw new RpcError("gRPC响应帧标志不兼容", "DATA_LOSS");
                trailers = header[0] === 128;
                remaining = new DataView(header.buffer).getUint32(1);
                if (
                  remaining >
                  (trailers ? GRPC_TRAILER_BYTES : GRPC_MESSAGE_BYTES)
                ) {
                  throw new RpcError(
                    "gRPC响应单消息超过预算",
                    "RESOURCE_EXHAUSTED",
                  );
                }
                headerBytes = 0;
              }
            }
          }
          controller.enqueue(chunk.value);
        } catch (reason) {
          if (!ended) fail(reason);
        }
      },
      cancel(reason) {
        cancel(reason);
      },
    },
    { highWaterMark: 0 },
  );
  return new Response(body, {
    status: response.status,
    statusText: response.statusText,
    headers: response.headers,
  });
}

/** Keep fetch invocation synchronous so the final-action gate still starts the actual request. */
export function boundedGrpcFetch(fetchFn: typeof fetch): typeof fetch {
  return async (input, init) =>
    boundedGrpcResponse(await fetchFn(input, init), init?.signal);
}
