// Observe actual response clones without delaying delivery to the wallet caller.
async function install(page, origins, record) {
  await page.exposeBinding('__C101RetainActualRead', (_source, row) => record(row));
  await page.addInitScript(({ origins }) => {
    const nativeFetch = globalThis.fetch, allowed = new Set(origins);
    const state = { pending: new Set(), failures: [], nativeFailures: [], retained: 0 };
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
      const startedAt = Date.now();
      const requestBytes = init && Object.prototype.hasOwnProperty.call(init, 'body')
        ? new Response(init.body ?? null).arrayBuffer()
        : input instanceof Request ? input.clone().arrayBuffer() : Promise.resolve(new ArrayBuffer(0));
      const original = nativeFetch.call(this, input, init);
      const observation = original.then(async response => {
        // This callback is registered before the caller can consume the original body.
        const clone = response.clone();
        const [request, reply] = await Promise.all([requestBytes, clone.arrayBuffer()]);
        await globalThis.__C101RetainActualRead({ observation: 'consumer-fetch-clone', url: url.href,
          status: response.status, headers: Object.fromEntries(response.headers),
          startedAt, receivedAt: Date.now(), requestBase64: base64(request), responseBase64: base64(reply) });
        state.retained++;
      }, async error => {
        await Promise.allSettled([requestBytes]);
        state.nativeFailures.push({ url: url.href, errorType: error?.name ?? 'Error' });
      }).catch(error => state.failures.push({ url: url.href, errorType: error?.name ?? 'Error' }));
      state.pending.add(observation);
      void observation.finally(() => state.pending.delete(observation));
      return original;
    };
  }, { origins });
}

async function flush(page) {
  const result = await page.evaluate(async () => {
    const state = globalThis.__C101ReadObservation;
    if (!state) return { installed: false, pending: 0, failures: [], nativeFailures: [], retained: 0 };
    while (state.pending.size) await Promise.all([...state.pending]);
    return { installed: true, pending: state.pending.size, failures: state.failures,
      nativeFailures: state.nativeFailures, retained: state.retained };
  });
  if (result.failures.length || result.pending) throw new Error('Actual consumer response retention failed');
  return result;
}

module.exports = { install, flush };
