// Copyright (c) LinkU Labs, Inc.
// SPDX-License-Identifier: Apache-2.0
import { WalletReadSession } from "./session";
import { transactionMoveDependencies } from "./transaction-move-dependencies";
import { WalletNetworkAdmissionStore } from "./network-admission-store";
import { selectConfiguredDeployment } from "./release-deployment-config";
import { probeDeploymentCapabilities } from "./deployment-capabilities";
import { WalletNativeReadWindowChangedError } from "./identity";
import {
  createCapabilityFetch,
  type WalletCapabilityFetch,
} from "./capability-fetch";
import { CapabilityObservationLifetime } from "./capability-observation-lifetime";
import { classifyNetworkAdmissionError } from "./network-admission-classification";
import { walletMoveContracts } from "./wallet-move-contracts";
import {
  validateNetworkAdmissionFault,
  WalletNetworkAdmissionBlockedError,
  type NetworkAdmissionFault,
  type NetworkAdmissionTicket,
  WalletNetworkAdmissionStateError,
} from "./network-admission-state";
import type { TransactionAdmissionStore } from "./transaction-network-identity";

export class TransactionMoveAdmissionError extends Error {
  constructor(
    readonly reason: "release-policy" | "contract-incomplete" | "package-pin",
  ) {
    super("批准交易的审核合约依赖未通过当前后台核验");
    this.name = "TransactionMoveAdmissionError";
  }
}
const admission = new WalletNetworkAdmissionStore();
const identityFailures = new WeakMap<WalletReadSession, Error>();

/** Activation belongs after the existing journal/pending read-only branch, before new simulation. */
export function createTransactionMoveAuthorizer(
  session: WalletReadSession,
  bytesBase64: string,
  sender: string,
  authorizeOwner: () => Promise<void>,
  options: Parameters<typeof assertTransactionMoveAdmission>[3] = {},
) {
  let active = false;
  let finalReady = false;
  const authorize = async () => {
    await authorizeOwner();
    if (!active) return;
    await assertTransactionMoveAdmission(session, bytesBase64, sender, options);
    // Permissions/profile/account changes while the package probe waited remain independent.
    await authorizeOwner();
    const targets = transactionMoveDependencies(
      session.profile,
      bytesBase64,
      sender,
    );
    await (options.admission ?? admission).assertClear(
      session.profile,
      targets.areas,
    );
    session.assertActive();
    options.signal?.throwIfAborted();
  };
  const runFinal = async <T>(start: () => Promise<T>): Promise<T> => {
    if (!finalReady) throw new WalletNetworkAdmissionStateError("stale");
    const store = options.admission ?? admission;
    if (!store.runIfClear)
      throw new WalletNetworkAdmissionStateError("unavailable");
    const targets = transactionMoveDependencies(
      session.profile,
      bytesBase64,
      sender,
    );
    return store.runIfClear(session.profile, targets.areas, () => {
      session.assertActive();
      options.signal?.throwIfAborted();
      return start();
    });
  };
  return Object.freeze({
    authorize,
    runFinal,
    activate: async () => {
      active = true;
      finalReady = false;
      await authorize();
      finalReady = true;
    },
  });
}

