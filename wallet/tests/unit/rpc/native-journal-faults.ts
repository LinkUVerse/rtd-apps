// Copyright (c) LinkU Labs, Inc.
// SPDX-License-Identifier: Apache-2.0
// Controlled storage faults in real Chromium. No dev-chain account or transport.
import { WalletExecutionCoordinator } from "../../../src/shared/rpc/execution-coordinator";
import {
  createPendingRecord,
  WalletExecutionJournal,
} from "../../../src/shared/rpc/execution-journal";
import {
  executionScopeKey,
  networkBindingKey,
  validateNetworkProfile,
} from "../../../src/shared/rpc/profile";
import { profileFixture } from "../../../src/shared/rpc/profile-fixture";
import { WalletReadSession } from "../../../src/shared/rpc/session";
import { executionFixture, sender } from "./execution-fixtures";

const check = (value: unknown, message: string): void => {
  if (!value) throw new Error(message);
};

export async function nativeJournalFaults() {
  const profile = validateNetworkProfile(profileFixture());
  const tx = await executionFixture();
  const scope = executionScopeKey(profile, sender);
  const evidence: Array<Record<string, unknown>> = [];
  const make = (databaseName: string) => {
    const session = new WalletReadSession(profile);
    const journal = new WalletExecutionJournal({ databaseName });
    const calls = { simulate: 0, sign: 0, verify: 0, dispatch: 0, lookup: 0 };
    const reader = {
      verifySignature: async () => {
        calls.verify++;
      },
      dispatch: async () => {
        calls.dispatch++;
        return tx.receipt();
      },
      lookup: async () => {
        calls.lookup++;
        return null;
      },
    };
    const input = {
      accountId: "native-fault-fixture",
      accountAddress: sender,
      requestId: databaseName,
      originRef: "wallet-ui",
      bindingKey: networkBindingKey(profile),
      bytesBase64: tx.bytesBase64,
      digest: tx.digest,
    };
    const callbacks = {
      authorize: async () => {},
      simulate: async () => {
        calls.simulate++;
      },
      signData: async () => {
        calls.sign++;
        return tx.signed.signature;
      },
    };
    return {
      session,
      journal,
      calls,
      input,
      callbacks,
      reader,
      coordinator: new WalletExecutionCoordinator(session, journal, reader),
    };
  };
  const rejected = async (operation: Promise<unknown>, message: string) => {
    let denied = false;
    try {
      await operation;
    } catch {
      denied = true;
    }
    check(denied, message);
  };
  const open = (
    name: string,
    version?: number,
    upgrade?: (db: IDBDatabase) => void,
  ) =>
    new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open(name, version);
      request.onupgradeneeded = () => upgrade?.(request.result);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  const rawWrite = async (
    name: string,
    action: (transaction: IDBTransaction) => void,
  ) => {
    const db = await open(name);
    try {
      await new Promise<void>((resolve, reject) => {
        const transaction = db.transaction(
          ["journal-v2", "pending-scopes-v2", "metadata-v2"],
          "readwrite",
          { durability: "strict" },
        );
        transaction.oncomplete = () => resolve();
        transaction.onabort = () =>
          reject(transaction.error ?? new Error("raw write aborted"));
        action(transaction);
      });
    } finally {
      db.close();
    }
  };

  // Abort the actual transaction after both native add requests succeeded.
  {
    const name = "fault-pending-asynchronous-abort";
    const f = make(name);
    const original = IDBObjectStore.prototype.add;
    let written = 0,
      aborts = 0;
    IDBObjectStore.prototype.add = function (...args) {
      const request = original.apply(this, args);
      if (this.transaction.db.name === name) {
        if (this.name === "journal-v2")
          request.addEventListener("success", () => {
            written++;
          });
        if (this.name === "pending-scopes-v2") {
          const transaction = this.transaction;
          request.addEventListener("success", () => {
            aborts++;
            transaction.abort();
          });
        }
      }
      return request;
    };
    try {
      await rejected(
        f.coordinator.execute(f.input, f.callbacks),
        "pending abort allowed execute",
      );
    } finally {
      IDBObjectStore.prototype.add = original;
    }
    check(
      written === 1 && aborts === 1,
      "pending fault did not occur after native success",
    );
    const cold = new WalletExecutionJournal({ databaseName: name });
    const record = createPendingRecord(profile, f.input);
    check(
      (await cold.get(record.id)) === null &&
        (await cold.pending(scope)) === null,
      "aborted pending left half a record",
    );
    check(
      f.calls.dispatch === 0 && f.calls.simulate === 1 && f.calls.sign === 1,
      "dispatch preceded durable completion",
    );
    // An explicit new invocation is permitted only because no pending write
    // committed and no dispatch occurred; this is not automatic retry.
    const next = await f.coordinator.execute(f.input, f.callbacks);
    check(
      next.state === "confirmed" && f.calls.dispatch === 1,
      "explicit post-abort invocation failed",
    );
    evidence.push({
      case: "native pending add success then abort rolls back both stores",
      written,
      aborts,
      priorDispatches: 0,
      finalDispatches: f.calls.dispatch,
      calls: { ...f.calls },
    });
    f.session.close();
  }

  // Simulate an implementation that declines the requested strict durability
  // API. The returned transaction is still native, and the actual abort must
  // leave no pending writes; this is not a claim Chromium lacks strict mode.
  {
    const name = "fault-strict-durability-unavailable";
    const f = make(name);
    const original = IDBDatabase.prototype.transaction;
    let injected = 0,
      aborted = 0;
    let observedAbort!: () => void;
    const abortObserved = new Promise<void>((resolve) => {
      observedAbort = resolve;
    });
    IDBDatabase.prototype.transaction = function (...args) {
      const transaction = original.apply(this, args);
      if (this.name === name && args[1] === "readwrite") {
        injected++;
        transaction.addEventListener("abort", () => {
          aborted++;
          observedAbort();
        });
        Object.defineProperty(transaction, "durability", { value: "relaxed" });
      }
      return transaction;
    };
    try {
      await rejected(
        f.coordinator.execute(f.input, f.callbacks),
        "non-strict journal allowed dispatch",
      );
    } finally {
      IDBDatabase.prototype.transaction = original;
    }
    await Promise.race([
      abortObserved,
      new Promise<void>((_, reject) =>
        setTimeout(
          () =>
            reject(
              new Error(
                `native abort event missing; injected=${injected}, aborted=${aborted}`,
              ),
            ),
          2000,
        ),
      ),
    ]);
    const record = createPendingRecord(profile, f.input);
    check(
      injected === 1 && aborted === 1,
      `strict fallback was not actually aborted; injected=${injected}, aborted=${aborted}`,
    );
    check(
      (await f.journal.get(record.id)) === null &&
        (await f.journal.pending(scope)) === null,
      "strict fallback left pending data",
    );
    check(f.calls.dispatch === 0, "strict durability fallback dispatched");
    evidence.push({
      case: "controlled relaxed durability result causes native abort",
      injected,
      aborted,
      calls: { ...f.calls },
    });
    f.session.close();
  }

  for (const fault of [
    "invalid-record",
    "missing-record",
    "wrong-lock-owner",
  ] as const) {
    const name = "fault-corrupt-" + fault;
    const f = make(name);
    const original = createPendingRecord(profile, f.input);
    await f.journal.commitPending(original);
    await rawWrite(name, (transaction) => {
      if (fault === "invalid-record")
        transaction
          .objectStore("journal-v2")
          .put({ ...original, digest: "untrusted" });
      if (fault === "missing-record")
        transaction.objectStore("journal-v2").delete(original.id);
      if (fault === "wrong-lock-owner")
        transaction
          .objectStore("pending-scopes-v2")
          .put({ scope, recordId: "wrong-owner" });
    });
    await rejected(
      f.coordinator.execute(
        { ...f.input, requestId: "successor" },
        f.callbacks,
      ),
      "corrupt pending allowed a successor",
    );
    await rejected(
      f.coordinator.recover(sender, f.callbacks.authorize),
      "corrupt pending allowed recovery lookup",
    );
    check(
      Object.values(f.calls).every((value) => value === 0),
      "corrupt storage caused signing or network calls",
    );
    const db = await open(name);
    const retained = await new Promise<unknown>((resolve, reject) => {
      const request = db
        .transaction("pending-scopes-v2")
        .objectStore("pending-scopes-v2")
        .get(scope);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    db.close();
    check(retained, "corrupt scope was silently deleted");
    evidence.push({
      case:
        "native " + fault + " blocks execute and lookup without clearing scope",
      calls: { ...f.calls },
    });
    f.session.close();
  }

  {
    const name = "fault-blocked-upgrade";
    const f = make(name);
    const held = await open(name, 1, (db) => {
      db.createObjectStore("legacy", { keyPath: "id" });
    });
    await new Promise<void>((resolve, reject) => {
      const transaction = held.transaction("legacy", "readwrite");
      transaction
        .objectStore("legacy")
        .put({ id: "original", marker: "preserve" });
      transaction.oncomplete = () => resolve();
      transaction.onabort = () => reject(transaction.error);
    });
    try {
      await rejected(
        f.coordinator.execute(f.input, f.callbacks),
        "blocked upgrade allowed execution",
      );
    } finally {
      held.close();
    }
    // The abandoned open can succeed late. It must close, preserve legacy
    // contents and quarantine them, without resolving the rejected caller.
    const cold = await open(name, 2);
    const legacy = await new Promise<{ marker: string }>((resolve, reject) => {
      const request = cold
        .transaction("legacy")
        .objectStore("legacy")
        .get("original");
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    cold.close();
    check(legacy.marker === "preserve", "blocked upgrade lost old contents");
    await rejected(
      f.journal.pending(scope),
      "late upgrade did not quarantine old data",
    );
    check(
      Object.values(f.calls).every((value) => value === 0),
      "late upgrade performed signing or network calls",
    );
    evidence.push({
      case: "native blocked upgrade and late success preserve and quarantine v1 data",
      calls: { ...f.calls },
    });
    f.session.close();
  }
  for (const fault of ["higher-version", "missing-stores"] as const) {
    const name = "fault-database-" + fault;
    const f = make(name);
    const version = fault === "higher-version" ? 3 : 2;
    const initial = await open(name, version, (db) => {
      db.createObjectStore("legacy", { keyPath: "id" });
    });
    await new Promise<void>((resolve, reject) => {
      const transaction = initial.transaction("legacy", "readwrite");
      transaction
        .objectStore("legacy")
        .put({ id: "original", marker: "preserve" });
      transaction.oncomplete = () => resolve();
      transaction.onabort = () => reject(transaction.error);
    });
    initial.close();
    await rejected(
      f.coordinator.execute(f.input, f.callbacks),
      "incompatible database allowed execution",
    );
    const cold = await open(name, version);
    const retained = await new Promise<{ marker: string }>(
      (resolve, reject) => {
        const request = cold
          .transaction("legacy")
          .objectStore("legacy")
          .get("original");
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      },
    );
    check(
      cold.objectStoreNames.length === 1 && retained.marker === "preserve",
      "incompatible database was silently repaired or discarded",
    );
    cold.close();
    check(
      Object.values(f.calls).every((value) => value === 0),
      "incompatible storage signed or dispatched",
    );
    evidence.push({
      case: "native " + fault + " refuses writes and preserves original store",
      calls: { ...f.calls },
    });
    f.session.close();
  }
  {
    const name = "fault-quarantine-before-terminal";
    const f = make(name);
    const record = createPendingRecord(profile, f.input);
    f.reader.dispatch = async () => {
      f.calls.dispatch++;
      await rawWrite(name, (transaction) => {
        transaction
          .objectStore("metadata-v2")
          .put({ key: "legacy-quarantined", value: true });
      });
      return tx.receipt();
    };
    const outcome = await f.coordinator.execute(f.input, f.callbacks);
    check(
      outcome.state === "pending" && outcome.reason === "storage-unavailable",
      "quarantine during dispatch falsely confirmed receipt",
    );
    await rejected(
      f.journal.commitReceipt(record.id, tx.receipt()),
      "quarantined journal admitted terminal write",
    );
    const db = await open(name);
    const retained = await new Promise<{ record: any; lock: any }>(
      (resolve, reject) => {
        const transaction = db.transaction(["journal-v2", "pending-scopes-v2"]);
        let recordValue: any, lockValue: any;
        const recordRequest = transaction
          .objectStore("journal-v2")
          .get(record.id);
        recordRequest.onsuccess = () => {
          recordValue = recordRequest.result;
        };
        const lockRequest = transaction
          .objectStore("pending-scopes-v2")
          .get(scope);
        lockRequest.onsuccess = () => {
          lockValue = lockRequest.result;
        };
        transaction.oncomplete = () =>
          resolve({ record: recordValue, lock: lockValue });
        transaction.onabort = () => reject(transaction.error);
      },
    );
    db.close();
    check(
      retained.record?.state === "dispatch-pending" &&
        !retained.record.receipt &&
        retained.lock?.recordId === record.id,
      "quarantine released pending or overwrote a record",
    );
    check(
      f.calls.dispatch === 1 &&
        f.calls.simulate === 1 &&
        f.calls.sign === 1 &&
        f.calls.lookup === 0,
      "quarantine recovery rebuilt or re-dispatched",
    );
    evidence.push({
      case: "quarantine appearing before terminal transaction refuses commit and preserves pending",
      calls: { ...f.calls },
    });
    f.session.close();
  }
  return evidence;
}
