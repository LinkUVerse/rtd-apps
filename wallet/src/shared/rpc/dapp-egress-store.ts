// Copyright (c) LinkU Labs, Inc.
// SPDX-License-Identifier: Apache-2.0
import {
  NETWORK_ADMISSION_DATABASE,
  NETWORK_ADMISSION_STORES,
  openAdmissionDatabase,
  validateAdmissionDatabaseName,
  validateAdmissionStore,
} from "./network-admission-database";
import {
  assertNetworkAdmissionClear,
  createNetworkAdmissionTicket,
  type NetworkAdmissionArea,
  validateNetworkAdmissionRecord,
  WalletNetworkAdmissionBlockedError,
  WalletNetworkAdmissionStateError,
} from "./network-admission-state";
import {
  DAPP_EGRESS_MAX_BYTES,
  validateDappEgressMessage,
} from "./dapp-egress-protocol";
import {
  networkBindingKey,
  validateNetworkProfile,
  type ValidatedNetworkProfile,
} from "./profile";

export interface WalletEgressSourceBinding {
  readonly origin: string;
  readonly tabId: number;
  readonly frameId: number;
  readonly documentId: string;
  readonly requestId: string;
  readonly account: string;
  readonly gateOwner: string;
}
export interface WalletEgressBinding extends WalletEgressSourceBinding {
  readonly profileBinding: string;
}
type Context = {
  key: "global";
  schemaVersion: 1;
  epoch: string;
  revision: number;
  pending: string[];
};
type Ticket = {
  id: string;
  schemaVersion: 2;
  admissionTargets: AdmissionTargets;
  binding: WalletEgressBinding;
  epoch: string;
  revision: number;
  createdAt: number;
  expiresAt: number;
  payload: string;
};
type LeaseState = {
  admissionTargets: AdmissionTargets;
  started: Set<"sign" | "dispatch">;
  invoked: Set<"sign" | "dispatch">;
  profile: ValidatedNetworkProfile;
  binding: WalletEgressBinding;
  epoch: string;
  revision: number;
  capturedAt: number;
};
type Mutation = { id: string; epoch: string; revision: number };
export type WalletEgressLease = Readonly<object>;
export type WalletEgressReceipt = Readonly<object>;
export type WalletEgressMutation = Readonly<object>;
const hex = /^[a-f0-9]{64}$/;
type AdmissionTargets = "all" | readonly NetworkAdmissionArea[];
function targets(value: unknown): AdmissionTargets {
  if (value === "all") return value;
  if (!Array.isArray(value)) fail();
  return value.length
    ? createNetworkAdmissionTicket(value).areas
    : Object.freeze([]);
}
const fields = [
  "origin",
  "tabId",
  "frameId",
  "documentId",
  "requestId",
  "account",
  "gateOwner",
  "profileBinding",
] as const;
function fail(): never {
  throw new WalletNetworkAdmissionStateError("corrupt");
}
function exact(
  value: unknown,
  keys: readonly string[],
): Record<string, unknown> {
  if (
    !value ||
    Object.getPrototypeOf(value) !== Object.prototype ||
    Object.getOwnPropertySymbols(value).length ||
    Object.getOwnPropertyNames(value).length !== keys.length ||
    keys.some(
      (k) =>
        !Object.hasOwn(value, k) ||
        !Object.hasOwn(Object.getOwnPropertyDescriptor(value, k)!, "value"),
    )
  )
    fail();
  return value as Record<string, unknown>;
}
function integer(value: unknown): number {
  if (typeof value !== "number" || !Number.isSafeInteger(value) || value < 0)
    fail();
  return value;
}
function text(value: unknown, limit = 256): string {
  if (
    typeof value !== "string" ||
    !value ||
    new TextEncoder().encode(value).length > limit ||
    /[\u0000-\u001f\u007f]/.test(value)
  )
    fail();
  return value;
}
const random = () =>
  Array.from(crypto.getRandomValues(new Uint8Array(32)), (n) =>
    n.toString(16).padStart(2, "0"),
  ).join("");
