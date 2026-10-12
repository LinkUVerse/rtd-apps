// Copyright (c) LinkU Labs, Inc.
// SPDX-License-Identifier: Apache-2.0
import { RtdGrpcClient } from "rtd-typescript/grpc";
import type { WalletReadSession } from "./session";
import { boundedGrpcFetch } from "./grpc-response-budget";
import { ReadRequestQueue } from "./read-request-queue";

type Info = Awaited<
  ReturnType<RtdGrpcClient["ledgerService"]["getServiceInfo"]>
>["response"];
const queues = new WeakMap<
  WalletReadSession,
  WeakMap<typeof fetch, Map<string, ReadRequestQueue<void, Info>>>
>();

/** One native request for simultaneous identity checks. Each reader still checks
 * H0/watermarks; later post-read checks always send a new request.
 */
export function queuedServiceInfo(
  session: WalletReadSession,
  endpoint: string,
  transport: typeof fetch,
  timeoutMs: number,
  signal: AbortSignal,
): Promise<Info> {
  session.assertActive();
  let transports = queues.get(session);
  if (!transports) queues.set(session, (transports = new WeakMap()));
  let lanes = transports.get(transport);
  if (!lanes) transports.set(transport, (lanes = new Map()));
  const key = JSON.stringify([endpoint, timeoutMs]);
  let queue = lanes.get(key);
  if (!queue) {
    const fetchFn = boundedGrpcFetch(transport);
    const client = new RtdGrpcClient({
      network: session.profile.sdkNetwork,
      baseUrl: endpoint,
      format: "binary",
      mvr: { url: "" },
      fetch: (input, init) =>
        fetchFn(input, { ...init, redirect: "error", credentials: "omit" }),
    });
    queue = new ReadRequestQueue(
      async (inputs, sharedSignal) => {
        const { response } = await session.request(sharedSignal, () =>
          client.ledgerService.getServiceInfo(
            {},
            { abort: sharedSignal, timeout: timeoutMs },
          ),
        );
        return inputs.map(() => ({
          status: "fulfilled" as const,
          value: response,
        }));
      },
      () => {
        if (lanes!.get(key) === queue) lanes!.delete(key);
      },
    );
    lanes.set(key, queue);
  }
  return queue.request(undefined, AbortSignal.any([session.signal, signal]));
}
