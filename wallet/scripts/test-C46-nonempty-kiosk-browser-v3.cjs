// Actual current C46 nonempty inventory and six unsigned UI previews; no dispatch.
process.env.PW_EXPERIMENTAL_SERVICE_WORKER_NETWORK_EVENTS = '1';
const fs = require('node:fs'), path = require('node:path'), os = require('node:os');
const crypto = require('node:crypto'), assert = require('node:assert/strict');
const { chromium, expect } = require('@playwright/test');
const { Transaction } = require('rtd-typescript/transactions');
const { GrpcTypes } = require('rtd-typescript/grpc');
const { bcs } = require('rtd-typescript/bcs');
const { Ed25519Keypair } = require('rtd-typescript/keypairs/ed25519');
const read = f => JSON.parse(fs.readFileSync(f));
const sha = f => crypto.createHash('sha256').update(fs.readFileSync(f)).digest('hex');
function frame(value, trailers) {
  const raw = Buffer.from(value, 'base64'), rows = [];
  for (let i = 0; i < raw.length;) {
    assert(i + 5 <= raw.length); const flag = raw[i], length = raw.readUInt32BE(i + 1);
    assert((flag === 0 || flag === 128) && i + 5 + length <= raw.length);
    rows.push({ flag, body: raw.subarray(i + 5, i + 5 + length) }); i += 5 + length;
  }
  assert.equal(rows.length, trailers ? 2 : 1); assert.equal(rows[0].flag, 0);
  if (trailers) { assert.equal(rows[1].flag, 128); assert.match(rows[1].body.toString(), /(^|\r\n)grpc-status:[ \t]*0(\r\n|$)/); }
  return rows[0].body;
}
(async () => {
  const [readinessFile, inventoryFile, output, fixture] = process.argv.slice(2);
  const wallet = path.resolve(__dirname, '..'), root = path.resolve(wallet, '../..');
  const rt = path.join(os.homedir(), '.local/state/rtd-wallet-migration/dev-20261006-03');
  const logs = path.join(wallet, 'migrationToGRpcOrGraphQLDoc/workLog');
  assert(output && !fs.existsSync(output) && fixture && !fs.existsSync(fixture));
  assert.equal(path.dirname(path.resolve(fixture)), rt);
  assert(path.basename(fixture).startsWith('current-C46-nonempty-browser-'));
  const buildFile = path.join(logs, '20261007-default-generation-positive-C46-build-03.json');
  const oracleFile = path.join(logs, '20261007-C43-nonempty-kiosk-native-independent-01.json');
  const gatewayFile = path.join(logs, '20261007-C46-nonempty-gateway-started-01.json');
  const profileFile = path.join(rt, 'publication-foundation/C46-isolated-browser-gateway-20261007-03/profile.json');
  const readiness = read(readinessFile), inventory = read(inventoryFile), build = read(buildFile);
  const oracle = read(oracleFile), gateway = read(gatewayFile), profile = read(profileFile);
  assert(readiness.passed && readiness.infrastructureReadyForProductionProbe && Object.values(readiness.coverageGates).every(v => v === true));
  assert(Date.now() - Date.parse(readiness.observedAt) < 300000);
  assert(inventory.passed && inventory.indexedFixtureAccepted && inventory.mode === 'covered-fixture-inventory');
  assert(Date.now() - Date.parse(inventory.observedAt) < 300000 && inventory.targetCheckpoint === 424677);
  assert(gateway.passed && gateway.mode === 'isolated-temporary-test' && gateway.profile === profileFile);
  assert(oracle.passed && oracle.h0 === readiness.h0 && oracle.h0 === profile.expectedGenesisDigest);
  assert.equal(oracle.operation, inventory.fixture); assert.equal(readiness.generation, path.basename(rt));
  assert(build.passed); assert.deepEqual(require('./build-reviewed-generation-production-extension.cjs').productSource(), build.sourceAfter);
  for (const proof of [readiness, inventory, gateway]) for (const [f, h] of Object.entries(proof.inputsSha256)) assert.equal(sha(f), h);
  const intentFile = path.join(inventory.fixture, 'intent.json'), keyFile = path.join(inventory.fixture, 'keys.json');
  const protectedPins = read(intentFile).protectedOriginalsSha256; assert.equal(Object.keys(protectedPins).length, 1015);
  const key = Ed25519Keypair.fromSecretKey(read(keyFile).source), owner = oracle.addresses.source;
  assert.equal(key.toRtdAddress(), owner);
  const inputFiles = [__filename, path.resolve(readinessFile), path.resolve(inventoryFile), buildFile,
    oracleFile, gatewayFile, profileFile, intentFile, keyFile,
    ...['current-extension-worker.cjs', 'current-extension-ui-source.cjs', 'lifecycle-journal-snapshot.cjs'].map(n => path.join(__dirname, 'lib', n))];
  const inputPins = Object.fromEntries(inputFiles.map(f => [f, sha(f)]));
  const held = () => {
    for (const [f, h] of Object.entries({ ...inputPins, ...protectedPins })) assert.equal(sha(f), h);
    for (const [f, h] of Object.entries(build.artifacts)) assert.equal(sha(path.join(build.output, f)), h);
    assert.deepEqual(require('./build-reviewed-generation-production-extension.cjs').productSource(), build.sourceAfter);
  };
  held(); fs.mkdirSync(fixture, { mode: 0o700 });
  const password = crypto.randomBytes(32).toString('base64url');
  fs.writeFileSync(path.join(fixture, 'recovery-private.json'), JSON.stringify({ password }) + '\n', { flag: 'wx', mode: 0o600 });
  fs.writeFileSync(path.join(fixture, 'input-seal.json'), JSON.stringify(inputPins, null, 2) + '\n', { flag: 'wx', mode: 0o600 });
  const checks = [], frames = [], simulations = [], jobs = [], traffic = [], blocked = [], pageErrors = [], captureErrors = [];
  const previews = [], denials = [], renderedKiosks = [], abortedResponses = [], failedRequests = [];
  const requestIds = new WeakMap(); let requestSequence = 0;
  const captureFailureRequests = new Map();
  const requestId = request => { if (!requestIds.has(request)) requestIds.set(request, ++requestSequence); return requestIds.get(request); };
  const confirmedReadonlyAbort = row => { const u = new URL(row.url); return row.errorText === 'net::ERR_ABORTED' && row.method === 'POST' &&
    (['/graphql','/account/graphql'].includes(u.pathname) || /\/(GetObject|GetServiceInfo|GetCheckpoint|GetAvailableRange)$/.test(u.pathname)); };
  let context, page, command, accounts, stage = 'launch', privateStage = false, proof = {}, executeRequests = 0;
  const classifyActualCaptureFailures = () => {
    for (let index = captureErrors.length - 1; index >= 0; index--) {
      const row = captureErrors[index], request = captureFailureRequests.get(row.requestId);
      const failureText = request?.failure()?.errorText ?? null;
      const actual = failedRequests.find(r => r.requestId === row.requestId && r.url === row.url && r.requestBase64 === row.requestBase64 && r.errorText === failureText);
      if (failureText === 'net::ERR_ABORTED' && actual && confirmedReadonlyAbort(actual) && !row.message.includes('capture deadline exceeded')) {
        abortedResponses.push({ ...row, failureText }); captureErrors.splice(index, 1);
      }
    }
    abortedResponses.sort((a, b) => a.requestId - b.requestId);
  };
  const check = (label, value) => { assert(value, label); checks.push({ label, passed: true }); console.log(JSON.stringify({ stage, checks: checks.length })); };
  const snapshot = () => require('./lib/lifecycle-journal-snapshot.cjs')(page);
  const approvals = () => page.evaluate(() => {
    const seen = new Set(), stack = [], rows = [];
    for (const n of document.querySelectorAll('*')) {
      const k = Object.keys(n).find(k => k.startsWith('__reactFiber$'));
      if (k) { let f = n[k]; while (f.return) f = f.return; if (!f.stateNode?.current) throw Error('Committed React root required'); stack.push(f.stateNode.current); }
    }
    while (stack.length) {
      const f = stack.pop(); if (!f || seen.has(f)) continue; seen.add(f);
      for (let h = f.memoizedState; h; h = h.next) { const v = h.memoizedState; if (v?.prepared?.bytesBase64 && typeof v.requestId === 'string') rows.push(JSON.parse(JSON.stringify(v))); }
      stack.push(f.child, f.sibling);
    }
    return Array.from(new Map(rows.map(v => [v.requestId, v])).values());
  });
  const getCipher = () => page.evaluate(async () => {
    const db = await new Promise((resolve, reject) => {
      const q = indexedDB.open('RtdWallet DB'); q.onupgradeneeded = () => { q.transaction.abort(); reject(Error('Existing account required')); };
      q.onsuccess = () => resolve(q.result); q.onerror = () => reject(Error('Readonly account open failed'));
    });
    try {
      const rows = await new Promise((resolve, reject) => {
        const tx = db.transaction('accounts', 'readonly'), q = tx.objectStore('accounts').getAll();
        q.onsuccess = () => resolve(q.result.map(r => ({ id: r.id, address: r.address, publicKey: r.publicKey, encrypted: r.encrypted, type: r.type })));
        tx.onerror = () => reject(Error('Readonly accounts failed'));
      });
      if (rows.length !== 1 || rows[0].type !== 'imported' || !rows[0].encrypted) throw Error('One encrypted imported test account required');
      const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(JSON.stringify(rows)));
      return { owner: rows[0].address, sha256: Array.from(new Uint8Array(digest)).map(x => x.toString(16).padStart(2, '0')).join('') };
    } finally { db.close(); }
  });
  try {
    context = await chromium.launchPersistentContext(path.join(fixture, 'profile'), {
      executablePath: path.join(os.homedir(), 'Library/Caches/ms-playwright/chromium-1243/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing'),
      headless: true, viewport: { width: 850, height: 800 }, args: [`--disable-extensions-except=${build.output}`, `--load-extension=${build.output}`],
    });
    const allowed = new Set(['http://127.0.0.1:41750', 'http://127.0.0.1:41957', 'http://127.0.0.1:41958', 'http://127.0.0.1:41959', 'http://127.0.0.1:41718']);
    await context.route('**/*', route => {
      const r = route.request(), u = new URL(r.url());
      if (['http:', 'https:'].includes(u.protocol)) {
        traffic.push({ url: u.href, method: r.method() });
        if (u.pathname.endsWith('/ExecuteTransaction')) executeRequests++;
        if (!allowed.has(u.origin) || /\/(ExecuteTransaction|VerifySignature)$/.test(u.pathname) || String(r.postData()).includes('"jsonrpc"')) {
          blocked.push(u.href); return route.abort();
        }
      }
      return route.continue();
    });
    context.on('requestfailed', request => {
      const u = new URL(request.url()); if (!['http:', 'https:'].includes(u.protocol)) return;
      failedRequests.push({ requestId: requestId(request), stage, url: u.href, method: request.method(),
        requestBase64: (request.postDataBuffer() ?? Buffer.alloc(0)).toString('base64'),
        errorText: request.failure()?.errorText ?? null });
    });
    context.on('response', r => {
      const currentStage = stage, u = new URL(r.url()); if (!['http:', 'https:'].includes(u.protocol)) return;
      jobs.push((async () => {
        const request = r.request().postDataBuffer() ?? Buffer.alloc(0);
        let timer; const timeout = new Promise((_, reject) => { timer = setTimeout(() => reject(new Error('Readonly/required response body capture deadline exceeded')), 10000); });
        let response; try { response = await Promise.race([r.body(), timeout]); } finally { clearTimeout(timer); }
        const row = { stage: currentStage, url: u.href, status: r.status(), requestBase64: request.toString('base64'), responseBase64: response.toString('base64') };
        frames.push(row);
        if (u.pathname.endsWith('/SimulateTransaction')) {
          const req = GrpcTypes.SimulateTransactionRequest.fromBinary(frame(row.requestBase64, false));
          assert.equal(req.checks, GrpcTypes.SimulateTransactionRequest_TransactionChecks.ENABLED); simulations.push(row);
        }
      })().catch(e => {
        const request = r.request(), failureText = request.failure()?.errorText ?? null;
        const row = { requestId: requestId(request), stage: currentStage, url: u.href, errorType: e.name,
          message: String(e.message).slice(0, 600), status: r.status(), method: request.method(),
          requestBase64: (request.postDataBuffer() ?? Buffer.alloc(0)).toString('base64'), failureText };
        const readonlyPath = /\/(GetObject|GetServiceInfo|GetCheckpoint|GetAvailableRange)$/.test(u.pathname) ||
          ['/graphql', '/account/graphql'].includes(u.pathname);
        captureFailureRequests.set(row.requestId, request); captureErrors.push(row);
      }));
    });
    const first = context.serviceWorkers()[0] || await context.waitForEvent('serviceworker');
    const loaded = await require('./lib/current-extension-worker.cjs').ensure(context, first, build.output), worker = loaded.worker;
    proof.workerSource = loaded.evidence.after ?? loaded.evidence.before;
    assert.equal(proof.workerSource.workerSha256, build.artifacts['background.js']);
    assert.equal('chrome-extension://' + new URL(worker.url()).host, gateway.origin);
    page = await context.newPage(); page.on('pageerror', e => pageErrors.push({ stage, errorType: e.name, message: String(e.message).slice(0, 200) }));
    const base = new URL('ui.html', worker.url()).href;
    proof.uiSource = await require('./lib/current-extension-ui-source.cjs').inspect(context, page, build.output,
      Object.keys(build.artifacts).filter(f => f.endsWith('.js') && !['background.js', 'content-script.js', 'dapp-interface.js', 'egress-gate.js'].includes(f)),
      { url: base, navigate: async () => { await page.goto(base); await page.locator('a[href*="add-account"]').first().waitFor(); } });
    command = (method, args) => page.evaluate(({ method, args }) => new Promise((resolve, reject) => {
      const port = chrome.runtime.connect({ name: 'rtd_ui<->background' }), id = crypto.randomUUID();
      const timer = setTimeout(() => { port.disconnect(); reject(Error('Account command timeout')); }, 20000);
      port.onMessage.addListener(m => {
        if (m?.kind === 'rtd-ui-source-challenge') { port.postMessage({ kind: 'rtd-ui-source-confirm', nonce: m.nonce }); return; }
        if (m.id === id) { clearTimeout(timer); port.disconnect(); resolve(m.payload); }
      });
      port.postMessage({ id, payload: method === '@setNetwork' ? { type: 'set-network', network: args } : { type: 'method-payload', method, args } });
    }), { method, args });
    stage = 'private source import'; privateStage = true;
    await page.goto(base + '#/accounts/import-private-key'); await page.locator('[name="privateKey"]').fill(key.getSecretKey());
    await page.locator('[name="privateKey"]').blur(); await expect(page.locator('button[type="submit"]')).toBeEnabled(); await page.locator('button[type="submit"]').click();
    await page.waitForURL(/protect-account/); await page.locator('[name="password.input"]').fill(password); await page.locator('[name="password.confirmation"]').fill(password);
    await page.locator('#acceptedTos').click(); await page.locator('button[type="submit"]').click(); await page.waitForURL(/#\/tokens/, { timeout: 45000 }); privateStage = false;
    accounts = (await command('getStoredEntities', { type: 'accounts' })).args.entities;
    check('fresh profile imported the separate nonempty fixture owner', accounts.length === 1 && accounts[0].address === owner && !accounts[0].isLocked);
    assert.equal((await command('@setNetwork', { env: 'local', customRpcUrl: null })).type, 'done');
    proof.initialJournal = await snapshot(); assert(Object.values(proof.initialJournal).every(r => Array.isArray(r) && r.length === 0));
    proof.cipherBefore = await getCipher(); assert.equal(proof.cipherBefore.owner, owner);
    stage = 'actual three nonempty kiosk cards'; await page.goto(base + '#/nfts');
    for (const k of inventory.sourceKiosks) await expect(page.locator('a[href*="/kiosk?"][href*="' + k.kioskId + '"]')).toBeVisible({ timeout: 180000 });
    check('three actual framework Personal OriginByte owned cards', inventory.sourceKiosks.length === 3);
    for (const k of inventory.sourceKiosks) {
      await page.goto(base + '#/kiosk?kioskId=' + k.kioskId);
      for (const item of k.items) await expect(page.locator('a[href*="nft-details"][href*="' + item.objectId + '"]')).toBeVisible({ timeout: 180000 });
      const ids = await page.locator('a[href*="nft-details"]').evaluateAll(ns => ns.map(n => new URL(n.href).hash).map(h => new URLSearchParams(h.split('?')[1]).get('objectId')).sort());
      assert.deepEqual(ids, k.items.map(i => i.objectId).sort()); renderedKiosks.push({ kioskId: k.kioskId, ids });
      check('actual complete kiosk contents ' + k.kind + '/' + k.ownerCap?.isPersonal, true);
    }
    const nft = serial => oracle.nfts.find(n => n.value.serial === serial);
    const cases = [
      { label: 'direct', id: nft('6').objectId, to: oracle.addresses.existingTarget, route: 'direct', calls: [] },
      { label: 'framework-ordinary', id: nft('1').objectId, to: oracle.addresses.existingTarget, route: 'framework-kiosk', calls: ['take'] },
      { label: 'framework-listed', id: nft('2').objectId, to: oracle.addresses.existingTarget, route: 'framework-kiosk', calls: ['take'] },
      { label: 'personal', id: nft('5').objectId, to: oracle.addresses.existingTarget, route: 'personal-kiosk', calls: ['borrow_val', 'take', 'return_val'] },
      { label: 'originbyte-existing-target', id: oracle.obNfts[0].objectId, to: oracle.addresses.existingTarget, route: 'originbyte-kiosk', calls: ['p2p_transfer'] },
      { label: 'originbyte-new-target', id: oracle.obNfts[1].objectId, to: oracle.addresses.newTarget, route: 'originbyte-kiosk', calls: ['p2p_transfer_and_create_target_kiosk'] },
    ];
    for (const c of cases) {
      held(); stage = c.label + ' actual details'; await page.goto(base + '#/nft-details?objectId=' + c.id);
      const detailSend = page.locator('a[href*="nft-transfer/' + c.id + '"]'); await expect(detailSend).toBeVisible({ timeout: 180000 });
      const detailText = (await page.locator('body').innerText()).slice(0, 7000); await detailSend.click();
      const input = page.locator('[name="to"]'); await expect(input).toBeVisible({ timeout: 180000 }); await input.fill(c.to); await input.blur();
      const review = page.locator('form button[type="submit"]'); await expect(review).toBeEnabled({ timeout: 60000 });
      await Promise.all(jobs); const start = simulations.length; stage = c.label + ' actual preview'; await review.click();
      const send = page.getByRole('button', { name: /^(Send NFT Now|立即发送 NFT)$/ }); await expect(send).toBeEnabled({ timeout: 180000 });
      await Promise.all(jobs); const rows = await approvals(); assert.equal(rows.length, 1); const approval = rows[0], p = approval.prepared;
      assert.equal(p.route, c.route); assert.equal(p.input.objectId, c.id); assert.equal(p.input.to, c.to); assert.equal(p.sender, owner);
      const tx = Transaction.from(p.bytesBase64), data = tx.getData(); assert.equal(await tx.getDigest(), p.digest);
      assert.equal(data.sender, owner); assert.equal(data.gasData.owner, owner); assert.equal(String(data.gasData.budget), p.gasBudget);
      assert.deepEqual(data.commands.filter(v => v.$kind === 'MoveCall').map(v => v.MoveCall.function), c.calls);
      const canonical = bcs.TransactionData.parse(Buffer.from(p.bytesBase64, 'base64'));
      assert.deepEqual(Buffer.from(bcs.TransactionData.serialize(canonical).toBytes()), Buffer.from(p.bytesBase64, 'base64'));
      const actual = simulations.slice(start); assert(actual.length > 0); let matched = 0;
      for (const s of actual) {
        assert.equal(s.status, 200); const req = GrpcTypes.SimulateTransactionRequest.fromBinary(frame(s.requestBase64, false));
        const res = GrpcTypes.SimulateTransactionResponse.fromBinary(frame(s.responseBase64, true));
        assert.equal(req.checks, GrpcTypes.SimulateTransactionRequest_TransactionChecks.ENABLED);
        if (!req.transaction?.bcs?.value || !Buffer.from(req.transaction.bcs.value).equals(Buffer.from(p.bytesBase64, 'base64'))) continue;
        assert.equal(req.doGasSelection, false); assert.equal(res.transaction.effects.status.success, true);
        assert.deepEqual(Buffer.from(res.transaction.transaction.bcs.value), Buffer.from(p.bytesBase64, 'base64'));
        const effects = bcs.TransactionEffects.parse(res.transaction.effects.bcs.value); assert.equal((effects.$kind === 'V2' ? effects.V2 : effects.V1).transactionDigest, p.digest); matched++;
      }
      assert(matched > 0); assert.deepEqual(await snapshot(), proof.initialJournal);
      previews.push({ ...c, approval, transaction: data, canonical, formalMatchingSimulations: matched, detailText, previewText: (await page.locator('body').innerText()).slice(0, 7000) });
      check(c.label + ' complete actual final BCS and formal successful preview', true);
      await page.getByRole('button', { name: /^(Back|返回)$/ }).click(); await expect(input).toBeVisible({ timeout: 180000 });
      assert.equal((await approvals()).length, 0); assert.deepEqual(await snapshot(), proof.initialJournal);
      check(c.label + ' Back releases approval with all three journals unchanged', true);
    }
    for (const [serial, label] of [['3', 'locked'], ['4', 'exclusive']]) {
      stage = label + ' actual details denial'; const id = nft(serial).objectId; await Promise.all(jobs); const start = simulations.length;
      await page.goto(base + '#/nft-details?objectId=' + id);
      if (label === 'exclusive') await expect(page.getByRole('button', { name: /^(Send NFT|发送 NFT)$/ })).toBeDisabled({ timeout: 180000 });
      else await expect(page.locator('a[href*="hyperspace.xyz"]')).toBeVisible({ timeout: 180000 });
      assert.equal(await page.locator('a[href*="nft-transfer/' + id + '"]').count(), 0);
      const text = (await page.locator('body').innerText()).slice(0, 7000);
      await page.goto(base + '#/nft-transfer/' + id); await page.waitForURL(/#\/(tokens|nfts)$/, { timeout: 180000 });
      assert.equal(await page.locator('[name="to"]').count(), 0); assert.equal((await approvals()).length, 0);
      await Promise.all(jobs); assert.equal(simulations.length, start); assert.deepEqual(await snapshot(), proof.initialJournal);
      denials.push({ label, id, detailsText: text, routeAfter: new URL(page.url()).hash, simulations: 0, approvals: 0 });
      check(label + ' details and manually entered transfer route deny before simulation', true);
    }
    stage = 'normal relock'; assert.equal((await command('lockAccountSourceOrAccount', { id: accounts[0].id })).type, 'done');
    assert((await command('getStoredEntities', { type: 'accounts' })).args.entities.every(a => a.isLocked));
    proof.cipherAfter = await getCipher(); assert.deepEqual(proof.cipherAfter, proof.cipherBefore); proof.finalJournal = await snapshot();
    assert.deepEqual(proof.finalJournal, proof.initialJournal); check('normal relock encrypted owner and all journals unchanged', true);
    held(); await Promise.all(jobs); classifyActualCaptureFailures(); check('no page/capture errors forbidden traffic signatures or Execute', !pageErrors.length && !captureErrors.length && !blocked.length && executeRequests === 0 && failedRequests.every(confirmedReadonlyAbort));
    proof.passed = true;
  } catch (e) {
    proof.passed = false; proof.stage = stage; proof.errorType = e.name;
    proof.message = privateStage ? 'Private import diagnostic withheld' : String(e.message).slice(0, 1000); process.exitCode = 1;
    if (page && !privateStage) proof.publicDiagnostic = { route: new URL(page.url()).hash, text: (await page.locator('body').innerText().catch(() => '')).slice(0, 7000) };
  } finally {
    if (context && page && command && accounts?.length) {
      try { for (const a of accounts) await command('lockAccountSourceOrAccount', { id: a.id }); proof.accountsNormallyRelocked = (await command('getStoredEntities', { type: 'accounts' })).args.entities.every(a => a.isLocked); }
      catch (e) { proof.relockFailed = e.name; proof.passed = false; process.exitCode = 1; }
    }
    await Promise.all(jobs); if (context) await context.close(); await Promise.all(jobs); classifyActualCaptureFailures(); held();
    if (captureErrors.length || pageErrors.length || blocked.length || executeRequests || !failedRequests.every(confirmedReadonlyAbort)) { proof.passed = false; process.exitCode = 1; }
    Object.assign(proof, { observedAt: new Date().toISOString(), fixture, owner, h0: readiness.h0, generation: readiness.generation,
      source: build.sourceAfter, checks, frames, simulations, previews, denials, renderedKiosks, traffic, blocked, pageErrors, captureErrors, abortedResponses, failedRequests,
      inputsSha256: inputPins, originalPrivateFilesHeld: 1015, originalProfilesOpened: 0, signatures: 0, executeRequests,
      faucetRequests: 0, contractsDeployed: 0, seedRequests: 0, certificateChanges: 0, chromeClosed: true,
      scope: 'Actual bounded response body/requestfailed evidence retained; no unbounded Response.finished wait. Only confirmed net::ERR_ABORTED readonly responses are recorded separately; unresolved capture errors or any simulation/write capture failure fail the run. Current exact C46 isolated Chrome UI and worker, fresh seven-gate424677 original inventory, three nonempty kiosk contents, six actual unsigned final previews and two locked/exclusive detail/manual-route denials. Exact final BCS/effects and Back/relock journal retention. No signer/Send action, Execute, original profile, repeated funding/seed, normal-system-CA or complete parent acceptance.' });
    fs.writeFileSync(output, JSON.stringify(proof, (_k, v) => typeof v === 'bigint' ? v.toString() : v, 2) + '\n', { flag: 'wx', mode: 0o600 });
    console.log(JSON.stringify({ passed: proof.passed, stage: proof.stage, checks: checks.length, previews: previews.length, denials: denials.length, simulations: simulations.length, executeRequests }));
  }
})().catch(() => { console.error('Nonempty C46 prerequisites failed; no private values printed'); process.exitCode = 1; });
