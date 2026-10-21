// Copyright (c) LinkU Labs, Inc.
// SPDX-License-Identifier: Apache-2.0
import {
  assertNetworkAdmissionClear,
  completeNetworkAdmissionObservation,
  createNetworkAdmissionTicket,
  reserveNetworkAdmissionObservation,
  validateNetworkAdmissionRecord,
  WalletNetworkAdmissionBlockedError,
  WalletNetworkAdmissionStateError,
  type NetworkAdmissionArea,
  type NetworkAdmissionFault,
  type NetworkAdmissionRecord,
  type NetworkAdmissionTicket,
} from "./network-admission-state";
import {
  networkBindingKey,
  validateNetworkProfile,
  type ValidatedNetworkProfile,
} from "./profile";
import {
  consumeCapabilityTerminalFailure,
  type CapabilityTerminalFailure,
} from "./capability-observation-lifetime";
import {
  notifyNetworkAdmission,
  subscribeNetworkAdmission,
} from "./network-admission-notifications";

import {
  NETWORK_ADMISSION_DATABASE as DATABASE,
  openAdmissionDatabase,
  validateAdmissionDatabaseName,
} from "./network-admission-database";
import {
  acquireCapabilityOwnerLock,
  type CapabilityOwnerLock,
} from "./capability-owner-lock";
const STORE = "admission-v1";
const OWNER_STORE = "capability-owner-v1";
type OwnerMarker = Readonly<{
  schemaVersion: 1;
  id: string;
  bindingKey: string;
  areas: readonly NetworkAdmissionArea[];
  incarnation: string;
}>;
type Owner = {
  bindingKey: string;
  decision?: readonly NetworkAdmissionFault[];
  completing: boolean;
  managed?: {
    lock: CapabilityOwnerLock;
    marker: OwnerMarker;
    adopted: boolean;
  };
};
function ownerMarker(
  value: unknown,
  profile: ValidatedNetworkProfile,
  ticket: NetworkAdmissionTicket,
): OwnerMarker | undefined {
  if (value === undefined) return;
  if (
    !value ||
    typeof value !== "object" ||
    Array.isArray(value) ||
    Object.getOwnPropertySymbols(value).length ||
    Object.getOwnPropertyNames(value).sort().join() !==
      "areas,bindingKey,id,incarnation,schemaVersion"
  )
    throw new WalletNetworkAdmissionStateError("corrupt");
  const row = value as OwnerMarker;
  if (
    row.schemaVersion !== 1 ||
    row.id !== ticket.id ||
    row.bindingKey !== networkBindingKey(profile) ||
    JSON.stringify(row.areas) !== JSON.stringify(ticket.areas) ||
    typeof row.incarnation !== "string" ||
    !/^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/.test(
      row.incarnation,
    )
  )
    throw new WalletNetworkAdmissionStateError("corrupt");
  return Object.freeze({
    schemaVersion: 1,
    id: ticket.id,
    bindingKey: row.bindingKey,
    areas: ticket.areas,
    incarnation: row.incarnation,
  });
}
function assertMarker(
  current: unknown,
  profile: ValidatedNetworkProfile,
  ticket: NetworkAdmissionTicket,
  expected: OwnerMarker,
) {
  if (
    JSON.stringify(ownerMarker(current, profile, ticket)) !==
    JSON.stringify(expected)
  )
    throw new WalletNetworkAdmissionStateError("stale");
}
function failure(error?: unknown) {
  return error instanceof WalletNetworkAdmissionStateError ||
    error instanceof WalletNetworkAdmissionBlockedError
    ? error
    : new WalletNetworkAdmissionStateError("unavailable");
}

