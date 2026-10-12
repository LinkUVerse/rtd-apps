// Copyright (c) LinkU Labs, Inc.
// SPDX-License-Identifier: Apache-2.0
import type { NetworkIdentityReport } from "./identity";
import type { ValidatedNetworkProfile } from "./profile";
import {
  WalletNetworkObservationError,
  captureNetworkObservation,
  reconcileNetworkObservation,
  networkObservationScope,
  type NetworkObservationSnapshot,
  type NetworkObservationStore,
  type ObservationDecision,
} from "./network-observation-state";

const STORE = "observations-v1";
/** Independent from transaction journals. Every write settles only at strict transaction complete. */
export class WalletNetworkObservations implements NetworkObservationStore {
  constructor(
    readonly options: {
      indexedDB?: IDBFactory;
      databaseName?: string;
      timeoutMs?: number;
    } = {},
  ) {}
  #timeout() {
    const value = this.options.timeoutMs ?? 5_000;
    if (!Number.isSafeInteger(value) || value < 1 || value > 5_000)
      throw new RangeError("网络观察存储期限必须在1–5000ms");
    return value;
  }
  async #open(): Promise<IDBDatabase> {
    const factory = this.options.indexedDB ?? globalThis.indexedDB;
    if (!factory) throw new WalletNetworkObservationError("unavailable");
    const timeout = this.#timeout();
    return new Promise((resolve, reject) => {
      let abandoned = false;
      const fail = () => {
        abandoned = true;
        clearTimeout(timer);
        reject(new WalletNetworkObservationError("unavailable"));
      };
      const timer = setTimeout(fail, timeout);
      let request: IDBOpenDBRequest;
      try {
        request = factory.open(
          this.options.databaseName ?? "RtdWallet NetworkObservations",
          1,
        );
      } catch {
        fail();
        return;
      }
      request.onerror = fail;
      request.onblocked = fail;
      request.onupgradeneeded = (event) => {
        if (abandoned || event.oldVersion !== 0) {
          request.transaction?.abort();
          return;
        }
        request.result.createObjectStore(STORE, { keyPath: "scope" });
      };
      request.onsuccess = () => {
        clearTimeout(timer);
        const db = request.result;
        if (abandoned) {
          db.close();
          return;
        }
        if (
          db.version !== 1 ||
          db.objectStoreNames.length !== 1 ||
          !db.objectStoreNames.contains(STORE)
        ) {
          db.close();
          reject(new WalletNetworkObservationError("corrupt"));
          return;
        }
        db.onversionchange = () => db.close();
        resolve(db);
      };
    });
  }
  async #transaction<T>(
    mode: "readonly" | "readwrite",
    work: (
      store: IDBObjectStore,
      done: (value: T) => void,
      fail: (error: Error) => void,
    ) => void,
  ): Promise<T> {
    const db = await this.#open();
    return new Promise((resolve, reject) => {
      let tx: IDBTransaction;
      try {
        tx = db.transaction(
          STORE,
          mode,
          mode === "readwrite" ? { durability: "strict" } : undefined,
        );
      } catch {
        db.close();
        reject(new WalletNetworkObservationError("unavailable"));
        return;
      }
      let failure: Error | undefined,
        filled = false,
        result: T;
      const fail = (error: Error) => {
        failure = error;
        try {
          tx.abort();
        } catch {
          /* already finished */
        }
      };
      const timer = setTimeout(
        () => fail(new WalletNetworkObservationError("unavailable")),
        this.#timeout(),
      );
      const close = () => {
        clearTimeout(timer);
        db.close();
      };
      tx.onabort = () => {
        close();
        reject(failure ?? new WalletNetworkObservationError("unavailable"));
      };
      tx.onerror = () => {
        failure ??= new WalletNetworkObservationError("unavailable");
      };
      tx.oncomplete = () => {
        close();
        if (!filled || failure)
          reject(failure ?? new WalletNetworkObservationError("corrupt"));
        else resolve(result);
      };
      if (mode === "readwrite" && tx.durability !== "strict") {
        fail(new WalletNetworkObservationError("unavailable"));
        return;
      }
      try {
        const store = tx.objectStore(STORE);
        if (store.keyPath !== "scope" || store.autoIncrement) {
          fail(new WalletNetworkObservationError("corrupt"));
          return;
        }
        work(
          store,
          (value) => {
            result = value;
            filled = true;
          },
          fail,
        );
      } catch (error) {
        fail(
          error instanceof WalletNetworkObservationError
            ? error
            : new WalletNetworkObservationError("unavailable"),
        );
      }
    });
  }
  capture(
    profile: ValidatedNetworkProfile,
  ): Promise<NetworkObservationSnapshot> {
    return this.#transaction("readonly", (store, done, fail) => {
      const request = store.get(networkObservationScope(profile));
      request.onsuccess = () => {
        try {
          done(captureNetworkObservation(profile, request.result));
        } catch (error) {
          fail(error as Error);
        }
      };
    });
  }
  async observe(
    profile: ValidatedNetworkProfile,
    before: NetworkObservationSnapshot,
    report: NetworkIdentityReport,
  ): Promise<void> {
    const decision = await this.#transaction<ObservationDecision>(
      "readwrite",
      (store, done, fail) => {
        const request = store.get(networkObservationScope(profile));
        request.onsuccess = () => {
          try {
            const decision = reconcileNetworkObservation(
              profile,
              before,
              report,
              request.result,
            );
            if (decision.next) store.put(decision.next);
            done(decision);
          } catch (error) {
            fail(error as Error);
          }
        };
      },
    );
    // A reset is an intentional committed quarantine, not an aborted write.
    if (decision.kind === "reset-required") throw decision.reset!;
    if (decision.kind === "stale")
      throw new WalletNetworkObservationError("stale");
  }
}
