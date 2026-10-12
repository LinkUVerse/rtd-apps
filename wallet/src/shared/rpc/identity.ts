// Copyright (c) LinkU Labs, Inc.
// SPDX-License-Identifier: Apache-2.0
import type { CapabilityObservationLifetime } from "./capability-observation-lifetime";

import { boundedGrpcFetch } from "./grpc-response-budget";
import { createReadDeadline } from "./read-deadline";

import { RtdGraphQLClient } from "rtd-typescript/graphql";
import { RpcError, RtdGrpcClient } from "rtd-typescript/grpc";

import { assertGenesisDigest, type EndpointRole } from "./profile";
import { WalletReadSession } from "./session";

type IdentityRole = Exclude<EndpointRole, "accountHistory">;

export class NetworkIdentityError extends Error {
  constructor(
    readonly role: EndpointRole,
    readonly reason: "chain-mismatch" | "incompatible",
  ) {
    super(
      reason === "chain-mismatch"
        ? "钱包查询入口属于不同链，已停止接纳数据"
        : "钱包查询入口身份响应不兼容",
    );
    this.name = "NetworkIdentityError";
  }
}

/** A valid advancing retention window invalidates this read, without proving a bad identity. */
export class WalletNativeReadWindowChangedError extends RpcError {
  readonly reason = "changed";
  constructor(readonly role: "fullnode" | "archive") {
    super("查询期间原生历史保留范围推进，请重新读取", "ABORTED");
    this.name = "WalletNativeReadWindowChangedError";
  }
}

type NativeReadWindow = Readonly<{
  height: bigint;
  lower: bigint;
  objects: bigint;
}>;

/** Scalars/H0 have already been checked by each info reader. Never publish a changed window. */
export function assertNativeReadWindowUnchanged(
  role: "fullnode" | "archive",
  before: NativeReadWindow,
  after: NativeReadWindow,
): void {
  if (
    after.height < before.height ||
    after.lower < before.lower ||
    after.objects < before.objects
  )
    throw new NetworkIdentityError(role, "incompatible");
  if (after.lower !== before.lower || after.objects !== before.objects)
    throw new WalletNativeReadWindowChangedError(role);
}

export type EndpointIdentity =
  | { role: IdentityRole; state: "unconfigured" | "unavailable" }
  | {
      role: IdentityRole;
      state: "verified";
      genesisDigest: string;
      checkpointHeight?: bigint;
      lowestAvailableCheckpoint?: bigint;
      lowestAvailableCheckpointObjects?: bigint;
    };

/** These proofs establish chain identity only, not schema/coverage/package readiness. */
export interface NetworkIdentityReport {
  state: "identity-verified" | "unavailable";
  bindingKey: string;
  observedAt: number;
  endpoints: readonly EndpointIdentity[];
}

