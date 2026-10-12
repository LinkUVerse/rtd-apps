// Read-only test observation. Return the original response after retaining its full clone.
async function install(page, origins, record) {
  await page.exposeBinding('__C101RetainActualRead', (_source, row) => record(row));
  await page.addInitScript(({ origins }) => {
    const nativeFetch = globalThis.fetch, allowed = new Set(origins);
    const base64 = bytes => {
      const values = new Uint8Array(bytes); let text = '';
      for (let i = 0; i < values.length; i += 8192)
        text += String.fromCharCode(...values.subarray(i, i + 8192));
      return btoa(text);
    };
    globalThis.fetch = async function(input, init) {
      const url = new URL(input instanceof Request ? input.url : String(input), location.href);
      if (!allowed.has(url.origin)) return nativeFetch.call(this, input, init);
      const startedAt = Date.now();
      let requestBytes;
      if (init && Object.prototype.hasOwnProperty.call(init, 'body'))
        requestBytes = await new Response(init.body ?? null).arrayBuffer();
      else requestBytes = input instanceof Request ? await input.clone().arrayBuffer() : new ArrayBuffer(0);
      const response = await nativeFetch.call(this, input, init);
      const responseBytes = await response.clone().arrayBuffer();
      await globalThis.__C101RetainActualRead({ observation: 'consumer-fetch-clone', url: url.href,
        status: response.status, headers: Object.fromEntries(response.headers),
        startedAt, receivedAt: Date.now(), requestBase64: base64(requestBytes), responseBase64: base64(responseBytes) });
      return response;
    };
  }, { origins });
}
module.exports = { install };
