// Copyright (c) LinkU Labs, Inc.
// SPDX-License-Identifier: Apache-2.0
import { NetworkIdentityError } from "./identity";
import {
  validateNetworkAdmissionFault,
  WalletNetworkAdmissionStateError,
  type NetworkAdmissionFault,
  type NetworkAdmissionTicket,
} from "./network-admission-state";
import type { WalletReadSession } from "./session";

declare const terminalFailure: unique symbol;
export type CapabilityTerminalFailure = Readonly<{ [terminalFailure]: true }>;
type Receipt = {
  bindingKey: string;
  ticket: NetworkAdmissionTicket;
  faults: readonly NetworkAdmissionFault[];
};
const receipts = new WeakMap<CapabilityTerminalFailure, Receipt>();

/** One process-local receipt, bound to the original ticket object, never a positive authority. */
export function consumeCapabilityTerminalFailure(
  input: CapabilityTerminalFailure,
  bindingKey: string,
  ticket: NetworkAdmissionTicket,
): readonly NetworkAdmissionFault[] {
  const receipt = receipts.get(input);
  if (
    !receipt ||
    receipt.bindingKey !== bindingKey ||
    receipt.ticket !== ticket
  )
    throw new WalletNetworkAdmissionStateError("stale");
  receipts.delete(input);
  return receipt.faults;
}

/** Own raw work beyond cancellation wrappers, including fetch/body/cancel cleanup. */
export class CapabilityObservationLifetime {
  readonly #bindingKey: string;
  readonly #ticket: NetworkAdmissionTicket;
  readonly #work = new Set<Promise<unknown>>();
  readonly #faults = new Map<string, NetworkAdmissionFault>();
  #sealed = false;
  #finish: ((receipt: CapabilityTerminalFailure) => void) | undefined;
  #receipt: Promise<CapabilityTerminalFailure> | undefined;
  constructor(session: WalletReadSession, ticket: NetworkAdmissionTicket) {
    this.#bindingKey = session.bindingKey;
    this.#ticket = ticket;
  }
  noteFault(input: NetworkAdmissionFault) {
    // A tracked continuation may discover a definite negative after UI cancellation.
    const fault = validateNetworkAdmissionFault(input);
    this.#faults.set(JSON.stringify(fault), fault);
  }
  noteError(error: unknown) {
    if (error instanceof NetworkIdentityError)
      this.noteFault({
        kind: "identity",
        role: error.role,
        reason: error.reason,
      });
  }
  track<T>(work: Promise<T>): Promise<T> {
    if (this.#sealed) {
      void work.catch(() => undefined);
      throw new WalletNetworkAdmissionStateError("stale");
    }
    const owned = work.then(
      (value) => value,
      (error) => {
        this.noteError(error);
        throw error;
      },
    );
    this.#work.add(owned);
    void owned.then(
      () => {
        this.#work.delete(owned);
        this.#settle();
      },
      () => {
        this.#work.delete(owned);
        this.#settle();
      },
    );
    return owned;
  }
  assertOpen() {
    if (this.#sealed) throw new WalletNetworkAdmissionStateError("stale");
  }
  fail(error: unknown): Promise<CapabilityTerminalFailure> {
    this.noteError(error);
    if (this.#receipt) return this.#receipt;
    this.#sealed = true;
    this.#receipt = new Promise((resolve) => {
      this.#finish = resolve;
    });
    this.#settle();
    return this.#receipt;
  }
  #settle() {
    if (!this.#sealed || this.#work.size || !this.#finish) return;
    const input = Object.freeze({}) as CapabilityTerminalFailure;
    receipts.set(input, {
      bindingKey: this.#bindingKey,
      ticket: this.#ticket,
      faults: Object.freeze([...this.#faults.values()]),
    });
    const finish = this.#finish;
    this.#finish = undefined;
    finish(input);
  }
}
