// Current full staking and withdrawal forms, real sign-only Web Lock, exact previews; never dispatch.
process.env.PW_EXPERIMENTAL_SERVICE_WORKER_NETWORK_EVENTS = '1';
const fs = require('node:fs'), path = require('node:path'), os = require('node:os'), crypto = require('node:crypto'), assert = require('node:assert/strict'), http = require('node:http'), cp = require('node:child_process');
const { chromium, expect } = require('@playwright/test'), { Transaction } = require('rtd-typescript/transactions'), { GrpcTypes } = require('rtd-typescript/grpc');
const { Ed25519Keypair } = require('rtd-typescript/keypairs/ed25519'), loader = require('tsx/cjs/api');
const read = f => JSON.parse(fs.readFileSync(f)), sha = f => crypto.createHash('sha256').update(fs.readFileSync(f)).digest('hex');
const wallet = path.resolve(__dirname, '..'), load = n => loader.require(path.join(wallet, 'src/shared/rpc', n + '.ts'), __filename);
(async () => {
  const [indexedFile, environmentFile, output, fixture] = process.argv.slice(2); assert(output && !fs.existsSync(output));
  const rt = path.join(os.homedir(), '.local/state/rtd-wallet-migration/dev-20261006-03'), logs = path.join(wallet, 'migrationToGRpcOrGraphQLDoc/workLog');
  assert(path.dirname(path.resolve(fixture)) === rt && path.basename(fixture).startsWith('current-staking-lock-C42-20261007-') && !fs.existsSync(fixture));
  const indexed = read(indexedFile), environment = read(environmentFile), buildFile = path.join(logs, '20261007-default-generation-positive-C42-build-01.json'), build = read(buildFile);
  const profileFile = path.join(rt, 'certified-positive-transport-release-20261006-01/profile.json');
  assert(indexed.passed && indexed.originalStakeIndexedInBothProductionDomains && environment.passed && environment.through === 333000 && environment.currentC42OriginRegistered);
  assert(environment.effectiveAssetWindow.originalStakingExecutionHeightReached && Date.now() - Date.parse(environment.observedAt) < 300000);
  for (const result of [indexed, environment]) for (const [f, h] of Object.entries(result.inputsSha256)) assert.equal(sha(f), h);
  assert(build.passed); assert.deepEqual(require('./build-reviewed-generation-production-extension.cjs').productSource(), build.sourceAfter);
  for (const [f, h] of Object.entries(build.artifacts)) assert.equal(sha(path.join(build.output, f)), h);
  const owner = indexed.owner, stakeId = indexed.stakeId, validator = indexed.domain.value.positions[0].validatorAddress;
  const key = read(path.join(rt, 'config/rtd.keystore')).map(e => { const b = Buffer.from(e, 'base64'); return b.length === 33 && b[0] === 0 ? Ed25519Keypair.fromSecretKey(b.subarray(1)) : null; }).find(k => k?.toRtdAddress() === owner); assert(key);
  const password = crypto.randomBytes(32).toString('base64url'), profile = path.join(fixture, 'profile');
  fs.mkdirSync(fixture, { mode: 0o700 }); fs.writeFileSync(path.join(fixture, 'recovery-private.json'), JSON.stringify({ password }) + '\n', { flag: 'wx', mode: 0o600 });
  assert(!cp.execFileSync('ps', ['-Ao', 'command='], { encoding: 'utf8' }).split('\n').some(s => s.includes('Google Chrome') && s.includes('--user-data-dir=' + profile)));
  let context, worker, page, stakePage, withdrawPage, demo, server, debug, closing = false, secretStage = false, stage = 'fresh native preflight', report = {};
  const checks = [], frames = [], captureErrors = [], forbidden = [], jobs = [], simulations = [], previews = []; let executeRequests = 0;
  const check = (name, value) => { assert(value, name); checks.push({ name, passed: true }); };
  const snapshot = require('./lib/lifecycle-journal-snapshot.cjs');
  const approvals = p => p.evaluate(() => {
    const seen = new Set(), stack = [], rows = [];
    for (const n of document.querySelectorAll('*')) { const k = Object.keys(n).find(k => k.startsWith('__reactFiber$')); if (k) { let f = n[k]; while (f.return) f = f.return; stack.push(f); } }
    while (stack.length) { const f = stack.pop(); if (!f || seen.has(f)) continue; seen.add(f); for (let h = f.memoizedState; h; h = h.next) { const v = h.memoizedState; if (v && typeof v === 'object' && v.prepared?.bytesBase64 && typeof v.requestId === 'string') rows.push(JSON.parse(JSON.stringify(v))); } stack.push(f.child, f.sibling); }
    return Array.from(new Map(rows.map(v => [v.requestId, v])).values());
  });
  try {
    const { validateNetworkProfile, executionScopeKey } = load('profile'), { WalletReadSession } = load('session'), { WalletFullnodeReader } = load('fullnode-reader');
    const selectedProfile = validateNetworkProfile(read(profileFile)), session = new WalletReadSession(selectedProfile); let coins;
    try {
      const native = new WalletFullnodeReader(session); coins = await native.coins(owner, '0x2::rtd::RTD'); const stake = await native.object(stakeId), system = await native.object('0x5');
      assert(stake && system); assert.equal(stake.owner.AddressOwner, owner); assert.equal(stake.version, indexed.freshStake.version); assert.equal(stake.digest, indexed.freshStake.digest);
      assert.equal(Buffer.from(stake.content).toString('base64'), indexed.freshStake.contentBase64);
      report.nativeBefore = [stake, system].map(o => ({ objectId: o.objectId, type: o.type, version: o.version, digest: o.digest, owner: o.owner, contentBase64: Buffer.from(o.content).toString('base64'), objectBcsBase64: Buffer.from(o.objectBcs).toString('base64') }));
    } finally { session.close(); }
    assert(coins.length); const attemptFile = path.join(os.homedir(), '.local/state/rtd-wallet-migration/dev-20261003-01/current-mnemonic-coin-execution-20261006-01/attempt.json');
    const gasPrice = Transaction.from(read(attemptFile).bytesBase64).getData().gasData.price, tx = new Transaction();
    tx.setSender(owner); tx.setGasOwner(owner); tx.setGasPrice(gasPrice); tx.setGasBudget('100000000'); tx.setGasPayment([{ objectId: coins[0].objectId, version: coins[0].version, digest: coins[0].digest }]); tx.setExpiration({ None: true });
    const part = tx.splitCoins(tx.gas, [1n]); tx.transferObjects([part], owner); const bytes = await tx.build();
    const variant = { json: await tx.toJSON(), bytesBase64: Buffer.from(bytes).toString('base64'), digest: await tx.getDigest(), bytesSha256: crypto.createHash('sha256').update(bytes).digest('hex') };
    const demoRoot = path.join(os.homedir(), '.local/state/rtd-wallet-migration/dev-20261003-01/authorization-matrix-demo-20261006-01');
    server = http.createServer((req, res) => { const pathname = new URL(req.url, 'http://localhost').pathname, file = path.resolve(demoRoot, '.' + (pathname === '/' ? '/index.html' : pathname)); if (!file.startsWith(demoRoot + path.sep) || !fs.existsSync(file) || !fs.statSync(file).isFile()) { res.writeHead(404).end(); return; } res.setHeader('Content-Type', file.endsWith('.js') ? 'text/javascript' : file.endsWith('.css') ? 'text/css' : 'text/html'); fs.createReadStream(file).pipe(res); });
    await new Promise(resolve => server.listen(0, '127.0.0.1', resolve)); const demoOrigin = 'http://127.0.0.1:' + server.address().port;
    context = await chromium.launchPersistentContext(profile, { executablePath: path.join(os.homedir(), 'Library/Caches/ms-playwright/chromium-1243/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing'), headless: true, viewport: { width: 800, height: 700 }, args: [`--disable-extensions-except=${build.output}`, `--load-extension=${build.output}`] });
    const allowed = new Set(['http://127.0.0.1:41750', 'http://127.0.0.1:41954', 'http://127.0.0.1:41955', 'http://127.0.0.1:41956', 'http://127.0.0.1:41718', demoOrigin]);
    await context.route('**/*', async route => {
      const r = route.request(), u = new URL(r.url()); if (['http:', 'https:'].includes(u.protocol) && (!allowed.has(u.origin) || /\/ExecuteTransaction$/.test(u.pathname) || String(r.postData()).includes('"jsonrpc"'))) { forbidden.push({ url: u.href, method: r.method() }); return route.abort(); } return route.continue();
    });
    context.on('request', r => { if (r.url().endsWith('/ExecuteTransaction')) executeRequests++; });
    context.on('response', r => {
      const u = new URL(r.url()); if (!['http://127.0.0.1:41750', 'http://127.0.0.1:41954', 'http://127.0.0.1:41955', 'http://127.0.0.1:41956'].includes(u.origin)) return;
      const headers = Object.fromEntries(Object.entries(r.headers()).filter(([k]) => ['content-type','grpc-status','grpc-message','x-rtd-chain-id','x-rtd-checkpoint-height','x-rtd-lowest-available-checkpoint'].includes(k.toLowerCase())));
      const capturedDuringClose = closing; jobs.push((async () => {
        const request = r.request().postDataBuffer() ?? Buffer.alloc(0), response = await r.body();
        const row = { url: u.href, status: r.status(), responseHeaders: headers, requestBase64: request.toString('base64'), responseBase64: response.toString('base64') }; frames.push(row);
        if (u.pathname.endsWith('/SimulateTransaction')) {
          assert(request[0] === 0); const parsed = GrpcTypes.SimulateTransactionRequest.fromBinary(request.subarray(5, 5 + request.readUInt32BE(1)));
          assert.equal(parsed.checks, GrpcTypes.SimulateTransactionRequest_TransactionChecks.ENABLED);
          simulations.push({ ...row, bytesBase64: parsed.transaction?.bcs?.value ? Buffer.from(parsed.transaction.bcs.value).toString('base64') : null });
        }
      })().catch(e => captureErrors.push({ url: u.href, status: r.status(), requestBase64: Buffer.from(r.request().postDataBuffer() ?? []).toString('base64'), responseHeaders: headers, closing: capturedDuringClose || closing, message: String(e.message).split('\n')[0].slice(0, 180) })));
    });
    worker = context.serviceWorkers()[0] || await context.waitForEvent('serviceworker'); const loaded = await require('./lib/current-extension-worker.cjs').ensure(context, worker, build.output); worker = loaded.worker;
    report.workerSource = loaded.evidence.after ?? loaded.evidence.before; check('current C42 worker bytes', report.workerSource.workerSha256 === build.artifacts['background.js']);
    assert.equal(new URL(worker.url()).host, 'inejiinamojodncefjohnjceedcpbgfg'); const base = new URL('ui.html', worker.url()).href;
    const uiFiles = Object.keys(build.artifacts).filter(f => f.endsWith('.js') && !['background.js', 'content-script.js', 'dapp-interface.js', 'egress-gate.js'].includes(f));
    page = await context.newPage(); report.uiSource = await require('./lib/current-extension-ui-source.cjs').inspect(context, page, build.output, uiFiles, { url: base, navigate: async () => { await page.goto(base); await page.locator('button,a,input').first().waitFor(); } });
    const command = (method, args) => page.evaluate(({ method, args }) => new Promise((resolve, reject) => {
      const port = chrome.runtime.connect({ name: 'rtd_ui<->background' }), id = crypto.randomUUID(), timer = setTimeout(() => { port.disconnect(); reject(new Error('account command timeout')); }, 20000);
      port.onMessage.addListener(m => { if (m?.kind === 'rtd-ui-source-challenge') { port.postMessage({ kind: 'rtd-ui-source-confirm', nonce: m.nonce }); return; } if (m.id === id) { clearTimeout(timer); port.disconnect(); resolve(m.payload); } });
      port.postMessage({ id, payload: method === '@setNetwork' ? { type: 'set-network', network: args } : { type: 'method-payload', method, args } });
    }), { method, args });
    stage = 'private import and protection'; secretStage = true; await page.goto(base + '#/accounts/import-private-key'); await page.locator('[name="privateKey"]').fill(key.getSecretKey()); await page.locator('[name="privateKey"]').blur();
    await expect(page.locator('button[type="submit"]')).toBeEnabled(); await page.locator('button[type="submit"]').click(); await page.waitForURL(/protect-account/);
    await page.locator('[name="password.input"]').fill(password); await page.locator('[name="password.confirmation"]').fill(password); await page.locator('#acceptedTos').click(); await expect(page.locator('button[type="submit"]')).toBeEnabled(); await page.locator('button[type="submit"]').click(); await page.waitForURL(/#\/tokens/, { timeout: 45000 }); secretStage = false;
    const accounts = (await command('getStoredEntities', { type: 'accounts' })).args.entities; check('controlled current owner imported and unlocked', accounts.length === 1 && accounts[0].address === owner && !accounts[0].isLocked);
    assert.equal((await command('@setNetwork', { env: 'local', customRpcUrl: null })).type, 'done'); const before = await snapshot(page); assert(Object.values(before).every(v => Array.isArray(v) && v.length === 0)); report.initialJournal = before;
    stage = 'full actual forms before signing lock'; console.error(JSON.stringify({ phase: stage }));
    stakePage = await context.newPage(); await stakePage.goto(base + '#/stake/new'); await expect(stakePage.getByTestId('validator-list-item')).toHaveCount(1, { timeout: 120000 }); await stakePage.getByTestId('validator-list-item').click(); await stakePage.locator('a[href*="address="]').click();
    assert.equal(new URLSearchParams(new URL(stakePage.url()).hash.split('?')[1]).get('address'), validator); await expect(stakePage.locator('[name="amount"]')).toBeVisible({ timeout: 120000 });
    await stakePage.locator('[name="amount"]').fill('1'); await stakePage.locator('[name="amount"]').blur(); const stakeReview = stakePage.getByRole('button', { name: /^(预览交易|Review Transaction)$/ }); await expect(stakeReview).toBeEnabled({ timeout: 60000 });
    withdrawPage = await context.newPage(); await withdrawPage.goto(base + '#/stake/new?unstake=true&staked=' + stakeId);
    const withdrawReview = withdrawPage.getByRole('button', { name: /^(预览交易|Review Transaction)$/ }); await expect(withdrawReview).toBeEnabled({ timeout: 120000 });
    report.formsBeforeLock = [{ kind: 'stake', route: new URL(stakePage.url()).hash, text: (await stakePage.locator('body').innerText()).slice(0, 5000) }, { kind: 'withdraw', route: new URL(withdrawPage.url()).hash, text: (await withdrawPage.locator('body').innerText()).slice(0, 5000) }];
    check('validator and original indexed withdrawal forms ready before lock', (await stakePage.locator('[name="amount"]').count()) === 1 && (await approvals(stakePage)).length === 0 && (await approvals(withdrawPage)).length === 0);
    demo = await context.newPage(); demo.setDefaultTimeout(60000); const url = new URL(demoOrigin); await demo.goto(url.href); await expect(demo.getByRole('button', { name: 'Connect', exact: true })).toBeEnabled();
    const connecting = context.waitForEvent('page', { timeout: 15000 }).catch(() => null); await demo.getByRole('button', { name: 'Connect', exact: true }).click(); const connection = await connecting;
    if (connection) { await connection.getByRole('button', { name: /^(继续|Continue)$/ }).click(); await connection.getByRole('button', { name: /^(连接|Connect)$/ }).click(); }
    await demo.getByTestId('accounts-list').getByText(owner, { exact: true }).waitFor(); url.searchParams.set('authorization', Buffer.from(variant.json).toString('base64')); await demo.goto(url.href); await demo.getByRole('button', { name: 'Connect', exact: true }).click(); await demo.getByTestId('accounts-list').getByText(owner, { exact: true }).waitFor();
    const opened = context.waitForEvent('page', { timeout: 20000 }); opened.catch(() => {}); await demo.getByRole('button', { name: 'Sign authorization fixture', exact: true }).click(); const firstPopup = await opened, approve = firstPopup.getByRole('button', { name: /^(批准|Approve)$/ }); await expect(approve).toBeEnabled({ timeout: 120000 });
    assert.equal((await firstPopup.getByText(/^(交易摘要|Transaction digest):/).innerText()).split(':').pop().trim(), variant.digest);
    report.originalApprovedTransaction = { ...variant, requestId: new URL(firstPopup.url()).hash.split('/').pop() };
    debug = await require('./lib/current-worker-production-sign-hold-verified.cjs')(context, worker, 'sign', accounts[0].id, build.output); report.signHoldSource = debug.sourceProof;
    stage = 'real original signing result held'; console.error(JSON.stringify({ phase: stage })); const pause = debug.wait(), click = approve.click(); click.catch(() => {}); await debug.install(await pause); await click;
    await expect.poll(() => worker.evaluate(() => globalThis.__signReturnHold.responseReady), { timeout: 15000 }).toBe(true); report.heldAt = await worker.evaluate(() => Date.now());
    const scope = executionScopeKey(selectedProfile, owner), lockName = 'wallet-execution:' + scope; report.scopeKey = scope;
    await Promise.all(jobs); const simBefore = simulations.length; assert.equal(simBefore, 2);
    assert(simulations.every(r => r.bytesBase64 === variant.bytesBase64));
    const initialHeld = await worker.evaluate(() => globalThis.__signReturnHold);
    assert(initialHeld.invoked === 1 && initialHeld.signaturePresent && !initialHeld.released && initialHeld.dispatches === 0);
    assert.equal(initialHeld.intentBytesSha256, variant.bytesSha256);
    report.heldSimulationsBefore = simBefore; report.competitions = [];
    for (const [kind, form, review] of [['stake', stakePage, stakeReview], ['withdraw', withdrawPage, withdrawReview]]) {
      stage = 'actual ' + kind + ' form prepare under real same-scope lock'; console.error(JSON.stringify({ phase: stage }));
      assert(await form.evaluate(name => navigator.locks.request(name, { mode: 'exclusive', ifAvailable: true }, lock => lock === null), lockName));
      await expect(review).toBeEnabled({ timeout: 120000 }); await review.click(); await expect(form.getByText('当前链账户正在签名或恢复，请稍后查看结果', { exact: true })).toBeVisible({ timeout: 60000 });
      await expect(review).toBeEnabled({ timeout: 120000 }); const rows = await approvals(form); assert.deepEqual(rows, []); await Promise.all(jobs); assert.equal(simulations.length, simBefore);
      const held = await worker.evaluate(() => globalThis.__signReturnHold); assert(held.invoked === 1 && held.signaturePresent && !held.released && held.dispatches === 0);
      assert.deepEqual(await snapshot(page), before); report.competitions.push({ kind, route: new URL(form.url()).hash, text: (await form.locator('body').innerText()).slice(0, 5500), nativeLockUnavailable: true, preparedRows: rows, simulationsBefore: simBefore, simulationsAfter: simulations.length, held });
      check(kind + ' complete form preparation rejected with no competing simulation signature dispatch or journal write', true);
    }
    stage = 'release after actual thirty-second lease expiry'; await expect.poll(() => Date.now() - report.heldAt >= 31000, { timeout: 33000 }).toBe(true); report.releaseAt = await worker.evaluate(() => Date.now()); assert(report.releaseAt - report.heldAt >= 31000);
    await worker.evaluate(() => globalThis.__releaseSignReturnHold()); await expect(demo.getByRole('alert')).toBeVisible({ timeout: 30000 }); report.originalResultError = await demo.getByRole('alert').innerText();
    assert(report.originalResultError.includes('网络准入记录未通过精确合同')); assert.equal(await demo.getByTestId('action-result').count(), 0);
    await expect.poll(() => page.evaluate(name => navigator.locks.request(name, { mode: 'exclusive', ifAvailable: true }, lock => lock !== null), lockName)).toBe(true);
    await worker.evaluate(() => globalThis.__restoreSignReturnHold()); assert(await worker.evaluate(() => globalThis.__signReturnHold.restored)); report.realSignDataCompleted = 1; report.realSignerRestored = true;
    check('actual original sign-only result expires with zero released signatures and native lock released', true);
    let simCursor = simulations.length;
    for (const [kind, form, review, amount] of [['stake', stakePage, stakeReview, '1'], ['stake', stakePage, stakeReview, '2'], ['withdraw', withdrawPage, withdrawReview, null]]) {
      stage = 'actual ' + kind + (amount ? ' ' + amount + ' RTD' : '') + ' preview after release'; console.error(JSON.stringify({ phase: stage }));
      if (amount) { const input = form.locator('[name="amount"]'); await input.click(); await input.press('Meta+A'); await input.press('Backspace'); await input.pressSequentially(amount); await input.blur(); }
      await expect(review).toBeEnabled({ timeout: 60000 }); await review.click(); const send = form.getByRole('button', { name: kind === 'stake' ? /^(立即质押|Stake Now)$/ : /^(立即解除质押|Unstake Now)$/ }); await expect(send).toBeEnabled({ timeout: 120000 });
      const rows = await approvals(form); assert.equal(rows.length, 1); const approval = rows[0], prepared = approval.prepared;
      assert.equal(prepared.sender, owner); assert.equal(prepared.input.kind, kind); assert.equal(await Transaction.from(prepared.bytesBase64).getDigest(), prepared.digest);
      if (kind === 'stake') { assert.equal(prepared.input.validator, validator); assert.equal(prepared.input.amount, (BigInt(amount) * 1000000000n).toString()); }
      else { assert.equal(prepared.input.objectId, stakeId); assert.equal(prepared.withdrawal.principal, '1000000000'); assert.equal(prepared.withdrawal.poolId, indexed.domain.value.positions[0].poolId); }
      await Promise.all(jobs); const fresh = simulations.slice(simCursor); assert.equal(fresh.length, 2); assert.equal(fresh[0].bytesBase64, null); assert.equal(fresh[1].bytesBase64, prepared.bytesBase64); assert(fresh.every(r => r.status === 200)); simCursor = simulations.length;
      const text = await form.locator('body').innerText(); assert(text.includes(prepared.digest) && text.includes(owner)); if (kind === 'withdraw') assert(text.includes(stakeId));
      previews.push({ kind, amount, route: new URL(form.url()).hash, approval, text, simulations: fresh }); assert.deepEqual(await snapshot(page), before);
      await form.getByRole('button', { name: /^(Back|返回)$/ }).click(); await expect(review).toBeEnabled({ timeout: 60000 }); assert.deepEqual(await approvals(form), []); assert.equal(await send.count(), 0);
      check(kind + (amount ? ' ' + amount + ' RTD' : '') + ' exact current preview and normal Back without dispatch', true);
    }
    assert.notEqual(previews[0].approval.requestId, previews[1].approval.requestId); assert.notEqual(previews[0].approval.prepared.digest, previews[1].approval.prepared.digest);
    report.finalJournal = await snapshot(page); assert.deepEqual(report.finalJournal, before); await stakePage.goto(base + '#/tokens'); await withdrawPage.goto(base + '#/tokens');
    assert.equal((await command('lockAccountSourceOrAccount', { id: accounts[0].id })).type, 'done'); check('controlled current account normally relocked', (await command('getStoredEntities', { type: 'accounts' })).args.entities[0].isLocked);
    await Promise.all(jobs); assert.equal(simulations.length, 8); assert.equal(executeRequests, 0); assert.deepEqual(forbidden, []); assert(captureErrors.every(e => !/\/(SimulateTransaction|ExecuteTransaction|VerifySignature)$/.test(new URL(e.url).pathname)));
    report.preCloseNetworkWitness = { frames: frames.length, simulations: simulations.length, captureErrors: captureErrors.length, executeRequests, observedAt: new Date().toISOString() };
    for (const [f, h] of Object.entries(build.artifacts)) assert.equal(sha(path.join(build.output, f)), h); assert.deepEqual(require('./build-reviewed-generation-production-extension.cjs').productSource(), build.sourceAfter);
    report = { ...report, passed: true, observedAt: new Date().toISOString(), owner, stakeId, validator, originalStakingDigest: indexed.originalDigest, originalStakingCheckpoint: '332734', h0: indexed.h0, generation: indexed.generation,
      fixture, profile, source: build.sourceAfter, checks, previews, signatureCount: 0, executeRequests, simulations, frames, captureErrors, forbidden, journalUnchanged: true,
      allOriginalHttpResponseBodiesCaptured: captureErrors.length === 0, allEightCriticalSimulationResponsesCaptured: true, uncapturedOriginalReadResponsesRetained: true, currentC42StakeWithdrawFormsAccepted: true, currentDurablePendingMatrixAccepted: false, parentTX04Complete: false, originalProfilesOpened: 0, certificateChanges: 0, normalChromeHttpsAccepted: false,
      inputsSha256: Object.fromEntries([__filename, path.resolve(indexedFile), path.resolve(environmentFile), buildFile, profileFile, attemptFile, path.join(__dirname, 'lib/current-worker-production-sign-hold-verified.cjs'), path.join(__dirname, 'lib/current-extension-worker.cjs'), path.join(__dirname, 'lib/current-extension-ui-source.cjs')].map(f => [f, sha(f)])),
      scope: 'Actual current C42 full staking/withdrawal forms and real validator/original332734 indexed position selected before real original same-scope sign-only lock; both actual Review actions rejected with no competing simulations/signatures/journal/dispatch. One privately completed real signature withheld beyond real31s validity, result fails closed; native lock/signer restored. Three real stake1/stake2/withdraw previews with six kind/final simulations, normal Back/relock; eight total simulations including two original sign-only checks. No Execute, original profile, durable pending, all NFT matrix, normalChrome TLS or parent completion.' };
  } catch (e) {
    report = { ...report, passed: false, observedAt: new Date().toISOString(), stage, errorType: e.name, message: secretStage ? 'Private account stage failed; diagnostic redacted' : String(e.message).replaceAll(password, '[redacted]').replaceAll(key.getSecretKey(), '[redacted]').slice(0, 900), checks, previews, simulations, frames, captureErrors, forbidden, executeRequests, fixture, profile };
    if (!secretStage) for (const [name, p] of [['stakeDiagnostic', stakePage], ['withdrawDiagnostic', withdrawPage]]) if (p) report[name] = { route: new URL(p.url()).hash, text: (await p.locator('body').innerText().catch(() => '')).slice(0, 5000) };
    process.exitCode = 1;
  } finally {
    if (worker) {
      // Failed form checks must not turn cleanup into delivery of a still-valid real signature.
      const held = await worker.evaluate(() => globalThis.__signReturnHold ? { ready: globalThis.__signReturnHold.responseReady, released: globalThis.__signReturnHold.released } : null).catch(() => null);
      if (held && !held.released) {
        const heldAt = report.heldAt;
        if (Number.isFinite(heldAt)) await new Promise(resolve => setTimeout(resolve, Math.max(0, 31000 - (Date.now() - heldAt))));
        else await new Promise(resolve => setTimeout(resolve, 31000));
      }
      await worker.evaluate(() => { globalThis.__releaseSignReturnHold?.(); globalThis.__restoreSignReturnHold?.(); }).catch(() => {});
    }
    if (debug) await debug.close(); closing = true;
    if (context) { await context.unrouteAll({ behavior: 'ignoreErrors' }); await context.close(); } await Promise.all(jobs);
    if (server) await new Promise(resolve => server.close(resolve));
    report.frames = frames; report.simulations = simulations; report.captureErrors = captureErrors; report.allOriginalHttpResponseBodiesCaptured = captureErrors.length === 0;
    fs.writeFileSync(output, JSON.stringify(report, null, 2) + '\n', { flag: 'wx', mode: 0o600 }); console.log(JSON.stringify({ passed: report.passed, stage: report.stage, checks: checks.length, simulations: simulations.length, signaturesReturned: 0, executeRequests, frames: frames.length }));
  }
})().catch(e => { console.error(JSON.stringify({ passed: false, stage: 'preflight', errorType: e.name, message: String(e.message).slice(0, 250) })); process.exitCode = 1; });
