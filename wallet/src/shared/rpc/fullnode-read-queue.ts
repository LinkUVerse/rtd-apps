// Copyright (c) LinkU Labs, Inc.
// SPDX-License-Identifier: Apache-2.0
import { toBase64 } from "rtd-typescript/utils";
import { ReadRequestQueue } from "./read-request-queue";
import type { WalletReadSession } from "./session";

export type FullnodeReadMethod =
  | "GetBalance"
  | "ListBalances"
  | "GetObject"
  | "ListOwnedObjects";
const queues = new WeakMap<
  WalletReadSession,
  WeakMap<typeof fetch, Map<string, ReadRequestQueue<void, unknown>>>
>();

/** Share only identical, not-yet-dispatched native reads. Encoded request bytes
 * include the owner/type/object, masks and pagination token. No returned or
 * already-running observation may satisfy a later freshness requirement.
 */
export function queuedFullnodeRead<T>(
  session: WalletReadSession,
  transport: typeof fetch,
  timeoutMs: number,
  method: FullnodeReadMethod,
  request: Uint8Array,
  signal: AbortSignal,
  send: (signal: AbortSignal) => Promise<T>,
): Promise<T> {
  session.assertActive();
  if (
    !["GetBalance", "ListBalances", "GetObject", "ListOwnedObjects"].includes(
      method,
    )
  )
    throw new Error("只允许复用指定的 Fullnode 只读查询");
  let transports = queues.get(session);
  if (!transports) queues.set(session, (transports = new WeakMap()));
  let lanes = transports.get(transport);
  if (!lanes) transports.set(transport, (lanes = new Map()));
  const key = JSON.stringify([
    session.profile.endpoints.fullnodeGrpcWeb,
    timeoutMs,
    method,
    toBase64(request),
  ]);
  let queue = lanes.get(key);
  if (!queue) {
    queue = new ReadRequestQueue<void, unknown>(
      async (pending, sharedSignal) => {
        const abort = AbortSignal.any([session.signal, sharedSignal]);
        const value = await session.request(abort, () => send(abort));
        return pending.map(() => ({ status: "fulfilled" as const, value }));
      },
      () => {
        if (lanes!.get(key) === queue) lanes!.delete(key);
      },
    );
    lanes.set(key, queue);
  }
  return queue
    .request(undefined, AbortSignal.any([session.signal, signal]))
    .then((value) => structuredClone(value) as T);
}
