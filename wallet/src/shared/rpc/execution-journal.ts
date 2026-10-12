// Copyright (c) LinkU Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { bcs } from "rtd-typescript/bcs";
import { fromBase64, toBase64 } from "rtd-typescript/utils";
import { walletAddress } from "./asset-address";
import {
  assertGenesisDigest,
  executionScopeKey,
  type ValidatedNetworkProfile,
} from "./profile";

export interface WalletExecutionReceipt {
  readonly digest: string;
  readonly success: boolean;
  readonly checkpoint: string | null;
  readonly epoch: string;
  readonly effectsBase64: string;
  readonly source: "fullnode" | "archive";
}
export interface WalletStoredReceipt {
  readonly bindingKey: string;
  readonly accountAddress: string;
  readonly receipt: WalletExecutionReceipt;
}
export interface WalletJournalRecord {
  readonly schemaVersion: 2;
  readonly id: string;
  readonly scope: string;
  readonly chainId: string;
  readonly generation: string;
  readonly accountId: string;
  readonly accountAddress: string;
  readonly requestId: string;
  readonly originRef: string;
  readonly digest: string;
  readonly createdAt: number;
  readonly endpointRevision: number;
  readonly bindingKey: string;
  readonly state:
    | "dispatch-pending"
    | "confirmed-success"
    | "confirmed-failure";
  readonly receipt?: WalletExecutionReceipt;
}
export class WalletJournalError extends Error {
  constructor(
    readonly reason:
      | "unavailable"
      | "pending"
      | "conflict"
      | "legacy"
      | "invalid",
  ) {
    super(
      {
        unavailable: "交易恢复存储不可用，禁止提交",
        pending: "当前链账户有待确认交易，禁止再次签名和发送",
        conflict: "交易恢复记录冲突，禁止提交",
        legacy: "发现旧交易恢复数据，需要先核对旧记录",
        invalid: "交易恢复记录无效，禁止提交",
      }[reason],
    );
    this.name = "WalletJournalError";
  }
}
const RECORDS = "journal-v2";
const LOCKS = "pending-scopes-v2";
const META = "metadata-v2";
function text(value: unknown): asserts value is string {
  if (typeof value !== "string" || !value || value.length > 4096)
    throw new WalletJournalError("invalid");
}
export function assertExecutionReceipt(receipt: WalletExecutionReceipt): void {
  try {
    if (
      typeof receipt.success !== "boolean" ||
      !["fullnode", "archive"].includes(receipt.source)
    )
      throw new Error("receipt");
    const numeric = (value: string) =>
      typeof value === "string" &&
      /^(0|[1-9]\d*)$/.test(value) &&
      BigInt(value) <= 0xffffffffffffffffn;
    if (
      !numeric(receipt.epoch) ||
      (receipt.checkpoint !== null && !numeric(receipt.checkpoint)) ||
      typeof receipt.effectsBase64 !== "string" ||
      receipt.effectsBase64.length > 2_800_000
    )
      throw new Error("receipt bounds");
    const bytes = fromBase64(receipt.effectsBase64);
    const effects = bcs.TransactionEffects.parse(bytes);
    const body = effects.$kind === "V1" ? effects.V1 : effects.V2;
    if (
      toBase64(bytes) !== receipt.effectsBase64 ||
      toBase64(bcs.TransactionEffects.serialize(effects).toBytes()) !==
        receipt.effectsBase64 ||
      body.transactionDigest !== assertGenesisDigest(receipt.digest) ||
      (body.status.$kind === "Success") !== receipt.success ||
      body.executedEpoch !== receipt.epoch
    )
      throw new Error("receipt facts");
  } catch {
    throw new WalletJournalError("invalid");
  }
}
export function assertJournalRecord(value: WalletJournalRecord): void {
  for (const field of [
    value.id,
    value.scope,
    value.generation,
    value.accountId,
    value.requestId,
    value.originRef,
    value.bindingKey,
  ])
    text(field);
  const chainId = assertGenesisDigest(value.chainId);
  const account = walletAddress(value.accountAddress);
  assertGenesisDigest(value.digest);
  if (
    value.schemaVersion !== 2 ||
    value.accountAddress !== account ||
    value.scope !== JSON.stringify([2, chainId, value.generation, account]) ||
    value.id !== JSON.stringify([value.scope, value.requestId]) ||
    !Number.isSafeInteger(value.createdAt) ||
    value.createdAt < 0 ||
    !Number.isSafeInteger(value.endpointRevision) ||
    value.endpointRevision < 1 ||
    !["dispatch-pending", "confirmed-success", "confirmed-failure"].includes(
      value.state,
    )
  )
    throw new WalletJournalError("invalid");
  if (value.state === "dispatch-pending") {
    if (value.receipt !== undefined) throw new WalletJournalError("invalid");
  } else {
    if (
      !value.receipt ||
      value.receipt.digest !== value.digest ||
      value.receipt.success !== (value.state === "confirmed-success")
    )
      throw new WalletJournalError("invalid");
    assertExecutionReceipt(value.receipt);
  }
}
export function createPendingRecord(
  profile: ValidatedNetworkProfile,
  input: {
    accountId: string;
    accountAddress: string;
    requestId: string;
    originRef: string;
    digest: string;
    bindingKey: string;
  },
): WalletJournalRecord {
  const scope = executionScopeKey(profile, input.accountAddress);
  const record: WalletJournalRecord = Object.freeze({
    ...input,
    schemaVersion: 2,
    id: JSON.stringify([scope, input.requestId]),
    scope,
    chainId: profile.expectedGenesisDigest,
    generation: profile.generation,
    accountAddress: walletAddress(input.accountAddress),
    createdAt: Date.now(),
    endpointRevision: profile.revision,
    state: "dispatch-pending",
  });
  assertJournalRecord(record);
  return record;
}

