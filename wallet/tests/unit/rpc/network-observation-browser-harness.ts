// Copyright (c) LinkU Labs, Inc.
// SPDX-License-Identifier: Apache-2.0
// Native storage harness: controlled identity reports, no chain or wallet signing.
export { WalletNetworkObservations } from "../../../src/shared/rpc/network-observations";
export { networkObservationScope } from "../../../src/shared/rpc/network-observation-state";
export { validateNetworkProfile } from "../../../src/shared/rpc/profile";
export { profileFixture } from "../../../src/shared/rpc/profile-fixture";
import {
  networkBindingKey,
  type ValidatedNetworkProfile,
} from "../../../src/shared/rpc/profile";
import type { NetworkIdentityReport } from "../../../src/shared/rpc/identity";
export function report(
  p: ValidatedNetworkProfile,
  fullnode = "100",
  archive: string | null = "80",
): NetworkIdentityReport {
  return {
    state: "identity-verified",
    bindingKey: networkBindingKey(p),
    observedAt: Date.now(),
    endpoints: [
      {
        role: "fullnode",
        state: "verified",
        genesisDigest: p.expectedGenesisDigest,
        checkpointHeight: BigInt(fullnode),
      },
      {
        role: "graphql",
        state: "verified",
        genesisDigest: p.expectedGenesisDigest,
      },
      archive === null
        ? { role: "archive", state: "unavailable" }
        : {
            role: "archive",
            state: "verified",
            genesisDigest: p.expectedGenesisDigest,
            checkpointHeight: BigInt(archive),
          },
    ],
  };
}
export async function rawDatabase(
  name: string,
  version = 1,
  keyPath = "scope",
) {
  return new Promise<IDBDatabase>((resolve, reject) => {
    const r = indexedDB.open(name, version);
    r.onupgradeneeded = () => {
      if (r.transaction && !r.result.objectStoreNames.length)
        r.result.createObjectStore("observations-v1", { keyPath });
    };
    r.onerror = () => reject(r.error);
    r.onsuccess = () => resolve(r.result);
  });
}
export async function rawRow(
  name: string,
  scope: string,
  change?: (store: IDBObjectStore) => void,
) {
  const db = await rawDatabase(name);
  return new Promise<unknown>((resolve, reject) => {
    const tx = db.transaction(
      "observations-v1",
      change ? "readwrite" : "readonly",
      change ? { durability: "strict" } : undefined,
    );
    const store = tx.objectStore("observations-v1");
    if (change) change(store);
    const r = store.get(scope);
    tx.oncomplete = () => {
      db.close();
      resolve(r.result);
    };
    tx.onabort = () => {
      db.close();
      reject(tx.error);
    };
  });
}
