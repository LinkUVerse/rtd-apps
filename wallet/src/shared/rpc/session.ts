// Copyright (c) LinkU Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { networkBindingKey, type ValidatedNetworkProfile } from "./profile";
import { WalletReadConcurrency } from "./read-concurrency";

export {
  WalletReadBudgetError,
  WalletReadBudgetUnavailableError,
} from "./read-concurrency";

// All sessions/bindings in this page or worker share the bounded local queue.
const readConcurrency = new WalletReadConcurrency();

export class StaleWalletSessionError extends Error {
  constructor() {
    super("钱包网络或账户会话已改变，请重新查询");
    this.name = "StaleWalletSessionError";
  }
}

/** Owns request cancellation and a fence for transports that finish after an abort. */
export class WalletReadSession {
  readonly signal: AbortSignal;
  readonly bindingKey: string;
  readonly cacheKey: string;
  readonly #controller = new AbortController();
  #active = true;

  /** Leaf SDK queries only: hold through body/trailers, never around nested readers. */
  async request<T>(
    signal: AbortSignal,
    operation: () => PromiseLike<T>,
  ): Promise<T> {
    this.assertActive();
    const cancellation = AbortSignal.any([this.signal, signal]);
    cancellation.throwIfAborted();
    return readConcurrency.run(cancellation, async () => {
      cancellation.throwIfAborted();
      this.assertActive();
      const value = await operation();
      cancellation.throwIfAborted();
      this.assertActive();
      return value;
    });
  }

  constructor(readonly profile: ValidatedNetworkProfile) {
    this.signal = this.#controller.signal;
    this.bindingKey = networkBindingKey(profile);
    // Re-entering the same profile still requires fresh admission; old UI caches are not a proof.
    this.cacheKey = JSON.stringify([this.bindingKey, crypto.randomUUID()]);
  }

  assertActive() {
    if (!this.#active || this.signal.aborted)
      throw new StaleWalletSessionError();
  }

  close() {
    this.#active = false;
    this.#controller.abort(new StaleWalletSessionError());
  }

  async read<T>(operation: (signal: AbortSignal) => Promise<T>): Promise<T> {
    this.assertActive();
    try {
      const value = await operation(this.signal);
      this.assertActive();
      return value;
    } catch (error) {
      this.assertActive();
      throw error;
    }
  }
}
