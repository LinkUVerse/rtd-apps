// Copyright (c) LinkU Labs, Inc.
// SPDX-License-Identifier: Apache-2.0
import type {
  WalletReadCapabilities,
  WalletGraphQLCapabilityDomain,
  WalletMoveCapabilityGroup,
} from "rtd-apps-core/src/rpc/capability-types";
import { probeNetworkCapabilities } from "./network-capabilities";
import {
  classifyNetworkAdmissionCapabilities,
  classifyNetworkAdmissionError,
} from "./network-admission-classification";
import {
  WalletNetworkAdmissionBlockedError,
  WalletNetworkAdmissionStateError,
  validateNetworkAdmissionRecord,
  type NetworkAdmissionArea,
  type NetworkAdmissionFault,
  type NetworkAdmissionTicket,
} from "./network-admission-state";
import { WalletNetworkAdmissionStore } from "./network-admission-store";
import { WalletCapabilityTransportError } from "./capability-fetch";
import { selectConfiguredDeployment } from "./release-deployment-config";
import {
  projectReadCapabilities,
  validatingReadCapabilities,
} from "./read-capability-view";
import { WalletReadSession, WalletReadBudgetError } from "./session";
import { CapabilityObservationLifetime } from "./capability-observation-lifetime";

export type ReadCapabilityObservationStore = Pick<
  WalletNetworkAdmissionStore,
  "capture" | "begin" | "complete"
> &
  Partial<
    Pick<WalletNetworkAdmissionStore, "finishFailed" | "beginRecoverable">
  >;
const domains = {
  balances: true,
  coinMetadata: true,
  staking: true,
  assets: true,
  names: true,
  sentTransactions: true,
  eventsByType: true,
  eventsByModule: true,
} as const satisfies Record<WalletGraphQLCapabilityDomain, true>;
const groups = {
  standardLibrary: true,
  readerSupport: true,
  coins: true,
  staking: true,
  dynamicFields: true,
  display: true,
  framework: true,
  kiosk: true,
  personalKiosk: true,
  originByteDiscovery: true,
  originByteExecution: true,
  names: true,
} as const satisfies Record<WalletMoveCapabilityGroup, true>;

function areas(session: WalletReadSession): NetworkAdmissionArea[] {
  const { endpoints } = session.profile;
  return [
    { kind: "identity", role: "fullnode" },
    ...(endpoints.graphqlUrl
      ? [{ kind: "identity", role: "graphql" } as const]
      : []),
    ...(endpoints.archiveGrpcWeb
      ? [{ kind: "identity", role: "archive" } as const]
      : []),
    ...(endpoints.accountHistoryUrl
      ? [{ kind: "identity", role: "accountHistory" } as const]
      : []),
    ...(endpoints.graphqlUrl
      ? Object.keys(domains).map((domain) => ({
          kind: "graphql-domain" as const,
          domain: domain as WalletGraphQLCapabilityDomain,
        }))
      : []),
    ...Object.keys(groups).map((group) => ({
      kind: "move-group" as const,
      group: group as WalletMoveCapabilityGroup,
    })),
  ];
}
function unavailableReason(error: unknown): "policy" | "budget" | "transport" {
  if (error instanceof WalletNetworkAdmissionBlockedError) return "policy";
  if (error instanceof WalletCapabilityTransportError)
    return error.reason === "unavailable" ? "transport" : error.reason;
  if (
    error instanceof WalletReadBudgetError ||
    (error instanceof WalletNetworkAdmissionStateError &&
      error.reason === "budget") ||
    (error instanceof DOMException && error.name === "TimeoutError")
  )
    return "budget";
  return "transport";
}