/** Independent negative-admission storage. A successful read/completion is not authorization. */
export class WalletNetworkAdmissionStore {
  readonly #factory: IDBFactory | undefined;
  readonly #database: string;
  readonly #timeout: number;
  readonly #owners = new WeakMap<NetworkAdmissionTicket, Owner>();
  /**
   * One open handle per session.
   *
   * Every admission check used to open and close its own connection, so a single
   * Activity page issued roughly twenty opens against a five-second deadline.
   * Each open re-runs the upgrade checks, and one miss under a busy main thread
   * was enough to mark the whole session unavailable — the "网络校验记录暂不可用"
   * users saw. The handle is still validated on first open and re-opened after a
   * version change or close; only the repeated open/close per read goes away.
   */
  #connection: Promise<IDBDatabase> | undefined;
  constructor(
    options: {
      indexedDB?: IDBFactory;
      databaseName?: string;
      timeoutMs?: number;
    } = {},
  ) {
    this.#factory = options.indexedDB ?? globalThis.indexedDB;
    this.#database = options.databaseName ?? DATABASE;
    this.#timeout = options.timeoutMs ?? 5_000;
    if (
      !Number.isSafeInteger(this.#timeout) ||
      this.#timeout < 1 ||
      this.#timeout > 5_000
    )
      throw new RangeError("网络准入存储期限必须在1–5000ms");
    validateAdmissionDatabaseName(this.#database);
  }
  #remaining(deadline: number) {
    return deadline - performance.now();
  }
  async #open(deadline: number): Promise<IDBDatabase> {
    const cached = this.#connection;
    if (cached) {
      try {
        const db = await cached;
        if (this.#remaining(deadline) > 0) return db;
        // Out of budget: fall back to a fresh open, which reports the deadline.
      } catch {
        this.#connection = undefined;
      }
    }
    const opening = openAdmissionDatabase(
      this.#factory,
      this.#database,
      deadline,
    );
    this.#connection = opening;
    let db: IDBDatabase;
    try {
      db = await opening;
    } catch (error) {
      // Never cache a failed open: the next read is allowed to try again.
      if (this.#connection === opening) this.#connection = undefined;
      throw error;
    }
    db.addEventListener("close", () => {
      if (this.#connection === opening) this.#connection = undefined;
    });
    db.onversionchange = () => {
      db.close();
      if (this.#connection === opening) this.#connection = undefined;
    };
    return db;
  }
  async #transaction<T>(
    profile: ValidatedNetworkProfile,
    mode: "readonly" | "readwrite",
    transform: (
      current: unknown,
      marker?: unknown,
    ) => {
      result: T;
      write?: NetworkAdmissionRecord;
      ownerWrite?: OwnerMarker;
      ownerDelete?: boolean;
    },
    ownedTicket?: NetworkAdmissionTicket,
  ): Promise<T> {
    const deadline = performance.now() + this.#timeout;
    const db = await this.#open(deadline);
    if (this.#remaining(deadline) <= 0) throw failure();
    return new Promise((resolve, reject) => {
      let tx: IDBTransaction | undefined;
      let settled = false;
      let filled = false;
      let result: T;
      // The connection is shared across reads in this session; only the timer
      // belongs to this transaction.
      const close = () => clearTimeout(timer);
      const fail = (error?: unknown) => {
        if (settled) return;
        settled = true;
        try {
          tx?.abort();
        } catch {
          // A native completion may have already happened; never publish it late.
        }
        close();
        reject(failure(error));
      };
      const timer = setTimeout(() => fail(), this.#remaining(deadline));
      try {
        tx = db.transaction(
          ownedTicket ? [STORE, OWNER_STORE] : STORE,
          mode,
          mode === "readwrite" ? { durability: "strict" } : undefined,
        );
        tx.onerror = () => fail();
        tx.onabort = () => fail();
        tx.oncomplete = () => {
          if (settled) return;
          if (!filled || this.#remaining(deadline) <= 0) {
            fail();
            return;
          }
          settled = true;
          close();
          resolve(result);
        };
        if (mode === "readwrite" && tx.durability !== "strict") {
          fail();
          return;
        }
        const store = tx.objectStore(STORE);
        if (
          store.keyPath !== "bindingKey" ||
          store.autoIncrement ||
          store.indexNames.length
        ) {
          fail(new WalletNetworkAdmissionStateError("corrupt"));
          return;
        }
        const request = store.get(networkBindingKey(profile));
        request.onerror = () => fail();
        const accept = (current: unknown, marker?: unknown) => {
          if (settled) return;
          if (this.#remaining(deadline) <= 0) {
            fail();
            return;
          }
          try {
            const next = transform(current, marker);
            if (next.write) store.put(next.write).onerror = () => fail();
            if (next.ownerWrite)
              tx!.objectStore(OWNER_STORE).put(next.ownerWrite).onerror = () =>
                fail();
            if (next.ownerDelete)
              tx!.objectStore(OWNER_STORE).delete(ownedTicket!.id).onerror =
                () => fail();
            result = next.result;
            filled = true;
          } catch (error) {
            fail(error);
          }
        };
        request.onsuccess = () => {
          if (!ownedTicket) return accept(request.result);
          if (settled) return;
          const marker = tx!.objectStore(OWNER_STORE).get(ownedTicket.id);
          marker.onerror = () => fail();
          marker.onsuccess = () => accept(request.result, marker.result);
        };
      } catch (error) {
        fail(error);
      }
    });
  }
  capture(profile: ValidatedNetworkProfile) {
    const p = validateNetworkProfile(profile);
    return this.#transaction(p, "readonly", (current) => ({
      result: validateNetworkAdmissionRecord(p, current),
    }));
  }
  subscribe(listener: () => void) {
    return subscribeNetworkAdmission(this.#database, listener);
  }
  assertClear(
    profile: ValidatedNetworkProfile,
    targets: readonly NetworkAdmissionArea[] = [],
  ): Promise<void> {
    const p = validateNetworkProfile(profile);
    // Validate/copy before asynchronous IO; the synthetic record is never written.
    const selected = targets.length
      ? createNetworkAdmissionTicket(targets).areas
      : Object.freeze([]);
    return this.#transaction(p, "readonly", (current) => ({
      result: assertNetworkAdmissionClear(p, current, selected),
    }));
  }
  /** Start once inside the native read event; async work never holds an IDB transaction. */
  async runIfClear<T>(
    profile: ValidatedNetworkProfile,
    targets: readonly NetworkAdmissionArea[],
    start: () => Promise<T>,
  ): Promise<T> {
    const p = validateNetworkProfile(profile);
    const selected = targets.length
      ? createNetworkAdmissionTicket(targets).areas
      : Object.freeze([]);
    const { action } = await this.#transaction(p, "readonly", (current) => {
      assertNetworkAdmissionClear(p, current, selected);
      let action: Promise<T>;
      try {
        // No await between the committed row check and the actual action invocation.
        action = Promise.resolve(start());
      } catch (error) {
        action = Promise.reject(error);
      }
      // A storage failure can discard the started action; consume its rejection immediately.
      void action.catch(() => undefined);
      return { result: { action } };
    });
    return action;
  }
  async begin(
    profile: ValidatedNetworkProfile,
    targets: readonly NetworkAdmissionArea[],
  ): Promise<NetworkAdmissionTicket> {
    const p = validateNetworkProfile(profile);
    const ticket = createNetworkAdmissionTicket(targets);
    await this.#transaction(p, "readwrite", (current) => ({
      result: undefined,
      write: reserveNetworkAdmissionObservation(p, current, ticket),
    }));
    this.#owners.set(ticket, {
      bindingKey: networkBindingKey(p),
      completing: false,
    });
    notifyNetworkAdmission(this.#database);
    return ticket;
  }
  /** Read observations only. Adopt a marked original ticket while holding its native owner lock; never clear it to start IO. */
  async beginRecoverable(
    profile: ValidatedNetworkProfile,
    targets: readonly NetworkAdmissionArea[],
  ): Promise<NetworkAdmissionTicket> {
    const p = validateNetworkProfile(profile),
      fresh = createNetworkAdmissionTicket(targets),
      before = await this.capture(p);
    for (const candidate of before?.pending ?? []) {
      if (JSON.stringify(candidate.areas) !== JSON.stringify(fresh.areas))
        continue;
      const lock = await acquireCapabilityOwnerLock(
        this.#database,
        candidate.id,
      );
      if (!lock) continue;
      try {
        const result = await this.#transaction(
          p,
          "readwrite",
          (current, marker) => {
            lock.assertActive();
            const row = validateNetworkAdmissionRecord(p, current),
              existing = ownerMarker(marker, p, candidate);
            if (!existing) return { result: undefined };
            if (
              !row ||
              JSON.stringify(row.pending.find((t) => t.id === candidate.id)) !==
                JSON.stringify(candidate)
            )
              throw new WalletNetworkAdmissionStateError("stale");
            // Other pending and all negatives retain the existing admission policy.
            assertNetworkAdmissionClear(
              p,
              {
                ...row,
                pending: row.pending.filter((t) => t.id !== candidate.id),
              },
              candidate.areas,
            );
            const next = Object.freeze({
              ...existing,
              incarnation: crypto.randomUUID(),
            });
            return { result: next, ownerWrite: next };
          },
          candidate,
        );
        if (!result) {
          lock.release();
          continue;
        }
        this.#owners.set(candidate, {
          bindingKey: networkBindingKey(p),
          completing: false,
          managed: { lock, marker: result, adopted: true },
        });
        return candidate;
      } catch (error) {
        lock.release();
        throw error;
      }
    }
    const lock = await acquireCapabilityOwnerLock(this.#database, fresh.id);
    if (!lock) throw new WalletNetworkAdmissionStateError("unavailable");
    const marker: OwnerMarker = Object.freeze({
      schemaVersion: 1,
      id: fresh.id,
      bindingKey: networkBindingKey(p),
      areas: fresh.areas,
      incarnation: crypto.randomUUID(),
    });
    try {
      await this.#transaction(
        p,
        "readwrite",
        (current, existing) => {
          lock.assertActive();
          if (existing !== undefined)
            throw new WalletNetworkAdmissionStateError("stale");
          return {
            result: undefined,
            write: reserveNetworkAdmissionObservation(p, current, fresh),
            ownerWrite: marker,
          };
        },
        fresh,
      );
      this.#owners.set(fresh, {
        bindingKey: networkBindingKey(p),
        completing: false,
        managed: { lock, marker, adopted: false },
      });
      notifyNetworkAdmission(this.#database);
      return fresh;
    } catch (error) {
      lock.release();
      throw error;
    }
  }
  async complete(
    profile: ValidatedNetworkProfile,
    ticket: NetworkAdmissionTicket,
    faults: readonly NetworkAdmissionFault[],
  ): Promise<NetworkAdmissionRecord> {
    const p = validateNetworkProfile(profile);
    const owner = this.#owners.get(ticket);
    if (!owner || owner.bindingKey !== networkBindingKey(p) || owner.completing)
      throw new WalletNetworkAdmissionStateError("stale");
    // Validate and detach the first decision before any storage IO. A failed
    // negative completion can never be retried as an ordinary positive result.
    const decision = completeNetworkAdmissionObservation(
      p,
      {
        schemaVersion: 1,
        bindingKey: owner.bindingKey,
        faults: [],
        pending: [ticket],
      },
      ticket,
      faults,
    ).faults;
    if (
      owner.decision &&
      JSON.stringify(owner.decision) !== JSON.stringify(decision)
    )
      throw new WalletNetworkAdmissionStateError("stale");
    owner.decision ??= decision;
    owner.completing = true;
    try {
      const result = await this.#transaction(
        p,
        "readwrite",
        (current, marker) => {
          if (owner.managed) {
            owner.managed.lock.assertActive();
            assertMarker(marker, p, ticket, owner.managed.marker);
          }
          const next = completeNetworkAdmissionObservation(
            p,
            current,
            ticket,
            owner.decision!,
          );
          return { result: next, write: next, ownerDelete: !!owner.managed };
        },
        owner.managed ? ticket : undefined,
      );
      this.#owners.delete(ticket);
      owner.managed?.lock.release();
      notifyNetworkAdmission(this.#database);
      return result;
    } finally {
      owner.completing = false;
    }
  }
  /** A failed observation releases only its own settled reservation, never a positive proof. */
  async finishFailed(
    profile: ValidatedNetworkProfile,
    ticket: NetworkAdmissionTicket,
    receipt: CapabilityTerminalFailure,
  ): Promise<NetworkAdmissionRecord> {
    const p = validateNetworkProfile(profile),
      owner = this.#owners.get(ticket);
    if (
      !owner ||
      owner.bindingKey !== networkBindingKey(p) ||
      owner.completing ||
      owner.decision
    )
      throw new WalletNetworkAdmissionStateError("stale");
    const faults = consumeCapabilityTerminalFailure(
      receipt,
      owner.bindingKey,
      ticket,
    );
    if (owner.managed?.adopted && !faults.length) {
      // A transient failure of the successor is no evidence about the lost original observation.
      // After all successor raw work ended, leave its original reservation durable for a fresh attempt.
      const managed = owner.managed;
      const row = await this.#transaction(
        p,
        "readonly",
        (current, marker) => {
          managed.lock.assertActive();
          assertMarker(marker, p, ticket, managed.marker);
          const value = validateNetworkAdmissionRecord(p, current);
          if (
            !value ||
            JSON.stringify(value.pending.find((t) => t.id === ticket.id)) !==
              JSON.stringify(ticket)
          )
            throw new WalletNetworkAdmissionStateError("stale");
          return { result: value };
        },
        ticket,
      );
      this.#owners.delete(ticket);
      managed.lock.release();
      return row;
    }
    // The existing first-decision latch and strict transactional merge also apply to failure cleanup.
    return this.complete(p, ticket, faults);
  }
}
