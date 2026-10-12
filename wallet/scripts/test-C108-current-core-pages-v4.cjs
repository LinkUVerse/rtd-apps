// Current build, own C108 profile, actual read pages and Wallet Standard connect/disconnect.
// No faucet, signing, business Execute, ordinary Chrome, credential export or CA action.
process.env.PW_EXPERIMENTAL_SERVICE_WORKER_NETWORK_EVENTS = '1';
const fs = require('node:fs'), path = require('node:path'), os = require('node:os');
const crypto = require('node:crypto'), assert = require('node:assert/strict');
const cp = require('node:child_process'), http = require('node:http');
const { chromium } = require('@playwright/test');
const expect = require('@playwright/test').expect.configure({timeout:150000});
const wallet = path.resolve(__dirname, '..'), logs = path.join(wallet, 'migrationToGRpcOrGraphQLDoc/workLog');
const root = path.resolve(wallet, '../..');
const read = f => JSON.parse(fs.readFileSync(f)), sha = f => crypto.createHash('sha256').update(fs.readFileSync(f)).digest('hex');
const record = (f, p) => fs.writeFileSync(f, JSON.stringify(p, null, 2) + '\n', { flag: 'wx', mode: 0o600 });
function held(p) { for (const [f, h] of Object.entries(p.inputsSha256 ?? {})) assert.equal(sha(f), h); }
async function facts(page) {
  return page.evaluate(() => {
    const seen = new Set(), stack = [], clients = new Set(), contexts = [];
    for (const n of document.querySelectorAll('*')) {
      const k = Object.keys(n).find(k => k.startsWith('__reactFiber$'));
      if (k) { let f = n[k]; while (f.return) f = f.return; stack.push(f.stateNode.current); }
    }
    while (stack.length) {
      const f = stack.pop(); if (!f || seen.has(f)) continue; seen.add(f);
      for (let d = f.dependencies?.firstContext; d; d = d.next) {
        const v = d.memoizedValue;
        if (v?.getQueryCache) clients.add(v);
        if (v?.readSessionKey && v.assetSnapshotKey) contexts.push({ bindingKey: v.bindingKey,
          readSessionKey: v.readSessionKey, assetSnapshotKey: v.assetSnapshotKey, state: v.state });
      }
      stack.push(f.child, f.sibling);
    }
    const queries = [];
    for (const c of clients) for (const q of c.getQueryCache().getAll()) {
      if (!['wallet-balances', 'wallet-staking', 'wallet-account-history'].includes(q.queryKey[0])) continue;
      queries.push({ key: q.queryKey, status: q.state.status, fetchStatus: q.state.fetchStatus,
        errorType: q.state.error?.name ?? null, data: q.state.data ?? null });
    }
    return JSON.parse(JSON.stringify({ contexts, queries }, (_, v) => typeof v === 'bigint' ? v.toString() : v));
  });
}
async function main() {
  const [internalFile, auditFile, coverageFile, output] = process.argv.slice(2);
  assert(output && !fs.existsSync(output));
  const internal = read(internalFile), audit = read(auditFile), coverage = read(coverageFile);
  assert(internal.passed && internal.currentC108UnsignedInternalAccepted);
  assert(audit.passed && audit.currentC108UnsignedInternalAccepted);
  held(internal); held(audit); held(coverage);
  cp.execFileSync(path.join(root, 'rtd-archive-service/localDeploy/data/publisher-venv/bin/python'), ['-c',
    'import sys,json;sys.path.insert(0,sys.argv[1]);from wallet_C108_core_readiness_v2 import readiness;assert readiness(json.load(open(sys.argv[2])))',
    path.join(root, 'link-u-smart-contract/all-in-one-deploy/localDeploy'), path.resolve(coverageFile)], { timeout: 30000 });
  const lineage = require('./lib/C102-product-source-lineage-v2.cjs'), q = read(lineage.qualificationFile);
  const buildFile = path.join(logs, '20261008-default-generation-positive-C102-build-03.json'), build = read(buildFile);
  assert.deepEqual(lineage.validate(q.originalSource, buildFile), internal.source);
  assert.deepEqual(audit.source, internal.source);
  const gateway = require('./lib/C108-current-core-gateway-ownership-v2.cjs');
  const authority = gateway.capture(); assert.deepEqual(authority, internal.gatewayAuthority);
  const runtime = path.join(os.homedir(), '.local/state/rtd-wallet-migration/dev-20261006-03');
  assert.equal(path.dirname(internal.fixture), runtime);
  assert(path.basename(internal.fixture).startsWith('current-C108-internal-authorization-'));
  assert.equal(internal.profile, path.join(internal.fixture, 'profile'));
  assert(!cp.execFileSync('ps', ['-Ao', 'command='], { encoding: 'utf8' }).split('\n')
    .some(c => c.includes('Google Chrome') && c.includes('--user-data-dir=' + internal.profile)));
  const password = read(path.join(internal.fixture, 'recovery-private.json')).password;
  const demoFile = path.join(logs, '20261007-C46-authorization-demo-independent-02.json'), demoProof = read(demoFile);
  assert(demoProof.passed && demoProof.sourceMapAllDiskSourcesEqual && demoProof.sourceCount === 216);
  assert.deepEqual(demoProof.source, q.originalSource);
  for (const [f, h] of Object.entries(demoProof.sources)) assert.equal(sha(f), h);
  for (const [f, h] of Object.entries(demoProof.artifacts)) assert.equal(sha(path.join(demoProof.directory, f)), h);
  const files = [__filename, path.resolve(internalFile), path.resolve(auditFile), path.resolve(coverageFile),
    buildFile, lineage.qualificationFile, gateway.startedFile, demoFile,
    path.join(__dirname, 'lib/C108-current-core-gateway-ownership-v2.cjs'),
    path.join(__dirname, 'lib/current-extension-worker.cjs'), path.join(__dirname, 'lib/current-extension-ui-source.cjs'),
    path.join(__dirname, 'lib/C102-consumer-read-observer.cjs'), path.join(__dirname, 'lib/lifecycle-journal-snapshot.cjs')];
  const inputsSha256 = Object.fromEntries(files.map(f => [f, sha(f)]));
  const pages = [], frames = [], traffic = [], blocked = [], errors = [], jobs = [], flushes = [];
  let context, page, worker, server, demoOrigin, privateStage = false, phase = 'preflight', proof = {};
  let executeRequests = 0, signatures = 0, simulations = 0, faucetRequests = 0;
  const allowed = new Set(['http://127.0.0.1:41750', 'http://127.0.0.1:42011',
    'http://127.0.0.1:42012', 'http://127.0.0.1:42013', 'http://127.0.0.1:41718']);
  const journal = () => require('./lib/lifecycle-journal-snapshot.cjs')(page);
  try {
    context = await chromium.launchPersistentContext(internal.profile, {
      executablePath: path.join(os.homedir(), 'Library/Caches/ms-playwright/chromium-1243/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing'),
      headless: true, viewport: { width: 900, height: 800 },
      args: [`--disable-extensions-except=${build.output}`, `--load-extension=${build.output}`],
    });
    await context.route('**/*', route => {
      const request = route.request(), u = new URL(request.url());
      if (['http:', 'https:'].includes(u.protocol)) {
        traffic.push({ phase, url: u.href, method: request.method() });
        if (u.pathname.endsWith('/ExecuteTransaction')) executeRequests++;
        if (u.pathname.endsWith('/VerifySignature')) signatures++;
        if (u.pathname.endsWith('/SimulateTransaction')) simulations++;
        if (u.pathname === '/v2/gas' || u.pathname === '/gas') faucetRequests++;
        if ((!allowed.has(u.origin) && u.origin !== demoOrigin) ||
            /\/(ExecuteTransaction|VerifySignature|SimulateTransaction)$/.test(u.pathname) ||
            faucetRequests || String(request.postData()).includes('"jsonrpc"')) {
          blocked.push({ phase, url: u.href }); return route.abort();
        }
      }
      return route.continue();
    });
    const initial = context.serviceWorkers()[0] || await context.waitForEvent('serviceworker');
    const loaded = await require('./lib/current-extension-worker.cjs').ensure(context, initial, build.output);
    worker = loaded.worker; proof.workerSource = loaded.evidence.after ?? loaded.evidence.before;
    assert.equal(proof.workerSource.workerSha256, build.artifacts['background.js']);
    assert.equal('chrome-extension://' + new URL(worker.url()).host, authority.origin);
    page = await context.newPage(); page.setDefaultTimeout(60000);
    const observer = require('./lib/C102-consumer-read-observer.cjs');
    await observer.install(page, [...allowed], row => frames.push({ phase, ...row }));
    page.on('pageerror', e => errors.push({ phase, name: e.name }));
    const base = new URL('ui.html', worker.url()).href;
    proof.uiSource = await require('./lib/current-extension-ui-source.cjs').inspect(context, page, build.output,
      Object.keys(build.artifacts).filter(f => f.endsWith('.js') && !['background.js', 'content-script.js', 'dapp-interface.js', 'egress-gate.js'].includes(f)),
      { url: base, navigate: async () => { await page.goto(base); await page.getByTestId('unlock-account-button').waitFor(); } });
    const command = (method, args) => page.evaluate(({ method, args }) => new Promise((resolve, reject) => {
      const port = chrome.runtime.connect({ name: 'rtd_ui<->background' }), id = crypto.randomUUID();
      const timer = setTimeout(() => { port.disconnect(); reject(Error('Account timeout')); }, 20000);
      port.onMessage.addListener(m => {
        if (m?.kind === 'rtd-ui-source-challenge') { port.postMessage({ kind: 'rtd-ui-source-confirm', nonce: m.nonce }); return; }
        if (m.id === id) { clearTimeout(timer); port.disconnect(); resolve(m.payload); }
      }); port.postMessage({ id, payload: { type: 'method-payload', method, args } });
    }), { method, args });
    const entities = (await command('getStoredEntities', { type: 'accounts' })).args.entities;
    assert.equal(entities.length, 1); assert.equal(entities[0].address, internal.owner); assert(entities[0].isLocked);
    phase = 'unlock own C108 profile'; privateStage = true;
    assert.equal((await command('unlockAccountSourceOrAccount', { id: entities[0].id, password })).type, 'done');
    privateStage = false; await expect(page.getByTestId('lock-account-button')).toBeVisible({timeout:30000});
    phase='normal read admission';await expect.poll(async()=>(await facts(page)).contexts.some(c=>c.state==='configured')).toBe(true);
    proof.initialJournal = await journal(); assert.deepEqual(proof.initialJournal, internal.finalJournal);
    const navigate = async (name, hash, check) => {
      flushes.push({ phase, ...(await observer.flush(page)) });
      phase = name; await page.goto(base + hash); await check();
      flushes.push({ phase, ...(await observer.flush(page)) });
      pages.push({ name, hash, body: await page.locator('body').innerText(), facts: await facts(page) });
    };
    await navigate('tokens', '#/tokens', async () => {
      await expect.poll(async () => (await facts(page)).queries.some(q => q.key[0] === 'wallet-balances' && q.status === 'success' && q.data?.value?.length)).toBe(true);
      await expect(page.locator('a[href*="/send?type="]').first()).toBeVisible();
    });
    await navigate('staking portfolio', '#/stake', async () => { await expect(page.getByTestId('stake-card')).toHaveCount(1); });
    await navigate('validator selection', '#/stake/new', async () => { await expect(page.getByTestId('validator-list-item')).toHaveCount(1); });
    await navigate('original stake detail', '#/stake/delegation-detail?staked=' + internal.stakeId, async () => {
      await expect(page.getByTestId('unstake-button')).toBeVisible();
      await expect.poll(async () => (await facts(page)).queries.some(q => q.key[0] === 'wallet-staking' && q.status === 'success' && q.data?.value?.positions?.some(p => p.objectId === internal.stakeId))).toBe(true);
    });
    await navigate('history', '#/transactions', async () => {
      await expect.poll(async () => (await facts(page)).queries.some(q => q.key[0] === 'wallet-account-history' && q.status === 'success')).toBe(true);
      const data = (await facts(page)).queries.find(q => q.key[0] === 'wallet-account-history' && q.status === 'success').data;
      const value = data.value ?? data; assert(value.transactions.length > 0);
      await expect(page.getByTestId('link-to-txn')).toHaveCount(value.transactions.length);
    });
    for (const menu of ['/', '/network', '/auto-lock', '/language', '/theme', '/more-options']) {
      await navigate('settings ' + menu, '#/tokens?menu=' + encodeURIComponent(menu), async () => {
        await expect(page.locator('.settings-panel')).toBeVisible();
        await expect.poll(async () => (await page.locator('.settings-panel').innerText()).trim().length).toBeGreaterThan(4);
      });
    }
    await navigate('apps list', '#/apps', async () => { await expect(page.getByTestId('apps-page')).toBeVisible(); });
    server = http.createServer((req, res) => {
      const name = new URL(req.url, 'http://localhost').pathname;
      const file = path.resolve(demoProof.directory, '.' + (name === '/' ? '/index.html' : name));
      if (!file.startsWith(demoProof.directory + path.sep) || !fs.existsSync(file) || !fs.statSync(file).isFile()) { res.writeHead(404).end(); return; }
      res.setHeader('Content-Type', file.endsWith('.js') ? 'text/javascript' : file.endsWith('.css') ? 'text/css' : 'text/html');
      fs.createReadStream(file).pipe(res);
    });
    await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
    demoOrigin = 'http://127.0.0.1:' + server.address().port;
    const demo = await context.newPage(); demo.setDefaultTimeout(60000);
    demo.on('pageerror', e => errors.push({ phase, name: e.name }));
    phase = 'Wallet Standard actual discovery and connect'; await demo.goto(demoOrigin);
    await expect(demo.getByRole('button', { name: 'Connect', exact: true })).toBeEnabled();
    const waiting = context.waitForEvent('page', { timeout: 20000 }); waiting.catch(() => {});
    await demo.getByRole('button', { name: 'Connect', exact: true }).click(); const popup = await waiting;
    await popup.getByRole('button', { name: /^(继续|Continue)$/ }).click();
    await popup.getByRole('button', { name: /^(连接|Connect)$/ }).click();
    await demo.getByTestId('accounts-list').getByText(internal.owner, { exact: true }).waitFor();
    await demo.reload(); await demo.getByRole('button', { name: 'Inspect wallet authorization', exact: true }).click();
    assert(JSON.parse(await demo.getByTestId('wallet-authorization').innerText()).includes(internal.owner));
    let secondConnectPopups = 0; const count = () => secondConnectPopups++;
    context.on('page', count); await demo.getByRole('button', { name: 'Connect', exact: true }).click();
    await demo.getByTestId('accounts-list').getByText(internal.owner, { exact: true }).waitFor();
    context.off('page', count); assert.equal(secondConnectPopups, 0);
    proof.dappConnected = { actualDiscovery: true, visibleApproval: true, authorizedOwner: internal.owner,
      reloadAuthorizationHeld: true, secondConnectPopups, body: await demo.locator('body').innerText() };
    phase = 'Wallet Standard disconnect'; await demo.getByRole('button', { name: 'Disconnect', exact: true }).click();
    await demo.getByRole('button', { name: 'Inspect wallet authorization', exact: true }).click();
    await expect.poll(async () => JSON.parse(await demo.getByTestId('wallet-authorization').innerText()).length).toBe(0);
    proof.dappDisconnected = { authorizationEmpty: true, body: await demo.locator('body').innerText() }; await demo.close();
    phase = 'normal relock'; await page.goto(base + '#/tokens');
    await page.getByTestId('lock-account-button').click(); await expect(page.getByTestId('unlock-account-button')).toBeVisible();
    proof.finalJournal = await journal(); assert.deepEqual(proof.finalJournal, proof.initialJournal);
    flushes.push({ phase, ...(await observer.flush(page)) });
    await context.close(); context = null;
    assert.equal(executeRequests + signatures + simulations + faucetRequests, 0);
    assert.deepEqual(blocked, []); assert.deepEqual(errors, []);
    assert.deepEqual(gateway.capture(), authority); held(internal); held(audit); held(coverage);
    for (const [f, h] of Object.entries(inputsSha256)) assert.equal(sha(f), h);
    assert.deepEqual(lineage.validate(q.originalSource, buildFile), internal.source);
    proof = { ...proof, passed: true, observedAt: new Date().toISOString(), source: internal.source,
      currentBuildActualCoreReadPagesAccepted: true, normallyRelocked: true, ownProfileClosed: true,
      gatewayAuthority: authority, h0: internal.h0, owner: internal.owner, stakeId: internal.stakeId,
      originalProfilesOpened: 0, profilesOpened: 1, credentialExported: false, certificateChanges: 0,
      parentAcceptance: false, wholeREL02Accepted: false,
      scope: 'Actual current build03 tokens, validators, original stake detail, history, six readonly settings panels, apps and Wallet Standard discovery/connect/reload/disconnect in own C108 CFT profile. No coin/stake/NFT Execute, signing, current NFT/name, ordinary Chrome, TLS/permissions or full REL02 acceptance.' };
  } catch (e) {
    proof = { ...proof, passed: false, observedAt: new Date().toISOString(), phase,
      errorType: e.name, message: privateStage ? 'Private account stage; diagnostic withheld' : String(e.message).replaceAll(password, '[redacted]').slice(0,1000),
      parentAcceptance: false };
    if (page && !privateStage && !page.isClosed()) proof.publicDiagnostic = { hash: new URL(page.url()).hash,
      body: await page.locator('body').innerText().catch(() => ''), facts: await facts(page).catch(() => null) };
    process.exitCode = 1;
  } finally {
    if (context) {
      if (page && !privateStage && !page.isClosed()) {
        try { await page.goto(new URL('ui.html', worker.url()).href + '#/tokens');
          if (await page.getByTestId('lock-account-button').isVisible()) await page.getByTestId('lock-account-button').click(); } catch {}
      }
      await context.close();
    }
    if (server) await new Promise(resolve => server.close(resolve));
    await Promise.all(jobs);
    Object.assign(proof, { pages, frames, traffic, blocked, errors, flushes, executeRequests,
      signatures, simulations, faucetRequests, inputsSha256 });
    record(output, proof);
    console.log(JSON.stringify({ passed: proof.passed, phase: proof.phase, pages: pages.length,
      retainedConsumerFrames: frames.length, executeRequests, errorType: proof.errorType, message: proof.message }));
  }
}
main().catch(e => { console.error(JSON.stringify({ passed: false, phase: 'preflight', errorType: e.name,
  message: String(e.message).slice(0, 500) })); process.exitCode = 1; });
