// Copyright (c) LinkU Labs, Inc.
// SPDX-License-Identifier: Apache-2.0
import {
  WALLET_READ_OPERATIONS,
  type WalletReadAdmissionView,
  type WalletReadOperation,
} from "rtd-apps-core/src/rpc/read-admission";
import type {
  WalletRpc,
  WalletAssetSnapshot,
} from "rtd-apps-core/src/rpc/WalletRpcContext";
import type {
  WalletGraphQLCapabilityDomain,
  WalletMoveCapabilityGroup,
} from "rtd-apps-core/src/rpc/capability-types";
import type { Query } from "@tanstack/react-query";
import { WalletNetworkAdmissionStore } from "./network-admission-store";
import {
  assertNetworkAdmissionClear,
  networkAdmissionAreaKey,
  validateNetworkAdmissionRecord,
  WalletNetworkAdmissionBlockedError,
  WalletNetworkAdmissionStateError,
  type NetworkAdmissionArea,
  type NetworkAdmissionFault,
  type NetworkAdmissionRecord,
} from "./network-admission-state";
import { WalletReadSession, StaleWalletSessionError } from "./session";

const domain = (name: WalletGraphQLCapabilityDomain): NetworkAdmissionArea =>
  Object.freeze({ kind: "graphql-domain", domain: name });
const group = (name: WalletMoveCapabilityGroup): NetworkAdmissionArea =>
  Object.freeze({ kind: "move-group", group: name });
const asset = [
  domain("assets"),
  group("display"),
  group("framework"),
  group("readerSupport"),
  group("standardLibrary"),
];
const stake = [
  domain("staking"),
  group("staking"),
  group("framework"),
  group("readerSupport"),
  group("standardLibrary"),
  group("dynamicFields"),
];
const dependencies: Readonly<
  Record<WalletReadOperation, readonly NetworkAdmissionArea[]>
> = Object.freeze({
  entry: [],
  balances: [domain("balances")],
  coinMetadata: [domain("coinMetadata")],
  staking: stake,
  assets: asset,
  assetBalances: [...asset, domain("balances")],
  assetCoinMetadata: [...asset, domain("coinMetadata")],
  assetCoins: [...asset, group("coins")],
  assetStaking: [
    ...new Map(
      [...asset, ...stake].map((area) => [networkAdmissionAreaKey(area), area]),
    ).values(),
  ],
  assetNativeKiosks: [
    ...asset,
    group("kiosk"),
    group("personalKiosk"),
    group("dynamicFields"),
  ],
  assetKiosks: [
    ...asset,
    group("kiosk"),
    group("personalKiosk"),
    group("originByteDiscovery"),
    group("dynamicFields"),
  ],
  assetDynamicFields: [...asset, group("dynamicFields")],
  names: [
    domain("names"),
    group("names"),
    group("standardLibrary"),
    group("framework"),
    group("readerSupport"),
    group("dynamicFields"),
  ],
  sentTransactions: [domain("sentTransactions")],
  eventsByType: [domain("eventsByType")],
  eventsByModule: [domain("eventsByModule")],
  history: [],
  receipts: [],
  historicalObjects: [],
  freshObject: [],
  freshCoins: [],
  freshBalance: [],
  prepare: [],
  simulate: [],
  recipient: [],
});
function applies(area: NetworkAdmissionArea, operation: WalletReadOperation) {
  return (
    area.kind === "identity" ||
    dependencies[operation].some(
      (target) =>
        networkAdmissionAreaKey(target) === networkAdmissionAreaKey(area),
    )
  );
}
export type ReadAdmissionStore = Pick<
  WalletNetworkAdmissionStore,
  "capture" | "subscribe"
