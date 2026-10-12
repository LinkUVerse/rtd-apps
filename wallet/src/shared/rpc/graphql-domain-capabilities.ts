// Copyright (c) LinkU Labs, Inc.
// SPDX-License-Identifier: Apache-2.0
import type { CapabilityObservationLifetime } from "./capability-observation-lifetime";
import { createReadDeadline } from "./read-deadline";
import { ASSET_COVERAGE } from "./asset-reader";
import { BALANCE_COVERAGE } from "./balance-reader";
import { COIN_METADATA_COVERAGE } from "./coin-metadata-reader";
import { NAME_COVERAGE } from "./name-reader";
import { STAKING_COVERAGE } from "./staking-snapshot-reader";
import {
  checkpointNumber,
  GraphQLSnapshot,
  SnapshotReadError,
  type CoverageDependency,
  type GraphQLSnapshotProof,
} from "./graphql-snapshot";
import {
  probeGraphQLSchemaCapabilities,
  type WalletSchemaCapabilities,
} from "./graphql-schema-capabilities";
import type { WalletGraphQLSchemaContract } from "./graphql-schema-contracts";
import { NetworkIdentityError } from "./identity";
import { WalletReadSession } from "./session";

interface DomainRequirements {
  readonly contracts: readonly WalletGraphQLSchemaContract[];
  readonly coverage: readonly CoverageDependency[];
}
const indexed = (
  field: "transactions" | "events",
  filter: string,
): readonly CoverageDependency[] =>
  Object.freeze([
    Object.freeze({ type: "Query", field: "checkpoints" }),
    Object.freeze({ type: "Query", field, filters: Object.freeze([filter]) }),
  ]);
const requirements: Readonly<Record<string, DomainRequirements>> = {
  balances: { contracts: ["snapshot", "balances"], coverage: BALANCE_COVERAGE },
  coinMetadata: {
    contracts: ["snapshot", "coinMetadata"],
    coverage: COIN_METADATA_COVERAGE,
  },
  staking: {
    contracts: [
      "snapshot",
      "stakingObjects",
      "stakingMultiGetObjects",
      "dynamicFields",
    ],
    coverage: STAKING_COVERAGE,
  },
  assets: {
    contracts: [
      "snapshot",
      "ownedObjects",
      "multiGetObjects",
      "dynamicFields",
      "displayHistory",
    ],
    coverage: ASSET_COVERAGE,
  },
  names: { contracts: ["snapshot", "dynamicFields"], coverage: NAME_COVERAGE },
  sentTransactions: {
    contracts: ["snapshot", "indexedTransactions"],
    coverage: indexed("transactions", "sentAddress"),
  },
  eventsByType: {
    contracts: ["snapshot", "indexedEvents"],
    coverage: indexed("events", "type"),
  },
  eventsByModule: {
    contracts: ["snapshot", "indexedEvents"],
    coverage: indexed("events", "module"),
  },
};
export type WalletGraphQLDomain =
  | "balances"
  | "coinMetadata"
  | "staking"
  | "assets"
  | "names"
  | "sentTransactions"
  | "eventsByType"
  | "eventsByModule";
export type WalletGraphQLDomainCapability = Readonly<
  | { state: "snapshot-verified"; proof: GraphQLSnapshotProof }
  | { state: "unconfigured"; reason: "endpoint" | "name-registry" }
  | { state: "unsupported"; reason: "schema" }
  | { state: "syncing"; reason: "coverage" }
  | { state: "incomplete"; reason: "response" | "partial" | "changed" }
  | { state: "unavailable"; reason: "transport" }
>;
export interface WalletGraphQLDomainCapabilities {
  readonly state:
    | "unconfigured"
    | "query-protocol-verified"
    | "query-protocol-degraded";
  readonly bindingKey: string;
  readonly readSessionKey: string;
  readonly observedAt: number;
  readonly schema: WalletSchemaCapabilities;
  readonly domains: Readonly<
    Record<WalletGraphQLDomain, WalletGraphQLDomainCapability>
  >;
}

/** End caller waiting on cancellation; leaf requests keep their lease until actual settlement. */
function cancellableRaw<T>(
  promise: Promise<T>,
  signal: AbortSignal,
): Promise<T> {
  return new Promise((resolve, reject) => {
    const abort = () => {
      signal.removeEventListener("abort", abort);
      reject(signal.reason);
    };
    signal.addEventListener("abort", abort, { once: true });
    promise.then(
      (value) => {
        signal.removeEventListener("abort", abort);
        if (signal.aborted) reject(signal.reason);
        else resolve(value);
      },
      (error) => {
        signal.removeEventListener("abort", abort);
        reject(error);
      },
    );
    if (signal.aborted) abort();
  });
}

