// Copyright (c) LinkU Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

/** Dispose only when the owning operation has settled; cancellation stays latched. */
export function createReadDeadline(timeoutMs: number) {
  if (!Number.isSafeInteger(timeoutMs) || timeoutMs < 1 || timeoutMs > 60_000)
    throw new RangeError("读取期限必须在1–60000ms");
  const controller = new AbortController();
  const timer = setTimeout(
    () => controller.abort(new DOMException("读取期限已到", "TimeoutError")),
    timeoutMs,
  );
  return { signal: controller.signal, dispose: () => clearTimeout(timer) };
}