>;
export interface ReadAdmissionSnapshot {
  readonly view: WalletReadAdmissionView;
  readonly identityFault?: Extract<NetworkAdmissionFault, { kind: "identity" }>;
}
/** Native negative fence for current reads. Ordinary reads do not fabricate observation tickets. */
export class WalletReadAdmission {
  readonly #listeners = new Set<() => void>();
  readonly #faults = new Map<string, NetworkAdmissionFault>();
  readonly #fingerprints = new Map<WalletReadOperation, string>();
  #snapshot!: ReadAdmissionSnapshot;
  #serial = 0;
  #generation = 0;
  #readSequence = 0;
  #disposed = false;
  #refresh?: Promise<void>;
  #row?: NetworkAdmissionRecord;
  #queuedCapture?: {
    generation: number;
    value: Promise<NetworkAdmissionRecord | undefined>;
  };
  constructor(
    readonly session: WalletReadSession,
    readonly store: ReadAdmissionStore = new WalletNetworkAdmissionStore(),
  ) {
    this.#set("checking");
  }
  getSnapshot = () => this.#snapshot;
  subscribe = (listener: () => void) => {
    this.#listeners.add(listener);
    return () => {
      this.#listeners.delete(listener);
    };
  };
  #set(phase: WalletReadAdmissionView["phase"], row?: NetworkAdmissionRecord) {
    if (this.#disposed) return;
    for (const fault of row?.faults ?? [])
      this.#faults.set(JSON.stringify(fault), fault);
    const identityFault = [...this.#faults.values()].find(
      (f): f is Extract<NetworkAdmissionFault, { kind: "identity" }> =>
        f.kind === "identity",
    );
    const blocked: WalletReadOperation[] = [],
      keys = {} as Record<WalletReadOperation, string>,
      reasons: Partial<
        Record<WalletReadOperation, "checking" | "blocked" | "unavailable">
      > = {};
    let changed = this.#snapshot?.view.phase !== phase;
    for (const operation of WALLET_READ_OPERATIONS) {
      const faults = [...this.#faults.values()]
        .filter((f) => applies(f, operation))
        .map((f) => JSON.stringify(f))
        .sort();
      const pending =
        row?.pending
          .filter((ticket) => ticket.areas.some((a) => applies(a, operation)))
          .map((ticket) => ticket.id)
          .sort() ?? [];
      const fingerprint = faults.length
        ? JSON.stringify(["fault", faults])
        : phase !== "observed"
          ? phase
          : pending.length
            ? JSON.stringify(["pending", pending])
            : "clear";
      if (fingerprint !== "clear") {
        blocked.push(operation);
        reasons[operation] = faults.length
          ? "blocked"
          : phase === "unavailable"
            ? "unavailable"
            : "checking";
      }
      if (this.#fingerprints.get(operation) !== fingerprint) {
        changed = true;
        this.#fingerprints.set(operation, fingerprint);
        keys[operation] = JSON.stringify([
          this.session.cacheKey,
          operation,
          ++this.#serial,
        ]);
      } else keys[operation] = this.#snapshot.view.keys[operation];
    }
    if (!changed) return;
    this.#snapshot = Object.freeze({
      view: Object.freeze({
        phase,
        blocked: Object.freeze(blocked),
        keys: Object.freeze(keys),
        reasons: Object.freeze(reasons),
      }),
      ...(identityFault ? { identityFault } : {}),
    });
    // Only definite identity faults close shared transports. Schema/ABI or pending leave independent reads alive.
    if (identityFault) this.session.close();
    for (const listener of [...this.#listeners]) listener();
  }
  #captureForLightweightRead() {
    if (this.#queuedCapture?.generation === this.#generation)
      return this.#queuedCapture.value;
    const queued = {
      generation: this.#generation,
      value: new Promise<void>((resolve) => setTimeout(resolve, 0)).then(() => {
        // Share only captures that have not started. In particular, a later
        // publication check must never inherit an in-flight pre-read capture.
        if (this.#queuedCapture === queued) this.#queuedCapture = undefined;
        if (this.#disposed) throw new StaleWalletSessionError();
        return this.store.capture(this.session.profile);
      }),
    };
    this.#queuedCapture = queued;
    return queued.value;
  }
  async #capture(lightweight = false) {
    if (this.#disposed) throw new StaleWalletSessionError();
    const generation = this.#generation,
      sequence = ++this.#readSequence;
    try {
      const row = validateNetworkAdmissionRecord(
        this.session.profile,
        await (lightweight
          ? this.#captureForLightweightRead()
          : this.store.capture(this.session.profile)),
      );
      if (this.#disposed) throw new StaleWalletSessionError();
      // A definite native negative is retained even if a newer capture/invalidation is in flight.
      if (row?.faults.length) {
        for (const fault of row.faults)
          this.#faults.set(JSON.stringify(fault), fault);
        this.#set(this.#snapshot.view.phase, this.#row);
      }
      if (generation !== this.#generation)
        throw new WalletNetworkAdmissionBlockedError("reviewing");
      if (sequence === this.#readSequence) {
        this.#row = row;
        this.#set("observed", row);
      }
      return row;
    } catch (error) {
      if (
        !this.#disposed &&
        generation === this.#generation &&
        sequence === this.#readSequence
      )
        this.#set("unavailable");
      throw error instanceof WalletNetworkAdmissionStateError ||
        error instanceof WalletNetworkAdmissionBlockedError ||
        error instanceof StaleWalletSessionError
        ? error
        : new WalletNetworkAdmissionStateError("unavailable");
    }
  }
  refresh = () => {
    if (this.#refresh) return this.#refresh;
    this.#refresh = this.#capture()
      .then(
        () => {},
        () => {},
      )
      .finally(() => {
        this.#refresh = undefined;
      });
    return this.#refresh;
  };
  invalidate = () => {
    if (this.#disposed) return;
    ++this.#generation;
    this.#set("checking");
    // Coalesce bursts. A capture started before invalidation cannot restore its old positive view.
    const waiting = this.refresh();
    void waiting.then(() => {
      if (!this.#disposed && this.#snapshot.view.phase === "checking")
        void this.refresh();
    });
  };
  start() {
    const unsubscribe = this.store.subscribe(this.invalidate);
    const timer = setInterval(() => {
      void this.refresh();
    }, 5_000);
    // Focus is not a durable invalidation. Reread it like the periodic check:
    // unchanged facts retain the admitted query key; any pending, fault or
    // storage failure still changes the view and retracts dependent data.
    // Explicit store notifications continue to invalidate synchronously.
    globalThis.addEventListener?.("focus", this.refresh);
    globalThis.document?.addEventListener("visibilitychange", this.refresh);
    void this.refresh();
    return () => {
      this.#disposed = true;
      ++this.#generation;
      unsubscribe();
      clearInterval(timer);
      globalThis.removeEventListener?.("focus", this.refresh);
      globalThis.document?.removeEventListener(
        "visibilitychange",
        this.refresh,
      );
      this.#listeners.clear();
    };
  }
  async check(operation: WalletReadOperation, signal?: AbortSignal) {
    if (
      this.#faults.size &&
      [...this.#faults.values()].some((f) => applies(f, operation))
    )
      throw new WalletNetworkAdmissionBlockedError("quarantined");
    this.session.assertActive();
    signal?.throwIfAborted();
    // Native IndexedDB callbacks otherwise separate concurrent portfolio reads
    // into different tasks before they can reach the shared GraphQL queue.
    // Authorization, preparation and other domains keep their original capture.
    const row = await this.#capture(
      operation === "balances" || operation === "coinMetadata",
    );
    assertNetworkAdmissionClear(
      this.session.profile,
      row,
      dependencies[operation],
    );
    if ([...this.#faults.values()].some((f) => applies(f, operation)))
      throw new WalletNetworkAdmissionBlockedError("quarantined");
    this.session.assertActive();
    signal?.throwIfAborted();
  }
  async run<T>(
    operation: WalletReadOperation,
    read: () => Promise<T>,
    signal?: AbortSignal,
  ): Promise<T> {
    await this.check(operation, signal);
    const value = await read();
    await this.check(operation, signal);
    return value;
  }
}

export function guardAssetSnapshot(
  reader: WalletAssetSnapshot,
  gate: WalletReadAdmission,
): WalletAssetSnapshot {
  return Object.freeze({
    proof: reader.proof,
    balances: (owner, signal) =>
      gate.run("assetBalances", () => reader.balances(owner, signal), signal),
    coinMetadata: (type, signal) =>
      gate.run(
        "assetCoinMetadata",
        () => reader.coinMetadata(type, signal),
        signal,
      ),
    ownedObjects: (owner, options) =>
      gate.run(
        "assets",
        () => reader.ownedObjects(owner, options),
        options?.signal,
      ),
    objects: (ids, signal) =>
      gate.run("assets", () => reader.objects(ids, signal), signal),
    coinObjects: (owner, type, signal) =>
      gate.run(
        "assetCoins",
        () => reader.coinObjects(owner, type, signal),
        signal,
      ),
    staking: (owner, signal) =>
      gate.run("assetStaking", () => reader.staking(owner, signal), signal),
    nativeKiosks: (owner, signal) =>
      gate.run(
        "assetNativeKiosks",
        () => reader.nativeKiosks(owner, signal),
        signal,
      ),
    kiosks: (owner, signal) =>
      gate.run("assetKiosks", () => reader.kiosks(owner, signal), signal),
    dynamicFields: (parent, signal) =>
      gate.run(
        "assetDynamicFields",
        () => reader.dynamicFields(parent, signal),
        signal,
      ),
    dynamicField: (parent, name, kind, signal) =>
      gate.run(
        "assetDynamicFields",
        () => reader.dynamicField(parent, name, kind, signal),
        signal,
      ),
  } satisfies WalletAssetSnapshot);
}
export function guardWalletRpc(
  rpc: WalletRpc,
  gate: WalletReadAdmission,
): WalletRpc {
  const view = gate.getSnapshot().view;
  return {
    ...rpc,
    readAdmission: view,
    hasFullnodeSession:
      rpc.hasFullnodeSession && !view.blocked.includes("freshObject"),
    probeEntryAccess: (signal) =>
      gate.run("entry", () => rpc.probeEntryAccess(signal), signal),
    readBalances: rpc.readBalances
      ? (owner, signal) =>
          gate.run("balances", () => rpc.readBalances!(owner, signal), signal)
      : undefined,
    readCoinMetadata: rpc.readCoinMetadata
      ? (type, signal) =>
          gate.run(
            "coinMetadata",
            () => rpc.readCoinMetadata!(type, signal),
            signal,
          )
      : undefined,
    readStakingView: rpc.readStakingView
      ? (owner, signal) =>
          gate.run("staking", () => rpc.readStakingView!(owner, signal), signal)
      : undefined,
    readSentTransactions: rpc.readSentTransactions
      ? (sender, options) =>
          gate.run(
            "sentTransactions",
            () => rpc.readSentTransactions!(sender, options),
            options.signal,
          )
      : undefined,
    readIndexedEvents: rpc.readIndexedEvents
      ? (filter, options) =>
          gate.run(
            filter.type ? "eventsByType" : "eventsByModule",
            () => rpc.readIndexedEvents!(filter, options),
            options.signal,
          )
      : undefined,
    resolveRecipientName: (name, signal) =>
      gate.run("names", () => rpc.resolveRecipientName(name, signal), signal),
    readDefaultName: (owner, signal) =>
      gate.run("names", () => rpc.readDefaultName(owner, signal), signal),
    readAccountHistory: (owner, signal, page) =>
      gate.run("history", () => rpc.readAccountHistory(owner, signal, page), signal),
    readTransactionDetails: (digest, signal) =>
      gate.run(
        "receipts",
        () => rpc.readTransactionDetails(digest, signal),
        signal,
      ),
    readHistoricalObjects: rpc.readHistoricalObjects
      ? (selectors, signal) =>
          gate.run(
            "historicalObjects",
            () => rpc.readHistoricalObjects!(selectors, signal),
            signal,
          )
      : undefined,
    readFreshObject: (id, signal) =>
      gate.run("freshObject", () => rpc.readFreshObject(id, signal), signal),
    readFreshCoins: (owner, type, signal) =>
      gate.run(
        "freshCoins",
        () => rpc.readFreshCoins(owner, type, signal),
        signal,
      ),
    readFreshBalance: (owner, type, signal) =>
      gate.run(
        "freshBalance",
        () => rpc.readFreshBalance(owner, type, signal),
        signal,
      ),
    readFreshBalances: (owner, signal) =>
      gate.run(
        "freshBalance",
        () => rpc.readFreshBalances(owner, signal),
        signal,
      ),
    prepareTransaction: (tx, owner, signal) =>
      gate.run(
        "prepare",
        () => rpc.prepareTransaction(tx, owner, signal),
        signal,
      ),
    simulateTransaction: (bytes, owner, signal) =>
      gate.run(
        "simulate",
        () => rpc.simulateTransaction(bytes, owner, signal),
        signal,
      ),
    openAssetSnapshot: (signal) =>
      gate.run(
        "assets",
        async () =>
          guardAssetSnapshot(await rpc.openAssetSnapshot(signal), gate),
        signal,
      ),
    refreshAssets: () => gate.run("assets", () => rpc.refreshAssets()),
  };
}

const queryOperations: Readonly<Record<string, WalletReadOperation>> =
  Object.freeze({
    "wallet-snapshot-admission": "assets",
    "wallet-assets": "assets",
    "wallet-balances": "balances",
    "wallet-current-balances": "freshBalance",
    "wallet-coin-metadata": "coinMetadata",
    "wallet-staking": "staking",
    "wallet-default-name": "names",
    "wallet-account-history": "history",
    "wallet-transaction-details": "receipts",
    "wallet-indexed-transactions": "sentTransactions",
    "wallet-fresh-coins": "freshCoins",
    "wallet-fresh-balance": "freshBalance",
    "wallet-recipient-inspection": "recipient",
    "wallet-entry-access": "entry",
    "wallet-receipt-indexing": "assets",
    "wallet-transaction-preview": "prepare",
  });
/** Exact session/binding only. Unknown wallet caches are withdrawn only by global negatives. */
export function admissionQueryAffected(
  query: Pick<Query, "queryKey" | "meta">,
  gate: WalletReadAdmission,
  all = false,
) {
  const [prefix, binding, session] = query.queryKey;
  if (
    typeof prefix !== "string" ||
    !prefix.startsWith("wallet-") ||
    binding !== gate.session.bindingKey
  )
    return false;
  if (session !== gate.session.cacheKey) {
    // A background preview does not belong to this frontend session. Temporary observation
    // pending/checking must not cancel the very background observer holding its ticket.
    if (
      prefix !== "wallet-transaction-preview" ||
      session !== null ||
      all ||
      !gate.getSnapshot().identityFault
    )
      return false;
  }
  if (all) return true;
  const tagged = query.meta?.walletReadOperation;
  const operation =
    typeof tagged === "string" &&
    WALLET_READ_OPERATIONS.includes(tagged as WalletReadOperation)
      ? (tagged as WalletReadOperation)
      : queryOperations[prefix];
  if (prefix === "wallet-indexed-events" && !operation)
    return (
      gate.getSnapshot().view.blocked.includes("eventsByType") ||
      gate.getSnapshot().view.blocked.includes("eventsByModule")
    );
  return gate.getSnapshot().view.blocked.includes(operation ?? "freshObject");
}