/** Snapshot declarations, never business facts, signing inputs, cache publication or wallet readiness. */
export async function probeGraphQLDomainCapabilities(
  session: WalletReadSession,
  options: {
    fetch?: typeof fetch;
    lifetime?: CapabilityObservationLifetime;
    signal?: AbortSignal;
    timeoutMs?: number;
    minimumCheckpoint?: string;
  } = {},
): Promise<WalletGraphQLDomainCapabilities> {
  const cancellable = <T>(promise: Promise<T>, signal: AbortSignal) =>
    cancellableRaw(options.lifetime?.track(promise) ?? promise, signal);
  let disposeDeadline: (() => void) | undefined;
  return session
    .read(async (sessionSignal) => {
      const timeoutMs = options.timeoutMs ?? 30_000;
      if (
        !Number.isSafeInteger(timeoutMs) ||
        timeoutMs < 1 ||
        timeoutMs > 60_000
      )
        throw new RangeError("领域能力探测期限必须在1–60000ms");
      if (options.minimumCheckpoint !== undefined)
        checkpointNumber(options.minimumCheckpoint);
      const identityFailure = new AbortController();
      const deadline = createReadDeadline(timeoutMs);
      disposeDeadline = deadline.dispose;
      const signal = AbortSignal.any([
        sessionSignal,
        identityFailure.signal,
        deadline.signal,
        ...(options.signal ? [options.signal] : []),
      ]);
      signal.throwIfAborted();
      const schema = await cancellable(
        probeGraphQLSchemaCapabilities(session, {
          ...options,
          signal,
          timeoutMs,
        }),
        signal,
      );
      signal.throwIfAborted();
      session.assertActive();
      if (
        schema.bindingKey !== session.bindingKey ||
        schema.readSessionKey !== session.cacheKey
      )
        throw new NetworkIdentityError("graphql", "incompatible");
      const domains = Object.keys(requirements) as WalletGraphQLDomain[];
      const values = await cancellable(
        Promise.allSettled(
          domains
            .map(async (name): Promise<WalletGraphQLDomainCapability> => {
              if (schema.state === "unconfigured")
                return Object.freeze({
                  state: "unconfigured",
                  reason: "endpoint",
                });
              if (name === "names" && !session.profile.packages.name)
                return Object.freeze({
                  state: "unconfigured",
                  reason: "name-registry",
                });
              const domain = requirements[name];
              if (
                domain.contracts.some(
                  (contract) => schema.contracts[contract] !== "compatible",
                )
              ) {
                options.lifetime?.noteFault({
                  kind: "graphql-domain",
                  domain: name,
                  reason: "schema",
                });
                return Object.freeze({
                  state: "unsupported",
                  reason: "schema",
                });
              }
              const snapshot = await GraphQLSnapshot.open(
                session,
                domain.coverage,
                { ...options, signal, timeoutMs },
              );
              signal.throwIfAborted();
              session.assertActive();
              if (snapshot.proof.bindingKey !== session.bindingKey)
                throw new NetworkIdentityError("graphql", "incompatible");
              return Object.freeze({
                state: "snapshot-verified",
                proof: snapshot.proof,
              });
            })
            .map((work) =>
              work.catch((error) => {
                options.lifetime?.noteError(error);
                if (
                  error instanceof NetworkIdentityError &&
                  error.reason === "chain-mismatch"
                )
                  identityFailure.abort(error);
                throw error;
              }),
            ),
        ),
        signal,
      );
      signal.throwIfAborted();
      session.assertActive();
      // Known wrong chain outranks temporarily unavailable domains.
      for (const value of values)
        if (
          value.status === "rejected" &&
          value.reason instanceof NetworkIdentityError &&
          value.reason.reason === "chain-mismatch"
        )
          throw value.reason;
      for (const value of values)
        if (
          value.status === "rejected" &&
          value.reason instanceof NetworkIdentityError
        )
          throw value.reason;
      const result = Object.fromEntries(
        values.map((value, index) => {
          if (value.status === "fulfilled")
            return [domains[index], value.value];
          const error = value.reason;
          const failure: WalletGraphQLDomainCapability =
            error instanceof SnapshotReadError
              ? error.reason === "coverage"
                ? { state: "syncing", reason: "coverage" }
                : {
                    state: "incomplete",
                    reason:
                      error.reason === "partial" || error.reason === "changed"
                        ? error.reason
                        : "response",
                  }
              : { state: "unavailable", reason: "transport" };
          return [domains[index], Object.freeze(failure)];
        }),
      ) as Record<WalletGraphQLDomain, WalletGraphQLDomainCapability>;
      return Object.freeze({
        state:
          schema.state === "unconfigured"
            ? "unconfigured"
            : values.every(
                  (value) =>
                    value.status === "fulfilled" &&
                    value.value.state === "snapshot-verified",
                )
              ? "query-protocol-verified"
              : "query-protocol-degraded",
        bindingKey: session.bindingKey,
        readSessionKey: session.cacheKey,
        observedAt: Date.now(),
        schema,
        domains: Object.freeze(result),
      });
    })
    .finally(() => disposeDeadline?.());
}
