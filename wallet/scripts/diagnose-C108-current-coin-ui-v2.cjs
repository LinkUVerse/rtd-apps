// Own C108 profile only; actual readonly UI/cache/admission diagnosis, no positive acceptance.
process.env.PW_EXPERIMENTAL_SERVICE_WORKER_NETWORK_EVENTS = '1';
const fs = require('node:fs'), path = require('node:path'), os = require('node:os');
const crypto = require('node:crypto'), assert = require('node:assert/strict');
const { chromium, expect } = require('@playwright/test');
const wallet = path.resolve(__dirname, '..'), logs = path.join(wallet, 'migrationToGRpcOrGraphQLDoc/workLog');
const read = f => JSON.parse(fs.readFileSync(f)), sha = f => crypto.createHash('sha256').update(fs.readFileSync(f)).digest('hex');
async function main() {
  const output = process.argv[2]; assert(output && !fs.existsSync(output));
  const buildFile = path.join(logs, '20261008-default-generation-positive-C102-build-03.json'), build = read(buildFile);
  const lineage = require('./lib/C102-product-source-lineage-v2.cjs'), q = read(lineage.qualificationFile);
  const source = lineage.validate(q.originalSource, q.buildFile);
  const gateway = require('./lib/C108-current-core-gateway-ownership-v2.cjs'), authority = gateway.capture();
  const fixture = path.join(os.homedir(), '.local/state/rtd-wallet-migration/dev-20261006-03/current-C108-internal-authorization-20261008-01');
  const password = read(path.join(fixture, 'recovery-private.json')).password;
  const browserProof = path.join(logs, '20261008-C108-current-internal-gas-chrome-01.json');
  const failed = read(browserProof); assert(!failed.passed && failed.stage === 'actual coin original approval');
  const inputs = [__filename, buildFile, lineage.qualificationFile, browserProof, gateway.startedFile,
    path.join(__dirname, 'lib/C108-current-core-gateway-ownership-v2.cjs')];
  const inputsSha256 = Object.fromEntries(inputs.map(f => [f, sha(f)]));
  const frames = [], jobs = [], blocked = [], observations = [];
  let context, page, worker, phase = 'preflight', privateStage = false, proof = {};
  try {
    context = await chromium.launchPersistentContext(path.join(fixture, 'profile'), {
      executablePath: path.join(os.homedir(), 'Library/Caches/ms-playwright/chromium-1243/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing'),
      headless: true, args: [`--disable-extensions-except=${build.output}`, `--load-extension=${build.output}`],
    });
    await context.route('**/*', route => {
      const r = route.request(), u = new URL(r.url());
      if (['http:', 'https:'].includes(u.protocol) && (![
        'http://127.0.0.1:41750', 'http://127.0.0.1:42011', 'http://127.0.0.1:42012',
        'http://127.0.0.1:42013', 'http://127.0.0.1:41718',
      ].includes(u.origin) || /\/(ExecuteTransaction|VerifySignature|SimulateTransaction)$/.test(u.pathname))) {
        blocked.push({ phase, url: u.href }); return route.abort();
      }
      return route.continue();
    });
    context.on('response', r => {
      if (!r.url().startsWith('http://127.0.0.1:')) return;
      const at = phase;
      jobs.push((async () => frames.push({ phase: at, url: r.url(), status: r.status(),
        requestBase64: (r.request().postDataBuffer() ?? Buffer.alloc(0)).toString('base64'),
        responseBase64: (await r.body()).toString('base64') }))().catch(e => frames.push({ phase: at,
        url: r.url(), status: r.status(), captureErrorType: e.name })));
    });
    worker = context.serviceWorkers()[0] || await context.waitForEvent('serviceworker');
    const loaded = await require('./lib/current-extension-worker.cjs').ensure(context, worker, build.output);
    worker = loaded.worker; assert.equal((loaded.evidence.after ?? loaded.evidence.before).workerSha256, build.artifacts['background.js']);
    page = await context.newPage(); const base = new URL('ui.html', worker.url()).href;
    await page.goto(base); await page.getByTestId('unlock-account-button').waitFor();
    const command = (method, args) => page.evaluate(({ method, args }) => new Promise((resolve, reject) => {
      const port = chrome.runtime.connect({ name: 'rtd_ui<->background' }), id = crypto.randomUUID();
      const timer = setTimeout(() => { port.disconnect(); reject(Error('account timeout')); }, 20000);
      port.onMessage.addListener(m => {
        if (m?.kind === 'rtd-ui-source-challenge') { port.postMessage({ kind: 'rtd-ui-source-confirm', nonce: m.nonce }); return; }
        if (m.id === id) { clearTimeout(timer); port.disconnect(); resolve(m.payload); }
      }); port.postMessage({ id, payload: { type: 'method-payload', method, args } });
    }), { method, args });
    const entities = (await command('getStoredEntities', { type: 'accounts' })).args.entities;
    assert.equal(entities.length, 1); assert.equal(entities[0].address, failed.cipherBefore.owner);
    phase = 'unlock own profile'; privateStage = true;
    assert.equal((await command('unlockAccountSourceOrAccount', { id: entities[0].id, password })).type, 'done');
    privateStage = false; await expect(page.getByTestId('lock-account-button')).toBeVisible({ timeout: 30000 });
    phase = 'actual coin page'; await page.goto(base + '#/send?type=0x2%3A%3Artd%3A%3ARTD');
    for (let i = 0; i < 24; i++) {
      await page.waitForTimeout(2500);
      const row = await page.evaluate(async () => {
        const seen = new Set(), stack = [], clients = new Set(), contexts = [];
        for (const n of document.querySelectorAll('*')) {
          const k = Object.keys(n).find(k => k.startsWith('__reactFiber$'));
          if (k) { let f = n[k]; while (f.return) f = f.return; stack.push(f.stateNode.current); }
        }
        while (stack.length) {
          const f = stack.pop(); if (!f || seen.has(f)) continue; seen.add(f);
          for (let d = f.dependencies?.firstContext; d; d = d.next) {
            const v = d.memoizedValue; if (v?.getQueryCache) clients.add(v);
            if (v?.readSessionKey) contexts.push({ state: v.state, bindingKey: v.bindingKey,
              readSessionKey: v.readSessionKey, assetSnapshotKey: v.assetSnapshotKey,
              readAdmission: v.readAdmission, readCapabilities: v.readCapabilities });
          }
          stack.push(f.child, f.sibling);
        }
        const queries = [];
        for (const c of clients) for (const q of c.getQueryCache().getAll()) {
          queries.push({ key: q.queryKey, status: q.state.status, fetchStatus: q.state.fetchStatus,
            errorType: q.state.error?.name ?? null, errorMessage: q.state.error?.message ?? null,
            errorReason: q.state.error?.reason ?? null, errorStack: q.state.error?.stack ?? null });
        }
        let admission;
        if ((await indexedDB.databases()).some(d => d.name === 'RtdWallet NetworkAdmission')) {
          admission = await new Promise((resolve, reject) => {
            const request = indexedDB.open('RtdWallet NetworkAdmission');
            request.onupgradeneeded = () => { request.transaction.abort(); reject(Error('Readonly upgrade refused')); };
            request.onerror = () => reject(request.error);
            request.onsuccess = () => {
              const db = request.result, tx = db.transaction('admission-v1', 'readonly');
              const q = tx.objectStore('admission-v1').getAll(); let value;
              q.onsuccess = () => { value = q.result; };
              tx.oncomplete = () => { db.close(); resolve(value); };
              tx.onabort = () => { db.close(); reject(Error('Admission read failed')); };
            };
          });
        }
        return JSON.parse(JSON.stringify({ at: Date.now(), hash: location.hash,
          body: document.body.innerText, contexts, queries, admission }, (_, v) => typeof v === 'bigint' ? v.toString() : v));
      });
      observations.push(row);
      if (row.queries.some(q => q.errorType)) break;
    }
    proof = { passed: true, diagnosticObservationCompleted: true };
  } catch (e) {
    proof = { passed: false, diagnosticObservationCompleted: false, phase, errorType: e.name,
      message: privateStage ? 'Private account stage; diagnostic withheld' : String(e.message).replaceAll(password, '[redacted]').slice(0,1000) };
    process.exitCode = 1;
  } finally {
    if (page && !privateStage) {
      try { await page.goto(new URL('ui.html', worker.url()).href + '#/tokens');
        if (await page.getByTestId('lock-account-button').isVisible()) await page.getByTestId('lock-account-button').click(); } catch {}
    }
    await context?.close(); await Promise.all(jobs);
    assert.deepEqual(gateway.capture(), authority); assert.deepEqual(lineage.validate(q.originalSource, q.buildFile), source);
    for (const [f, h] of Object.entries(inputsSha256)) assert.equal(sha(f), h);
    fs.writeFileSync(output, JSON.stringify({ ...proof, observedAt: new Date().toISOString(), diagnosticOnly: true,
      source, observations, frames, blocked, profilesOpened: 1, originalProfilesOpened: 0,
      executeRequests: 0, signatures: 0, simulations: 0, parentAcceptance: false, inputsSha256 }, null, 2) + '\n', { flag: 'wx', mode: 0o600 });
    console.log(JSON.stringify({ passed: proof.passed, phase: proof.phase, observations: observations.length,
      errors: observations.flatMap(o => o.queries.filter(q => q.errorType).map(q => ({ operation: q.key[0],
        errorType: q.errorType, message: q.errorMessage, reason: q.errorReason }))) }));
  }
}
main().catch(e => { console.error(JSON.stringify({ passed: false, errorType: e.name, message: String(e.message).slice(0,500) })); process.exitCode = 1; });
