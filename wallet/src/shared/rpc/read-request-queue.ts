// Copyright (c) LinkU Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

type Pending<I, O> = {
  input: I;
  signal: AbortSignal;
  resolve: (value: O) => void;
  reject: (reason: unknown) => void;
  remove: () => void;
  active: boolean;
};

/** Coalesce only requests not yet dispatched. Never reuse an earlier observation
 * for a later read-after-read fence, and never retain a completed result.
 */
export class ReadRequestQueue<I, O> {
  #pending: Pending<I, O>[] = [];
  #scheduled = false;

  constructor(
    private readonly execute: (
      inputs: readonly I[],
      signal: AbortSignal,
    ) => Promise<readonly PromiseSettledResult<O>[]>,
    private readonly onDispatch: () => void = () => {},
  ) {}

  request(input: I, signal: AbortSignal): Promise<O> {
    signal.throwIfAborted();
    return new Promise((resolve, reject) => {
      const item: Pending<I, O> = {
        input,
        signal,
        resolve,
        reject,
        active: true,
        remove: () => {},
      };
      const abort = () => {
        item.active = false;
        reject(signal.reason);
      };
      signal.addEventListener("abort", abort, { once: true });
      item.remove = () => signal.removeEventListener("abort", abort);
      this.#pending.push(item);
      if (!this.#scheduled) {
        this.#scheduled = true;
        // Independent polling timers run in separate tasks. Collect until the
        // next task, while still releasing the batch before its I/O starts.
        setTimeout(() => void this.flush(), 0);
      }
    });
  }

  private async flush() {
    const pending = this.#pending;
    this.#pending = [];
    this.#scheduled = false;
    // Release factory indexes even when every subscriber cancelled before I/O.
    this.onDispatch();
    const active = pending.filter((item) => item.active);
    for (const item of pending) if (!item.active) item.remove();
    if (!active.length) return;
    const controller = new AbortController();
    const cancelIfUnused = () => {
      if (active.every((item) => item.signal.aborted)) controller.abort();
    };
    for (const item of active)
      item.signal.addEventListener("abort", cancelIfUnused, { once: true });
    try {
      const results = await this.execute(
        active.map((item) => item.input),
        controller.signal,
      );
      if (results.length !== active.length)
        throw new Error("查询合并结果数量不符");
      for (const [index, item] of active.entries()) {
        if (!item.active) continue;
        const result = results[index];
        if (result.status === "fulfilled") item.resolve(result.value);
        else item.reject(result.reason);
      }
    } catch (error) {
      for (const item of active) if (item.active) item.reject(error);
    } finally {
      for (const item of active) {
        item.remove();
        item.signal.removeEventListener("abort", cancelIfUnused);
      }
    }
  }
}
