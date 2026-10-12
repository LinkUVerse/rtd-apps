// Copyright (c) LinkU Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

export class WalletReadBudgetError extends Error {
  constructor() {
    super("读取等待队列已满，请稍后重试");
    this.name = "WalletReadBudgetError";
  }
}

export class WalletReadBudgetUnavailableError extends Error {
  constructor() {
    super("浏览器读取并发控制不可用，请重新打开钱包");
    this.name = "WalletReadBudgetUnavailableError";
  }
}

const slots = Array.from(
  { length: 4 },
  (_, index) => `wallet-read-transport:v1:${index}`,
);

/** One instance per context; native locks share physical permits across pages/workers. */
export class WalletReadConcurrency {
  #running = 0;
  readonly #waiting: (() => void)[] = [];

  async run<T>(
    signal: AbortSignal,
    operation: () => PromiseLike<T>,
  ): Promise<T> {
    signal.throwIfAborted();
    if (this.#running >= slots.length) {
      if (this.#waiting.length >= 64) throw new WalletReadBudgetError();
      await new Promise<void>((resolve, reject) => {
        const start = () => {
          signal.removeEventListener("abort", abort);
          // The previous request transfers its local slot directly to this waiter.
          resolve();
        };
        const abort = () => {
          const index = this.#waiting.indexOf(start);
          if (index >= 0) this.#waiting.splice(index, 1);
          signal.removeEventListener("abort", abort);
          reject(signal.reason);
        };
        this.#waiting.push(start);
        signal.addEventListener("abort", abort, { once: true });
        if (signal.aborted) abort();
      });
    } else this.#running++;

    try {
      signal.throwIfAborted();
      return await this.#physicalPermit(signal, operation);
    } finally {
      const next = this.#waiting.shift();
      if (next) next();
      else this.#running--;
    }
  }

  async #physicalPermit<T>(
    signal: AbortSignal,
    operation: () => PromiseLike<T>,
  ): Promise<T> {
    const locks = globalThis.navigator?.locks;
    if (!locks) throw new WalletReadBudgetUnavailableError();
    const alternatives = new AbortController();
    const acquisition = AbortSignal.any([signal, alternatives.signal]);
    let winner: number | undefined;
    const attempts = slots.map(async (name, index) => {
      return locks.request(
        name,
        { mode: "exclusive", signal: acquisition },
        async (lock) => {
          if (winner !== undefined) return;
          if (!lock) throw new WalletReadBudgetUnavailableError();
          winner = index;
          // Abort only pending alternatives, never the transport's signal or held lock.
          alternatives.abort();
          signal.throwIfAborted();
          return await operation();
        },
      );
    });
    // Observe every sibling rejection and wait until the winning physical lock is released.
    const results = await Promise.allSettled(attempts);
    if (winner === undefined) {
      signal.throwIfAborted();
      throw new WalletReadBudgetUnavailableError();
    }
    const result = results[winner];
    if (result.status === "rejected") throw result.reason;
    return result.value as T;
  }
}