/** Only IndexedDB completion resolves a write. No signed payload, bytes or key material is stored. */
export class WalletExecutionJournal {
  constructor(
    readonly options: { indexedDB?: IDBFactory; databaseName?: string } = {},
  ) {}
  async #open(): Promise<IDBDatabase> {
    const factory = this.options.indexedDB ?? globalThis.indexedDB;
    if (!factory) throw new WalletJournalError("unavailable");
    return new Promise((resolve, reject) => {
      const request = factory.open(
        this.options.databaseName ?? "RtdWallet TransactionJournal",
        2,
      );
      let abandoned = false;
      request.onerror = () => reject(new WalletJournalError("unavailable"));
      request.onblocked = () => {
        abandoned = true;
        reject(new WalletJournalError("unavailable"));
      };
      request.onupgradeneeded = (event) => {
        const db = request.result;
        const priorStores = Array.from(db.objectStoreNames);
        if (!db.objectStoreNames.contains(RECORDS)) {
          const records = db.createObjectStore(RECORDS, { keyPath: "id" });
          records.createIndex("scope", "scope");
        }
        if (!db.objectStoreNames.contains(LOCKS))
          db.createObjectStore(LOCKS, { keyPath: "scope" });
        if (!db.objectStoreNames.contains(META))
          db.createObjectStore(META, { keyPath: "key" });
        // Preserve all v1 stores and quarantine any old data, whose short-chain identity is unproven.
        if (event.oldVersion > 0 && event.oldVersion < 2)
          for (const name of priorStores) {
            const count = request.transaction!.objectStore(name).count();
            count.onsuccess = () => {
              if (count.result > 0)
                request
                  .transaction!.objectStore(META)
                  .put({ key: "legacy-quarantined", value: true });
            };
          }
      };
      request.onsuccess = () => {
        const db = request.result;
        if (abandoned) {
          db.close();
          return;
        }
        db.onversionchange = () => db.close();
        resolve(db);
      };
    });
  }
  async #transaction<T>(
    mode: IDBTransactionMode,
    operation: (
      tx: IDBTransaction,
      done: (value: T) => void,
      fail: (error: Error) => void,
    ) => void,
  ): Promise<T> {
    const db = await this.#open();
    return new Promise<T>((resolve, reject) => {
      let tx: IDBTransaction;
      try {
        tx = db.transaction(
          [RECORDS, LOCKS, META],
          mode,
          mode === "readwrite" ? { durability: "strict" } : undefined,
        );
      } catch {
        db.close();
        reject(new WalletJournalError("unavailable"));
        return;
      }
      if (mode === "readwrite" && tx.durability !== "strict") {
        tx.abort();
        db.close();
        reject(new WalletJournalError("unavailable"));
        return;
      }
      let result: T;
      let filled = false;
      let failure: Error | undefined;
      const fail = (error: Error) => {
        failure = error;
        try {
          tx.abort();
        } catch {
          /* already ended */
        }
      };
      tx.onabort = () => {
        db.close();
        reject(failure ?? new WalletJournalError("unavailable"));
      };
      tx.onerror = () => {
        failure ??= new WalletJournalError("unavailable");
      };
      tx.oncomplete = () => {
        db.close();
        if (filled && !failure) resolve(result);
        else reject(failure ?? new WalletJournalError("unavailable"));
      };
      try {
        operation(
          tx,
          (value) => {
            result = value;
            filled = true;
          },
          fail,
        );
      } catch (error) {
        fail(
          error instanceof Error ? error : new WalletJournalError("invalid"),
        );
      }
    });
  }
  async pending(scope: string): Promise<WalletJournalRecord | null> {
    text(scope);
    return this.#transaction("readonly", (tx, done, fail) => {
      const quarantine = tx.objectStore(META).get("legacy-quarantined");
      quarantine.onsuccess = () => {
        if (quarantine.result?.value) {
          fail(new WalletJournalError("legacy"));
          return;
        }
        const lock = tx.objectStore(LOCKS).get(scope);
        lock.onsuccess = () => {
          if (!lock.result) {
            done(null);
            return;
          }
          const record = tx.objectStore(RECORDS).get(lock.result.recordId);
          record.onsuccess = () => {
            try {
              assertJournalRecord(record.result);
              if (
                record.result.scope !== scope ||
                record.result.state !== "dispatch-pending"
              )
                throw new WalletJournalError("conflict");
              done(record.result);
            } catch {
              fail(new WalletJournalError("invalid"));
            }
          };
        };
      };
    });
  }
  async get(id: string): Promise<WalletJournalRecord | null> {
    text(id);
    return this.#transaction("readonly", (tx, done, fail) => {
      const quarantine = tx.objectStore(META).get("legacy-quarantined");
      quarantine.onsuccess = () => {
        if (quarantine.result?.value) {
          fail(new WalletJournalError("legacy"));
          return;
        }
        const request = tx.objectStore(RECORDS).get(id);
        request.onsuccess = () => {
          try {
            if (request.result) assertJournalRecord(request.result);
            done(request.result ?? null);
          } catch {
            fail(new WalletJournalError("invalid"));
          }
        };
      };
    });
  }
  /** Read only, using the existing scope index; no URL/revision alias can resurrect another generation. */
  async confirmedReceipt(
    scope: string,
    digest: string,
  ): Promise<WalletExecutionReceipt | null> {
    text(scope);
    assertGenesisDigest(digest);
    return this.#transaction("readonly", (tx, done, fail) => {
      const quarantine = tx.objectStore(META).get("legacy-quarantined");
      quarantine.onsuccess = () => {
        if (quarantine.result?.value) {
          fail(new WalletJournalError("legacy"));
          return;
        }
        let found: WalletExecutionReceipt | null = null,
          count = 0;
        const request = tx
          .objectStore(RECORDS)
          .index("scope")
          .openCursor(scope);
        request.onsuccess = () => {
          try {
            const cursor = request.result;
            if (!cursor) {
              done(found);
              return;
            }
            if (++count > 10_000) throw new WalletJournalError("unavailable");
            const record = cursor.value as WalletJournalRecord;
            assertJournalRecord(record);
            if (record.scope !== scope)
              throw new WalletJournalError("conflict");
            if (
              record.digest === digest &&
              record.state !== "dispatch-pending"
            ) {
              const receipt = record.receipt!;
              if (
                found &&
                (found.effectsBase64 !== receipt.effectsBase64 ||
                  found.success !== receipt.success ||
                  found.epoch !== receipt.epoch ||
                  (found.checkpoint !== null &&
                    receipt.checkpoint !== null &&
                    found.checkpoint !== receipt.checkpoint))
              )
                throw new WalletJournalError("conflict");
              if (!found || found.checkpoint === null)
                found = Object.freeze({
                  digest: receipt.digest,
                  success: receipt.success,
                  checkpoint: receipt.checkpoint,
                  epoch: receipt.epoch,
                  effectsBase64: receipt.effectsBase64,
                  source: receipt.source,
                });
            }
            cursor.continue();
          } catch (error) {
            fail(
              error instanceof WalletJournalError
                ? error
                : new WalletJournalError("invalid"),
            );
          }
        };
      };
    });
  }
  async commitPending(record: WalletJournalRecord): Promise<void> {
    assertJournalRecord(record);
    if (record.state !== "dispatch-pending")
      throw new WalletJournalError("invalid");
    // Explicit allowlist prevents accidental persistence of a signed payload passed as extra properties.
    const stored = {
      schemaVersion: record.schemaVersion,
      id: record.id,
      scope: record.scope,
      chainId: record.chainId,
      generation: record.generation,
      accountId: record.accountId,
      accountAddress: record.accountAddress,
      requestId: record.requestId,
      originRef: record.originRef,
      digest: record.digest,
      createdAt: record.createdAt,
      endpointRevision: record.endpointRevision,
      bindingKey: record.bindingKey,
      state: record.state,
    };
    return this.#transaction("readwrite", (tx, done, fail) => {
      const quarantine = tx.objectStore(META).get("legacy-quarantined");
      quarantine.onsuccess = () => {
        if (quarantine.result?.value) {
          fail(new WalletJournalError("legacy"));
          return;
        }
        const lock = tx.objectStore(LOCKS).get(record.scope);
        lock.onsuccess = () => {
          if (lock.result) {
            fail(new WalletJournalError("pending"));
            return;
          }
          const prior = tx.objectStore(RECORDS).get(record.id);
          prior.onsuccess = () => {
            if (prior.result) {
              fail(new WalletJournalError("conflict"));
              return;
            }
            try {
              tx.objectStore(RECORDS).add(stored);
              tx.objectStore(LOCKS).add({
                scope: record.scope,
                recordId: record.id,
              });
              done(undefined);
            } catch {
              fail(new WalletJournalError("unavailable"));
            }
          };
        };
      };
    });
  }
  async commitReceipt(
    id: string,
    receipt: WalletExecutionReceipt,
  ): Promise<WalletJournalRecord> {
    assertExecutionReceipt(receipt);
    return this.#transaction("readwrite", (tx, done, fail) => {
      // A restore or upgrade can quarantine the database after the earlier
      // pending read. Re-check in this same terminal transaction before any
      // record update or scope release, as every other journal operation does.
      const quarantine = tx.objectStore(META).get("legacy-quarantined");
      quarantine.onsuccess = () => {
        if (quarantine.result?.value) {
          fail(new WalletJournalError("legacy"));
          return;
        }
        const request = tx.objectStore(RECORDS).get(id);
        request.onsuccess = () => {
          try {
            const record = request.result as WalletJournalRecord;
            assertJournalRecord(record);
            if (
              record.state !== "dispatch-pending" ||
              receipt.digest !== record.digest
            )
              throw new WalletJournalError("conflict");
            const lock = tx.objectStore(LOCKS).get(record.scope);
            lock.onsuccess = () => {
              if (lock.result?.recordId !== id) {
                fail(new WalletJournalError("conflict"));
                return;
              }
              const next: WalletJournalRecord = {
                ...record,
                state: receipt.success
                  ? "confirmed-success"
                  : "confirmed-failure",
                receipt: {
                  digest: receipt.digest,
                  success: receipt.success,
                  checkpoint: receipt.checkpoint,
                  epoch: receipt.epoch,
                  effectsBase64: receipt.effectsBase64,
                  source: receipt.source,
                },
              };
              try {
                assertJournalRecord(next);
              } catch {
                fail(new WalletJournalError("invalid"));
                return;
              }
              try {
                tx.objectStore(RECORDS).put(next);
                tx.objectStore(LOCKS).delete(record.scope);
                done(next);
              } catch {
                fail(new WalletJournalError("unavailable"));
              }
            };
          } catch (error) {
            fail(
              error instanceof Error
                ? error
                : new WalletJournalError("invalid"),
            );
          }
        };
      };
    });
  }
}
