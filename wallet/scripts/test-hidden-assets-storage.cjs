#!/usr/bin/env node
// Real Chromium IndexedDB storage checks; not wallet extension UI acceptance.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const http = require('node:http');
const {execFileSync} = require('node:child_process');
const {chromium} = require('@playwright/test');
(async () => {
  const temporary = fs.mkdtempSync(path.join(os.tmpdir(), 'wallet-hidden-assets-'));
  let browser, server;
  try {
    const bundle = path.join(temporary, 'bundle.js');
    execFileSync('pnpm', ['exec', 'esbuild', 'tests/unit/rpc/hidden-assets-browser-harness.ts', '--bundle', '--platform=browser', '--format=iife', '--global-name=HiddenAssets', `--outfile=${bundle}`], {cwd: path.resolve(__dirname, '..'), stdio:'pipe'});
    server = http.createServer((request, response) => {
      response.setHeader('Content-Type', request.url === '/bundle.js' ? 'text/javascript' : 'text/html');
      response.end(request.url === '/bundle.js' ? fs.readFileSync(bundle) : '<!doctype html><script src="/bundle.js"></script>');
    });
    await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
    browser = await chromium.launch({executablePath: path.join(os.homedir(), 'Library/Caches/ms-playwright/chromium-1243/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing'), headless:true});
    const context = await browser.newContext();
    const pages = await Promise.all([context.newPage(), context.newPage()]);
    const url = `http://127.0.0.1:${server.address().port}`;
    await Promise.all(pages.map((page) => page.goto(url)));
    await Promise.all(pages.map((page, index) => page.evaluate(async (offset) => {
      const H = globalThis.HiddenAssets, key = H.hiddenAssetKey('chain/generation', '0x1');
      for (let i = 0; i < 10; i++) await H.changeHiddenAsset(key, `0x${(offset * 10 + i + 1).toString(16)}`, true);
    }, index)));
    const result = await pages[0].evaluate(async () => {
      const H = globalThis.HiddenAssets, key = H.hiddenAssetKey('chain/generation', '0x1');
      const concurrentCount = (await H.readHiddenAssets(key)).length;
      await H.changeHiddenAsset(key, '0x1', false);
      await H.set('hidden-asset-ids', ['0x42']);
      return { concurrentCount, afterUndo: (await H.readHiddenAssets(key)).length,
        otherAccount: await H.readHiddenAssets(H.hiddenAssetKey('chain/generation', '0x2')),
        otherChain: await H.readHiddenAssets(H.hiddenAssetKey('other/generation', '0x1')),
        legacy: await H.get('hidden-asset-ids') };
    });
    assert.equal(result.concurrentCount, 20); assert.equal(result.afterUndo, 19);
    assert.deepEqual(result.otherAccount, []); assert.deepEqual(result.otherChain, []); assert.deepEqual(result.legacy, ['0x42']);
    await pages[1].reload();
    assert.equal(await pages[1].evaluate(async () => (await HiddenAssets.readHiddenAssets(HiddenAssets.hiddenAssetKey('chain/generation', '0x1'))).length), 19);
    console.log(JSON.stringify({browser: browser.version(), passed:true, ...result, reloadPersisted:true, scope:'Native IndexedDB, two tabs; no extension UI or chain proof'}, null, 2));
  } finally { await browser?.close(); if (server) await new Promise((resolve) => server.close(resolve)); fs.rmSync(temporary, {recursive:true, force:true}); }
})().catch((error) => {console.error(error); process.exitCode = 1;});