function binding(
  profile: ValidatedNetworkProfile,
  value: unknown,
): WalletEgressBinding {
  const v = exact(value, fields),
    origin = text(v.origin, 2048),
    url = new URL(origin);
  if (
    !["http:", "https:"].includes(url.protocol) ||
    url.origin !== origin ||
    typeof v.account !== "string" ||
    !/^0x[a-f0-9]{64}$/.test(v.account) ||
    typeof v.gateOwner !== "string" ||
    !hex.test(v.gateOwner) ||
    text(v.profileBinding, 65536) !== networkBindingKey(profile)
  )
    fail();
  return Object.freeze({
    origin,
    tabId: integer(v.tabId),
    frameId: integer(v.frameId),
    documentId: text(v.documentId),
    requestId: text(v.requestId),
    account: v.account,
    gateOwner: v.gateOwner,
    profileBinding: v.profileBinding as string,
  });
}
function context(value: unknown): Context {
  const v = exact(value, [
    "key",
    "schemaVersion",
    "epoch",
    "revision",
    "pending",
  ]);
  if (
    v.key !== "global" ||
    v.schemaVersion !== 1 ||
    typeof v.epoch !== "string" ||
    !hex.test(v.epoch) ||
    !Array.isArray(v.pending) ||
    v.pending.length > 64 ||
    new Set(v.pending).size !== v.pending.length ||
    v.pending.some((id) => typeof id !== "string" || !hex.test(id))
  )
    fail();
  integer(v.revision);
  return structuredClone(v) as Context;
}
function ticket(profile: ValidatedNetworkProfile, value: unknown): Ticket {
  const v = exact(value, [
    "id",
    "schemaVersion",
    "binding",
    "epoch",
    "revision",
    "createdAt",
    "expiresAt",
    "payload",
    "admissionTargets",
  ]);
  if (
    typeof v.id !== "string" ||
    !hex.test(v.id) ||
    v.schemaVersion !== 2 ||
    typeof v.epoch !== "string" ||
    !hex.test(v.epoch)
  )
    fail();
  binding(profile, v.binding);
  targets(v.admissionTargets);
  integer(v.revision);
  const start = integer(v.createdAt),
    end = integer(v.expiresAt);
  if (
    end <= start ||
    end - start > 30000 ||
    typeof v.payload !== "string" ||
    new TextEncoder().encode(v.payload).length > DAPP_EGRESS_MAX_BYTES
  )
    fail();
  return structuredClone(v) as Ticket;
}
const equal = (a: WalletEgressBinding, b: WalletEgressBinding) =>
  fields.every((k) => a[k] === b[k]);
function clear(
  profile: ValidatedNetworkProfile,
  raw: unknown,
  selected: AdmissionTargets,
) {
  const row = validateNetworkAdmissionRecord(profile, raw);
  // An empty record is only a negative check. The caller still needs its
  // independent permission/account/identity/ABI authorization session.
  if (!row) throw new WalletNetworkAdmissionStateError("unavailable");
  if (selected !== "all") {
    assertNetworkAdmissionClear(profile, row, selected);
    return;
  }
  if (row.faults.length)
    throw new WalletNetworkAdmissionBlockedError("quarantined");
  if (row.pending.length)
    throw new WalletNetworkAdmissionBlockedError("reviewing");
}
type Read = readonly [number, IDBValidKey | undefined, "count"?];

