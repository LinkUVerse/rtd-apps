// Copyright (c) LinkU Labs, Inc.
// SPDX-License-Identifier: Apache-2.0
// Unit-only transaction model. Native IndexedDB completion/abort is verified separately in Chromium.
import {
  captureNetworkObservation,
  reconcileNetworkObservation,
  networkObservationScope,
  WalletNetworkObservationError,
  type NetworkObservationStore,
  type NetworkObservationRecord,
} from "../../../src/shared/rpc/network-observation-state";
export class MemoryNetworkObservations implements NetworkObservationStore {
  readonly records = new Map<string, NetworkObservationRecord>();
  clear() {
    this.records.clear();
  }
  async capture(...[profile]: Parameters<NetworkObservationStore["capture"]>) {
    return captureNetworkObservation(
      profile,
      this.records.get(networkObservationScope(profile)),
    );
  }
  async observe(
    ...[profile, before, report]: Parameters<NetworkObservationStore["observe"]>
  ) {
    const result = reconcileNetworkObservation(
      profile,
      before,
      report,
      this.records.get(networkObservationScope(profile)),
    );
    if (result.next) this.records.set(result.next.scope, result.next);
    if (result.kind === "reset-required") throw result.reset!;
    if (result.kind === "stale")
      throw new WalletNetworkObservationError("stale");
  }
}
export const backgroundNetworkObservations = new MemoryNetworkObservations();
