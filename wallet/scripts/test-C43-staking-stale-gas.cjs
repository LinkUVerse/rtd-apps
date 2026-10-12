// Actual current UI approvals and precise parameter fault; no signature or Execute may pass.
process.env.PW_EXPERIMENTAL_SERVICE_WORKER_NETWORK_EVENTS = '1';
const fs = require('node:fs'), path = require('node:path'), os = require('node:os'), crypto = require('node:crypto'), assert = require('node:assert/strict');
const { chromium, expect } = require('@playwright/test'), { Transaction } = require('rtd-typescript/transactions'), { GrpcTypes } = require('rtd-typescript/grpc');
const read = file => JSON.parse(fs.readFileSync(file)), sha = file => crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
const wallet = path.resolve(__dirname, '..'), log = path.join(wallet, 'migrationToGRpcOrGraphQLDoc/workLog');

(async () => {
  const [windowFile, output] = process.argv.slice(2); assert(output && !fs.existsSync(output));
  const buildFile = path.join(log, '20261007-default-generation-positive-C43-build-01.json');
  const liveFile = path.join(log, '20261007-C43-staking-forms-live-lock-chrome-01.json');
  const matrixFile = path.join(log, '20261007-C43-staking-matrix-completion-audit-01.json');
  const build = read(buildFile), live = read(liveFile), matrix = read(matrixFile), window = read(windowFile);
  assert(build.passed && live.passed && matrix.passed && matrix.currentTX04M4Accepted);
  assert(window.passed && window.currentC43OriginRegistered && window.effectiveAssetWindow.originalStakingExecutionHeightReached);
  assert(Date.now() - Date.parse(window.observedAt) < 300000);
  for (const proof of [live, matrix, window]) for (const [file, digest] of Object.entries(proof.inputsSha256)) assert.equal(sha(file), digest);
  assert.deepEqual(require('./build-reviewed-generation-production-extension.cjs').productSource(), build.sourceAfter);
  assert(live.profile === path.join(live.fixture, 'profile'));
  const password = read(path.join(live.fixture, 'recovery-private.json')).password;
  const checks = [], cases = [], traffic = [], simulations = [], captureErrors = [], forbidden = [], pageErrors = [], jobs = [];
  let context, page, worker, hook, stage = 'actual current C43 cold open', privateStage = false, proof = {};
  const check = (label, value) => { assert(value, label); checks.push({ label, passed: true }); console.log(JSON.stringify({ stage, checks: checks.length })); };
  const snapshot = () => require('./lib/lifecycle-journal-snapshot.cjs')(page);
  const cipher = () => page.evaluate(async () => {
    const db = await new Promise((resolve, reject) => { const request = indexedDB.open('RtdWallet DB'); request.onupgradeneeded = () => { request.transaction.abort(); reject(Error('Existing account required')); }; request.onsuccess = () => resolve(request.result); request.onerror = () => reject(Error('Readonly account failed')); });
    try { const rows = await new Promise((resolve, reject) => { const tx = db.transaction('accounts', 'readonly'), request = tx.objectStore('accounts').getAll(); request.onsuccess = () => resolve(request.result.map(row => ({ id: row.id, address: row.address, publicKey: row.publicKey, encrypted: row.encrypted, type: row.type }))); tx.onerror = () => reject(Error('Readonly accounts failed')); });
      if (rows.length !== 1 || rows[0].type !== 'imported' || typeof rows[0].encrypted !== 'string' || !rows[0].encrypted) throw Error('Expected protected existing owner');
      const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(JSON.stringify(rows)));
      return { owner: rows[0].address, sha256: Array.from(new Uint8Array(digest)).map(x => x.toString(16).padStart(2, '0')).join('') };
    } finally { db.close(); }
  });
  const approvals = () => page.evaluate(() => {
    const seen = new Set(), stack = [], rows = [];
    for (const n of document.querySelectorAll('*')) { const k = Object.keys(n).find(k => k.startsWith('__reactFiber$')); if (k) { let f = n[k]; while (f.return) f = f.return; stack.push(f); } }
    while (stack.length) { const f = stack.pop(); if (!f || seen.has(f)) continue; seen.add(f); for (let h = f.memoizedState; h; h = h.next) { const v = h.memoizedState; if (v?.prepared?.bytesBase64 && typeof v.requestId === 'string') rows.push(JSON.parse(JSON.stringify(v))); } stack.push(f.child, f.sibling); }
    return Array.from(new Map(rows.map(v => [v.requestId, v])).values());
  });
  const lockFree = () => worker.evaluate(scope => navigator.locks.request('wallet-execution:' + scope, { mode: 'exclusive', ifAvailable: true }, lock => Boolean(lock)), live.scopeKey);
  const contexts = () => page.evaluate(() => {
    const seen = new Set(), stack = [], rows = [];
    for (const n of document.querySelectorAll('*')) { const key = Object.keys(n).find(k => k.startsWith('__reactFiber$')); if (key) { let f = n[key]; while (f.return) f = f.return; stack.push(f); } }
    while (stack.length) { const f = stack.pop(); if (!f || seen.has(f)) continue; seen.add(f); for (let d = f.dependencies?.firstContext; d; d = d.next) { const v = d.memoizedValue; if (v && typeof v.readSessionKey === 'string' && v.assetSnapshotKey) rows.push({ bindingKey: v.bindingKey, readSessionKey: v.readSessionKey, assetSnapshotKey: v.assetSnapshotKey, state: v.state }); } stack.push(f.child, f.sibling); }
    return rows;
  });
  try {
    for (const [file, digest] of Object.entries(build.artifacts)) assert.equal(sha(path.join(build.output, file)), digest);
    context = await chromium.launchPersistentContext(live.profile, { executablePath: path.join(os.homedir(), 'Library/Caches/ms-playwright/chromium-1243/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing'), headless: true, args: [`--disable-extensions-except=${build.output}`, `--load-extension=${build.output}`] });
    await context.route('**/*', route => { const request = route.request(), u = new URL(request.url());
      if (['http:', 'https:'].includes(u.protocol)) { traffic.push({ url: u.href, method: request.method() });
        if (!['http://127.0.0.1:41750', 'http://127.0.0.1:41954', 'http://127.0.0.1:41955', 'http://127.0.0.1:41956', 'http://127.0.0.1:41718'].includes(u.origin) || /\/(VerifySignature|ExecuteTransaction)$/.test(u.pathname) || String(request.postData()).includes('"jsonrpc"')) { forbidden.push(u.href); return route.abort(); }
      } return route.continue();
    });
    context.on('response', response => { const atStage = stage, request = response.request(), u = new URL(response.url()); if (!['http:', 'https:'].includes(u.protocol)) return;
      jobs.push((async () => { const body = await response.body(); if (u.pathname.endsWith('/SimulateTransaction')) {
        const raw = request.postDataBuffer(); assert(raw?.[0] === 0 && raw.readUInt32BE(1) + 5 === raw.length);
        const input = GrpcTypes.SimulateTransactionRequest.fromBinary(raw.subarray(5)); assert.equal(input.checks, GrpcTypes.SimulateTransactionRequest_TransactionChecks.ENABLED);
        simulations.push({ stage: atStage, url: u.href, status: response.status(), requestBase64: raw.toString('base64'), responseBase64: body.toString('base64'), bytesBase64: input.transaction?.bcs?.value ? Buffer.from(input.transaction.bcs.value).toString('base64') : null });
      } else if ([503, 504].includes(response.status())) captureErrors.push({ stage: atStage, url: u.href, status: response.status(), responseHeaders: response.headers(), requestBase64: Buffer.from(request.postDataBuffer() ?? []).toString('base64'), responseBase64: body.toString('base64'), bodyCaptured: true });
      })().catch(error => captureErrors.push({ stage: atStage, url: u.href, status: response.status(), responseHeaders: response.headers(), requestBase64: Buffer.from(request.postDataBuffer() ?? []).toString('base64'), errorType: error.name, bodyCaptured: false })));
    });
    const initial = context.serviceWorkers()[0] || await context.waitForEvent('serviceworker');
    const loaded = await require('./lib/current-extension-worker.cjs').ensure(context, initial, build.output); worker = loaded.worker;
    proof.workerSource = loaded.evidence.after ?? loaded.evidence.before; assert.equal(new URL(worker.url()).host, 'bdndjiekaedpfbbndoefomeaeccaohgg');
    page = await context.newPage(); page.on('pageerror', error => pageErrors.push(error.name)); const base = new URL('ui.html', worker.url()).href;
    proof.uiSource = await require('./lib/current-extension-ui-source.cjs').inspect(context, page, build.output, Object.keys(build.artifacts).filter(f => f.endsWith('.js') && !['background.js', 'content-script.js', 'dapp-interface.js', 'egress-gate.js'].includes(f)), { url: base, navigate: async () => { await page.goto(base + '#/tokens'); await page.getByTestId('unlock-account-button').waitFor({ timeout: 60000 }); } });
    proof.initialJournal = await snapshot(); assert.deepEqual(proof.initialJournal, live.finalJournal); proof.cipherBefore = await cipher(); assert.equal(proof.cipherBefore.owner, live.owner);
    check('actual current source and existing cold locked empty journal owner', true);
    stage = 'normal private unlock'; privateStage = true; await page.getByTestId('unlock-account-button').click(); const dialog = page.getByRole('dialog'); await dialog.locator('input[type="password"]').fill(password); await dialog.getByRole('button', { name: /^(Unlock|解锁)$/ }).click(); await expect(dialog).toHaveCount(0); await expect(page.getByTestId('lock-account-button')).toBeVisible(); privateStage = false;
    check('normal existing owner unlock without original execution or pending profile', true);
    for (const kind of ['stake', 'withdraw']) {
      stage = 'actual ' + kind + ' original approval'; const start = simulations.length;
      await page.goto(base + (kind === 'stake' ? '#/stake/new?address=' + live.validator : '#/stake/new?unstake=true&staked=' + live.stakeId));
      if (kind === 'stake') { const input = page.locator('[name="amount"]'); await input.waitFor({ timeout: 180000 }); await input.fill('1'); await input.blur(); }
      const review = page.getByRole('button', { name: /^(Review Transaction|预览交易)$/ }); await expect(review).toBeEnabled({ timeout: 180000 }); await review.click();
      const send = page.getByRole('button', { name: kind === 'stake' ? /^(Stake Now|立即质押)$/ : /^(Unstake Now|立即解除质押)$/ }); await expect(send).toBeEnabled({ timeout: 180000 });
      await Promise.all(jobs); const rows = await approvals(); assert.equal(rows.length, 1); const approval = rows[0], prepared = approval.prepared;
      assert.equal(prepared.input.kind, kind); assert.equal(prepared.sender, live.owner); assert.equal(await Transaction.from(prepared.bytesBase64).getDigest(), prepared.digest);
      assert.equal(simulations.length - start, 2); const textBefore = (await page.locator('body').innerText()).slice(0,7000); assert(textBefore.includes(prepared.digest)); assert.deepEqual(await snapshot(), proof.initialJournal);
      const altered = Transaction.from(prepared.bytesBase64); altered.setGasBudget((BigInt(prepared.gasBudget) + 1000n).toString());
      const bytesBase64 = Buffer.from(await altered.build()).toString('base64'), changedDigest = await altered.getDigest(); assert.notEqual(changedDigest, prepared.digest);
      const changedGas = { bytesBase64, digest: changedDigest, budget: altered.getData().gasData.budget };
      await expect.poll(lockFree, { timeout: 20000 }).toBe(true);
      hook = await require('./lib/current-ui-staking-gas-fault.cjs')(context, page, build.output);
      const sourceProof = hook.evidence; stage = 'actual ' + kind + ' gas fault revalidation';
      const click = send.click({ timeout: 90000 }); click.catch(() => {}); const pause = await hook.wait();
      const injection = await hook.inject(pause, prepared, bytesBase64); await click;
      await expect(page.getByText('原批准交易模拟未通过，请重新预览并授权', { exact: true })).toBeVisible({ timeout: 90000 });
      await hook.close(); hook = undefined; await Promise.all(jobs); assert.equal(simulations.length - start, 3);
      const actual = simulations.slice(start); assert.equal(actual[2].bytesBase64, bytesBase64); assert(actual.every(row => row.status === 200));
      const rowsAfter = await approvals(); assert.deepEqual(rowsAfter, rows); assert.deepEqual(await snapshot(), proof.initialJournal);
      const actualContexts = await contexts(); assert(actualContexts.length && actualContexts.every(row => BigInt(JSON.parse(row.assetSnapshotKey)[2]) >= 332734n));
      const textAfter = (await page.locator('body').innerText()).slice(0,7000); assert(textAfter.includes(prepared.digest)); assert(!textAfter.includes(changedDigest));
      cases.push({ kind, route: new URL(page.url()).hash, approval, changedGas, sourceProof, injection, actualContexts, textBefore, textAfter, simulations: actual, originalVisibleApprovalRetained: true });
      check(kind + ' actual gas+1000 simulation rejects old digest without changing reviewed approval or journal', true);
      await page.getByRole('button', { name: /^(Back|返回)$/ }).click(); await expect(review).toBeEnabled({ timeout: 120000 }); assert.deepEqual(await approvals(), []);
      check(kind + ' normal Back clears approval with no signing or execution', true);
    }
    stage = 'normal relock'; await page.goto(base + '#/tokens'); await page.getByTestId('lock-account-button').click(); await expect(page.getByTestId('unlock-account-button')).toBeVisible();
    proof.cipherAfter = await cipher(); assert.deepEqual(proof.cipherAfter, proof.cipherBefore); proof.finalJournal = await snapshot(); assert.deepEqual(proof.finalJournal, proof.initialJournal);
    check('normal relock original cipher and all three stores unchanged', true);
    assert.deepEqual(forbidden, []); assert.deepEqual(pageErrors, []); assert.equal(simulations.length, 6); assert(!captureErrors.some(row => row.url.endsWith('/SimulateTransaction')));
    for (const [file, digest] of Object.entries(build.artifacts)) assert.equal(sha(path.join(build.output, file)), digest);
    proof = { ...proof, passed: true, observedAt: new Date().toISOString(), source: build.sourceAfter, profile: live.profile, h0: live.h0, generation: live.generation, owner: live.owner, stakeId: live.stakeId, validator: live.validator,
      cases, checks, traffic, simulations, captureErrors, forbidden, pageErrors, signatures: 0, executeRequests: 0, faultInjectionExplicit: true, originalApprovalObjectsModified: false, responsesOrJournalInjected: false,
      currentC43StaleGasChromeAccepted: true, parentTX01Complete: false, inputsSha256: Object.fromEntries([__filename, path.resolve(windowFile), liveFile, matrixFile, buildFile, path.join(__dirname, 'lib/current-ui-staking-gas-fault.cjs')].map(file => [file, sha(file)])),
      scope: 'Actual current C43 stake and original332734 withdraw UI preview/click into source-verified production revalidation. Explicit one-shot cloned-parameter BCS gas+1000 fault with unchanged old digest; real native enabled simulation and actual UI rejection; original visible approval/stores/cipher held, Back/relock/Chrome close. Not a product gas edit, native market change, fake response, key/sign/Execute, sustained health or parent acceptance.' };
  } catch (error) { proof = { ...proof, passed: false, observedAt: new Date().toISOString(), stage, errorType: error.name, message: privateStage ? 'Private diagnostics withheld' : String(error.message).replaceAll(password, '[redacted]').slice(0,1000), cases, checks, traffic, simulations, captureErrors, forbidden, pageErrors };
    if (page && !privateStage && !hook) proof.diagnostic = { route: new URL(page.url()).hash, text: (await page.locator('body').innerText().catch(() => '')).slice(0,3000) }; process.exitCode = 1;
  } finally {
    if (hook) await hook.close().catch(() => {});
    if (page && !privateStage) { try { await page.goto(new URL('ui.html', worker.url()).href + '#/tokens'); if (await page.getByTestId('lock-account-button').isVisible()) { await page.getByTestId('lock-account-button').click(); await page.getByTestId('unlock-account-button').waitFor(); proof.cleanupRelock = true; } } catch (error) { proof.cleanupErrorType = error.name; } }
    if (context) await context.close(); await Promise.allSettled(jobs);
    fs.writeFileSync(output, JSON.stringify(proof, null, 2) + '\n', { flag: 'wx', mode: 0o600 }); console.log(JSON.stringify({ passed: proof.passed, stage: proof.stage, checks: checks.length, cases: cases.length, simulations: simulations.length, executeRequests: 0 }));
  }
})().catch(error => { console.error(JSON.stringify({ passed:false,errorType:error.name,message:String(error.message).slice(0,300) })); process.exitCode = 1; });
