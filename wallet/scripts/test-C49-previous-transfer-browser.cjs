// Actual previous-transfer refusal under a stale real index; no simulation, signature or dispatch.
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
  assert(path.basename(fixture).startsWith('current-C49-previous-transfer-'));
  const buildFile = path.join(logs, '20261007-default-generation-positive-C46-build-03.json');
  const oracleFile = path.join(logs, '20261007-C43-nonempty-kiosk-native-independent-01.json');
  const gatewayFile = path.join(logs, '20261007-C49-previous-transfer-gateway-started-01.json');
  const profileFile = path.join(rt, 'publication-foundation/C49-isolated-previous-transfer-gateway-20261007-01/profile.json');
  const readiness = read(readinessFile), inventory = read(inventoryFile), build = read(buildFile);
  const oracle = read(oracleFile), gateway = read(gatewayFile), profile = read(profileFile);
  assert(readiness.passed && !readiness.infrastructureReadyForProductionProbe && readiness.targetCheckpoint===524022);
  assert(Date.now() - Date.parse(readiness.observedAt) < 300000);
  assert(inventory.passed && inventory.originalExecutions===6 && inventory.nativeReceipts.length===6 && inventory.maximumExecutionCheckpoint==='524022');
  assert(readiness.effectiveAssetWindow.commonHi < Math.min(...inventory.nativeReceipts.map(r=>Number(r.checkpoint))));
  assert(inventory.h0===readiness.h0 && inventory.generation===readiness.generation);
  assert(gateway.passed && gateway.mode === 'isolated-temporary-test' && gateway.profile === profileFile);
  assert(oracle.passed && oracle.h0 === readiness.h0 && oracle.h0 === profile.expectedGenesisDigest);
  assert.equal(oracle.operation, readiness.fixture); assert.equal(readiness.generation, path.basename(rt));
  assert(build.passed); assert.deepEqual(require('./build-reviewed-generation-production-extension.cjs').productSource(), build.sourceAfter);
  for (const proof of [readiness, inventory, gateway]) for (const [f, h] of Object.entries(proof.inputsSha256)) assert.equal(sha(f), h);
  const intentFile = path.join(readiness.fixture, 'intent.json'), keyFile = path.join(readiness.fixture, 'keys.json');
  const protectedPins = read(intentFile).protectedOriginalsSha256; assert.equal(Object.keys(protectedPins).length, 1015);
  const key = Ed25519Keypair.fromSecretKey(read(keyFile).source), owner = oracle.addresses.source;
  assert.equal(key.toRtdAddress(), owner);
  const inputFiles = [__filename, path.resolve(readinessFile), path.resolve(inventoryFile), buildFile,
    oracleFile, gatewayFile, profileFile, intentFile, keyFile,
    ...['current-extension-worker.cjs', 'current-extension-ui-source.cjs', 'lifecycle-journal-snapshot.cjs'].map(n => path.join(__dirname, 'lib', n))];
  const inputPins = Object.fromEntries(inputFiles.map(f => [f, sha(f)]));
  const gatewayAuditFile=path.join(logs,'20261007-C49-previous-transfer-gateway-independent-01.json');const gatewayAudit=read(gatewayAuditFile);assert(gatewayAudit.passed&&gatewayAudit.actualRequests===21);
  for (const [f,h]of Object.entries(gatewayAudit.inputsSha256))assert.equal(sha(f),h);inputPins[gatewayAuditFile]=sha(gatewayAuditFile);
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
      held(); stage=c.label+' previous-transfer route'; await Promise.all(jobs); const start=simulations.length;
      await page.goto(base+'#/nft-transfer/'+c.id); const input=page.locator('[name="to"]');
      const outcome=await Promise.race([input.waitFor({state:'visible',timeout:180000}).then(()=> 'form'),page.waitForURL(/#\/(tokens|nfts)$/, {timeout:180000}).then(()=> 'route-denied')]);
      let message=null;
      if(outcome==='form') {
        await input.fill(c.to);await input.blur(); const review=page.locator('form button[type="submit"]');await expect(review).toBeEnabled({timeout:60000});
        stage=c.label+' previous-transfer fresh native refusal';await review.click();
        message=c.route==='originbyte-kiosk'?'藏品已离开 OriginByte Kiosk':'当前账户没有可用于转出的藏品所有权';
        await expect(page.getByText(message,{exact:true})).toBeVisible({timeout:180000});
        assert.equal(await page.getByRole('button',{name:/^(Send NFT Now|立即发送 NFT)$/}).count(),0);
      }
      await Promise.all(jobs);assert.equal(simulations.length,start);assert.equal((await approvals()).length,0);assert.deepEqual(await snapshot(),proof.initialJournal);
      denials.push({...c,outcome,message,routeAfter:new URL(page.url()).hash,text:(await page.locator('body').innerText()).slice(0,8000),simulations:0,approvals:0});
      check(c.label+' previous transfer denied before approval simulation and writes',true);
    }
    stage = 'normal relock'; assert.equal((await command('lockAccountSourceOrAccount', { id: accounts[0].id })).type, 'done');
    assert((await command('getStoredEntities', { type: 'accounts' })).args.entities.every(a => a.isLocked));
    proof.cipherAfter = await getCipher(); assert.deepEqual(proof.cipherAfter, proof.cipherBefore); proof.finalJournal = await snapshot();
    assert.deepEqual(proof.finalJournal, proof.initialJournal); check('normal relock encrypted owner and all journals unchanged', true);
    held(); await Promise.all(jobs); classifyActualCaptureFailures(); check('all six previous-transfer denials no simulation/capture errors signatures or Execute',denials.length===6 && simulations.length===0 && !pageErrors.length && !captureErrors.length && !blocked.length && executeRequests===0 && failedRequests.every(confirmedReadonlyAbort));
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
    if (captureErrors.length || pageErrors.length || blocked.length || executeRequests || simulations.length || !failedRequests.every(confirmedReadonlyAbort)) { proof.passed = false; process.exitCode = 1; }
    Object.assign(proof, { observedAt: new Date().toISOString(), fixture, owner, h0: readiness.h0, generation: readiness.generation,
      source: build.sourceAfter, checks, frames, simulations, previews, denials, renderedKiosks, traffic, blocked, pageErrors, captureErrors, abortedResponses, failedRequests,
      inputsSha256: inputPins, originalPrivateFilesHeld: 1015, originalProfilesOpened: 0, signatures: 0, executeRequests,
      faucetRequests: 0, contractsDeployed: 0, seedRequests: 0, certificateChanges: 0, chromeClosed: true,
      scope:'Actual current C46 six previously transferred NFTs refused by visible fresh native ownership checks before simulation/approval, or current route admission. The real index was below all six actual execution checkpoints; no snapshot or response injection. All journals/cipher/private pins held and normal relock/Chrome close. Zero simulation/signature/Execute, old profile opening, faucet/deploy/seed/CA change. Full post-write index524022 still requires separate coverage.' });
    fs.writeFileSync(output, JSON.stringify(proof, (_k, v) => typeof v === 'bigint' ? v.toString() : v, 2) + '\n', { flag: 'wx', mode: 0o600 });
    console.log(JSON.stringify({ passed: proof.passed, stage: proof.stage, checks: checks.length, previews: previews.length, denials: denials.length, simulations: simulations.length, executeRequests }));
  }
})().catch(() => { console.error('Nonempty C46 prerequisites failed; no private values printed'); process.exitCode = 1; });
