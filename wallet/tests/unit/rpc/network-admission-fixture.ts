// Copyright (c) LinkU Labs, Inc.
// SPDX-License-Identifier: Apache-2.0
// Control-flow fixture only. Never native commit, timing or persistence evidence.
import {
  assertNetworkAdmissionClear,
  completeNetworkAdmissionObservation,
  createNetworkAdmissionTicket,
  reserveNetworkAdmissionObservation,
  WalletNetworkAdmissionStateError,
  type NetworkAdmissionRecord,
  type NetworkAdmissionTicket,
} from "../../../src/shared/rpc/network-admission-state";
import { networkBindingKey } from "../../../src/shared/rpc/profile";
import type { TransactionAdmissionStore } from "../../../src/shared/rpc/transaction-network-identity";
export class MemoryNetworkAdmission implements TransactionAdmissionStore {
  readonly records = new Map<string, NetworkAdmissionRecord>();
  #owners = new WeakMap<NetworkAdmissionTicket, string>();
  clear() {
    this.records.clear();
    this.#owners = new WeakMap();
  }
  async assertClear(
    ...[p, areas]: Parameters<TransactionAdmissionStore["assertClear"]>
  ) {
    assertNetworkAdmissionClear(
      p,
      this.records.get(networkBindingKey(p)),
      areas,
    );
  }
  async runIfClear<T>(
    p: Parameters<TransactionAdmissionStore["assertClear"]>[0],
    areas: Parameters<TransactionAdmissionStore["assertClear"]>[1],
    start: () => Promise<T>,
  ): Promise<T> {
    assertNetworkAdmissionClear(
      p,
      this.records.get(networkBindingKey(p)),
      areas,
    );
    return start();
  }
  async begin(...[p, areas]: Parameters<TransactionAdmissionStore["begin"]>) {
    const ticket = createNetworkAdmissionTicket(areas),
      key = networkBindingKey(p);
    this.records.set(
      key,
      reserveNetworkAdmissionObservation(p, this.records.get(key), ticket),
    );
    this.#owners.set(ticket, key);
    return ticket;
  }
  async complete(
    ...[p, ticket, faults]: Parameters<TransactionAdmissionStore["complete"]>
  ) {
    const key = networkBindingKey(p);
    if (this.#owners.get(ticket) !== key)
      throw new WalletNetworkAdmissionStateError("stale");
    const next = completeNetworkAdmissionObservation(
      p,
      this.records.get(key),
      ticket,
      faults,
    );
    this.records.set(key, next);
    this.#owners.delete(ticket);
    return next;
  }
}
export const backgroundNetworkAdmission = new MemoryNetworkAdmission();
