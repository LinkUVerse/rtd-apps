// Copyright (c) LinkU Labs, Inc.
// SPDX-License-Identifier: Apache-2.0
import type { CapabilityObservationLifetime } from "./capability-observation-lifetime";
import {
  probeAccountHistoryCapabilities,
  type WalletAccountHistoryCapabilities,
} from "./account-history-capabilities";
import {
  createCapabilityFetch,
  WalletCapabilityTransportError,
} from "./capability-fetch";
import {
  probeDeploymentCapabilities,
  type WalletDeploymentCapabilities,
} from "./deployment-capabilities";
import {
  probeGraphQLDomainCapabilities,
  type WalletGraphQLDomainCapabilities,
} from "./graphql-domain-capabilities";
import { WalletSchemaCapabilityError } from "./graphql-schema-capabilities";
import {
  NetworkIdentityError,
  WalletNativeReadWindowChangedError,
  probeNetworkIdentity,
  type NetworkIdentityReport,
} from "./identity";
import {
  probeNativeServiceCapabilities,
  type WalletNativeServiceCapabilities,
} from "./native-service-capabilities";
import { WalletReadSession } from "./session";
import { walletAddress } from "./asset-address";
import { checkpointNumber } from "./graphql-snapshot";

export type CapabilityAssessment<T> = Readonly<
  | { state: "observed"; value: T }
  | {
      state: "incomplete" | "unavailable";
      reason: "response" | "partial" | "budget" | "transport" | "policy";
    }
