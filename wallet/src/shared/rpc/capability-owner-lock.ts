// Copyright (c) LinkU Labs, Inc.
// SPDX-License-Identifier: Apache-2.0
import { WalletNetworkAdmissionStateError } from "./network-admission-state";

export interface CapabilityOwnerLock {
  assertActive(): void;
  release(): void;
}

/** The grant is authoritative; a lock snapshot or elapsed time is never ownership. */
export function acquireCapabilityOwnerLock(
  database: string,
  ticketId: string,
): Promise<CapabilityOwnerLock | null> {
  const locks = globalThis.navigator?.locks;
  if (!locks)
    return Promise.reject(new WalletNetworkAdmissionStateError("unavailable"));
  return new Promise((resolve, reject) => {
    let settled = false;
    const timer = setTimeout(() => {
      if (settled) return;
      settled = true;
      reject(new WalletNetworkAdmissionStateError("unavailable"));
    }, 5000);
    try {
      void locks
        .request(
          JSON.stringify([
            "rtd-wallet-read-observation-owner-v1",
            database,
            ticketId,
          ]),
          { mode: "exclusive", ifAvailable: true },
          (lock) => {
            // A late native grant after acquisition failure must never create a reservation.
            if (settled) return;
            settled = true;
            clearTimeout(timer);
            if (!lock) {
              resolve(null);
              return;
            }
            let active = true;
            return new Promise<void>((finish) => {
              resolve(
                Object.freeze({
                  assertActive: () => {
                    if (!active)
                      throw new WalletNetworkAdmissionStateError("stale");
                  },
                  release: () => {
                    if (active) {
                      active = false;
                      finish();
                    }
                  },
                }),
              );
            });
          },
        )
        .catch(() => {
          if (settled) return;
          settled = true;
          clearTimeout(timer);
          reject(new WalletNetworkAdmissionStateError("unavailable"));
        });
    } catch {
      settled = true;
      clearTimeout(timer);
      reject(new WalletNetworkAdmissionStateError("unavailable"));
    }
  });
}
