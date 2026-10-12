// Copyright (c) LinkU Labs, Inc.
// SPDX-License-Identifier: Apache-2.0
// Inspect only public admission state in a fresh encrypted copy, with network blocked.
const { chromium } = require('@playwright/test');
const fs = require('node:fs'), path = require('node:path'), os = require('node:os');
const crypto = require('node:crypto'), assert = require('node:assert/strict');
const sha = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
const runtime = path.join(os.homedir(), '.local/state/rtd-wallet-migration/dev-20261003-01');
function inventory(root) {
  const files = [];
  function visit(directory) {
    for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
      const file = path.join(directory, entry.name);
      if (entry.name.startsWith('Singleton') || entry.isSymbolicLink()) continue;
      if (entry.isDirectory()) visit(file);
      else if (entry.isFile()) files.push({ file: path.relative(root, file), sha256: sha(fs.readFileSync(file)) });
    }
  }
  visit(root); return files.sort((a, b) => a.file.localeCompare(b.file));
}
(async () => {
  const [sourceArg, cloneArg, outputArg] = process.argv.slice(2);
  const source = fs.realpathSync(sourceArg), clone = path.resolve(cloneArg), output = path.resolve(outputArg);
  assert(source.startsWith(runtime + '/funded-signing-fixture-') && source.endsWith('/created-profile'));
  assert(path.dirname(clone) === runtime && path.basename(clone).startsWith('funded-signing-failure-diagnostic-'));
  assert(!fs.existsSync(clone) && !fs.existsSync(output));
  const before = inventory(source);
  fs.cpSync(source, clone, { recursive: true, filter: file => !path.basename(file).startsWith('Singleton') && !fs.lstatSync(file).isSymbolicLink() });
  assert.deepEqual(inventory(clone), before);
  const extension = path.join(runtime, 'certified-release-production-20261006-03');
  const context = await chromium.launchPersistentContext(clone, {
    executablePath: path.join(os.homedir(), 'Library/Caches/ms-playwright/chromium-1243/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing'),
    headless: true, viewport: { width: 800, height: 600 },
    args: [`--disable-extensions-except=${extension}`, `--load-extension=${extension}`, '--window-size=800,600'],
  });
  try {
    await context.route('**/*', route => ['http:', 'https:'].includes(new URL(route.request().url()).protocol) ? route.abort() : route.continue());
    assert(context.pages().every(page => !page.url().startsWith('chrome-extension:')), 'No restored extension UI may start an observation');
    const worker = context.serviceWorkers()[0] || await context.waitForEvent('serviceworker');
    const workerSource = await require('./lib/current-extension-worker.cjs').inspect(context, worker, extension);
    assert(workerSource.matchesDisk);
    const admission = await worker.evaluate(async () => {
      const name = 'RtdWallet NetworkAdmission';
      if (!(await indexedDB.databases()).some(row => row.name === name)) return { exists: false, rows: [] };
      return new Promise((resolve, reject) => {
        const request = indexedDB.open(name);
        request.onupgradeneeded = () => { request.transaction.abort(); reject(new Error('No schema mutation allowed')); };
        request.onerror = () => reject(new Error('Readonly admission open failed'));
        request.onsuccess = () => {
          const db = request.result, tx = db.transaction('admission-v1', 'readonly');
          const read = tx.objectStore('admission-v1').getAll(); let rows;
          read.onsuccess = () => { rows = read.result.map(row => ({ faults: row.faults, pending: row.pending.map(ticket => ({ areas: ticket.areas })) })); };
          tx.oncomplete = () => { db.close(); resolve({ exists: true, rows }); };
          tx.onabort = tx.onerror = () => { db.close(); reject(new Error('Readonly admission aborted')); };
        };
      });
    });
    assert.deepEqual(inventory(source), before);
    const result = { passed: true, observedAt: new Date().toISOString(), source, clone, sourceFiles: before.length,
      sourceManifestSha256: sha(JSON.stringify(before)), originalSourceUnchanged: true, workerSource, admission,
      signatures: 0, simulations: 0, executions: 0, originalProfilesOpened: 0, certificateChanges: 0,
      scope: 'Public post-test admission in encrypted clone before any new UI; not state at the original failed signature time. Source profile never opened or reset.' };
    fs.writeFileSync(output, JSON.stringify(result, null, 2) + '\n', { flag: 'wx', mode: 0o600 });
    console.log(JSON.stringify({ passed: true, sourceFiles: before.length, admission }));
  } finally { await context.close(); }
})().catch(error => { console.error(JSON.stringify({ passed: false, errorType: error.name, message: String(error.message).split('\n')[0].slice(0, 200) })); process.exitCode = 1; });
