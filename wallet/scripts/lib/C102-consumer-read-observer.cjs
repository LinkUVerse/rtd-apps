// Original promise/response delivery; retain completed clones and explicit original-signal cancellations separately.
async function install(page, origins, record) {
  await page.exposeBinding('__C101RetainActualRead', (_source, row) => record(row));
  await page.addInitScript(({ origins }) => {
    const nativeFetch = globalThis.fetch, allowed = new Set(origins);
    const state = { pending: new Set(), failures: [], nativeFailures: [], cancelledClones: [], retained: 0 };
    globalThis.__C101ReadObservation = state;
    const base64 = bytes => {
      const values = new Uint8Array(bytes); let text = '';
      for (let i = 0; i < values.length; i += 8192)
        text += String.fromCharCode(...values.subarray(i, i + 8192));
      return btoa(text);
    };
    globalThis.fetch = function(input, init) {
      const url = new URL(input instanceof Request ? input.url : String(input), location.href);
      if (!allowed.has(url.origin)) return nativeFetch.call(this, input, init);
      const startedAt = Date.now(), signal = init?.signal ?? (input instanceof Request ? input.signal : null);
      const requestBytes = init && Object.prototype.hasOwnProperty.call(init, 'body')
        ? new Response(init.body ?? null).arrayBuffer()
        : input instanceof Request ? input.clone().arrayBuffer() : Promise.resolve(new ArrayBuffer(0));
      const original = nativeFetch.call(this, input, init);
      let stage = 'fetch', metadata;
      const observation = original.then(async response => {
        stage = 'clone';
        const clone = response.clone(), reply = clone.arrayBuffer();
        // A clone may abort while the independently cloned request body is being read.
        void reply.catch(() => {});
        stage = 'request-body';
        const request = await requestBytes;
        metadata = { url: url.href, status: response.status, headers: Object.fromEntries(response.headers),
          startedAt, requestBase64: base64(request) };
        stage = 'response-body';
        const bytes = await reply;
        stage = 'record';
        await globalThis.__C101RetainActualRead({ observation: 'consumer-fetch-clone', ...metadata,
          receivedAt: Date.now(), responseBase64: base64(bytes) });
        state.retained++;
      }, async error => {
        await Promise.allSettled([requestBytes]);
        state.nativeFailures.push({ url: url.href, errorType: error?.name ?? 'Error' });
      }).catch(error => {
        const failure = { ...metadata, url: url.href, stage, errorType: error?.name ?? 'Error',
          signalAborted: signal?.aborted === true, abortReasonType: signal?.reason?.name ?? null };
        if (stage === 'response-body' && error?.name === 'AbortError' && signal?.aborted === true)
          state.cancelledClones.push({ ...failure, incompleteResponse: true });
        else state.failures.push(failure);
      });
      state.pending.add(observation);
      void observation.finally(() => state.pending.delete(observation));
      return original;
    };
  }, { origins });
}

async function flush(page) {
  const result = await page.evaluate(async () => {
    const state = globalThis.__C101ReadObservation;
    if (!state) return { installed: false, pending: 0, failures: [], nativeFailures: [], cancelledClones: [], retained: 0 };
    while (state.pending.size) await Promise.all([...state.pending]);
    return { installed: true, pending: state.pending.size, failures: state.failures,
      nativeFailures: state.nativeFailures, cancelledClones: state.cancelledClones, retained: state.retained };
  });
  if (result.failures.length || result.pending) throw new Error('Actual consumer response retention failed');
  return result;
}

module.exports = { install, flush };
