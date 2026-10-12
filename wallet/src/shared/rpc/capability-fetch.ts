// Copyright (c) LinkU Labs, Inc.
// SPDX-License-Identifier: Apache-2.0
import type { CapabilityObservationLifetime } from "./capability-observation-lifetime";
import { Kind, parse, visit } from "graphql";
import { RpcError } from "rtd-typescript/grpc";
import {
  HISTORY_COVERAGE_QUERY,
  HISTORY_PAGE_QUERY,
} from "./account-history-protocol";
import { NATIVE_READ_PROBE_METHODS } from "./native-service-capabilities";
import { WalletReadSession } from "./session";

export class WalletCapabilityTransportError extends RpcError {
  constructor(readonly reason: "policy" | "budget" | "unavailable") {
    super(
      "网络能力探测未取得允许的有界响应",
      reason === "budget"
        ? "RESOURCE_EXHAUSTED"
        : reason === "policy"
          ? "PERMISSION_DENIED"
          : "UNAVAILABLE",
    );
    this.name = "WalletCapabilityTransportError";
  }
}
export type WalletCapabilityFetch = typeof fetch & {
  /** A wrapper result alone cannot prove that all physical requests ended. */
  assertCompleted(): void;
  dispose(): void;
};
/** Used inside each existing SDK request lease, never around the aggregate operation. */
export function createCapabilityFetch(
  session: WalletReadSession,
  signal: AbortSignal,
  fetchFn: typeof fetch,
  lifetime?: CapabilityObservationLifetime,
): WalletCapabilityFetch {
  let pending = 0,
    interrupted = false,
    sealed = false;
  const listeners: (() => void)[] = [];
  const dispose = () => {
    sealed = true;
    for (const remove of listeners.splice(0)) remove();
  };
  const { endpoints } = session.profile;
  const native = new Set([
    ...[
      ...NATIVE_READ_PROBE_METHODS.fullnode,
      "MovePackageService/GetPackage",
    ].map((method) => `${endpoints.fullnodeGrpcWeb}/rtd.rpc.v2.${method}`),
    ...(endpoints.archiveGrpcWeb
      ? NATIVE_READ_PROBE_METHODS.archive.map(
          (method) => `${endpoints.archiveGrpcWeb}/rtd.rpc.v2.${method}`,
        )
      : []),
  ]);
  const fence = () => {
    lifetime?.assertOpen();
    session.assertActive();
    signal.throwIfAborted();
    if (sealed) throw new WalletCapabilityTransportError("policy");
  };
  const bounded: typeof fetch = async (input, init) => {
    fence();
    const url = String(input);
    const query =
      url === endpoints.graphqlUrl || url === endpoints.accountHistoryUrl;
    if (init?.method !== "POST" || (!native.has(url) && !query))
      throw new WalletCapabilityTransportError("policy");
    if (query) {
      if (
        typeof init.body !== "string" ||
        new TextEncoder().encode(init.body).length >
          (url === endpoints.accountHistoryUrl ? 16384 : 65536)
      )
        throw new WalletCapabilityTransportError("budget");
      try {
        const payload = JSON.parse(init.body);
        if (!payload || typeof payload.query !== "string") throw new Error();
        if (
          url === endpoints.accountHistoryUrl &&
          payload.query !== HISTORY_COVERAGE_QUERY &&
          payload.query !== HISTORY_PAGE_QUERY
        )
          throw new Error();
        const document = parse(payload.query, { maxTokens: 4096 });
        const operations = document.definitions.filter(
          (node) => node.kind === Kind.OPERATION_DEFINITION,
        );
        if (operations.length !== 1 || operations[0].operation !== "query")
          throw new Error();
        visit(document, {
          Field(node) {
            if (
              [
                "simulateTransaction",
                "executeTransaction",
                "dryRunTransactionBlock",
                "executeTransactionBlock",
              ].includes(node.name.value)
            )
              throw new Error();
          },
        });
      } catch {
        throw new WalletCapabilityTransportError("policy");
      }
    } else {
      const body = init.body;
      const size =
        body instanceof ArrayBuffer
          ? body.byteLength
          : ArrayBuffer.isView(body)
            ? body.byteLength
            : -1;
      if (size < 0 || size > 65536)
        throw new WalletCapabilityTransportError("budget");
    }
    const cancellation = AbortSignal.any([
      signal,
      ...(init.signal ? [init.signal] : []),
    ]);
    cancellation.throwIfAborted();
    // Keep this listener until the aggregate seals, including SDK decoding after EOF.
    const abort = () => {
      interrupted = true;
    };
    cancellation.addEventListener("abort", abort, { once: true });
    listeners.push(() => cancellation.removeEventListener("abort", abort));
    pending++;
    try {
      const response = await fetchFn(input, {
        ...init,
        signal: cancellation,
        redirect: "error",
        credentials: "omit",
      });
      try {
        fence();
        cancellation.throwIfAborted();
      } catch (error) {
        await response.body?.cancel().catch(() => {});
        throw error;
      }
      // Preserve HTTP statuses and the authored native retry/backoff policy.
      if (!response.body) {
        if (!response.ok) return response;
        throw new WalletCapabilityTransportError("unavailable");
      }
      const reader = response.body.getReader(),
        chunks: Uint8Array[] = [];
      let size = 0,
        complete = false;
      try {
        while (true) {
          const next = await reader.read();
          fence();
          cancellation.throwIfAborted();
          if (next.done) {
            complete = true;
            break;
          }
          size += next.value.length;
          if (size > 2 * 1024 * 1024)
            throw new WalletCapabilityTransportError("budget");
          chunks.push(next.value);
        }
        const bytes = new Uint8Array(size);
        let offset = 0;
        for (const chunk of chunks) {
          bytes.set(chunk, offset);
          offset += chunk.length;
        }
        return new Response(bytes, {
          status: response.status,
          headers: response.headers,
        });
      } finally {
        if (!complete) {
          interrupted = true;
          await reader.cancel().catch(() => {});
        }
        reader.releaseLock();
      }
    } finally {
      pending--;
    }
  };
  const tracked: typeof fetch = (input, init) => {
    // Check before creating any physical fetch; cancellation alone is not settlement.
    lifetime?.assertOpen();
    const work = bounded(input, init);
    return lifetime?.track(work) ?? work;
  };
  return Object.assign(tracked, {
    assertCompleted() {
      fence();
      if (pending !== 0 || interrupted) {
        dispose();
        throw new WalletCapabilityTransportError("budget");
      }
      dispose();
    },
    dispose,
  });
}
