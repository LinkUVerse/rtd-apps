// Copyright (c) LinkU Labs, Inc.
// SPDX-License-Identifier: Apache-2.0
import { RpcError } from "rtd-typescript/grpc";
import {
  NetworkIdentityError,
  probeNetworkIdentity,
  type NetworkIdentityReport,
} from "./identity";
import { WalletReadSession } from "./session";
import { WalletNetworkObservations } from "./network-observations";
import { WalletNetworkAdmissionStore } from "./network-admission-store";
import { classifyNetworkAdmissionError } from "./network-admission-classification";
import { CapabilityObservationLifetime } from "./capability-observation-lifetime";
import {
  createCapabilityFetch,
  type WalletCapabilityFetch,
} from "./capability-fetch";
import {
  WalletNetworkAdmissionBlockedError,
  WalletNetworkAdmissionStateError,
  type NetworkAdmissionTicket,
} from "./network-admission-state";
import {
  TransactionNetworkResetError,
  WalletNetworkObservationError,
  type NetworkObservationStore,
} from "./network-observation-state";
export { TransactionNetworkResetError } from "./network-observation-state";
const persistentObservations = new WalletNetworkObservations();
const persistentAdmission = new WalletNetworkAdmissionStore();
export type TransactionAdmissionStore = Pick<
  WalletNetworkAdmissionStore,
  "assertClear" | "begin" | "complete"
> &
  Partial<
    Pick<WalletNetworkAdmissionStore, "beginRecoverable" | "finishFailed">
  >;
interface OperationIdentity {
  failure?: Error;
}
// Known incompatible identities remain fenced locally; native watermarks/reset survive other operations.
const operations = new WeakMap<WalletReadSession, OperationIdentity>();
export interface TransactionNetworkIdentity {
  readonly state: "identity-verified" | "identity-degraded";
  readonly report: NetworkIdentityReport;
}
/** Fresh read-only native identities at every transaction authorization boundary, not capabilities. */
export async function assertTransactionNetworkIdentity(
  session: WalletReadSession,
  options: NonNullable<Parameters<typeof probeNetworkIdentity>[1]> & {
    observations?: NetworkObservationStore;
    admission?: TransactionAdmissionStore;
  } = {},
): Promise<TransactionNetworkIdentity> {
  session.assertActive();
  options.signal?.throwIfAborted();
  let operation = operations.get(session);
  if (!operation) {
    operation = {};
    operations.set(session, operation);
  }
  if (operation.failure) throw operation.failure;
  const admission = options.admission ?? persistentAdmission;
  let ticket: NetworkAdmissionTicket | undefined;
  let lifetime: CapabilityObservationLifetime | undefined;
  let trackedFetch: WalletCapabilityFetch | undefined;
  let probeStarted = false;
  let probeReturned = false;
  let completionAttempted = false;
  const configured = new Set([
    "fullnode",
    ...(session.profile.endpoints.graphqlUrl ? ["graphql"] : []),
    ...(session.profile.endpoints.archiveGrpcWeb ? ["archive"] : []),
  ]);
  try {
    // Any persisted identity fault/pending applies, including accountHistory.
    // This probe still observes only its own three native identity roles.
    // A marked lost read owner is adopted atomically by beginRecoverable.
    // An early generic clear check would reject that original reservation first.
    if (!admission.beginRecoverable)
      await admission.assertClear(session.profile);
    session.assertActive();
    const observations = options.observations ?? persistentObservations;
    const before = await observations.capture(session.profile);
    session.assertActive();
    options.signal?.throwIfAborted();
    const areas = (["fullnode", "graphql", "archive"] as const)
      .filter((role) => configured.has(role))
      .map((role) => ({ kind: "identity" as const, role }));
    ticket = await (admission.beginRecoverable
      ? admission.beginRecoverable(session.profile, areas)
      : admission.begin(session.profile, areas));
    lifetime = new CapabilityObservationLifetime(session, ticket);
    session.assertActive();
    options.signal?.throwIfAborted();
    trackedFetch = createCapabilityFetch(
      session,
      AbortSignal.any([
        session.signal,
        ...(options.signal ? [options.signal] : []),
      ]),
      options.fetch ?? globalThis.fetch,
      lifetime,
    );
    probeStarted = true;
    const report = await probeNetworkIdentity(session, {
      ...options,
      fetch: trackedFetch,
      lifetime,
    });
    trackedFetch.assertCompleted();
    probeReturned = true;
    session.assertActive();
    if (operation.failure) throw operation.failure;
    if (
      report.bindingKey !== session.bindingKey ||
      report.endpoints.length !== 3 ||
      new Set(report.endpoints.map((e) => e.role)).size !== 3
    )
      throw new NetworkIdentityError("fullnode", "incompatible");
    const fullnode = report.endpoints.find((e) => e.role === "fullnode");
    if (fullnode?.state !== "verified")
      throw new RpcError("Fullnode尚未通过同链身份校验", "UNAVAILABLE");
    for (const endpoint of report.endpoints) {
      if (endpoint.state !== "verified") continue;
      if (endpoint.genesisDigest !== session.profile.expectedGenesisDigest)
        throw new NetworkIdentityError(endpoint.role, "chain-mismatch");
      if (endpoint.role === "graphql") continue;
      const height = endpoint.checkpointHeight;
      if (
        typeof height !== "bigint" ||
        height < 0n ||
        height > 0xffffffffffffffffn
      )
        throw new NetworkIdentityError(endpoint.role, "incompatible");
    }
    // The store rechecks concurrent updates and commits quarantine/positive facts before authorization.
    await observations.observe(session.profile, before, report);
    session.assertActive();
    completionAttempted = true;
    await admission.complete(session.profile, ticket, []);
    ticket = undefined;
    await admission.assertClear(session.profile);
    session.assertActive();
    options.signal?.throwIfAborted();
    if (operation.failure) throw operation.failure;
    return Object.freeze({
      state: report.endpoints.some(
        (e) => configured.has(e.role) && e.state !== "verified",
      )
        ? "identity-degraded"
        : "identity-verified",
      report,
    });
  } catch (error) {
    if (
      error instanceof NetworkIdentityError ||
      error instanceof TransactionNetworkResetError ||
      (error instanceof WalletNetworkObservationError &&
        error.reason === "corrupt") ||
      (error instanceof WalletNetworkAdmissionStateError &&
        error.reason === "corrupt") ||
      (error instanceof WalletNetworkAdmissionBlockedError &&
        error.reason === "quarantined")
    )
      operation.failure = error;
    const faults = classifyNetworkAdmissionError(error);
    if (
      ticket &&
      !completionAttempted &&
      (faults.length ||
        (!admission.finishFailed && (!probeStarted || probeReturned)))
    ) {
      // Persist a known negative even if the session closed while waiting.
      // A cancelled/failed probe can return before its leaves settle: without
      // a definite fault, keep its pending rather than invent a completion.
      completionAttempted = true;
      await admission.complete(session.profile, ticket, faults);
    }
    if (ticket && lifetime && !completionAttempted && admission.finishFailed) {
      const owned = ticket;
      // A caller stops promptly; physical fetch/body/cancel work retains the
      // original owner until a process-local terminal receipt proves settlement.
      void lifetime
        .fail(error)
        .then(async (receipt) => {
          if (completionAttempted) return;
          completionAttempted = true;
          await admission.finishFailed!(session.profile, owned, receipt);
        })
        .catch(() => {
          // Retain pending on storage/ownership failure; never retry an empty decision.
        });
    }
    session.assertActive();
    throw error;
  } finally {
    trackedFetch?.dispose();
  }
}
