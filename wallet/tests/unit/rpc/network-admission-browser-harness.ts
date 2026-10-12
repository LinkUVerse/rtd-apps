// Copyright (c) LinkU Labs, Inc.
// SPDX-License-Identifier: Apache-2.0
// Public synthetic profiles and native IndexedDB only; no chain/signing clients.
export { WalletNetworkAdmissionStore } from "../../../src/shared/rpc/network-admission-store";
export {
  networkBindingKey,
  validateNetworkProfile,
} from "../../../src/shared/rpc/profile";
export { profileFixture } from "../../../src/shared/rpc/profile-fixture";
export {
  assertNetworkAdmissionClear,
  createNetworkAdmissionTicket,
} from "../../../src/shared/rpc/network-admission-state";

export async function rawDatabase(
  name: string,
  version?: number,
  options: {
    keyPath?: string;
    index?: boolean;
    extraStore?: boolean;
    autoIncrement?: boolean;
  } = {},
) {
  return new Promise<IDBDatabase>((resolve, reject) => {
    const r = indexedDB.open(name, version);
    r.onupgradeneeded = () => {
      const store = r.result.createObjectStore("admission-v1", {
        keyPath: options.keyPath ?? "bindingKey",
        autoIncrement: options.autoIncrement ?? false,
      });
      if (options.index) store.createIndex("unexpected", "schemaVersion");
      if (options.extraStore) r.result.createObjectStore("unexpected");
    };
    r.onerror = () => reject(new Error("native fixture database failed"));
    r.onsuccess = () => {
      r.result.onversionchange = () => r.result.close();
      resolve(r.result);
    };
  });
}
export async function rawRow(
  name: string,
  binding: string,
  change?: (store: IDBObjectStore) => void,
) {
  const db = await rawDatabase(name);
  return new Promise<unknown>((resolve, reject) => {
    const tx = db.transaction(
      "admission-v1",
      change ? "readwrite" : "readonly",
      change ? { durability: "strict" } : undefined,
    );
    const store = tx.objectStore("admission-v1");
    if (change) change(store);
    const request = store.get(binding);
    tx.oncomplete = () => {
      db.close();
      resolve(request.result);
    };
    tx.onabort = () => {
      db.close();
      reject(new Error("native fixture transaction aborted"));
    };
  });
}
