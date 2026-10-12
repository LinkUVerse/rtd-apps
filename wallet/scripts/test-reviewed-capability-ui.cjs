// Copyright (c) LinkU Labs, Inc.
// SPDX-License-Identifier: Apache-2.0
// Fresh account-free sustained UI: capture actual service-info scalars and public admission.
process.env.PW_EXPERIMENTAL_SERVICE_WORKER_NETWORK_EVENTS = '1';
const { chromium } = require('@playwright/test');
const fs = require('node:fs'), path = require('node:path'), os = require('node:os');
const crypto = require('node:crypto'), assert = require('node:assert/strict');
const { GrpcTypes } = require('rtd-typescript/grpc');
const sha = b => crypto.createHash('sha256').update(b).digest('hex');
(async () => {
  const [outputArg, fixtureArg] = process.argv.slice(2), output = path.resolve(outputArg), fixture = path.resolve(fixtureArg);
  const runtime = path.join(os.homedir(), '.local/state/rtd-wallet-migration/dev-20261003-01');
  assert(path.dirname(fixture) === runtime && path.basename(fixture).startsWith('capability-chrome-fixture-'));
  assert(!fs.existsSync(output) && !fs.existsSync(fixture)); fs.mkdirSync(fixture, { mode: 0o700 });
  const extension = path.join(runtime, 'certified-release-production-20261006-03');
  const methods = new Set(['LedgerService/GetServiceInfo', 'LedgerService/GetCheckpoint', 'LedgerService/GetObject',
    'StateService/GetCoinInfo', 'MovePackageService/GetPackage', 'MovePackageService/GetDatatype', 'MovePackageService/GetFunction']);
  const context = await chromium.launchPersistentContext(path.join(fixture, 'profile'), {
    executablePath: path.join(os.homedir(), 'Library/Caches/ms-playwright/chromium-1243/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing'),
    headless: true, viewport: { width: 800, height: 600 },
    args: [`--disable-extensions-except=${extension}`, `--load-extension=${extension}`, '--window-size=800,600'],
  });
  const serviceInfos = [], requests = [], captureWork = [], start = Date.now();
  try {
    await context.route('**/*', async route => {
      const url = new URL(route.request().url());
      if (['http:', 'https:'].includes(url.protocol)) {
        const method = url.pathname.replace('/rtd.rpc.v2.', '');
        const allowed = url.origin === 'http://127.0.0.1:39400' && methods.has(method);
        requests.push({ origin: url.origin, method, allowed, elapsedMs: Date.now() - start });
        await (allowed ? route.continue() : route.abort()); return;
      }
      await route.continue();
    });
    context.on('response', response => {
      if (response.url() !== 'http://127.0.0.1:39400/rtd.rpc.v2.LedgerService/GetServiceInfo') return;
      captureWork.push((async () => {
        try {
          const bytes = await response.body(); assert(bytes[0] === 0 && bytes.length >= 5);
          const info = GrpcTypes.GetServiceInfoResponse.fromBinary(bytes.subarray(5, 5 + bytes.readUInt32BE(1)));
          const row = { elapsedMs: Date.now() - start, status: response.status() };
          for (const field of ['chainId', 'checkpointHeight', 'lowestAvailableCheckpoint', 'lowestAvailableCheckpointObjects'])
            row[field] = typeof info[field] === 'bigint' ? info[field].toString() : info[field] ?? null;
          serviceInfos.push(row);
        } catch (error) { serviceInfos.push({ captureFailure: error.name }); }
      })());
    });
    const worker = context.serviceWorkers()[0] || await context.waitForEvent('serviceworker');
    const workerSource = await require('./lib/current-extension-worker.cjs').inspect(context, worker, extension);
    assert(workerSource.matchesDisk);
    const page = await context.newPage(), url = new URL('ui.html', worker.url()).href;
    const uiSource = await require('./lib/current-extension-ui-source.cjs').inspect(context, page, extension,
      ['ui.js', '700.js', '503.js'], { url, navigate: async () => { await page.goto(url); await page.locator('a[href*="add-account"]').first().waitFor(); } });
    const read = () => worker.evaluate(async () => {
      const name = 'RtdWallet NetworkAdmission';
      if (!(await indexedDB.databases()).some(row => row.name === name)) return [];
      return new Promise((resolve, reject) => {
        const r = indexedDB.open(name);
        r.onupgradeneeded = () => { r.transaction.abort(); reject(new Error('No database mutation allowed')); };
        r.onerror = () => reject(new Error('Readonly admission unavailable'));
        r.onsuccess = () => {
          const db = r.result, tx = db.transaction('admission-v1', 'readonly'), q = tx.objectStore('admission-v1').getAll(); let rows;
          q.onsuccess = () => { rows = q.result.map(row => ({ faults: row.faults, pending: row.pending.map(ticket => ({ areas: ticket.areas })) })); };
          tx.oncomplete = () => { db.close(); resolve(rows); };
          tx.onabort = tx.onerror = () => { db.close(); reject(new Error('Readonly admission aborted')); };
        };
      });
    });
    let rows, sawPending = false;
    const deadline = Date.now() + 120000;
    do {
      rows = await read(); sawPending ||= rows.some(row => row.pending.length > 0);
      if (rows.length && rows.every(row => row.pending.length === 0)) break;
      if (Date.now() >= deadline) break;
      await new Promise(resolve => setTimeout(resolve, 200));
    } while (true);
    await Promise.all(captureWork);
    const result = { probeCompleted: true, observedAt: new Date().toISOString(), fixture, browser: context.browser().version(),
      uiSource, workerSource, rows, sawPending, physicalObservationSettled: rows.length > 0 && rows.every(row => row.pending.length === 0),
      admissionFaultFree: rows.length > 0 && rows.every(row => row.faults.length === 0), serviceInfos, requests,
      signatures: 0, simulations: 0, executions: 0, faucetRequests: 0, originalProfilesOpened: 0, certificateChanges: 0,
      inputsSha256: Object.fromEntries([__filename, path.join(__dirname, 'lib/current-extension-worker.cjs'), path.join(__dirname, 'lib/current-extension-ui-source.cjs')].map(file => [file, sha(fs.readFileSync(file))])),
      scope: 'Actual candidate account-free passive NC5 UI and HTTP Fullnode bookends; HTTPS is blocked, no TLS or transaction admission acceptance. Faults retained, never reset.' };
    fs.writeFileSync(output, JSON.stringify(result, null, 2) + '\n', { flag: 'wx', mode: 0o600 });
    console.log(JSON.stringify({ probeCompleted: true, physicalObservationSettled: result.physicalObservationSettled,
      admissionFaultFree: result.admissionFaultFree, serviceInfos, rows }));
  } finally { await context.close(); }
})().catch(error => { console.error(JSON.stringify({ probeCompleted: false, errorType: error.name, message: String(error.message).split('\n')[0].slice(0, 200) })); process.exitCode = 1; });
