// Copyright (c) LinkU Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

/** Test-only exclusive locks. Native browser behavior is verified separately. */
export function exclusiveLockManager(): Pick<LockManager, "request"> {
  const held = new Set<string>();
  const queues = new Map<string, (() => void)[]>();
  return {
    request: <T>(
      name: string,
      options: LockOptions,
      callback: (lock: Lock | null) => T | PromiseLike<T>,
    ): Promise<T> =>
      new Promise((resolve, reject) => {
        if (options.mode === "shared" || options.steal)
          throw new Error("exclusive test lock only");
        if (options.signal?.aborted) {
          reject(options.signal.reason);
          return;
        }
        const queue = queues.get(name) ?? [];
        queues.set(name, queue);
        const abort = () => {
          const index = queue.indexOf(start);
          if (index >= 0) queue.splice(index, 1);
          options.signal?.removeEventListener("abort", abort);
          reject(options.signal?.reason);
        };
        const start = () => {
          if (held.has(name) || queue[0] !== start) return;
          queue.shift();
          // Once granted, acquisition abort must not release the held physical lock.
          options.signal?.removeEventListener("abort", abort);
          held.add(name);
          const release = () => {
            held.delete(name);
            queueMicrotask(() => queue[0]?.());
          };
          void Promise.resolve()
            .then(() => callback({ name, mode: "exclusive" } as Lock))
            .then(
              (value) => { release(); resolve(value); },
              (error) => { release(); reject(error); },
            );
        };
        if (options.ifAvailable && (held.has(name) || queue.length)) {
          void Promise.resolve()
            .then(() => callback(null))
            .then(resolve, reject);
          return;
        }
        queue.push(start);
        options.signal?.addEventListener("abort", abort, { once: true });
        queueMicrotask(start);
      }),
  } as Pick<LockManager, "request">;
}
