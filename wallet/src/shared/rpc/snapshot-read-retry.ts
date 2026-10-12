// Copyright (c) LinkU Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

/** Only for authored snapshot queries. Never use for execution or faucet requests. */
export async function fetchSnapshotRead(
  fetchFn: typeof fetch,
  input: RequestInfo | URL,
  init: RequestInit,
): Promise<Response> {
  const signal = init.signal;
  // Browser fetch failures cannot distinguish CORS/TLS/configuration from outages.
  // Only explicit transient HTTP statuses qualify; thrown errors pass through.
  for (let attempt = 0; ; attempt++) {
    signal?.throwIfAborted();
    const response = await fetchFn(input, init);
    signal?.throwIfAborted();
    if (attempt === 2 || ![408, 429, 502, 503, 504].includes(response.status))
      return response;
    const retryAfter = response.headers.get("Retry-After");
    const seconds =
      retryAfter !== null && /^\d+$/.test(retryAfter)
        ? Number(retryAfter)
        : NaN;
    const date = retryAfter === null ? NaN : Date.parse(retryAfter);
    const requestedDelay = !Number.isNaN(seconds)
      ? seconds * 1000
      : Number.isFinite(date)
        ? Math.max(0, date - Date.now())
        : 0;
    const delay = Math.max(
      200 * 2 ** attempt + Math.random() * 100,
      requestedDelay,
    );
    // Do not retry earlier than a long server backoff (or overflow a JS timer).
    if (!Number.isFinite(delay) || delay > 60_000) return response;
    // Release discarded response streams before retrying the identical request.
    void response.body?.cancel().catch(() => {});
    await new Promise<void>((resolve, reject) => {
      const abort = () => {
        clearTimeout(timer);
        signal?.removeEventListener("abort", abort);
        reject(signal?.reason);
      };
      const timer = setTimeout(() => {
        signal?.removeEventListener("abort", abort);
        resolve();
      }, delay);
      signal?.addEventListener("abort", abort, { once: true });
      if (signal?.aborted) abort();
    });
  }
}
