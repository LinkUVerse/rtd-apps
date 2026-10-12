// Current disk bundle in a fresh retained profile. No account or transaction payload output.
const { chromium } = require('@playwright/test');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const crypto = require('node:crypto');
const assert = require('node:assert/strict');
const { execFileSync } = require('node:child_process');

(async () => {
  const [output, mode = 'normal-ca', extensionArg] = process.argv.slice(2);
  assert(output && !fs.existsSync(output));
  assert(mode === 'normal-ca');
  const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'rtd-loopback-extension-readonly-'));
  const extension = extensionArg ? path.resolve(extensionArg) : path.resolve(__dirname, '../dist');
  assert(extension===fs.realpathSync(extension));
  assert(extension===path.resolve(__dirname,'../dist')||extension.startsWith(path.join(os.homedir(),'.local/state/rtd-wallet-migration/dev-20261003-01')+path.sep));
  const args = [`--disable-extensions-except=${extension}`, `--load-extension=${extension}`];
  let context, stage = 'launch', result;
  const requests = [], errors = [];
  try {
    context = await chromium.launchPersistentContext(profile, {
      executablePath: path.join(os.homedir(), 'Library/Caches/ms-playwright/chromium-1243/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing'),
      headless: true, args,
    });
    context.on('request', request => {
      const url = new URL(request.url());
      if (!['http:', 'https:'].includes(url.protocol)) return;
      requests.push({ local: ['127.0.0.1', 'localhost'].includes(url.hostname), method: request.method(), path: url.pathname });
    });
    const worker = context.serviceWorkers()[0] || await context.waitForEvent('serviceworker', { timeout: 15000 });
    stage = 'worker-source';
    const workerSource = await require('./lib/current-extension-worker.cjs').inspect(context, worker, extension);
    assert(workerSource.matchesDisk);
    const page = await context.newPage();
    page.on('pageerror', error => errors.push(error.name));
    stage = 'fresh-ui';
    await page.goto(new URL('ui.html', worker.url()).href, { waitUntil: 'domcontentloaded' });
    await page.locator('a[href*="add-account"]').waitFor({ timeout: 15000 });
    const uiSource = await require('./lib/current-extension-ui-source.cjs').inspect(context, page, extension);
    const ui = await page.evaluate(async () => {
      const port = chrome.runtime.connect({ name: 'rtd_ui<->background' });
      const id = crypto.randomUUID();
      const saved = await new Promise((resolve, reject) => {
        const timer = setTimeout(() => { port.disconnect(); reject(new Error('UI command timeout')); }, 5000);
        port.onMessage.addListener(message => { if (message.kind === 'rtd-ui-source-challenge') { port.postMessage({ kind: 'rtd-ui-source-confirm', nonce: message.nonce }); return; } if (message.id === id) { clearTimeout(timer); port.disconnect(); resolve(message.payload); } });
        port.postMessage({ id, payload: { type: 'method-payload', method: 'getSavedCustomProfile', args: {} } });
      });
      let alarm;
      for (let i = 0; i < 40; i++) {
        alarm = await chrome.alarms.get('wallet-execution-recovery-v2');
        if (alarm) break;
        await new Promise(resolve => setTimeout(resolve, 50));
      }
      return { savedProfileEmpty: saved.method === 'getSavedCustomProfileResponse' && saved.args.result === null, recoveryPeriodMinutes: alarm?.periodInMinutes };
    });
    assert(ui.savedProfileEmpty); assert.equal(ui.recoveryPeriodMinutes, 1);
    stage = 'extension-origin-readonly-identity';
    const endpoints = [
      ['fullnode', 'http://127.0.0.1:39400/rtd.rpc.v2.LedgerService/GetServiceInfo', false],
      ['archive', 'http://127.0.0.1:39613/archive/rtd.rpc.v2.LedgerService/GetServiceInfo', false],
      ['graphql', 'http://127.0.0.1:39610/graphql', true],
      ['account', 'http://127.0.0.1:39616/account/graphql', true],
    ];
    const identities = [];
    const { GrpcTypes } = await import(path.resolve(__dirname, '../../../rtd-ts-sdk/packages/typescript/dist/grpc/index.mjs'));
    for (const [role, url, graphql] of endpoints) {
      const accountQuery = role === 'account' ? fs.readFileSync(path.resolve(__dirname, '../src/shared/rpc/account-history-protocol.ts'), 'utf8').match(/export const HISTORY_COVERAGE_QUERY = `([^`]+)`;/)?.[1] : undefined;
      if (role === 'account') assert(accountQuery);
      const response = await page.evaluate(async ({ url, graphql, accountQuery }) => {
        try {
          const response = await fetch(url, { method: 'POST', headers: graphql ? { 'content-type': 'application/json' } : { 'content-type': 'application/grpc-web+proto', 'x-grpc-web': '1' }, body: graphql ? JSON.stringify(accountQuery ? { query: accountQuery, variables: { chain: '3tEPxLxUysGx4gfr8UEycvH7xohMWuwKVbTX5np4TCYj' } } : { query: '{ checkpoint(sequenceNumber: 0) { digest } }' }) : new Uint8Array(5), signal: AbortSignal.timeout(20000) });
          return { status: response.status, bytes: Array.from(new Uint8Array(await response.arrayBuffer())) };
        } catch (error) { return { failureType: error.name }; }
      }, { url, graphql, accountQuery });
      let sameGenesis = false, graphqlErrors;
      const bytes = Buffer.from(response.bytes || []);
      if (response.status === 200) {
        if (graphql) {
          const decoded = JSON.parse(bytes.toString()); graphqlErrors = decoded.errors?.map(error => ({ message: String(error.message).slice(0,240), code: error.extensions?.code ?? null }));
          sameGenesis = !decoded.errors?.length && (role === 'account' ? decoded.data?.accountHistoryCoverage?.chainId : decoded.data?.checkpoint?.digest) === '3tEPxLxUysGx4gfr8UEycvH7xohMWuwKVbTX5np4TCYj';
        } else {
          assert.equal(bytes[0], 0);
          const length = bytes.readUInt32BE(1);
          const info = GrpcTypes.GetServiceInfoResponse.fromBinary(bytes.subarray(5, 5 + length));
          sameGenesis = info.chainId === '3tEPxLxUysGx4gfr8UEycvH7xohMWuwKVbTX5np4TCYj';
          assert.match(bytes.subarray(5 + length + 5).toString(), /^grpc-status:\s*0\r?$/im);
        }
      }
      identities.push({ role, status: response.status, failureType: response.failureType, sameGenesis, graphqlErrors });
    }
    stage = 'readonly-native-observation';
    let nativeObservation;
    const deadline = Date.now() + 60000;
    for (;;) {
      nativeObservation = await page.evaluate(async () => {
        if (!(await indexedDB.databases()).some(row => row.name === 'RtdWallet NetworkAdmission')) return { exists: false };
        return new Promise((resolve, reject) => {
          const request = indexedDB.open('RtdWallet NetworkAdmission');
          request.onupgradeneeded = () => { request.transaction.abort(); reject(new Error('Readonly observation forbids upgrade')); };
          request.onerror = request.onblocked = () => reject(new Error('Native observation unavailable'));
          request.onsuccess = () => {
            const db = request.result;
            const tx = db.transaction('admission-v1', 'readonly');
            let rows;
            tx.oncomplete = () => { db.close(); resolve({ exists: true, rows }); };
            tx.onabort = tx.onerror = () => { db.close(); reject(new Error('Native readonly transaction failed')); };
            const read = tx.objectStore('admission-v1').getAll();
            read.onsuccess = () => { rows = read.result.map(row => ({ schemaVersion: row.schemaVersion, pendingCount: row.pending.length, faults: row.faults.map(fault => ({kind: fault.kind, role: fault.role, group: fault.group, domain: fault.domain, reason: fault.reason})) })); };
          };
        });
      });
      if (nativeObservation.exists && nativeObservation.rows.length && nativeObservation.rows.every(row => row.pendingCount === 0)) break;
      if (Date.now() >= deadline) break;
      await new Promise(resolve => setTimeout(resolve, 250));
    }
    const forbiddenRequests = requests.filter(row => /\/(ExecuteTransaction|SimulateTransaction)(?:$|\/)/.test(row.path)).length;
    assert.equal(forbiddenRequests, 0); assert.equal(errors.length, 0);
    const networkIdentityAccepted = identities.every(row => row.sameGenesis);
    result = { passed: true, actualExtensionId: new URL(worker.url()).host, loopbackDevelopment: true, normalChromeHttpsAccepted: false, certificateChanges: 0, inputsSha256: {[__filename]: crypto.createHash('sha256').update(fs.readFileSync(__filename)).digest('hex')}, observedAt: new Date().toISOString(), browser: context.browser().version(), certificateMode: mode, workerSource, uiSource, ui, identities, networkIdentityAccepted, nativeObservation, requestCount: requests.length, externalRequests: requests.filter(row => !row.local).length, forbiddenRequests, pageErrorCount: errors.length, profileDirectory: profile, scope: 'Fresh current extension startup, exact executed UI and worker bytes, readonly extension-origin identities and default native row counts only. A clear negative row is not authorization. No accounts, approval, simulation, signing, execution, original journals, custom permission save, global readiness or trial acceptance. All four current configured endpoints are literal loopback HTTP; no certificate exception or trust changes. This finite development identity result never proves original HTTPS CA acceptance.' };
  } catch (error) {
    result = { passed: false, observedAt: new Date().toISOString(), certificateMode: mode, stage, errorType: error.name, profileDirectory: profile, pageErrorCount: errors.length, scope: 'Failure retained; no account or transaction payload emitted' };
    process.exitCode = 1;
  } finally {
    if (context) await context.close();
    fs.writeFileSync(output, JSON.stringify(result, null, 2) + '\n', { flag: 'wx', mode: 0o600 });
    console.log(JSON.stringify({ passed: result.passed, stage: result.stage, certificateMode: mode, networkIdentityAccepted: result.networkIdentityAccepted, identities: result.identities, pageErrorCount: result.pageErrorCount }));
  }
})().catch(error => { console.error(JSON.stringify({ passed: false, errorType: error.name })); process.exitCode = 1; });