>;
export interface WalletNetworkCapabilities {
  readonly state: "capabilities-assessed";
  readonly bindingKey: string;
  readonly readSessionKey: string;
  readonly observedAt: number;
  readonly identity: Readonly<{
    before: NetworkIdentityReport;
    after: NetworkIdentityReport;
  }>;
  readonly graphql: CapabilityAssessment<WalletGraphQLDomainCapabilities>;
  readonly native: CapabilityAssessment<WalletNativeServiceCapabilities>;
  readonly deployment: CapabilityAssessment<WalletDeploymentCapabilities>;
  readonly accountHistory: CapabilityAssessment<WalletAccountHistoryCapabilities>;
  readonly scope: "configured-read-contracts";
  readonly crossDomainSnapshot: "not-verified";
  readonly serviceDeployment: "not-verified";
  readonly readiness: "not-assessed";
  readonly execution: "not-probed";
}
function cancellableRaw<T>(work: Promise<T>, signal: AbortSignal): Promise<T> {
  return new Promise((resolve, reject) => {
    const abort = () => {
      signal.removeEventListener("abort", abort);
      reject(signal.reason);
    };
    signal.addEventListener("abort", abort, { once: true });
    work.then(
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
  });
}
/** All configured read protocols, fresh identity bookends and one deadline. No report/input reuse or client publication. */
export function probeNetworkCapabilities(
  session: WalletReadSession,
  options: {
    fetch?: typeof fetch;
    lifetime?: CapabilityObservationLifetime;
    signal?: AbortSignal;
    timeoutMs?: number;
    minimumCheckpoint?: string;
    address?: string;
    declaration?: { json: string; trustedSha256: string };
  } = {},
): Promise<WalletNetworkCapabilities> {
  const cancellable = <T>(promise: Promise<T>, signal: AbortSignal) =>
    cancellableRaw(options.lifetime?.track(promise) ?? promise, signal);
  return session.read(async (sessionSignal) => {
    const timeoutMs = options.timeoutMs ?? 60000;
    if (!Number.isSafeInteger(timeoutMs) || timeoutMs < 1 || timeoutMs > 60000)
      throw new RangeError("完整能力探测总期限必须在1–60000ms");
    const fatal = new AbortController();
    const signal = AbortSignal.any([
      sessionSignal,
      AbortSignal.timeout(timeoutMs),
      fatal.signal,
      ...(options.signal ? [options.signal] : []),
    ]);
    const fence = () => {
      session.assertActive();
      signal.throwIfAborted();
    };
    fence();
    // Capture scalar authority/selector inputs before any async identity IO.
    const declaration = options.declaration && {
      json: options.declaration.json,
      trustedSha256: options.declaration.trustedSha256,
    };
    const address =
        options.address === undefined
          ? undefined
          : walletAddress(options.address),
      minimumCheckpoint = options.minimumCheckpoint;
    if (minimumCheckpoint !== undefined) checkpointNumber(minimumCheckpoint);
    const fetch = createCapabilityFetch(
      session,
      signal,
      options.fetch ?? globalThis.fetch,
      options.lifetime,
    );
    const bound = <T extends { bindingKey: string; readSessionKey: string }>(
      value: T,
      role: "graphql" | "fullnode" | "accountHistory",
    ): T => {
      fence();
      if (
        value.bindingKey !== session.bindingKey ||
        value.readSessionKey !== session.cacheKey
      )
        throw new NetworkIdentityError(role, "incompatible");
      return value;
    };
    const identity = async () => {
      const report = await probeNetworkIdentity(session, {
        fetch,
        lifetime: options.lifetime,
        signal,
        timeoutMs: Math.min(timeoutMs, 10000),
      });
      fence();
      if (report.bindingKey !== session.bindingKey)
        throw new NetworkIdentityError("fullnode", "incompatible");
      return report;
    };
    const assess = async <T>(
      work: () => Promise<T>,
    ): Promise<CapabilityAssessment<T>> => {
      try {
        return Object.freeze({ state: "observed", value: await work() });
      } catch (error) {
        options.lifetime?.noteError(error);
        if (error instanceof NetworkIdentityError) {
          // Only an independently verified wrong chain stops sibling groups immediately.
          if (error.reason === "chain-mismatch") fatal.abort(error);
          throw error;
        }
        fence();
        if (error instanceof WalletNativeReadWindowChangedError)
          return Object.freeze({ state: "incomplete", reason: "partial" });
        if (error instanceof WalletSchemaCapabilityError)
          return Object.freeze({
            state:
              error.reason === "unavailable" ? "unavailable" : "incomplete",
            reason:
              error.reason === "incompatible"
                ? "response"
                : error.reason === "unavailable"
                  ? "transport"
                  : error.reason,
          });
        if (error instanceof WalletCapabilityTransportError)
          return Object.freeze({
            state:
              error.reason === "unavailable" ? "unavailable" : "incomplete",
            reason: error.reason === "unavailable" ? "transport" : error.reason,
          });
        return Object.freeze({ state: "unavailable", reason: "transport" });
      }
    };
    const run = async (): Promise<WalletNetworkCapabilities> => {
      const before = await identity();
      const shared = {
        fetch,
        signal,
        lifetime: options.lifetime,
        timeoutMs: Math.min(timeoutMs, 30000),
      };
      const jobs = [
        assess(async () =>
          bound(
            await probeGraphQLDomainCapabilities(session, {
              ...shared,
              minimumCheckpoint,
            }),
            "graphql",
          ),
        ),
        assess(async () =>
          bound(
            await probeNativeServiceCapabilities(session, shared),
            "fullnode",
          ),
        ),
        assess(async () =>
          bound(
            await probeDeploymentCapabilities(session, {
              ...shared,
              declaration,
            }),
            "fullnode",
          ),
        ),
        assess(async () =>
          bound(
            await probeAccountHistoryCapabilities(session, {
              ...shared,
              address,
              minimumCheckpoint,
            }),
            "accountHistory",
          ),
        ),
      ] as const;
      const results = await Promise.allSettled(jobs);
      fence();
      // Ending identities are fresh even when a local protocol assessment failed.
      const after = await identity();
      fence();
      for (const result of results)
        if (result.status === "rejected") throw result.reason;
      const [graphql, native, deployment, accountHistory] = results.map(
        (result) =>
          (result as PromiseFulfilledResult<CapabilityAssessment<unknown>>)
            .value,
      ) as [
        CapabilityAssessment<WalletGraphQLDomainCapabilities>,
        CapabilityAssessment<WalletNativeServiceCapabilities>,
        CapabilityAssessment<WalletDeploymentCapabilities>,
        CapabilityAssessment<WalletAccountHistoryCapabilities>,
      ];
      // Child deadlines can finish their wrappers while an abort-ignoring fetch
      // or body cleanup still owns a physical lease. Such a run cannot clear admission.
      fetch.assertCompleted();
      return Object.freeze({
        state: "capabilities-assessed",
        bindingKey: session.bindingKey,
        readSessionKey: session.cacheKey,
        observedAt: Date.now(),
        identity: Object.freeze({ before, after }),
        graphql,
        native,
        deployment,
        accountHistory,
        scope: "configured-read-contracts",
        crossDomainSnapshot: "not-verified",
        serviceDeployment: "not-verified",
        readiness: "not-assessed",
        execution: "not-probed",
      });
    };
    try {
      return await cancellable(run(), signal);
    } finally {
      fetch.dispose();
    }
  });
}
