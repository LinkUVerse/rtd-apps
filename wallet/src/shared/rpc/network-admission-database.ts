// Copyright (c) LinkU Labs, Inc.
// SPDX-License-Identifier: Apache-2.0
import { WalletNetworkAdmissionStateError } from "./network-admission-state";

export const NETWORK_ADMISSION_DATABASE = "RtdWallet NetworkAdmission";
export const NETWORK_ADMISSION_STORES = [
  "admission-v1",
  "egress-context-v1",
  "egress-ticket-v1",
  "capability-owner-v1",
] as const;
export type AdmissionStoreName = (typeof NETWORK_ADMISSION_STORES)[number];
const keys = ["bindingKey", "key", "id", "id"];

export function validateAdmissionDatabaseName(name: string) {
  if (
    typeof name !== "string" ||
    (name !== NETWORK_ADMISSION_DATABASE &&
      !name.startsWith(`${NETWORK_ADMISSION_DATABASE}:test:`)) ||
    new TextEncoder().encode(name).length > 256
  )
    throw new RangeError("网络准入存储必须使用独立命名空间");
}

export function validateAdmissionStore(store: IDBObjectStore, index: number) {
  if (
    store.keyPath !== keys[index] ||
    store.autoIncrement ||
    store.indexNames.length
  )
    throw new WalletNetworkAdmissionStateError("corrupt");
}

/** Shared v3 bootstrap. The original admission and egress rows are never rewritten. */
export function openAdmissionDatabase(
  factory: IDBFactory | undefined,
  name: string,
  deadline: number,
): Promise<IDBDatabase> {
  validateAdmissionDatabaseName(name);
  if (!factory || performance.now() >= deadline)
    return Promise.reject(new WalletNetworkAdmissionStateError("unavailable"));
  return new Promise((resolve, reject) => {
    let settled = false,
      request: IDBOpenDBRequest | undefined;
    const fail = (reason: "corrupt" | "unavailable" = "unavailable") => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      try {
        request?.transaction?.abort();
      } catch {
        /* No open transaction. */
      }
      reject(new WalletNetworkAdmissionStateError(reason));
    };
    const timer = setTimeout(
      () => fail(),
      Math.max(0, deadline - performance.now()),
    );
    try {
      const opened = (request = factory.open(name, 3));
      opened.onerror = () =>
        fail(opened.error?.name === "VersionError" ? "corrupt" : "unavailable");
      opened.onblocked = () => fail();
      opened.onupgradeneeded = (event) => {
        // A blocked/expired open can begin upgrading later. Explicitly abort
        // that new native transaction even if the rejection already settled.
        if (
          settled ||
          performance.now() >= deadline ||
          ![0, 1, 2].includes(event.oldVersion)
        ) {
          try {
            opened.transaction?.abort();
          } catch {
            /* Already aborted. */
          }
          return fail();
        }
        try {
          if (event.oldVersion > 0) {
            if (
              opened.result.objectStoreNames.length !==
                (event.oldVersion === 1 ? 1 : 3) ||
              !opened.transaction
            )
              throw new Error();
            for (
              let index = 0;
              index < (event.oldVersion === 1 ? 1 : 3);
              index++
            )
              validateAdmissionStore(
                opened.transaction.objectStore(NETWORK_ADMISSION_STORES[index]),
                index,
              );
          } else
            opened.result.createObjectStore(NETWORK_ADMISSION_STORES[0], {
              keyPath: keys[0],
            });
          for (const index of [1, 2, 3])
            if (
              !opened.result.objectStoreNames.contains(
                NETWORK_ADMISSION_STORES[index],
              )
            )
              opened.result.createObjectStore(NETWORK_ADMISSION_STORES[index], {
                keyPath: keys[index],
              });
        } catch {
          fail("corrupt");
        }
      };
      opened.onsuccess = () => {
        const db = opened.result;
        if (settled || performance.now() >= deadline) {
          db.close();
          return fail();
        }
        if (
          db.version !== 3 ||
          db.objectStoreNames.length !== 4 ||
          NETWORK_ADMISSION_STORES.some((n) => !db.objectStoreNames.contains(n))
        ) {
          db.close();
          return fail("corrupt");
        }
        try {
          const shape = db.transaction(
            [...NETWORK_ADMISSION_STORES],
            "readonly",
          );
          NETWORK_ADMISSION_STORES.forEach((name, index) =>
            validateAdmissionStore(shape.objectStore(name), index),
          );
        } catch {
          db.close();
          return fail("corrupt");
        }
        settled = true;
        clearTimeout(timer);
        db.onversionchange = () => db.close();
        resolve(db);
      };
    } catch {
      fail();
    }
  });
}
