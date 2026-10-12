// Copyright (c) LinkU Labs, Inc.
// SPDX-License-Identifier: Apache-2.0
import { RtdJsonRpcClient } from "rtd-typescript/jsonRpc";
import {
  epochPageSchema,
  epochSchema,
  epochRequestSchema,
} from "./epoch-schema";

/** Explicit RTD extension declarations; deployment capability must still be verified.
 * Current RTD source declares these methods but has no server implementation/registration.
 * Not imported by the wallet and never a fallback for wallet queries.
 */
export class ExplorerRpcClient extends RtdJsonRpcClient {
  async getEpochs({
    cursor = null,
    limit = null,
    descendingOrder = false,
    signal,
  }: {
    cursor?: string | null;
    limit?: number | null;
    descendingOrder?: boolean;
    signal?: AbortSignal;
  } = {}) {
    signal?.throwIfAborted();
    const input = epochRequestSchema.parse({ cursor, limit, descendingOrder });
    const value = await this.transport.request<unknown>({
      method: "rtdx_getEpochs",
      params: [input.cursor, input.limit, input.descendingOrder],
      signal,
    });
    return epochPageSchema.parse(value);
  }
  async getCurrentEpoch({ signal }: { signal?: AbortSignal } = {}) {
    signal?.throwIfAborted();
    return epochSchema.parse(
      await this.transport.request<unknown>({
        method: "rtdx_getCurrentEpoch",
        params: [],
        signal,
      }),
    );
  }
}