/** Probe clients stay private and are never returned as executable wallet clients. */
export async function probeNetworkIdentity(
  session: WalletReadSession,
  options: {
    fetch?: typeof fetch;
    lifetime?: CapabilityObservationLifetime;
    timeoutMs?: number;
    signal?: AbortSignal;
  } = {},
): Promise<NetworkIdentityReport> {
  let disposeDeadline: (() => void) | undefined;
  return session
    .read(async (sessionSignal) => {
      const timeoutMs = options.timeoutMs ?? 10_000;
      if (
        !Number.isSafeInteger(timeoutMs) ||
        timeoutMs < 1 ||
        timeoutMs > 60_000
      ) {
        throw new RangeError("身份查询超时必须在 1–60000 ms");
      }
      const fatal = new AbortController();
      const deadline = createReadDeadline(timeoutMs);
      disposeDeadline = deadline.dispose;
      const signal = AbortSignal.any([
        sessionSignal,
        deadline.signal,
        fatal.signal,
        ...(options.signal ? [options.signal] : []),
      ]);
      signal.throwIfAborted();
      const fetchFn = boundedGrpcFetch(options.fetch ?? globalThis.fetch);
      const guardedFetch: typeof fetch = (input, init) =>
        fetchFn(input, {
          ...init,
          redirect: "error",
          credentials: "omit",
        });
      const { profile } = session;
      const verifyDigest = (value: unknown, role: IdentityRole): string => {
        let digest: string;
        try {
          digest = assertGenesisDigest(value);
        } catch {
          throw new NetworkIdentityError(role, "incompatible");
        }
        if (digest !== profile.expectedGenesisDigest)
          throw new NetworkIdentityError(role, "chain-mismatch");
        return digest;
      };
      const grpc = async (
        role: "fullnode" | "archive",
        baseUrl?: string,
      ): Promise<EndpointIdentity> => {
        if (!baseUrl) return { role, state: "unconfigured" };
        const client = new RtdGrpcClient({
          network: profile.sdkNetwork,
          baseUrl,
          format: "binary",
          fetch: guardedFetch,
          // Empty URL overrides the SDK network defaults; named packages must not hit Sui MVR.
          mvr: { url: "" },
        });
        const { response } = await session.request(signal, () =>
          client.ledgerService.getServiceInfo(
            {},
            { abort: signal, timeout: timeoutMs },
          ),
        );
        const genesisDigest = verifyDigest(response.chainId, role);
        const height = response.checkpointHeight;
        if (height === undefined || height < 0n || height > 0xffffffffffffffffn)
          throw new NetworkIdentityError(role, "incompatible");
        for (const lower of [
          response.lowestAvailableCheckpoint,
          response.lowestAvailableCheckpointObjects,
        ]) {
          if (lower !== undefined && (lower < 0n || lower > height))
            throw new NetworkIdentityError(role, "incompatible");
        }
        return {
          role,
          state: "verified",
          genesisDigest,
          checkpointHeight: height,
          lowestAvailableCheckpoint: response.lowestAvailableCheckpoint,
          lowestAvailableCheckpointObjects:
            response.lowestAvailableCheckpointObjects,
        };
      };
      const graphql = async (): Promise<EndpointIdentity> => {
        if (!profile.endpoints.graphqlUrl)
          return { role: "graphql", state: "unconfigured" };
        const client = new RtdGraphQLClient({
          network: profile.sdkNetwork,
          url: profile.endpoints.graphqlUrl,
          fetch: guardedFetch,
          mvr: { url: "" },
        });
        const result = await session.request(signal, () =>
          client.query<{
            checkpoint?: { digest?: unknown } | null;
          }>({
            query:
              "query WalletGenesisIdentity { checkpoint(sequenceNumber: 0) { digest } }",
            variables: {},
            signal,
          }),
        );
        if (result.errors?.length)
          throw new NetworkIdentityError("graphql", "incompatible");
        return {
          role: "graphql",
          state: "verified",
          genesisDigest: verifyDigest(
            result.data?.checkpoint?.digest,
            "graphql",
          ),
        };
      };
      const roles: IdentityRole[] = ["fullnode", "graphql", "archive"];
      const pending = Promise.allSettled(
        [
          grpc("fullnode", profile.endpoints.fullnodeGrpcWeb),
          graphql(),
          grpc("archive", profile.endpoints.archiveGrpcWeb),
        ].map((work) =>
          work.catch((error) => {
            options.lifetime?.noteError(error);
            // Do not wait for an unavailable/abort-ignoring role to hide an already
            // verified wrong chain. The actual leaf still owns its request lease.
            if (
              error instanceof NetworkIdentityError &&
              error.reason === "chain-mismatch"
            )
              fatal.abort(error);
            throw error;
          }),
        ),
      );
      const tracked = options.lifetime?.track(pending) ?? pending;
      const results = await new Promise<Awaited<typeof pending>>(
        (resolve, reject) => {
          const abort = () => {
            signal.removeEventListener("abort", abort);
            reject(signal.reason);
          };
          signal.addEventListener("abort", abort, { once: true });
          tracked.then(
            (value) => {
              signal.removeEventListener("abort", abort);
              signal.aborted ? reject(signal.reason) : resolve(value);
            },
            (error) => {
              signal.removeEventListener("abort", abort);
              reject(error);
            },
          );
          if (signal.aborted) abort();
        },
      );
      // A known mismatch takes priority over an unavailable role: never degrade past a wrong chain.
      for (const result of results) {
        if (
          result.status === "rejected" &&
          result.reason instanceof NetworkIdentityError &&
          result.reason.reason === "chain-mismatch"
        )
          throw result.reason;
      }
      const endpoints = results.map((result, i): EndpointIdentity => {
        if (result.status === "fulfilled") return Object.freeze(result.value);
        if (result.reason instanceof NetworkIdentityError) throw result.reason;
        return Object.freeze({ role: roles[i], state: "unavailable" });
      });
      signal.throwIfAborted();
      return Object.freeze({
        state: endpoints.some((endpoint) => endpoint.state === "verified")
          ? "identity-verified"
          : "unavailable",
        bindingKey: session.bindingKey,
        observedAt: Date.now(),
        endpoints: Object.freeze(endpoints),
      });
    })
    .finally(() => {
      // A completed identity operation no longer owns a deadline. External
      // cancellation and already-fired deadlines remain latched by the transport.
      disposeDeadline?.();
    });
}