/** Durable one-use result gate, sharing the canonical negative-admission DB. */
export class WalletDappEgressStore {
  readonly #receipts = new WeakMap<WalletEgressReceipt, Ticket>();
  readonly #leases = new WeakMap<WalletEgressLease, LeaseState>();
  readonly #mutations = new WeakMap<WalletEgressMutation, Mutation>();
  readonly #factory: IDBFactory | undefined;
  readonly #database: string;
  readonly #timeout: number;
  constructor(
    options: {
      indexedDB?: IDBFactory;
      databaseName?: string;
      timeoutMs?: number;
    } = {},
  ) {
    this.#factory = options.indexedDB ?? globalThis.indexedDB;
    this.#database = options.databaseName ?? NETWORK_ADMISSION_DATABASE;
    this.#timeout = options.timeoutMs ?? 5000;
    validateAdmissionDatabaseName(this.#database);
    if (
      !Number.isSafeInteger(this.#timeout) ||
      this.#timeout < 1 ||
      this.#timeout > 5000
    )
      throw new RangeError("网络准入存储期限必须在1–5000ms");
  }
  async #transaction<T>(
    mode: IDBTransactionMode,
    reads: readonly Read[],
    change: (values: unknown[], stores: IDBObjectStore[]) => T,
  ): Promise<T> {
    const deadline = performance.now() + this.#timeout;
    const db = await openAdmissionDatabase(
      this.#factory,
      this.#database,
      deadline,
    );
    return new Promise((resolve, reject) => {
      let settled = false,
        filled = false,
        tx: IDBTransaction | undefined,
        result: T;
      const close = () => {
        clearTimeout(timer);
        db.close();
      };
      const bad = (error?: unknown) => {
        if (settled) return;
        settled = true;
        try {
          tx?.abort();
        } catch {
          /* Never restore an already consumed receipt. */
        }
        close();
        reject(
          error instanceof WalletNetworkAdmissionStateError ||
            error instanceof WalletNetworkAdmissionBlockedError
            ? error
            : new WalletNetworkAdmissionStateError("unavailable"),
        );
      };
      const timer = setTimeout(
        () => bad(),
        Math.max(0, deadline - performance.now()),
      );
      try {
        if (!reads.length || performance.now() >= deadline) return bad();
        tx = db.transaction(
          [...NETWORK_ADMISSION_STORES],
          mode,
          mode === "readwrite" ? { durability: "strict" } : undefined,
        );
        tx.onabort = () => bad();
        tx.onerror = () => bad();
        tx.oncomplete = () => {
          if (settled) return;
          if (!filled || performance.now() >= deadline) return bad();
          settled = true;
          close();
          resolve(result);
        };
        if (mode === "readwrite" && tx.durability !== "strict") return bad();
        const stores = NETWORK_ADMISSION_STORES.map((name, index) => {
          const store = tx!.objectStore(name);
          validateAdmissionStore(store, index);
          return store;
        });
        const values: unknown[] = [];
        let remaining = reads.length;
        reads.forEach(([index, key, operation], i) => {
          const request =
            operation === "count"
              ? stores[index].count()
              : stores[index].get(key!);
          request.onerror = () => bad();
          request.onsuccess = () => {
            if (settled) return;
            values[i] = request.result;
            if (--remaining) return;
            if (performance.now() >= deadline) return bad();
            try {
              result = change(values, stores);
              filled = true;
            } catch (error) {
              bad(error);
            }
          };
        });
      } catch (error) {
        bad(error);
      }
    });
  }
  /** Worker startup only. Gate/UI readers must never initialize an epoch. */
  startEpoch() {
    return this.#transaction("readwrite", [[1, "global"]], ([old], stores) => {
      const previous = old === undefined ? undefined : context(old);
      const next: Context = {
        key: "global",
        schemaVersion: 1,
        epoch: random(),
        revision: 0,
        pending: previous?.pending ?? [],
      };
      stores[1].put(next);
      stores[2].clear();
      return Object.freeze(structuredClone(next));
    });
  }
  async beginMutation(): Promise<WalletEgressMutation> {
    const state = await this.#transaction(
      "readwrite",
      [[1, "global"]],
      ([value], stores) => {
        const c = context(value),
          id = random();
        if (c.revision === Number.MAX_SAFE_INTEGER || c.pending.length >= 64)
          fail();
        c.revision++;
        c.pending.push(id);
        stores[1].put(c);
        stores[2].clear();
        return { id, epoch: c.epoch, revision: c.revision };
      },
    );
    const token = Object.freeze({});
    this.#mutations.set(token, state);
    return token;
  }
  async finishMutation(token: WalletEgressMutation) {
    const owner = this.#mutations.get(token);
    this.#mutations.delete(token);
    if (!owner) throw new WalletNetworkAdmissionStateError("stale");
    await this.#transaction("readwrite", [[1, "global"]], ([value], stores) => {
      const c = context(value);
      if (
        c.epoch !== owner.epoch ||
        !c.pending.includes(owner.id) ||
        owner.revision > c.revision
      )
        fail();
      c.pending = c.pending.filter((id) => id !== owner.id);
      stores[1].put(c);
    });
  }
  async mutate<T>(operation: () => Promise<T> | T) {
    if (typeof operation !== "function") fail();
    const token = await this.beginMutation();
    const result = await operation();
    await this.finishMutation(token);
    return result;
  }
  async capture(
    profile: ValidatedNetworkProfile,
    input: WalletEgressSourceBinding,
    requiredAreas?: readonly NetworkAdmissionArea[],
  ): Promise<WalletEgressLease> {
    const p = validateNetworkProfile(profile);
    const selected =
      requiredAreas === undefined ? "all" : targets(requiredAreas);
    exact(
      input,
      fields.filter((k) => k !== "profileBinding"),
    );
    const b = binding(p, { ...input, profileBinding: networkBindingKey(p) });
    const state = await this.#transaction(
      "readonly",
      [
        [1, "global"],
        [0, b.profileBinding],
      ],
      ([raw, negative]) => {
        const c = context(raw);
        clear(p, negative, selected);
        if (c.pending.length) fail();
        return {
          admissionTargets: selected,
          started: new Set<"sign" | "dispatch">(),
          invoked: new Set<"sign" | "dispatch">(),
          profile: p,
          binding: b,
          epoch: c.epoch,
          revision: c.revision,
          capturedAt: Date.now(),
        };
      },
    );
    const lease = Object.freeze({});
    this.#leases.set(lease, state);
    return lease;
  }
  /** Begin the actual action once in the latest native read callback; never recapture an old result. */
  async runBeforeAction<T>(
    lease: WalletEgressLease,
    stage: "sign" | "dispatch",
    start: () => Promise<T>,
  ): Promise<T> {
    const state = this.#leases.get(lease);
    if (
      !state ||
      (stage !== "sign" && stage !== "dispatch") ||
      state.started.has(stage) ||
      typeof start !== "function"
    )
      throw new WalletNetworkAdmissionStateError("stale");
    state.started.add(stage);
    const { action } = await this.#transaction(
      "readonly",
      [
        [1, "global"],
        [0, state.binding.profileBinding],
      ],
      ([raw, negative]) => {
        const c = context(raw),
          now = Date.now();
        clear(state.profile, negative, state.admissionTargets);
        if (
          c.pending.length ||
          c.epoch !== state.epoch ||
          c.revision !== state.revision ||
          now < state.capturedAt ||
          now >= state.capturedAt + 30000
        )
          fail();
        let action: Promise<T>;
        try {
          state.invoked.add(stage);
          action = Promise.resolve(start());
        } catch (error) {
          action = Promise.reject(error);
        }
        void action.catch(() => undefined);
        return { action };
      },
    );
    return action;
  }
  async issue(lease: WalletEgressLease, payload: string, ttlMs = 10000) {
    return this.#issue(lease, payload, ttlMs, false);
  }
  /** A confirmed execution result is read-only: retain the original context,
   * but begin its short delivery lifetime now, independently of action expiry.
   * The producer must already have verified the receipt and sealed the result.
   * This cannot renew sign/dispatch authority or cross a revoked context. */
  async issueConfirmedExecution(lease: WalletEgressLease, message: unknown) {
    const state = this.#leases.get(lease);
    if (!state) throw new WalletNetworkAdmissionStateError("stale");
    if (!state.invoked.has("sign") || !state.invoked.has("dispatch")) fail();
    const checked = validateDappEgressMessage(message, state.binding.requestId);
    if (checked.payload.type !== "execute-transaction-response") fail();
    return this.#issue(lease, JSON.stringify(checked), 10000, true);
  }
  async #issue(
    lease: WalletEgressLease,
    payload: string,
    ttlMs: number,
    confirmedExecution: boolean,
  ) {
    const state = this.#leases.get(lease);
    this.#leases.delete(lease);
    if (!state) throw new WalletNetworkAdmissionStateError("stale");
    if (
      !Number.isSafeInteger(ttlMs) ||
      ttlMs < 1 ||
      ttlMs > 30000 ||
      typeof payload !== "string" ||
      new TextEncoder().encode(payload).length > DAPP_EGRESS_MAX_BYTES
    )
      fail();
    const id = random(),
      b = state.binding;
    return this.#transaction(
      "readwrite",
      [
        [1, "global"],
        [0, b.profileBinding],
        [2, undefined, "count"],
      ],
      ([raw, negative, count], stores) => {
        const c = context(raw);
        const now = Date.now();
        clear(state.profile, negative, state.admissionTargets);
        if (
          c.pending.length ||
          integer(count) >= 64 ||
          c.epoch !== state.epoch ||
          c.revision !== state.revision ||
          now < state.capturedAt ||
          (!confirmedExecution && now >= state.capturedAt + 30000)
        )
          fail();
        stores[2].add(
          ticket(state.profile, {
            id,
            schemaVersion: 2,
            admissionTargets: state.admissionTargets,
            binding: b,
            epoch: state.epoch,
            revision: state.revision,
            createdAt: now,
            expiresAt: confirmedExecution
              ? now + ttlMs
              : Math.min(now + ttlMs, state.capturedAt + 30000),
            payload,
          }),
        );
        return Object.freeze({ ticket: id, binding: b });
      },
    );
  }
  async consume(
    profile: ValidatedNetworkProfile,
    id: string,
    input: WalletEgressBinding,
  ): Promise<WalletEgressReceipt> {
    const p = validateNetworkProfile(profile),
      b = binding(p, input);
    if (!hex.test(id)) fail();
    const row = await this.#transaction(
      "readwrite",
      [
        [1, "global"],
        [0, b.profileBinding],
        [2, id],
      ],
      ([raw, negative, saved], stores) => {
        const c = context(raw),
          t = ticket(p, saved);
        clear(p, negative, t.admissionTargets);
        const now = Date.now();
        if (
          c.pending.length ||
          c.epoch !== t.epoch ||
          c.revision !== t.revision ||
          !equal(t.binding, b) ||
          now < t.createdAt ||
          now >= t.expiresAt
        )
          fail();
        stores[2].delete(id);
        return t;
      },
    );
    const receipt = Object.freeze({});
    this.#receipts.set(receipt, row);
    return receipt;
  }
  async deliver(
    profile: ValidatedNetworkProfile,
    receipt: WalletEgressReceipt,
    input: WalletEgressBinding,
    synchronousPost: (payload: string) => void,
  ) {
    const row = this.#receipts.get(receipt);
    this.#receipts.delete(receipt);
    if (
      !row ||
      typeof synchronousPost !== "function" ||
      Object.getPrototypeOf(synchronousPost) !== Function.prototype
    )
      fail();
    const p = validateNetworkProfile(profile),
      b = binding(p, input);
    if (!equal(row.binding, b)) fail();
    await this.#transaction(
      "readonly",
      [
        [1, "global"],
        [0, b.profileBinding],
      ],
      ([raw, negative]) => {
        const c = context(raw);
        clear(p, negative, row.admissionTargets);
        const now = Date.now();
        if (
          c.pending.length ||
          c.epoch !== row.epoch ||
          c.revision !== row.revision ||
          now < row.createdAt ||
          now >= row.expiresAt
        )
          fail();
        if (synchronousPost(row.payload) !== undefined) fail();
      },
    );
  }
}
