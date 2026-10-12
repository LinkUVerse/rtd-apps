// Copyright (c) LinkU Labs, Inc.
// SPDX-License-Identifier: Apache-2.0
import { createMessage, type Message } from '_messages';
import { isErrorPayload, type Payload } from '_payloads';
import type { WindowMessageStream } from '_messaging/WindowMessageStream';
import type { Subscription } from 'rxjs';

/** AbortSignal stays in the page; only its request ID crosses the JSON message boundary. */
export function cancellableRequest<T extends Payload>(
  stream: WindowMessageStream,
  prepare: () => Promise<Payload>,
  signal?: AbortSignal,
): Promise<T> {
  return new Promise((resolve, reject) => {
    let request: Message | undefined;
    let subscription: Subscription | undefined;
    let settled = false;
    const cleanup = () => { signal?.removeEventListener('abort', abort); subscription?.unsubscribe(); };
    const fail = (error: unknown) => { if (!settled) { settled = true; cleanup(); reject(error); } };
    const abort = () => {
      if (settled) return;
      // Reject locally even if the port has disappeared. Background owns durable recovery.
      const id = request?.id;
      fail(signal?.reason ?? new DOMException('Request aborted', 'AbortError'));
      if (id) {
        try { stream.send(createMessage({ type: 'cancel-transaction-request', requestId: id })); }
        catch { /* Disconnect independently cancels background approval. */ }
      }
    };
    signal?.addEventListener('abort', abort, { once: true });
    if (signal?.aborted) { abort(); return; }
    Promise.resolve().then(prepare).then(payload => {
      if (settled) return;
      request = createMessage(payload);
      subscription = stream.messages.subscribe(message => {
        if (settled || message.id !== request?.id) return;
        if (isErrorPayload(message.payload)) { fail(new Error(message.payload.message)); return; }
        settled = true; cleanup(); resolve(message.payload as T);
      });
      stream.send(request);
    }).catch(fail);
  });
}
