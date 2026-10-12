// Copyright (c) LinkU Labs, Inc.
// SPDX-License-Identifier: Apache-2.0
// Native Chromium fixture for the uninstalled, test-namespace-only candidate.
const fs = require('node:fs'), path = require('node:path'), http = require('node:http');
const assert = require('node:assert/strict'), crypto = require('node:crypto');
const { chromium } = require('@playwright/test');
const sha = value => crypto.createHash('sha256').update(value).digest('hex');
async function main() {
  const [rootArg, outputArg] = process.argv.slice(2);
  assert(rootArg && outputArg);
  const root = path.resolve(rootArg), output = path.resolve(outputArg);
  assert(root.startsWith(path.join(process.env.HOME, '.local/state/rtd-wallet-migration/dev-20261003-01') + path.sep));
  assert(!fs.existsSync(root) && !fs.existsSync(output));
  const candidate = path.join(__dirname, 'candidates/dapp-egress-store.cjs');
  const inputs = { [__filename]: sha(fs.readFileSync(__filename)), [candidate]: sha(fs.readFileSync(candidate)) };
  fs.mkdirSync(root, { mode: 0o700 }); const extension = path.join(root, 'extension'); fs.mkdirSync(extension, { mode: 0o700 });
  const database = 'RtdWallet NetworkAdmission:test:egress-' + crypto.randomBytes(8).toString('hex');
  const sources = {
    'manifest.json': JSON.stringify({ manifest_version: 3, name: 'RTD isolated native egress protocol', version: '1.0.0', permissions: ['storage'], background: { service_worker: 'background.js' }, content_scripts: [{ matches: ['http://127.0.0.1/*'], js: ['content.js'], run_at: 'document_start' }], web_accessible_resources: [{ resources: ['gate.html'], matches: ['http://127.0.0.1/*'] }], content_security_policy: { extension_pages: "default-src 'none'; script-src 'self'; frame-ancestors *;" } }),
    'candidate.js': fs.readFileSync(candidate, 'utf8'),
    'background.js': `importScripts('candidate.js');globalThis.fixtureStore=new RtdEgressCandidate.CandidateEgressStore(${JSON.stringify(database)});`,
    'gate.html': '<!doctype html><script src="candidate.js"></script><script src="gate.js"></script>',
    'gate.js': `globalThis.fixtureStore=new RtdEgressCandidate.CandidateEgressStore(${JSON.stringify(database)});`,
    'content.js': `document.addEventListener('DOMContentLoaded',()=>{const f=document.createElement('iframe');f.id='native-egress';f.src=chrome.runtime.getURL('gate.html');f.style.display='none';document.body.appendChild(f)});`,
  };
  for (const [name, source] of Object.entries(sources)) fs.writeFileSync(path.join(extension, name), source, { flag: 'wx', mode: 0o600 });
  const server = http.createServer((req, res) => {
    res.setHeader('content-type', 'text/html');
    res.setHeader('Content-Security-Policy', "default-src 'self'; script-src 'unsafe-inline'; frame-src 'none'");
    res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
    res.end('<!doctype html><body><script>window.received=[];window.addEventListener("message",event=>{if(event.data?.kind==="native-egress-dummy")received.push(event.data)});</script></body>');
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  let browser; const checks = [];
  const check = (name, value) => { assert(value, name); checks.push(name); };
  try {
    browser = await chromium.launchPersistentContext(path.join(root, 'profile'), {
      headless: true,
      executablePath: path.join(process.env.HOME, 'Library/Caches/ms-playwright/chromium-1243/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing'),
      args: [`--disable-extensions-except=${extension}`, `--load-extension=${extension}`, '--enable-unsafe-extension-debugging'],
    });
    const worker = browser.serviceWorkers()[0] ?? await browser.waitForEvent('serviceworker');
    const page = await browser.newPage(); const origin = `http://127.0.0.1:${server.address().port}`;
    await page.goto(origin); await page.locator('#native-egress').waitFor({ state: 'attached' });
    const gateUrl = `chrome-extension://${worker.url().split('/')[2]}/gate.html`;
    const gate = page.frames().find(f => f.url() === gateUrl) ?? await page.waitForEvent('framenavigated', { predicate: f => f.url() === gateUrl });
    await gate.waitForFunction(() => typeof fixtureStore === 'object');
    const binding = { origin, tabId: 5, frameId: 0, documentId: 'native-original-document', requestId: 'native-original-request', account: '0x' + 'a'.repeat(64), profileBinding: 'fixture-only-independent-binding', gateOwner: crypto.randomBytes(32).toString('hex') };
    // Real v1 native DB with byte-for-byte logical negative/pending records.
    const oldRows = [
      { schemaVersion: 1, bindingKey: binding.profileBinding, faults: [], pending: [] },
      { schemaVersion: 1, bindingKey: 'preserve-original-negative', faults: [{ kind: 'identity', role: 'archive', reason: 'chain-mismatch' }], pending: [{ id: 'b7d13c5f-c553-4272-9b5c-166ea50c6019', areas: [{ kind: 'identity', role: 'fullnode' }] }] },
    ];
    await worker.evaluate(async ({ database, rows }) => {
      const r = indexedDB.open(database, 1);
      r.onupgradeneeded = () => r.result.createObjectStore('admission-v1', { keyPath: 'bindingKey' });
      const db = await new Promise((resolve, reject) => { r.onsuccess = () => resolve(r.result); r.onerror = () => reject(r.error); });
      await new Promise((resolve, reject) => { const tx = db.transaction('admission-v1', 'readwrite', { durability: 'strict' }); for (const row of rows) tx.objectStore('admission-v1').put(row); tx.oncomplete = resolve; tx.onabort = () => reject(tx.error); }); db.close();
    }, { database, rows: oldRows });
    await worker.evaluate(() => fixtureStore.startEpoch());
    const preserved = await worker.evaluate(() => fixtureStore.transaction('readonly', [[0, 'preserve-original-negative']], ([row]) => row));
    check('v1-upgrade-preserves-original-fault-and-pending', JSON.stringify(preserved) === JSON.stringify(oldRows[1]));
    check('old-version-reader-refuses-v2', await worker.evaluate(database => new Promise(resolve => { const r = indexedDB.open(database, 1); r.onerror = () => resolve(r.error.name === 'VersionError'); r.onsuccess = () => { r.result.close(); resolve(false); }; }), database));
    const issue = (b = binding, ttl = 10000) => worker.evaluate(({ b, ttl }) => (async () => fixtureStore.issue(await fixtureStore.capture(b), 'public-fixture-dummy', ttl))(), { b, ttl });
    const consume = (id, b = binding) => gate.evaluate(async ({ id, b }) => { globalThis.receipt = await fixtureStore.consume(id, b); }, { id, b });
    const denied = async action => { try { await action(); return false; } catch { return true; } };
    const deliver = (b = binding) => gate.evaluate(b => fixtureStore.deliver(globalThis.receipt, b, payload => { parent.postMessage({ kind: 'native-egress-dummy', payload }, b.origin); }), b);
    const writeNegative = row => worker.evaluate(row => fixtureStore.transaction('readwrite', [[0, row.bindingKey]], (_, os) => { os[0].put(row); }), row);
    let id = await issue(); check('cryptographic-256-bit-ticket', /^[a-f0-9]{64}$/.test(id)); await consume(id); await deliver();
    await page.waitForFunction(() => received.length === 1); check('actual-gate-post-to-strict-csp-and-coop-parent', (await page.evaluate(() => received[0].payload)) === 'public-fixture-dummy');
    check('ticket-persistently-consumed-before-post', await denied(() => consume(id)));
    check('same-receipt-cannot-post-again', await denied(() => deliver()));
    for (const [field, other] of Object.entries({ origin: 'https://different.test', tabId: 6, frameId: 1, documentId: 'other-document', requestId: 'other-request', account: '0x' + 'b'.repeat(64), profileBinding: 'different-binding', gateOwner: 'c'.repeat(64) })) {
      id = await issue(); check('reject-cross-' + field, await denied(() => consume(id, { ...binding, [field]: other })));
      // A refused wrong owner cannot consume the rightful ticket.
      await consume(id); await deliver();
    }
    id = await issue(); await consume(id);
    await writeNegative({ ...oldRows[0], faults: [{ kind: 'identity', role: 'archive', reason: 'chain-mismatch' }] });
    check('committed-late-native-fault-blocks-final-post', await denied(() => deliver()));
    check('late-fault-consumed-ticket-never-restored', await denied(() => consume(id))); await writeNegative(oldRows[0]);
    id = await issue(); await consume(id); const token = await worker.evaluate(() => fixtureStore.beginMutation());
    check('pre-mutation-barrier-blocks-final-post', await denied(() => deliver()));
    check('pending-mutation-blocks-new-ticket', await denied(() => issue()));
    await worker.evaluate(token => fixtureStore.finishMutation(token), token);
    check('completed-mutation-does-not-revive-ticket', await denied(() => consume(id)));
    id = await issue(); await consume(id); await worker.evaluate(() => fixtureStore.startEpoch());
    check('new-epoch-invalidates-consumed-receipt', await denied(() => deliver()));
    id = await issue(binding, 1); check('expired-ticket-denied', await denied(() => consume(id)));
    id = await issue();
    check('durable-consume-abort-publishes-no-receipt', await gate.evaluate(async ({ id, b }) => {
      const original = fixtureStore.transaction.bind(fixtureStore); let failed = false;
      fixtureStore.transaction = (mode, reads, change) => original(mode, reads, (rows, os) => { change(rows, os); throw new Error('owned native abort after delete'); });
      try { await fixtureStore.consume(id, b); } catch { failed = true; } finally { fixtureStore.transaction = original; }
      return failed;
    }, { id, b: binding }));
    await consume(id); await deliver(); check('aborted-native-delete-keeps-ticket-without-publication', true);
    id = await issue(); const winners = await gate.evaluate(async ({ id, b }) => {
      const settled = await Promise.allSettled([fixtureStore.consume(id, b), fixtureStore.consume(id, b)]);
      const success = settled.filter(r => r.status === 'fulfilled'); globalThis.receipt = success[0]?.value; return success.length;
    }, { id, b: binding });
    check('concurrent-native-consumers-only-one-durable-winner', winners === 1); await deliver();
    // Capacity is persistent, not a per-context JavaScript counter.
    await worker.evaluate(() => fixtureStore.startEpoch());
    const ids = await Promise.all(Array.from({ length: 64 }, () => issue()));
    check('persistent-ticket-capacity-64', new Set(ids).size === 64 && await denied(() => issue()));
    await worker.evaluate(() => fixtureStore.startEpoch());
    await writeNegative({ ...oldRows[0], surprise: true }); check('malformed-negative-row-denied', await denied(() => issue())); await writeNegative(oldRows[0]);
    const interrupted = await worker.evaluate(() => fixtureStore.beginMutation()); await worker.evaluate(() => fixtureStore.startEpoch());
    check('worker-epoch-preserves-interrupted-mutation-pending', await denied(() => issue()));
    check('old-worker-token-cannot-clear-unknown-mutation', await denied(() => worker.evaluate(token => fixtureStore.finishMutation(token), interrupted)));
    const extraChecks = await worker.evaluate(async () => {
      const completed = [];
      const name = suffix => fixtureStore.name + '-' + suffix;
      const verify = (label, passed) => { if (!passed) throw new Error(label); completed.push(label); };
      const refused = async f => { try { await f(); return false; } catch { return true; } };
      const seed = async (dbName, wrong) => {
        const r = indexedDB.open(dbName, 1);
        r.onupgradeneeded = () => r.result.createObjectStore('admission-v1', { keyPath: wrong ? 'wrong' : 'bindingKey' });
        return new Promise((resolve, reject) => { r.onsuccess = () => resolve(r.result); r.onerror = () => reject(r.error); });
      };
      const invalidName = name('invalid'); const invalid = await seed(invalidName, true); invalid.close();
      const badStore = new RtdEgressCandidate.CandidateEgressStore(invalidName);
      verify('invalid-v1-layout-refuses-upgrade', await refused(() => badStore.startEpoch()));
      const afterInvalid = await seed(invalidName, true);
      verify('failed-upgrade-preserves-original-v1-layout', afterInvalid.version === 1 && afterInvalid.objectStoreNames.length === 1); afterInvalid.close();
      const blockedName = name('blocked'), held = await seed(blockedName, false);
      const blockedStore = new RtdEgressCandidate.CandidateEgressStore(blockedName, indexedDB, 25);
      verify('held-v1-reader-blocks-upgrade-fail-closed', await refused(() => blockedStore.startEpoch())); held.close();
      // Drain the already-refused upgrade request. Its handler must abort instead of writing late.
      await new Promise(resolve => setTimeout(resolve, 40)); const afterBlocked = await seed(blockedName, false);
      verify('late-unblocked-upgrade-cannot-write-after-rejection', afterBlocked.version === 1 && afterBlocked.objectStoreNames.length === 1); afterBlocked.close();
      const isolated = new RtdEgressCandidate.CandidateEgressStore(name('guards'));
      const b = { origin: 'https://fixture.test', tabId: 1, frameId: 0, documentId: 'd', requestId: 'r', account: '0x' + 'a'.repeat(64), profileBinding: 'guards', gateOwner: 'd'.repeat(64) };
      await isolated.startEpoch();
      verify('absent-admission-is-not-positive-authority', await refused(async () => isolated.issue(await isolated.capture(b), 'dummy')));
      await isolated.transaction('readwrite', [[0, 'guards']], (_, os) => { os[0].put({ schemaVersion: 1, bindingKey: 'guards', faults: [], pending: [] }); });
      for (const [label, input] of [
        ['extra-binding-field', { ...b, extra: true }],
        ['negative-tab', { ...b, tabId: -1 }],
        ['fractional-frame', { ...b, frameId: 0.5 }],
        ['origin-path', { ...b, origin: 'https://fixture.test/path' }],
        ['opaque-origin', { ...b, origin: 'null' }],
        ['short-account', { ...b, account: '0xa' }],
        ['oversized-request', { ...b, requestId: 'r'.repeat(257) }],
        ['malformed-owner', { ...b, gateOwner: 'not-a-capability' }],
      ]) verify('reject-' + label, await refused(async () => isolated.issue(await isolated.capture(input), 'dummy')));
      verify('reject-payload-budget-overflow', await refused(async () => isolated.issue(await isolated.capture(b), 'x'.repeat(131073))));
      verify('reject-ttl-overflow', await refused(async () => isolated.issue(await isolated.capture(b), 'dummy', 30001)));
      const lease = await isolated.capture(b), beforeChange = await isolated.beginMutation();
      await isolated.finishMutation(beforeChange);
      verify('context-change-before-issuance-denies-old-approval-lease', await refused(() => isolated.issue(lease, 'dummy')));
      verify('failed-issuance-does-not-revive-lease', await refused(() => isolated.issue(lease, 'dummy')));
      verify('serialized-lease-is-not-authority', await refused(() => isolated.issue({}, 'dummy')));
      const ownedLease = await isolated.capture(b);
      const sibling = new RtdEgressCandidate.CandidateEgressStore(isolated.name);
      verify('another-store-instance-cannot-borrow-lease', await refused(() => sibling.issue(ownedLease, 'dummy')));
      const ownedId = await isolated.issue(ownedLease, 'dummy');
      verify('issued-lease-cannot-be-reused', await refused(() => isolated.issue(ownedLease, 'dummy')));
      const ownedReceipt = await isolated.consume(ownedId, b); let asynchronousPosts = 0;
      verify('async-final-callback-refused-before-invocation', await refused(() => isolated.deliver(ownedReceipt, b, async () => { asynchronousPosts++; })) && asynchronousPosts === 0);
      verify('invalid-final-callback-cannot-revive-receipt', await refused(() => isolated.deliver(ownedReceipt, b, () => {})));
      const fresh = await isolated.issue(await isolated.capture(b), 'dummy');
      const originalNow = Date.now; Date.now = () => originalNow() - 60000;
      try { verify('wall-clock-rollback-denies-consume', await refused(() => isolated.consume(fresh, b))); } finally { Date.now = originalNow; }
      await isolated.transaction('readwrite', [[1, 'global']], ([c], os) => { os[1].put({ ...c, revision: '0' }); });
      verify('corrupt-context-denies-epoch-reset', await refused(() => isolated.startEpoch()));
      verify('corrupt-context-denies-ticket-consume', await refused(() => isolated.consume(fresh, b)));
      const mutable = new RtdEgressCandidate.CandidateEgressStore(name('mutations'));
      await mutable.startEpoch();
      await mutable.transaction('readwrite', [[0, 'guards']], (_, os) => { os[0].put({ schemaVersion: 1, bindingKey: 'guards', faults: [], pending: [] }); });
      let sawPending = false;
      const changed = await mutable.mutate(async () => {
        sawPending = await mutable.transaction('readonly', [[1, 'global']], ([c]) => c.pending.length === 1 && c.revision === 1);
        if (!sawPending) throw new Error('mutation started before durable pending');
        await chrome.storage.local.set({ isolatedFixtureMutation: 'changed' });
        return 'result';
      });
      verify('actual-chrome-storage-mutation-starts-after-durable-barrier', sawPending && changed === 'result' && (await chrome.storage.local.get('isolatedFixtureMutation')).isolatedFixtureMutation === 'changed');
      verify('successful-mutation-clears-only-owned-pending', await mutable.transaction('readonly', [[1, 'global']], ([c]) => c.pending.length === 0 && c.revision === 1));
      const blocked = new RtdEgressCandidate.CandidateEgressStore(name('bad-mutation')); let started = 0;
      verify('missing-context-denies-before-external-state-change', await refused(() => blocked.mutate(() => { started++; })) && started === 0);
      await mutable.mutate(async () => { await chrome.storage.local.set({ isolatedFixtureMutation: 'partial' }); throw new Error('external mutation interrupted'); }).catch(() => undefined);
      verify('partial-external-mutation-keeps-pending', await mutable.transaction('readonly', [[1, 'global']], ([c]) => c.pending.length === 1));
      verify('partial-mutation-blocks-following-capture', await refused(() => mutable.capture(b)));
      const concurrent = new RtdEgressCandidate.CandidateEgressStore(name('concurrent-mutation')); await concurrent.startEpoch();
      const first = await concurrent.beginMutation(), second = await concurrent.beginMutation();
      await concurrent.finishMutation(first);
      verify('concurrent-mutation-finish-keeps-sibling-pending', await concurrent.transaction('readonly', [[1, 'global']], ([c]) => c.pending.length === 1 && c.pending[0] === second.id));
      await concurrent.finishMutation(second);
      verify('all-concurrent-mutations-finish-at-monotonic-revision', await concurrent.transaction('readonly', [[1, 'global']], ([c]) => c.pending.length === 0 && c.revision === 2));
      return completed;
    });
    checks.push(...extraChecks);
    // Positive output is exactly the deliberately authorized dummy cases above.
    const count = await page.evaluate(() => received.length); check('negative-cases-leak-zero-dummy-payloads', count === 11);
    check('product-database-name-rejected', await worker.evaluate(() => { try { new RtdEgressCandidate.CandidateEgressStore('RtdWallet NetworkAdmission'); return false; } catch { return true; } }));
    for (const [file, expected] of Object.entries(inputs)) assert.equal(sha(fs.readFileSync(file)), expected);
    for (const [name, source] of Object.entries(sources)) assert.equal(fs.readFileSync(path.join(extension, name), 'utf8'), source);
    const result = { passed: true, observedAt: new Date().toISOString(), browser: browser.browser().version(), inputsSha256: inputs, fixtureFilesSha256: Object.fromEntries(Object.entries(sources).map(([n, s]) => [n, sha(s)])), checks, checkCount: checks.length, dummyPublications: count, accounts: 0, signatures: 0, executions: 0, certificateChanges: 0, productChanged: false, scope: 'Uninstalled native candidate only. Real extension worker/gate IDB strict consumption, conservative negative/context fences, v1 preservation, final dummy post, capacity and replay. Product UI protection, source-port authority, canonical profile/admission integration, context mutation call sites and actual signing remain unverified.' };
    fs.writeFileSync(output, JSON.stringify(result, null, 2) + '\n', { flag: 'wx', mode: 0o600 }); console.log(JSON.stringify({ passed: true, checkCount: checks.length, dummyPublications: count }));
  } finally { if (browser) await browser.close(); await new Promise(resolve => server.close(resolve)); }
}
main().catch(error => { console.error(JSON.stringify({ passed: false, errorType: error.name, detail: String(error.message).slice(0, 180) })); process.exitCode = 1; });