/** Negative fence plus fresh finite authored-target facts, never an execution certificate. */
export async function assertTransactionMoveAdmission(
  session: WalletReadSession,
  bytesBase64: string,
  sender: string,
  options: {
    fetch?: typeof fetch;
    signal?: AbortSignal;
    timeoutMs?: number;
    admission?: TransactionAdmissionStore &
      Partial<Pick<WalletNetworkAdmissionStore, "runIfClear">>;
  } = {},
) {
  session.assertActive();
  const latched = identityFailures.get(session);
  if (latched) throw latched;
  const dependencies = transactionMoveDependencies(
    session.profile,
    bytesBase64,
    sender,
  );
  const timeoutMs = options.timeoutMs ?? 30000;
  if (!Number.isSafeInteger(timeoutMs) || timeoutMs < 1 || timeoutMs > 60000)
    throw new RangeError("后台合约核验期限必须在1–60000ms");
  const signal = AbortSignal.any([
    session.signal,
    AbortSignal.timeout(timeoutMs),
    ...(options.signal ? [options.signal] : []),
  ]);
  const fence = () => {
    session.assertActive();
    signal.throwIfAborted();
  };
  const store = options.admission ?? admission;
  if (!store.beginRecoverable || !dependencies.groups.length)
    await store.assertClear(session.profile, dependencies.areas);
  fence();
  if (!dependencies.groups.length) {
    await store.assertClear(session.profile, dependencies.areas);
    fence();
    return Object.freeze({
      state: "native-or-opaque-only" as const,
      dependencies,
      deployment: "not-required" as const,
      executionSemantics: "not-verified" as const,
    });
  }
  const release = await selectConfiguredDeployment(session.profile);
  fence();
  if (release.state === "rejected")
    throw new TransactionMoveAdmissionError("release-policy");
  let ticket: NetworkAdmissionTicket | undefined,
    attemptedCompletion = false,
    physicallyCompleted = false;
  let known: readonly NetworkAdmissionFault[] = [];
  let lifetime: CapabilityObservationLifetime | undefined;
  let fetch: WalletCapabilityFetch | undefined;
  try {
    // The probe reads all authored groups, not just the transaction's target group.
    const areas = [
      { kind: "identity", role: "fullnode" },
      ...Object.keys(walletMoveContracts(session.profile)).map((group) => ({
        kind: "move-group" as const,
        group: group as (typeof dependencies.groups)[number],
      })),
    ] as const;
    ticket = await (store.beginRecoverable
      ? store.beginRecoverable(session.profile, areas)
      : store.begin(session.profile, areas));
    lifetime = new CapabilityObservationLifetime(session, ticket);
    fence();
    fetch = createCapabilityFetch(
      session,
      signal,
      options.fetch ?? globalThis.fetch,
      lifetime,
    );
    const completedFetch = fetch;
    const probe = () =>
      probeDeploymentCapabilities(session, {
        fetch,
        signal,
        timeoutMs,
        declaration: release.state === "reviewed" ? release.input : undefined,
      });
    const report = await probe().catch((error: unknown) => {
      if (!(error instanceof WalletNativeReadWindowChangedError)) throw error;
      // Discard the entire invalidated observation. Only fully ended read work
      // may restart once, under this same ticket and original total deadline.
      completedFetch.assertCompleted();
      fence();
      fetch = createCapabilityFetch(
        session,
        signal,
        options.fetch ?? globalThis.fetch,
        lifetime,
      );
      return probe();
    });
    if (
      report.bindingKey !== session.bindingKey ||
      report.readSessionKey !== session.cacheKey ||
      !report.move
    )
      throw new TransactionMoveAdmissionError("contract-incomplete");
    known = Object.freeze(
      Object.entries(report.move.groups).flatMap(([group, row]) =>
        row.state === "unsupported" && row.reason === "abi"
          ? [
              validateNetworkAdmissionFault({
                kind: "move-group",
                group,
                reason: "abi",
              }),
            ]
          : [],
      ),
    );
    fetch.assertCompleted();
    physicallyCompleted = true;
    fence();
    attemptedCompletion = true;
    await store.complete(session.profile, ticket, known);
    fence();
    await store.assertClear(session.profile, dependencies.areas);
    fence();
    if (
      dependencies.groups.some(
        (group) => report.move!.groups[group].state !== "abi-compatible",
      )
    )
      throw new TransactionMoveAdmissionError("contract-incomplete");
    if (release.state === "reviewed") {
      const catalog = walletMoveContracts(session.profile);
      const packageIds = new Set(
        dependencies.groups.flatMap((group) => {
          const contract = catalog[group];
          return contract.state === "configured"
            ? contract.contracts.map((p) => p.packageId)
            : [];
        }),
      );
      if (
        report.declaration.state !== "release-pin-matched" ||
        [...packageIds].some(
          (id) =>
            report.packages.find((p) => p.packageId === id)?.state !==
            "pin-matched",
        )
      )
        throw new TransactionMoveAdmissionError("package-pin");
    }
    return Object.freeze({
      state: "authored-target-contracts-checked" as const,
      dependencies,
      deployment:
        release.state === "reviewed"
          ? ("release-pin-matched" as const)
          : ("unreviewed" as const),
      executionSemantics: "not-verified" as const,
    });
  } catch (error) {
    const definite = classifyNetworkAdmissionError(error);
    if (definite.length) {
      known = definite;
      identityFailures.set(session, error as Error);
      session.close();
    }
    if (
      ticket &&
      known.length &&
      !attemptedCompletion &&
      (definite.length || physicallyCompleted)
    ) {
      attemptedCompletion = true;
      try {
        await store.complete(session.profile, ticket, known);
      } catch {
        /* Original pending remains; never retry with an empty decision. */
      }
    }
    if (
      known.some(
        (f) => f.kind === "move-group" && dependencies.groups.includes(f.group),
      )
    )
      throw new WalletNetworkAdmissionBlockedError("quarantined");
    if (ticket && lifetime && !attemptedCompletion && store.finishFailed) {
      const owned = ticket;
      void lifetime
        .fail(error)
        .then(async (receipt) => {
          if (attemptedCompletion) return;
          attemptedCompletion = true;
          await store.finishFailed!(session.profile, owned, receipt);
        })
        .catch(() => {
          // Keep original pending on ownership/strict storage failure.
        });
    }
    throw error;
  } finally {
    fetch?.dispose();
  }
}
