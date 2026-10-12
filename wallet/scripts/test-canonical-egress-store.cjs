// Copyright (c) LinkU Labs, Inc.
// SPDX-License-Identifier: Apache-2.0
// Compile formal stores, then exercise native extension DBs in a fresh fixture.
const fs = require('node:fs'), path = require('node:path'), http = require('node:http'), crypto = require('node:crypto'), assert = require('node:assert/strict');
const { execFileSync } = require('node:child_process'); const { chromium } = require('@playwright/test');
const sha = value => crypto.createHash('sha256').update(value).digest('hex');
async function main() {
  const [rootArg, outputArg] = process.argv.slice(2); assert(rootArg && outputArg);
  const root = path.resolve(rootArg), output = path.resolve(outputArg);
  assert(root.startsWith(path.join(process.env.HOME, '.local/state/rtd-wallet-migration/dev-20261003-01') + path.sep) && !fs.existsSync(root) && !fs.existsSync(output));
  const wallet = path.resolve(__dirname, '..'), inputFiles = [__filename, 'tests/unit/rpc/dapp-egress-browser-harness.ts', ...['dapp-egress-store.ts', 'network-admission-store.ts', 'network-admission-database.ts', 'network-admission-state.ts', 'network-admission-notifications.ts', 'profile.ts', 'profile-fixture.ts'].map(name => 'src/shared/rpc/' + name)].map(name => path.resolve(wallet, name));
  const inputsSha256 = Object.fromEntries(inputFiles.map(file => [file, sha(fs.readFileSync(file))]));
  fs.mkdirSync(root, { mode: 0o700 }); const extension = path.join(root, 'extension'); fs.mkdirSync(extension, { mode: 0o700 });
  const metafile = path.join(root, 'compiler-metafile.json');
  const compilation = execFileSync('pnpm', ['exec', 'esbuild', 'tests/unit/rpc/dapp-egress-browser-harness.ts', '--bundle', '--platform=browser', '--format=iife', '--global-name=CanonicalHarness', `--outfile=${path.join(extension, 'formal.js')}`, `--metafile=${metafile}`], { cwd: wallet, encoding: 'utf8', stdio: 'pipe' });
  fs.writeFileSync(path.join(root, 'compiler.log'), compilation, { flag: 'wx', mode: 0o600 });
  const compilerInputsSha256 = Object.fromEntries(Object.keys(JSON.parse(fs.readFileSync(metafile, 'utf8')).inputs).map(name => [path.resolve(wallet, name), sha(fs.readFileSync(path.resolve(wallet, name)))]));
  const database = 'RtdWallet NetworkAdmission:test:canonical-egress-' + crypto.randomBytes(8).toString('hex');
  const auditDatabaseOpens = `globalThis.fixtureOpenedDatabases=[];const nativeOpen=IDBFactory.prototype.open;IDBFactory.prototype.open=function(name,...args){if(fixtureOpenedDatabases.length>=512)throw new Error('Fixture open budget exceeded');fixtureOpenedDatabases.push(name);return nativeOpen.call(this,name,...args)};`;
  const sources = {
    'manifest.json': JSON.stringify({ manifest_version: 3, name: 'RTD formal canonical egress isolated fixture', version: '1.0.0', permissions: ['storage'], background: { service_worker: 'background.js' }, content_scripts: [{ matches: ['http://127.0.0.1/*'], js: ['content.js'], run_at: 'document_start' }], web_accessible_resources: [{ resources: ['gate.html'], matches: ['http://127.0.0.1/*'] }], content_security_policy: { extension_pages: "default-src 'none'; script-src 'self'; frame-ancestors *;" } }),
    'background.js': `importScripts('formal.js');${auditDatabaseOpens}globalThis.H=CanonicalHarness;globalThis.p=H.validateNetworkProfile(H.profileFixture());globalThis.database=${JSON.stringify(database)};globalThis.egress=new H.WalletDappEgressStore({databaseName:database});globalThis.admission=new H.WalletNetworkAdmissionStore({databaseName:database});`,
    'content.js': `document.addEventListener('DOMContentLoaded',()=>{const f=document.createElement('iframe');f.id='formal-gate';f.style.display='none';f.src=chrome.runtime.getURL('gate.html');document.body.appendChild(f)},{once:true});`,
    'gate.html': '<!doctype html><script src="formal.js"></script><script src="gate.js"></script>',
    'gate.js': `${auditDatabaseOpens}globalThis.H=CanonicalHarness;globalThis.p=H.validateNetworkProfile(H.profileFixture());globalThis.egress=new H.WalletDappEgressStore({databaseName:${JSON.stringify(database)}});`,
  };
  for (const [name, source] of Object.entries(sources)) fs.writeFileSync(path.join(extension, name), source, { flag: 'wx', mode: 0o600 });
  const fixtureFilesSha256 = Object.fromEntries(fs.readdirSync(extension).map(name => [name, sha(fs.readFileSync(path.join(extension, name)))]));
  const server = http.createServer((_, res) => { res.setHeader('Content-Security-Policy', "default-src 'self'; script-src 'unsafe-inline'; frame-src 'none'"); res.setHeader('Cross-Origin-Opener-Policy', 'same-origin'); res.end('<!doctype html><body><script>globalThis.publicDummy=[];window.addEventListener("message",e=>{if(e.data?.kind==="formal-dummy")publicDummy.push(e.data.payload)});</script></body>'); });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve)); let context; const checks = [];
  const check = (name, passed) => { assert(passed, name); checks.push(name); };
  try {
    context = await chromium.launchPersistentContext(path.join(root, 'profile'), { headless: true, executablePath: path.join(process.env.HOME, 'Library/Caches/ms-playwright/chromium-1243/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing'), args: [`--disable-extensions-except=${extension}`, `--load-extension=${extension}`, '--enable-unsafe-extension-debugging'] });
    const worker = context.serviceWorkers()[0] ?? await context.waitForEvent('serviceworker');
    const page = await context.newPage(); await page.goto(`http://127.0.0.1:${server.address().port}`);
    await page.locator('#formal-gate').waitFor({ state: 'attached' });
    const gate = page.frames().find(f => f.url().endsWith('/gate.html')) ?? await page.waitForEvent('framenavigated', { predicate: f => f.url().endsWith('/gate.html') });
    await gate.waitForFunction(() => !!globalThis.egress, null, { polling: 100, timeout: 5000 });
    const source = { origin: page.url().slice(0, -1), tabId: 1, frameId: 0, documentId: 'public-fixture-parent-document', requestId: 'public-fixture-request', account: '0x' + 'a'.repeat(64), gateOwner: 'b'.repeat(64) };
    const migrated = await worker.evaluate(async () => {
      const name = database + '-v1', binding = H.networkBindingKey(p);
      const oldPending = H.createNetworkAdmissionTicket([{ kind: 'graphql-domain', domain: 'balances' }]);
      const oldRow = { schemaVersion: 1, bindingKey: binding, faults: [{ kind: 'graphql-domain', domain: 'assets', reason: 'schema' }], pending: [oldPending] };
      const request = indexedDB.open(name, 1); request.onupgradeneeded = () => request.result.createObjectStore('admission-v1', { keyPath: 'bindingKey' });
      const old = await new Promise((resolve, reject) => { request.onsuccess = () => resolve(request.result); request.onerror = reject; });
      await new Promise((resolve, reject) => { const tx = old.transaction('admission-v1', 'readwrite', { durability: 'strict' }); tx.objectStore('admission-v1').put(oldRow); tx.oncomplete = resolve; tx.onabort = reject; }); old.close();
      const s = new H.WalletDappEgressStore({ databaseName: name }); await s.startEpoch();
      const row = await new H.WalletNetworkAdmissionStore({ databaseName: name }).capture(p);
      let oldRejected = false; await new Promise(resolve => { const r = indexedDB.open(name, 1); r.onerror = () => { oldRejected = r.error.name === 'VersionError'; resolve(); }; r.onsuccess = () => { r.result.close(); resolve(); }; });
      return { sameRawRow: JSON.stringify(row) === JSON.stringify(oldRow), faults: row.faults.length, pending: row.pending.length, oldRejected };
    });
    check('formal-v1-upgrade-preserves-original-canonical-fault-and-pending', migrated.sameRawRow && migrated.faults === 1 && migrated.pending === 1);
    check('old-version-refuses-v2-without-clearing-original-record', migrated.oldRejected);
    await worker.evaluate(async () => { await egress.startEpoch(); const t = await admission.begin(p, [{ kind: 'identity', role: 'fullnode' }]); await admission.complete(p, t, []); });
    const issued = await worker.evaluate(async source => { globalThis.fixtureLease = await egress.capture(p, source); globalThis.fixtureIssued = await egress.issue(fixtureLease, 'public-formal-dummy'); return fixtureIssued; }, source);
    check('formal-profile-derived-binding', issued.binding.profileBinding === await worker.evaluate(() => H.networkBindingKey(p)));
    let leaseRefused = false; try { await worker.evaluate(() => egress.issue(fixtureLease, 'public-replay')); } catch { leaseRefused = true; } check('formal-lease-one-use', leaseRefused);
    await gate.evaluate(async issued => { globalThis.receipt = await egress.consume(p, issued.ticket, issued.binding); globalThis.issued = issued; }, issued);
    const consumed = await worker.evaluate(async () => {
      const r = indexedDB.open(database, 2); const db = await new Promise(resolve => { r.onsuccess = () => resolve(r.result); });
      const tx = db.transaction('egress-ticket-v1', 'readonly'), q = tx.objectStore('egress-ticket-v1').count();
      return new Promise(resolve => { tx.oncomplete = () => { db.close(); resolve(q.result); }; });
    });
    check('formal-consume-commits-payload-deletion-before-publication', consumed === 0);
    await gate.evaluate(() => egress.deliver(p, receipt, issued.binding, payload => { parent.postMessage({ kind: 'formal-dummy', payload }, issued.binding.origin); }));
    await page.waitForFunction(() => publicDummy.length === 1);
    check('formal-latest-native-final-callback-posts-once', await page.evaluate(() => publicDummy[0] === 'public-formal-dummy'));
    let receiptRefused = false; try { await gate.evaluate(() => egress.deliver(p, receipt, issued.binding, () => {})); } catch { receiptRefused = true; } check('formal-receipt-one-use', receiptRefused);
    const next = () => worker.evaluate(async source => egress.issue(await egress.capture(p, source), 'public-formal-dummy'), { ...source, requestId: crypto.randomBytes(16).toString('hex') });
    for (const [field, value] of Object.entries({ account: '0x' + 'c'.repeat(64), origin: 'http://127.0.0.1:1', tabId: 2, frameId: 2, documentId: 'other-document', requestId: 'other-request', gateOwner: 'c'.repeat(64) })) {
      const valueIssued = await next();
      let refused = false; try { await gate.evaluate(v => egress.consume(p, v.ticket, v.binding), { ...valueIssued, binding: { ...valueIssued.binding, [field]: value } }); } catch { refused = true; }
      check('formal-binding-refuses-' + field, refused);
      await gate.evaluate(v => egress.consume(p, v.ticket, v.binding), valueIssued);
    }
    const stale = await next();
    await worker.evaluate(() => egress.mutate(() => chrome.storage.local.set({ fixtureContextChange: true })));
    let staleRefused = false; try { await gate.evaluate(v => egress.consume(p, v.ticket, v.binding), stale); } catch { staleRefused = true; } check('strict-mutation-before-external-write-invalidates-prior-ticket', staleRefused);
    const negative = await next(); await gate.evaluate(async v => { globalThis.negativeReceipt = await egress.consume(p, v.ticket, v.binding); }, negative);
    await worker.evaluate(async () => { const t = await admission.begin(p, [{ kind: 'graphql-domain', domain: 'assets' }]); await admission.complete(p, t, [{ kind: 'graphql-domain', domain: 'assets', reason: 'schema' }]); });
    let negativeRefused = false; try { await gate.evaluate(v => egress.deliver(p, negativeReceipt, v.binding, payload => { parent.postMessage({ kind: 'formal-dummy', payload }, v.binding.origin); }), negative); } catch { negativeRefused = true; }
    check('canonical-fault-committed-before-final-post-blocks-owned-receipt', negativeRefused && (await page.evaluate(() => publicDummy.length)) === 1);
    const unitChecks = await worker.evaluate(async source => {
      const checks = [], reject = async (name, work) => { let refused = false; try { await work(); } catch { refused = true; } if (!refused) throw new Error(name); checks.push(name); };
      const setup = async suffix => {
        const options = { databaseName: database + '-' + suffix }, s = new H.WalletDappEgressStore(options), n = new H.WalletNetworkAdmissionStore(options);
        await s.startEpoch(); const t = await n.begin(p, [{ kind: 'identity', role: 'fullnode' }]); await n.complete(p, t, []); return { s, n, options };
      };
      const a = await setup('additional');
      await reject('formal-no-foreign-lease-object', () => a.s.issue({}, 'public-dummy'));
      const token = await a.s.beginMutation();
      await reject('formal-no-borrowed-mutation-token', () => new H.WalletDappEgressStore(a.options).finishMutation(token));
      await reject('formal-no-serialized-mutation-token', () => a.s.finishMutation(structuredClone(token)));
      await reject('pending-context-blocks-new-capture', () => a.s.capture(p, source));
      await a.s.finishMutation(token);
      await reject('formal-no-replayed-mutation-token', () => a.s.finishMutation(token));
      const lease = await a.s.capture(p, source); await a.s.mutate(() => Promise.resolve());
      await reject('formal-captured-revision-cannot-follow-mutation', () => a.s.issue(lease, 'public-dummy'));
      const pending = await a.n.begin(p, [{ kind: 'graphql-domain', domain: 'balances' }]);
      await reject('canonical-unfinished-observation-blocks-issuance', () => a.s.capture(p, source)); await a.n.complete(p, pending, []);
      const changed = H.validateNetworkProfile({ ...H.profileFixture(), generation: 'different-generation' });
      const ready = await a.s.issue(await a.s.capture(p, source), 'public-dummy');
      await reject('formal-wrong-generation-refuses-ticket', () => a.s.consume(changed, ready.ticket, ready.binding));
      const receipt = await a.s.consume(p, ready.ticket, ready.binding);
      await reject('formal-borrowed-receipt-refused', () => new H.WalletDappEgressStore(a.options).deliver(p, receipt, ready.binding, () => {}));
      await reject('formal-async-final-callback-refused-before-invocation', () => a.s.deliver(p, receipt, ready.binding, async () => { throw new Error('must not run'); }));
      const beforeEpoch = await a.s.issue(await a.s.capture(p, source), 'public-dummy'); await a.s.startEpoch();
      await reject('formal-new-worker-epoch-refuses-old-ticket', () => a.s.consume(p, beforeEpoch.ticket, beforeEpoch.binding));
      const expires = await a.s.issue(await a.s.capture(p, source), 'public-dummy', 20);
      await new Promise(resolve => setTimeout(resolve, 30));
      await reject('formal-real-ticket-deadline-refuses-consume', () => a.s.consume(p, expires.ticket, expires.binding));
      for (const ttl of [0, -1, 30001, 1.5])
        await reject('formal-ttl-budget-' + ttl, async () => a.s.issue(await a.s.capture(p, source), 'public-dummy', ttl));
      await reject('formal-payload-byte-budget', async () => a.s.issue(await a.s.capture(p, source), 'x'.repeat(H.DAPP_EGRESS_MAX_BYTES + 1)));
      const raw = async (name, change) => {
        const r = indexedDB.open(name, 2), db = await new Promise((resolve, reject) => { r.onsuccess = () => resolve(r.result); r.onerror = reject; });
        await new Promise((resolve, reject) => { const tx = db.transaction(['admission-v1', 'egress-context-v1', 'egress-ticket-v1'], 'readwrite', { durability: 'strict' }); change(tx); tx.oncomplete = resolve; tx.onabort = reject; }); db.close();
      };
      for (const [label, value] of [
        ['unknown-canonical-field', { schemaVersion: 1, bindingKey: H.networkBindingKey(p), faults: [], pending: [], unknown: true }],
        ['malformed-canonical-fault', { schemaVersion: 1, bindingKey: H.networkBindingKey(p), faults: [{ kind: 'identity', role: 'fullnode', reason: 'unknown' }], pending: [] }],
        ['malformed-canonical-pending', { schemaVersion: 1, bindingKey: H.networkBindingKey(p), faults: [], pending: [{ id: 'invented', areas: [] }] }],
      ]) {
        const target = await setup(label); await raw(target.options.databaseName, tx => tx.objectStore('admission-v1').put(value));
        await reject('formal-canonical-row-refuses-' + label, () => target.s.capture(p, source));
      }
      const noRow = await setup('missing-row'); await raw(noRow.options.databaseName, tx => tx.objectStore('admission-v1').clear());
      await reject('formal-missing-negative-record-is-no-authorization', () => noRow.s.capture(p, source));
      await reject('personal-empty-targets-still-refuse-missing-negative-row', () => noRow.s.capture(p, source, []));
      const actions = await setup('actions'); let calls = 0;
      const actionLease = await actions.s.capture(p, source, []);
      const value = await actions.s.runBeforeAction(actionLease, 'sign', async () => { calls++; return 'public-dummy'; });
      if (value !== 'public-dummy' || calls !== 1) throw new Error('Action did not start once');
      checks.push('actual-native-read-callback-starts-owned-sign-stub-once');
      await reject('sign-stage-replay-starts-no-second-action', () => actions.s.runBeforeAction(actionLease, 'sign', async () => { calls++; }));
      await actions.s.runBeforeAction(actionLease, 'dispatch', async () => { calls++; });
      await reject('dispatch-stage-replay-starts-no-second-action', () => actions.s.runBeforeAction(actionLease, 'dispatch', async () => { calls++; }));
      if (calls !== 2) throw new Error('Replayed action');
      checks.push('actual-sign-and-dispatch-stubs-each-once');
      await actions.s.issue(actionLease, 'public-dummy');
      await reject('spent-issued-lease-cannot-start-new-action', () => actions.s.runBeforeAction(actionLease, 'dispatch', async () => { calls++; }));
      const heldAction = await actions.s.capture(p, source, []), mutation = await actions.s.beginMutation();
      await reject('pending-mutation-before-sign-starts-no-action', () => actions.s.runBeforeAction(heldAction, 'sign', async () => { calls++; }));
      await actions.s.finishMutation(mutation);
      await reject('changed-revision-before-dispatch-starts-no-action', () => actions.s.runBeforeAction(heldAction, 'dispatch', async () => { calls++; }));
      const failed = await actions.s.capture(p, source, []);
      await reject('synchronous-action-failure-propagates', () => actions.s.runBeforeAction(failed, 'sign', () => { throw new Error('public-fixture'); }));
      await reject('failed-action-stage-not-retryable', () => actions.s.runBeforeAction(failed, 'sign', async () => { calls++; }));
      await reject('foreign-action-lease-refused', () => actions.s.runBeforeAction({}, 'sign', async () => { calls++; }));
      const actionBeforeEpoch = await actions.s.capture(p, source, []); await actions.s.startEpoch();
      await reject('worker-new-epoch-before-action-starts-no-action', () => actions.s.runBeforeAction(actionBeforeEpoch, 'sign', async () => { calls++; }));
      if (calls !== 2) throw new Error('Invalid context started action');
      checks.push('all-invalid-contexts-start-zero-additional-actions');
      const domains = await setup('domains'), assets = [{ kind: 'graphql-domain', domain: 'assets' }];
      const observation = await domains.n.begin(p, assets);
      const messageLease = await domains.s.capture(p, source, []);
      await reject('matching-domain-pending-blocks-dependent-capture', () => domains.s.capture(p, source, assets));
      await domains.n.complete(p, observation, [{ kind: 'graphql-domain', domain: 'assets', reason: 'schema' }]);
      await domains.s.runBeforeAction(messageLease, 'sign', async () => { calls++; });
      const message = { id: source.requestId, payload: { type: 'sign-message-request', return: { messageBytes: btoa('x'.repeat(1048576)), signature: 'AA==' } } };
      const payload = JSON.stringify(H.validateDappEgressMessage(message, source.requestId));
      const large = await domains.s.issue(messageLease, payload), largeReceipt = await domains.s.consume(p, large.ticket, large.binding);
      let completeBytes = 0; await domains.s.deliver(p, largeReceipt, large.binding, raw => { completeBytes = atob(JSON.parse(raw).payload.return.messageBytes).length; });
      if (completeBytes !== 1048576) throw new Error('Message truncated');
      checks.push('unrelated-assets-pending-and-fault-permit-full-one-MiB-personal-result');
      await reject('matching-assets-fault-still-blocks-dependent-capture', () => domains.s.capture(p, source, assets));
      await reject('default-all-domains-remains-quarantined', () => domains.s.capture(p, source));
      const identityLease = await domains.s.capture(p, source, []), identityObservation = await domains.n.begin(p, [{ kind: 'identity', role: 'archive' }]);
      await reject('all-identity-pending-blocks-even-empty-personal-targets', () => domains.s.runBeforeAction(identityLease, 'sign', async () => { calls++; }));
      await domains.n.complete(p, identityObservation, [{ kind: 'identity', role: 'archive', reason: 'chain-mismatch' }]);
      await reject('all-identity-fault-blocks-even-empty-personal-targets', () => domains.s.capture(p, source, []));
      const pinned = await setup('pinned-targets'), selected = [{ kind: 'graphql-domain', domain: 'assets' }];
      const selectedLease = await pinned.s.capture(p, source, selected); selected[0].domain = 'balances';
      const pinObservation = await pinned.n.begin(p, assets); await pinned.n.complete(p, pinObservation, [{ kind: 'graphql-domain', domain: 'assets', reason: 'schema' }]);
      await reject('captured-targets-detached-before-later-array-change', () => pinned.s.runBeforeAction(selectedLease, 'sign', async () => { calls++; }));
      const invalidTicket = await actions.s.issue(await actions.s.capture(p, source, []), 'public-dummy');
      await raw(actions.options.databaseName, tx => { const s = tx.objectStore('egress-ticket-v1'), q = s.get(invalidTicket.ticket); q.onsuccess = () => s.put({ ...q.result, schemaVersion: 1 }); });
      await reject('old-schema-ticket-never-accepted-as-new-domain-policy', () => actions.s.consume(p, invalidTicket.ticket, invalidTicket.binding));
      const full = await setup('ticket-budget');
      for (let i = 0; i < 64; i++) await full.s.issue(await full.s.capture(p, { ...source, requestId: 'budget-' + i }), 'public-dummy');
      await reject('formal-sixty-five-live-tickets-refused', async () => full.s.issue(await full.s.capture(p, source), 'public-dummy'));
      const strict = await setup('strict'), nativeTransaction = IDBDatabase.prototype.transaction;
      let started = 0;
      IDBDatabase.prototype.transaction = function (names, mode, options) { return nativeTransaction.call(this, names, mode, this.name === strict.options.databaseName && mode === 'readwrite' ? { durability: 'relaxed' } : options); };
      try { await reject('formal-relaxed-native-durability-starts-no-external-action', () => strict.s.mutate(() => { started++; })); }
      finally { IDBDatabase.prototype.transaction = nativeTransaction; }
      if (started !== 0) throw new Error('External action started without strict barrier');
      const blockedName = database + '-late-upgrade', oldOpen = indexedDB.open(blockedName, 1);
      oldOpen.onupgradeneeded = () => oldOpen.result.createObjectStore('admission-v1', { keyPath: 'bindingKey' });
      const held = await new Promise((resolve, reject) => { oldOpen.onsuccess = () => resolve(oldOpen.result); oldOpen.onerror = reject; });
      held.onversionchange = () => {};
      await reject('formal-native-blocked-upgrade-refused', () => new H.WalletDappEgressStore({ databaseName: blockedName, timeoutMs: 80 }).startEpoch());
      held.close(); await new Promise(resolve => setTimeout(resolve, 100));
      const afterOpen = indexedDB.open(blockedName, 1);
      const after = await new Promise((resolve, reject) => { afterOpen.onsuccess = () => resolve(afterOpen.result); afterOpen.onerror = reject; });
      if (after.version !== 1 || after.objectStoreNames.length !== 1) throw new Error('Rejected upgrade committed later'); after.close(); checks.push('formal-late-upgrade-explicit-abort-retains-original-version');
      await reject('formal-failed-external-mutation-keeps-unknown', () => a.s.mutate(() => Promise.reject(new Error('fixture failure'))));
      await a.s.startEpoch(); await reject('formal-new-epoch-preserves-interrupted-pending', () => a.s.capture(p, source));
      return checks;
    }, source);
    for (const name of unitChecks) check(name, true);
    const openedNames = [...await worker.evaluate(() => fixtureOpenedDatabases), ...await gate.evaluate(() => fixtureOpenedDatabases)];
    check('actual-native-opens-use-isolated-test-namespaces-only', openedNames.length > 0 && openedNames.every(name => name === database || name.startsWith(database + '-')));
    for (const [file, digest] of Object.entries(compilerInputsSha256)) assert.equal(sha(fs.readFileSync(file)), digest);
    for (const [file, digest] of Object.entries(inputsSha256)) assert.equal(sha(fs.readFileSync(file)), digest);
    for (const [name, digest] of Object.entries(fixtureFilesSha256)) assert.equal(sha(fs.readFileSync(path.join(extension, name))), digest);
    const proof = { passed: true, observedAt: new Date().toISOString(), browser: context.browser().version(), checks, checkCount: checks.length, inputsSha256, compilerInputsSha256, compilerMetafileSha256: sha(fs.readFileSync(metafile)), fixtureFilesSha256, nativeDatabaseOpens: openedNames.length, dummyPublications: await page.evaluate(() => publicDummy.length), accounts: 0, signatures: 0, executions: 0, certificateChanges: 0, productionDatabasesOpened: 0, productCspChanged: false, scope: 'Compiled formal canonical stores in fresh isolated Chrome extension test namespaces. Formal v1/v2 migration, shared transaction/negative profile binding and actual final dummy post only; no real product UI/state mutation/gate pairing/signature integration or readiness claim.' };
    fs.writeFileSync(output, JSON.stringify(proof, null, 2), { flag: 'wx', mode: 0o600 }); console.log(JSON.stringify({ passed: true, checks: checks.length, dummyPublications: proof.dummyPublications }));
  } catch (error) {
    fs.writeFileSync(output + '.failure.json', JSON.stringify({ passed: false, errorType: error.name, completedChecks: checks, inputsSha256, fixtureFilesSha256, scope: 'Failed finite fixture; do not count as completed.' }, null, 2), { flag: 'wx', mode: 0o600 }); throw error;
  } finally { if (context) await context.close(); await new Promise(resolve => server.close(resolve)); }
}
main().catch(error => { console.error(JSON.stringify({ passed: false, errorType: error.name, detail: String(error.message).slice(0, 200) })); process.exitCode = 1; });
