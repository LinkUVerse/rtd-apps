// Copyright (c) LinkU Labs, Inc.
// SPDX-License-Identifier: Apache-2.0
// Real current four-form live competition or a product-created, never-forwarded durable pending.
process.env.PW_EXPERIMENTAL_SERVICE_WORKER_NETWORK_EVENTS = '1';
const fs = require('node:fs'), path = require('node:path'), os = require('node:os');
const crypto = require('node:crypto'), assert = require('node:assert/strict'), cp = require('node:child_process'), http = require('node:http');
const { chromium, expect } = require('@playwright/test');
const { Transaction } = require('rtd-typescript/transactions'), { GrpcTypes, RtdGrpcClient } = require('rtd-typescript/grpc');
const { Ed25519Keypair } = require('rtd-typescript/keypairs/ed25519'), { verifyTransactionSignature } = require('rtd-typescript/verify');
const contract = require('./lib/C99-nft-inventory-contract-v2.cjs');
const wallet = path.resolve(__dirname, '..'), root = path.resolve(wallet, '../..');
const logs = path.join(wallet, 'migrationToGRpcOrGraphQLDoc/workLog');
const read = file => JSON.parse(fs.readFileSync(file, 'utf8'));
const hash = bytes => crypto.createHash('sha256').update(bytes).digest('hex'), sha = file => hash(fs.readFileSync(file));
function record(file, value) {
  const fd = fs.openSync(file, 'wx', 0o600);
  try { fs.writeFileSync(fd, JSON.stringify(value, (_, v) => typeof v === 'bigint' ? v.toString() : v, 2) + '\n'); fs.fsyncSync(fd); }
  finally { fs.closeSync(fd); }
  const directory = fs.openSync(path.dirname(file), 'r'); try { fs.fsyncSync(directory); } finally { fs.closeSync(directory); }
}
async function main() {
  const [inventoryFile, independentFile, mode, output, owned] = process.argv.slice(2);
  assert(['live', 'durable'].includes(mode) && output && owned && !fs.existsSync(output) && !fs.existsSync(owned));
  const inventory = read(inventoryFile); assert(inventory.passed);
  const files = [__filename, path.resolve(inventoryFile), path.join(__dirname, 'lib/C99-nft-inventory-contract-v2.cjs')];
  for (const [file, pin] of Object.entries(inventory.inputsSha256)) assert.equal(sha(file), pin);
  if (!inventory.indexedFixtureAccepted) {
    assert.equal(inventory.mode, 'uncovered-preflight-denied'); assert.equal(inventory.sessionsCreated, 0);
    record(output, { passed: true, mode: 'uncovered-browser-preflight-denied', requestedTestMode: mode,
      actualFourFormTestExecuted: false, profilesOpened: 0, signatures: 0, executeRequests: 0,
      newContainers: 0, parentCompletion: false, inputsSha256: Object.fromEntries(files.map(f => [f, sha(f)])) });
    console.log(JSON.stringify({ passed: true, mode: 'uncovered-browser-preflight-denied', profilesOpened: 0 })); return;
  }
  assert(inventory.mode === 'covered-current-inventory' && inventory.targetCheckpoint === 696489);
  assert(Date.now() - Date.parse(inventory.observedAt) >= 0 && Date.now() - Date.parse(inventory.observedAt) < 300000);
  const independent = read(independentFile); assert(independent.passed && independent.allFourteenCanonicalObjectsAccepted);
  assert.equal(independent.inputsSha256[path.resolve(inventoryFile)], sha(inventoryFile));
  for (const [file, pin] of Object.entries(independent.inputsSha256)) assert.equal(sha(file), pin);
  files.push(path.resolve(independentFile));
  const fixture = inventory.fixture, intentFile = path.join(fixture, 'intent.json'), intent = read(intentFile);
  const oracleFile = path.join(logs, '20261008-C93-recovered-native-independent-01.json'), oracle = read(oracleFile);
  const cases = contract.fourCases(oracle); assert.deepEqual(cases, inventory.cases);
  const keyFile = path.join(fixture, 'keys.json'), key = Ed25519Keypair.fromSecretKey(read(keyFile).source), owner = key.toRtdAddress();
  assert.equal(owner, oracle.addresses.source);
  const buildFile = inventory.buildFile, profileFile = inventory.profileFile, build = read(buildFile);
  const demoRoot = path.join(os.homedir(), '.local/state/rtd-wallet-migration/dev-20261003-01/authorization-matrix-demo-20261006-01');
  const helpers = ['current-extension-worker.cjs', 'current-extension-ui-source.cjs', 'lifecycle-journal-snapshot.cjs', 'current-worker-production-sign-hold-verified.cjs'];
  files.push(intentFile, oracleFile, keyFile, buildFile, profileFile, ...helpers.map(n => path.join(__dirname, 'lib', n)));
  assert.equal(path.dirname(path.resolve(owned)), path.dirname(fixture)); assert(path.basename(owned).startsWith('current-C99-four-nft-' + mode + '-'));
  const pins = Object.fromEntries(files.map(file => [path.resolve(file), sha(file)]));
  const held = () => {
    for (const [f, h] of Object.entries({ ...pins, ...intent.inputsSha256, ...intent.protectedOriginalsSha256 })) assert.equal(sha(f), h);
    for (const [f, h] of Object.entries(build.artifacts)) assert.equal(sha(path.join(build.output, f)), h);
    assert.deepEqual(require('./build-reviewed-generation-production-extension.cjs').productSource(), build.sourceAfter);
    cp.execFileSync(path.join(root, 'rtd-archive-service/localDeploy/data/publisher-venv/bin/python'), ['-c',
      'import sys,json;sys.path.insert(0,sys.argv[1]);from wallet_C98_successor_ownership import held;held(json.load(open(sys.argv[2])))',
      path.join(root, 'link-u-smart-contract/all-in-one-deploy/localDeploy'), intentFile], { stdio: ['ignore', 'pipe', 'pipe'], timeout: 120000 });
  };
  held(); fs.mkdirSync(owned, { mode: 0o700 });
  record(path.join(owned, 'intent.json'), { mode, onceOnly: true, automaticRetry: false, createdAt: new Date().toISOString(), inputsSha256: pins });
  const loader = require('tsx/cjs/api'), load = n => loader.require(path.join(wallet, 'src/shared/rpc', n + '.ts'), __filename);
  const { validateNetworkProfile, executionScopeKey } = load('profile'), { WalletReadSession } = load('session'), { WalletFullnodeReader } = load('fullnode-reader');
  const network = validateNetworkProfile(read(profileFile)), scope = executionScopeKey(network, owner), lockName = 'wallet-execution:' + scope;
  const profile = path.join(owned, 'profile'), password = crypto.randomBytes(32).toString('base64url');
  const allowed = new Set([network.endpoints.fullnodeGrpcWeb, network.endpoints.graphqlUrl, network.endpoints.archiveGrpcWeb, network.endpoints.accountHistoryUrl].map(v => new URL(v).origin));
  const frames = [], jobs = [], captureErrors = [], blocked = [], intercepts = [], stages = [], forms = [];
  let context, page, worker, base, server, debug, demo, variant, accountId, heldAt;
  let phase = 'native fresh input', privateStage = false, executeAttempts = 0, proof = { passed: false };
  const nativeFrames = [], fetch0 = globalThis.fetch;
  const command = (method, args) => page.evaluate(({ method, args }) => {
    let state = globalThis.__C99ReadonlyUiPort;
    if (!state) { const port = chrome.runtime.connect({ name: 'rtd_ui<->background' }), pending = new Map();
      state = { port, pending }; globalThis.__C99ReadonlyUiPort = state;
      port.onMessage.addListener(message => { if (message?.kind === 'rtd-ui-source-challenge') { port.postMessage({ kind: 'rtd-ui-source-confirm', nonce: message.nonce }); return; }
        const entry = pending.get(message.id); if (entry) { pending.delete(message.id); clearTimeout(entry.timer); entry.resolve(message.payload); } });
      port.onDisconnect.addListener(() => { for (const entry of pending.values()) { clearTimeout(entry.timer); entry.reject(Error('UI disconnected')); } pending.clear(); globalThis.__C99ReadonlyUiPort = undefined; });
    }
    return new Promise((resolve, reject) => { const id = crypto.randomUUID(), timer = setTimeout(() => { state.pending.delete(id); reject(Error('UI control timeout')); }, 20000);
      state.pending.set(id, { resolve, reject, timer }); state.port.postMessage({ id, payload: method === '@setNetwork' ? { type: 'set-network', network: args } : { type: 'method-payload', method, args } }); });
  }, { method, args });
  const accounts = async () => (await command('getStoredEntities', { type: 'accounts' })).args.entities;
  const journal = async () => {
    const present = await page.evaluate(async () => (await indexedDB.databases()).some(db => db.name === 'RtdWallet TransactionJournal'));
    return present ? require('./lib/lifecycle-journal-snapshot.cjs')(page) : { 'journal-v2': [], 'pending-scopes-v2': [], 'metadata-v2': [] };
  };
  const encrypted = () => page.evaluate(async () => {
    const db = await new Promise((resolve, reject) => { const r = indexedDB.open('RtdWallet DB'); r.onupgradeneeded = () => { r.transaction.abort(); reject(Error('Account audit forbids upgrade')); }; r.onerror = () => reject(Error('Account DB unavailable')); r.onsuccess = () => resolve(r.result); });
    const rows = await new Promise((resolve, reject) => { const tx = db.transaction('accounts', 'readonly'), r = tx.objectStore('accounts').getAll(); r.onsuccess = () => resolve(r.result.map(({ id, address, publicKey, encrypted, type }) => ({ id, address, publicKey, encrypted, type }))); tx.onerror = tx.onabort = () => reject(Error('Readonly account failure')); }); db.close();
    return Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(JSON.stringify(rows))))).map(n => n.toString(16).padStart(2, '0')).join('');
  });
  const uiFiles = Object.keys(build.artifacts).filter(f => f.endsWith('.js') && !['background.js', 'content-script.js', 'dapp-interface.js', 'egress-gate.js'].includes(f));
  const inspectUI = async target => require('./lib/current-extension-ui-source.cjs').inspect(context, target, build.output, uiFiles,
    { url: base, navigate: async () => { await target.goto(base); await target.locator('button,a,input').first().waitFor(); } });
  const stateRows = target => target.evaluate(() => {
    const seen = new Set(), stack = [], contexts = [], approvals = [];
    for (const node of document.querySelectorAll('*')) { const key = Object.keys(node).find(k => k.startsWith('__reactFiber$')); if (key) { let fiber = node[key]; while (fiber.return) fiber = fiber.return; stack.push(fiber); } }
    while (stack.length) { const f = stack.pop(); if (!f || seen.has(f)) continue; seen.add(f);
      for (let d = f.dependencies?.firstContext; d; d = d.next) { const v = d.memoizedValue; if (v && typeof v.readSessionKey === 'string' && v.assetSnapshotKey) contexts.push({ bindingKey: v.bindingKey, readSessionKey: v.readSessionKey, assetSnapshotKey: v.assetSnapshotKey, state: v.state }); }
      for (let h = f.memoizedState; h; h = h.next) { const v = h.memoizedState; if (v?.prepared?.bytesBase64 && v.requestId) approvals.push(JSON.parse(JSON.stringify(v))); }
      stack.push(f.child, f.sibling);
    } return { contexts, approvals };
  });
  const start = async label => {
    phase = label + ' launch';
    context = await chromium.launchPersistentContext(profile, { executablePath: path.join(os.homedir(), 'Library/Caches/ms-playwright/chromium-1243/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing'),
      headless: true, viewport: { width: 800, height: 600 }, args: [`--disable-extensions-except=${build.output}`, `--load-extension=${build.output}`] });
    await context.route('**/*', async route => {
      const req = route.request(), url = new URL(req.url()); if (!['http:', 'https:'].includes(url.protocol)) { await route.continue(); return; }
      if (url.pathname.endsWith('/ExecuteTransaction')) {
        executeAttempts++;
        try { assert.equal(mode, 'durable'); assert.equal(intercepts.length, 0); assert.equal(phase, 'first unique execute approval');
          const bytes = req.postDataBuffer(); assert(bytes?.[0] === 0 && bytes.readUInt32BE(1) === bytes.length - 5);
          const parsed = GrpcTypes.ExecuteTransactionRequest.fromBinary(bytes.subarray(5));
          assert.equal(Buffer.from(parsed.transaction.bcs.value).toString('base64'), variant.bytesBase64); assert.equal(parsed.signatures.length, 1);
          const signature = Buffer.from(parsed.signatures[0].bcs.value).toString('base64'); assert.equal((await verifyTransactionSignature(Buffer.from(variant.bytesBase64, 'base64'), signature)).toRtdAddress(), owner);
          intercepts.push({ phase, url: url.href, requestBase64: bytes.toString('base64'), forwarded: false });
        } catch (error) { captureErrors.push({ phase, url: url.href, errorType: error.name, unexpectedExecute: true }); }
        finally { await route.abort('failed'); } return;
      }
      if (!allowed.has(url.origin)) { blocked.push({ phase, origin: url.origin, path: url.pathname }); await route.abort(); return; }
      await route.continue();
    });
    context.on('response', response => {
      const url = new URL(response.url()); if (!allowed.has(url.origin) || !['/graphql', '/account/graphql'].includes(url.pathname) && !url.pathname.includes('/rtd.rpc.v2.')) return;
      const at = phase, request = Buffer.from(response.request().postDataBuffer() ?? []);
      jobs.push((async () => { const headers = await response.allHeaders();
        try { frames.push({ phase: at, url: url.href, status: response.status(), headers, requestBase64: request.toString('base64'), responseBase64: Buffer.from(await response.body()).toString('base64') }); }
        catch (error) { captureErrors.push({ phase: at, url: url.href, status: response.status(), headers, requestBase64: request.toString('base64'), errorType: error.name }); }
      })().catch(error => captureErrors.push({ phase: at, url: url.href, errorType: error.name, headersMissing: true })));
    });
    const initial = context.serviceWorkers()[0] || await context.waitForEvent('serviceworker');
    const loaded = await require('./lib/current-extension-worker.cjs').ensure(context, initial, build.output); worker = loaded.worker;
    page = await context.newPage(); page.setDefaultTimeout(30000); base = new URL('ui.html', worker.url()).href;
    const ui = await inspectUI(page), source = loaded.evidence.after ?? loaded.evidence.before; assert(source.matchesDisk && ui.matchesDisk);
    stages.push({ label, worker: source, ui });
  };
  const simCount = () => frames.filter(f => f.url.endsWith('/SimulateTransaction')).length;
  const freeLock = () => worker.evaluate(name => navigator.locks.request(name, { mode: 'exclusive', ifAvailable: true }, lock => Boolean(lock)), lockName);
  try {
    globalThis.fetch = async (input, init) => { const url = new URL(input instanceof Request ? input.url : String(input)); assert.equal(url.origin, new URL(network.endpoints.fullnodeGrpcWeb).origin); assert(!url.pathname.endsWith('/ExecuteTransaction'));
      const response = await fetch0(input, init); nativeFrames.push({ url: url.href, status: response.status(), headers: Object.fromEntries(response.headers), requestBase64: Buffer.from(init?.body ?? []).toString('base64'), responseBase64: Buffer.from(await response.clone().arrayBuffer()).toString('base64') }); return response; };
    const session = new WalletReadSession(network); let coins;
    try { coins = await new WalletFullnodeReader(session).coins(owner, '0x2::rtd::RTD'); } finally { session.close(); }
    assert(coins.length > 0); const native = new RtdGrpcClient({ network: 'localnet', baseUrl: network.endpoints.fullnodeGrpcWeb, format: 'binary', mvr: { url: '' } });
    const price = (await native.core.getReferenceGasPrice()).referenceGasPrice, tx = new Transaction(); tx.setSender(owner); tx.setGasOwner(owner); tx.setGasPrice(price);
    tx.setGasBudget(mode === 'live' ? '104000099' : '105000099'); tx.setGasPayment([{ objectId: coins[0].objectId, version: coins[0].version, digest: coins[0].digest }]); tx.setExpiration({ None: true });
    const split = tx.splitCoins(tx.gas, [1n]); tx.transferObjects([split], owner); const bytes = await tx.build();
    variant = { digest: await tx.getDigest(), bytesBase64: Buffer.from(bytes).toString('base64'), bytesSha256: hash(bytes), json: await tx.toJSON(), scope };
    globalThis.fetch = fetch0;
    server = http.createServer((request, response) => { const name = new URL(request.url, 'http://localhost').pathname, f = path.resolve(demoRoot, '.' + (name === '/' ? '/index.html' : name));
      if (!f.startsWith(demoRoot + path.sep) || !fs.existsSync(f) || !fs.statSync(f).isFile()) { response.writeHead(404).end(); return; }
      response.setHeader('Content-Type', f.endsWith('.js') ? 'text/javascript' : f.endsWith('.css') ? 'text/css' : 'text/html'); fs.createReadStream(f).pipe(response); });
    await new Promise(resolve => server.listen(0, '127.0.0.1', resolve)); const origin = 'http://127.0.0.1:' + server.address().port; allowed.add(origin);
    await start('original'); phase = 'private import'; privateStage = true;
    await page.goto(base + '#/accounts/import-private-key'); await page.locator('[name="privateKey"]').fill(key.getSecretKey()); await page.locator('[name="privateKey"]').blur(); await page.locator('button[type="submit"]').click();
    await page.waitForURL(/protect-account/); await page.locator('[name="password.input"]').fill(password); await page.locator('[name="password.confirmation"]').fill(password); await page.locator('#acceptedTos').click(); await page.locator('button[type="submit"]').click(); await page.waitForURL(/#\/tokens/);
    privateStage = false; phase = 'normal account controls'; const imported = await accounts(); assert.equal(imported.length, 1); assert.equal(imported[0].address, owner); assert(!imported[0].isLocked); accountId = imported[0].id;
    assert.equal((await command('@setNetwork', { env: 'local', customRpcUrl: null })).type, 'done');
    proof.initialJournal = await journal(); assert(Object.values(proof.initialJournal).every(rows => rows.length === 0)); proof.encryptedBefore = await encrypted();
    if (mode === 'live') {
      phase = 'four complete NFT forms before lock'; proof.formsBeforeLock = [];
      for (const item of cases) { const form = await context.newPage(), uiSource = await inspectUI(form); await form.goto(base + '#/nft-transfer/' + item.objectId);
        await expect(form.locator('[name="to"]')).toBeVisible({ timeout: 150000 }); await form.locator('[name="to"]').fill(oracle.addresses.existingTarget); await form.locator('[name="to"]').blur();
        const review = form.locator('form button[type="submit"]'); await expect(review).toBeEnabled({ timeout: 150000 });
        const state = await stateRows(form); assert.equal(state.approvals.length, 0); assert(state.contexts.length);
        forms.push({ ...item, form, review }); proof.formsBeforeLock.push({ ...item, uiSource, route: new URL(form.url()).hash, recipient: await form.locator('[name="to"]').inputValue(), state });
      }
    }
    demo = await context.newPage(); demo.setDefaultTimeout(30000); const url = new URL(origin); await demo.goto(url.href); const connect = context.waitForEvent('page', { timeout: 15000 }).catch(() => null);
    await demo.getByRole('button', { name: 'Connect', exact: true }).click(); const connection = await connect;
    if (connection) { await connection.getByRole('button', { name: /^(继续|Continue)$/ }).click(); await connection.getByRole('button', { name: /^(连接|Connect)$/ }).click(); }
    await demo.getByTestId('accounts-list').getByText(owner, { exact: true }).waitFor(); url.searchParams.set('authorization', Buffer.from(variant.json).toString('base64')); await demo.goto(url.href); await demo.getByRole('button', { name: 'Connect', exact: true }).click(); await demo.getByTestId('accounts-list').getByText(owner, { exact: true }).waitFor();
    const opened = context.waitForEvent('page', { timeout: 20000 }); opened.catch(() => {}); await demo.getByRole('button', { name: mode === 'live' ? 'Sign authorization fixture' : 'Execute authorization fixture', exact: true }).click();
    const popup = await opened, approve = popup.getByRole('button', { name: /^(批准|Approve)$/ }); await expect(approve).toBeEnabled({ timeout: 120000 });
    assert.equal((await popup.getByText(/^(交易摘要|Transaction digest):/).innerText()).split(':').pop().trim(), variant.digest); proof.originalRequestId = new URL(popup.url()).hash.split('/').pop();
    if (mode === 'live') {
      debug = await require('./lib/current-worker-production-sign-hold-verified.cjs')(context, worker, 'sign', accountId, build.output); proof.signHoldSource = debug.sourceProof;
      phase = 'original real sign held'; const pause = debug.wait(), click = approve.click(); click.catch(() => {}); await debug.install(await pause); await click;
      await expect.poll(() => worker.evaluate(() => globalThis.__signReturnHold.responseReady), { timeout: 15000 }).toBe(true); heldAt = await worker.evaluate(() => Date.now()); proof.heldAt = heldAt;
      await Promise.all(jobs); const count = simCount(); assert.equal(count, 2); proof.competitions = [];
      for (const item of forms) { phase = item.name + ' real Review under lock'; assert(await item.form.evaluate(name => navigator.locks.request(name, { mode: 'exclusive', ifAvailable: true }, lock => lock === null), lockName));
        await item.review.click(); await expect(item.form.getByText('当前链账户正在签名或恢复，请稍后查看结果', { exact: true })).toBeVisible({ timeout: 60000 }); await expect(item.review).toBeEnabled({ timeout: 60000 });
        assert.equal(await item.form.locator('[name="to"]').inputValue(), oracle.addresses.existingTarget); const state = await stateRows(item.form); assert.equal(state.approvals.length, 0); assert(state.contexts.length);
        await Promise.all(jobs); assert.equal(simCount(), count); const heldState = await worker.evaluate(() => globalThis.__signReturnHold);
        assert(heldState.invoked === 1 && heldState.signaturePresent && !heldState.released && heldState.dispatches === 0 && heldState.intentBytesSha256 === variant.bytesSha256);
        assert.deepEqual(await journal(), proof.initialJournal); assert.equal(executeAttempts, 0);
        proof.competitions.push({ name: item.name, objectId: item.objectId, route: new URL(item.form.url()).hash, text: (await item.form.locator('body').innerText()).slice(0, 6000), state, heldState, nativeLockUnavailable: true, simulationsBefore: count, simulationsAfter: simCount() });
      }
      phase = 'release original result after lease expiry'; await expect.poll(() => Date.now() - heldAt >= 31000, { timeout: 33000 }).toBe(true); proof.releaseAt = await worker.evaluate(() => Date.now()); await worker.evaluate(() => globalThis.__releaseSignReturnHold());
      await expect(demo.getByRole('alert')).toBeVisible({ timeout: 30000 }); proof.originalResultError = await demo.getByRole('alert').innerText(); assert(proof.originalResultError.includes('网络准入记录未通过精确合同')); assert.equal(await demo.getByTestId('action-result').count(), 0);
      await expect.poll(freeLock, { timeout: 30000 }).toBe(true); await worker.evaluate(() => globalThis.__restoreSignReturnHold()); assert(await worker.evaluate(() => globalThis.__signReturnHold.restored)); proof.realSignerRestored = true;
      proof.previews = [];
      for (const item of forms) { phase = item.name + ' positive preview after release'; await item.form.goto(base + '#/tokens'); await item.form.goto(base + '#/nft-transfer/' + item.objectId);
        await expect(item.form.locator('[name="to"]')).toBeVisible({ timeout: 150000 }); await item.form.locator('[name="to"]').fill(oracle.addresses.existingTarget); await item.form.locator('[name="to"]').blur();
        await expect(item.review).toBeEnabled({ timeout: 120000 }); const startCount = simCount(); await item.review.click(); await expect(item.form.getByRole('button', { name: /^(Send NFT Now|立即发送 NFT)$/ })).toBeEnabled({ timeout: 150000 });
        const state = await stateRows(item.form); assert.equal(state.approvals.length, 1); const approval = state.approvals[0], prepared = approval.prepared;
        assert.equal(prepared.route, item.route); assert.equal(prepared.sender, owner); assert.equal(prepared.input.objectId, item.objectId); assert.equal(prepared.input.to, oracle.addresses.existingTarget);
        const transaction = Transaction.from(Buffer.from(prepared.bytesBase64, 'base64')); assert.equal(await transaction.getDigest(), prepared.digest); assert.equal(transaction.getData().sender, owner); assert.equal(String(transaction.getData().gasData.budget), String(prepared.gasBudget));
        await Promise.all(jobs); assert.equal(simCount() - startCount, 2); assert.deepEqual(await journal(), proof.initialJournal); assert.equal(executeAttempts, 0);
        proof.previews.push({ name: item.name, objectId: item.objectId, approval, state, text: (await item.form.locator('body').innerText()).slice(0, 6000) });
        await item.form.getByRole('button', { name: /^(Back|返回)$/ }).click(); await expect(item.form.locator('[name="to"]')).toBeVisible(); assert.equal((await stateRows(item.form)).approvals.length, 0); await item.form.goto(base + '#/tokens'); await item.form.close();
      }
      assert.equal(simCount(), 10); proof.realPrivateSignDataCompleted = 1; proof.signaturesReturnedToDapp = 0;
    } else {
      phase = 'first unique execute approval'; await approve.click(); await expect.poll(() => intercepts.length, { timeout: 60000 }).toBe(1);
      await expect.poll(async () => (await journal())['journal-v2'].length, { timeout: 20000 }).toBe(1); proof.pendingJournal = await journal();
      const pending = proof.pendingJournal['journal-v2'][0]; assert.equal(pending.digest, variant.digest); assert.equal(pending.scope, scope); assert.equal(pending.state, 'dispatch-pending'); assert.equal(pending.accountId, accountId);
      assert.equal(proof.pendingJournal['pending-scopes-v2'].length, 1); assert.equal(proof.pendingJournal['pending-scopes-v2'][0].recordId, pending.id);
      await Promise.all(jobs); assert.equal(simCount(), 2); assert.equal(executeAttempts, 1);
      const previousWorker = worker; await context.close(); context = undefined; let absent = false; try { await previousWorker.evaluate(() => true); } catch { absent = true; } assert(absent); proof.originalWorkerClosed = true;
      await start('restarted'); assert((await accounts())[0].isLocked); assert.deepEqual(await journal(), proof.pendingJournal); assert.equal(await encrypted(), proof.encryptedBefore);
      phase = 'private normal UI unlock'; privateStage = true; await page.getByTestId('unlock-account-button').click(); const dialog = page.getByRole('dialog'); await dialog.locator('[name="password"]').fill(password); await dialog.locator('[name="password"]').blur(); await dialog.locator('button[type="submit"]').click(); await expect(page.getByTestId('lock-account-button')).toBeVisible({ timeout: 60000 }); privateStage = false;
      assert(!(await accounts())[0].isLocked); await expect.poll(freeLock, { timeout: 120000 }).toBe(true); proof.nativeScopeFreeAfterOriginalClose = true; proof.pendingForms = [];
      for (const item of cases) { phase = item.name + ' durable pending form'; await page.goto(base + '#/nft-transfer/' + item.objectId); await expect(page.getByText(variant.digest, { exact: false }).first()).toBeVisible({ timeout: 150000 });
        for (const button of await page.locator('form button[type="submit"]').all()) await expect(button).toBeDisabled(); assert.equal(await page.getByRole('button', { name: /^(Send NFT Now|立即发送 NFT)$/ }).count(), 0);
        const state = await stateRows(page); assert(state.contexts.length && state.approvals.length === 0); assert.deepEqual(await journal(), proof.pendingJournal); await Promise.all(jobs); assert.equal(simCount(), 2); assert.equal(executeAttempts, 1);
        proof.pendingForms.push({ ...item, route: new URL(page.url()).hash, text: (await page.locator('body').innerText()).slice(0, 6000), state, simulations: simCount(), executeAttempts });
        await page.goto(base + '#/tokens'); await expect.poll(freeLock, { timeout: 120000 }).toBe(true); assert.deepEqual(await journal(), proof.pendingJournal);
      }
      proof.pendingJournalHeld = true; proof.productCreatedPending = true; proof.signaturesInInterceptedRequest = 1;
    }
    phase = 'normal relock and complete final capture'; proof.finalJournal = await journal(); assert.deepEqual(proof.finalJournal, mode === 'live' ? proof.initialJournal : proof.pendingJournal);
    proof.encryptedAfter = await encrypted(); assert.equal(proof.encryptedAfter, proof.encryptedBefore); assert.equal((await command('lockAccountSourceOrAccount', { id: accountId })).type, 'done'); assert((await accounts())[0].isLocked);
    await Promise.all(jobs); assert.equal(blocked.length, 0);
    assert(captureErrors.every(e => {
      if (e.status !== 200 || e.headers?.['grpc-status'] !== '5' || e.unexpectedExecute || !e.requestBase64) return false;
      const request = Buffer.from(e.requestBase64, 'base64');
      if (e.url.endsWith('/GetTransaction')) return GrpcTypes.GetTransactionRequest.fromBinary(request.subarray(5)).digest === variant.digest;
      if (e.url.endsWith('/GetObject')) return GrpcTypes.GetObjectRequest.fromBinary(request.subarray(5)).objectId === owner;
      return false;
    }));
    for (const frame of frames.filter(f => f.url.endsWith('/GetTransaction'))) { const b = Buffer.from(frame.requestBase64, 'base64'); assert.equal(GrpcTypes.GetTransactionRequest.fromBinary(b.subarray(5)).digest, variant.digest); }
    held(); Object.assign(proof, { passed: true, currentFourNFTFormsAccepted: true, actualFourFormTestExecuted: true });
  } catch (error) { Object.assign(proof, { passed: false, phase, errorType: error.name,
      message: privateStage ? 'Private account stage failed; details withheld' : String(error.message).replaceAll(password, '[redacted]').replaceAll(key.getSecretKey(), '[redacted]').slice(0, 700) }); process.exitCode = 1; }
  finally {
    if (worker) { const hold = await worker.evaluate(() => globalThis.__signReturnHold ? { released: globalThis.__signReturnHold.released } : null).catch(() => null);
      if (hold && !hold.released) await new Promise(resolve => setTimeout(resolve, Number.isFinite(heldAt) ? Math.max(0, 31000 - (Date.now() - heldAt)) : 31000));
      await worker.evaluate(() => { globalThis.__releaseSignReturnHold?.(); globalThis.__restoreSignReturnHold?.(); }).catch(() => {}); }
    if (debug) await debug.close(); if (context) await context.close(); proof.ownedBrowserNaturallyClosed = true; await Promise.all(jobs); globalThis.fetch = fetch0;
    if (server) await new Promise(resolve => server.close(resolve));
    Object.assign(proof, { observedAt: new Date().toISOString(), mode, owner, accountId, profile, source: build.sourceAfter,
      cases, variant, h0: network.expectedGenesisDigest, generation: network.generation,
      scopeKey: scope, stages, frames, nativeFrames, captureErrors, blocked, intercepts,
      executeAttempts, forwardedExecuteRequests: 0, journalSeeded: false, originalProfilesOpened: 0,
      newContainers: 0, certificateChanges: 0, ordinaryChromeAccepted: false, parentCompletion: false, inputsSha256: pins });
    record(output, proof); console.log(JSON.stringify({ passed: proof.passed, mode, phase: proof.phase, executeAttempts, forwardedExecuteRequests: 0 }));
  }
}
main().catch(error => { console.error(JSON.stringify({ passed: false, phase: 'preflight', errorType: error.name })); process.exitCode = 1; });
