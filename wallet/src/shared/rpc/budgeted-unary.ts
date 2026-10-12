// Copyright (c) LinkU Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { UnaryCall } from "@protobuf-ts/runtime-rpc";
import type { RpcTransport } from "rtd-typescript/grpc";
import type { WalletReadSession } from "./session";

/** Delays a read/simulation RPC until a slot exists; never wrap transaction dispatch. */
export function budgetedUnary(
  session: WalletReadSession,
  transport: RpcTransport,
  signal: AbortSignal,
): RpcTransport["unary"] {
  return (method, input, options) => {
    const cancellation = AbortSignal.any([
      signal,
      session.signal,
      ...(options.abort ? [options.abort] : []),
    ]);
    const finished = session.request(cancellation, () =>
      transport.unary(method, input, { ...options, abort: cancellation }),
    );
    // Awaiting the complete call holds the slot through response/status/trailers.
    // Headers are intentionally exposed only with the completed unary result.
    const headers = finished.then((call) => call.headers);
    const response = finished.then((call) => call.response);
    const status = finished.then((call) => call.status);
    const trailers = finished.then((call) => call.trailers);
    // SDK consumers may await only .response; unused sibling failures must be observed.
    for (const promise of [headers, response, status, trailers])
      void promise.catch(() => {});
    return new UnaryCall(
      method,
      options.meta ?? {},
      input,
      headers,
      response,
      status,
      trailers,
    );
  };
}