/** One owned observation. Never a transaction authority or a durable positive certificate. */
export async function observeReadCapabilities(
  session: WalletReadSession,
  options: {
    fetch?: typeof fetch;
    signal?: AbortSignal;
    timeoutMs?: number;
    /** Ordinary pages recover abandoned full observations; they do not start a diagnostic scan. */
    recoverOnly?: boolean;
  } = {},
  store: ReadCapabilityObservationStore = new WalletNetworkAdmissionStore(),
): Promise<WalletReadCapabilities> {
  // Retain only a detached public binding template; a known negative may close the session later.
  const base = validatingReadCapabilities(session);
  const timeoutMs = options.timeoutMs ?? 60000;
  if (!Number.isSafeInteger(timeoutMs) || timeoutMs < 1 || timeoutMs > 60000)
    throw new RangeError("能力观察总期限必须在1–60000ms");
  const signal = AbortSignal.any([
    session.signal,
    AbortSignal.timeout(timeoutMs),
    ...(options.signal ? [options.signal] : []),
  ]);
  const fence = () => {
    session.assertActive();
    signal.throwIfAborted();
  };
  let ticket: NetworkAdmissionTicket | undefined,
    lifetime: CapabilityObservationLifetime | undefined,
    attemptedCompletion = false,
    known: readonly NetworkAdmissionFault[] = [];
  const failureView = (error: unknown): WalletReadCapabilities => {
    const identity = known.find((fault) => fault.kind === "identity");
    return Object.freeze(
      identity?.kind === "identity"
        ? {
            ...base,
            phase: "quarantined",
            role: identity.role,
            reason: identity.reason,
          }
        : { ...base, phase: "unavailable", reason: unavailableReason(error) },
    );
  };
  try {
    // The async selection boundary precedes begin; StrictMode cleanup cannot orphan its first ticket.
    const before = validateNetworkAdmissionRecord(
      session.profile,
      await store.capture(session.profile),
    );
    known = before?.faults ?? [];
    if (known.some((fault) => fault.kind === "identity"))
      return failureView(new WalletNetworkAdmissionBlockedError("quarantined"));
    fence();
    // A missing pending ticket is not a capability certificate. Domain readers
    // still prove their own identity/coverage and check durable admission on
    // both sides of IO. Keep the full protocol for every retained observation.
    if (options.recoverOnly && !before?.pending.length)
      return failureView(new WalletNetworkAdmissionBlockedError("reviewing"));
    const release = await selectConfiguredDeployment(session.profile);
    fence();
    ticket = await (store.beginRecoverable
      ? store.beginRecoverable(session.profile, areas(session))
      : store.begin(session.profile, areas(session)));
    lifetime = new CapabilityObservationLifetime(session, ticket);
    fence();
    const report = await probeNetworkCapabilities(session, {
      fetch: options.fetch,
      signal,
      timeoutMs,
      lifetime,
      declaration: release.state === "reviewed" ? release.input : undefined,
    });
    // Classify before the next cancellation fence: confirmed failures cannot become an empty decision.
    known = classifyNetworkAdmissionCapabilities(session, report);
    let view = projectReadCapabilities(session, report);
    if (
      release.state === "rejected" &&
      view.phase === "read-contracts-assessed"
    )
      view = Object.freeze({
        ...view,
        deployment: Object.freeze({ state: "incomplete", reason: "policy" }),
      });
    fence();
    attemptedCompletion = true;
    await store.complete(session.profile, ticket, known);
    fence();
    const current = validateNetworkAdmissionRecord(
      session.profile,
      await store.capture(session.profile),
    );
    // A concurrent negative/pending record overrides this finite positive view.
    if (
      current?.pending.length ||
      current?.faults.some(
        (fault) =>
          !known.some(
            (observed) => JSON.stringify(observed) === JSON.stringify(fault),
          ),
      )
    ) {
      known = current?.faults ?? [];
      return failureView(new WalletNetworkAdmissionBlockedError("reviewing"));
    }
    fence();
    return view;
  } catch (error) {
    const definite = classifyNetworkAdmissionError(error);
    if (definite.length) known = Object.freeze([...known, ...definite]);
    if (ticket && known.length && !attemptedCompletion) {
      attemptedCompletion = true;
      try {
        await store.complete(session.profile, ticket, known);
      } catch {
        /* Keep the original pending/negative; never retry as an empty decision. */
      }
    }
    if (ticket && lifetime && !attemptedCompletion && store.finishFailed) {
      const ownedTicket = ticket;
      // Return the failure view promptly. The original owner stays pending until
      // all raw work and physical cleanup actually settle; no TTL or view reuse.
      void lifetime
        .fail(error)
        .then(async (receipt) => {
          if (attemptedCompletion) return;
          attemptedCompletion = true;
          await store.finishFailed!(session.profile, ownedTicket, receipt);
        })
        .catch(() => {
          /* Storage/owner failure retains the reservation. Never retry empty. */
        });
    }
    // Failure cleanup does not publish a capability report or authorize any action.
    return failureView(error);
  }
}
