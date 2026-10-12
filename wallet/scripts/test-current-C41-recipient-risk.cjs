// Current production NFT address warning, genuine reads and transport refusal.
process.env.PW_EXPERIMENTAL_SERVICE_WORKER_NETWORK_EVENTS = '1';
const { chromium, expect } = require('@playwright/test');
const { Ed25519Keypair } = require('rtd-typescript/keypairs/ed25519');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const crypto = require('node:crypto');
const assert = require('node:assert/strict');
const read = f => JSON.parse(fs.readFileSync(f));
const sha = bytes => crypto.createHash('sha256').update(bytes).digest('hex');

(async () => {
  const [output] = process.argv.slice(2);
  assert(output && !fs.existsSync(output));
  const wallet = path.resolve(__dirname, '..');
  const rt = path.join(os.homedir(), '.local/state/rtd-wallet-migration/dev-20261006-03');
  const logs = path.join(wallet, 'migrationToGRpcOrGraphQLDoc/workLog');
  const buildFile = path.join(logs, '20261007-default-generation-positive-C41-build-01.json');
  const build = read(buildFile);
  const fixture = path.join(rt, 'current-recipient-risk-C41-20261007-01');
  const profile = path.join(fixture, 'profile');
  assert(build.passed && !fs.existsSync(fixture));
  const ownerFile = path.join(logs, '20261007-C40-receiver-display-chrome-03.json');
  const owner = read(ownerFile).owner;
  const key = read(path.join(rt, 'config/rtd.keystore')).map(encoded => {
    const bytes = Buffer.from(encoded, 'base64');
    return bytes.length === 33 && bytes[0] === 0 ? Ed25519Keypair.fromSecretKey(bytes.subarray(1)) : null;
  }).find(key => key?.toRtdAddress() === owner);
  assert(key);
  fs.mkdirSync(fixture, { mode: 0o700 });
  const password = crypto.randomBytes(32).toString('base64url');
  fs.writeFileSync(path.join(fixture, 'recovery-private.json'), JSON.stringify({ password }) + '\n', { flag: 'wx', mode: 0o600 });
  for (const [file, digest] of Object.entries(build.artifacts)) assert.equal(sha(fs.readFileSync(path.join(build.output, file))), digest);
  const nft = '0xbca970d965b7f00170947216c3483a501208812f68876c2e81aa7c8eb6a778af';
  let context, page, stage = 'launch', phase = 'initial', refuseAccount = false, proof = {};
  const checks = [], traffic = [], frames = [], jobs = [], captureErrors = [], blocked = [], refusals = [];
  const check = (name, value) => { assert(value, name); checks.push({ name, passed: true }); };
  try {
    context = await chromium.launchPersistentContext(profile, {
      executablePath: path.join(os.homedir(), 'Library/Caches/ms-playwright/chromium-1243/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing'),
      headless: true, viewport: { width: 800, height: 600 },
      args: [`--disable-extensions-except=${build.output}`, `--load-extension=${build.output}`],
    });
    context.on('request', request => {
      const url = new URL(request.url());
      if (['http:', 'https:'].includes(url.protocol)) traffic.push({ phase, url: url.href, method: request.method() });
    });
    await context.route('**/*', route => {
      const request = route.request(), url = new URL(request.url());
      if (!['http:', 'https:'].includes(url.protocol)) return route.continue();
      if (!['127.0.0.1', 'localhost'].includes(url.hostname) || /\/(ExecuteTransaction|SimulateTransaction)$/.test(url.pathname) || String(request.postData()).includes('"jsonrpc"')) {
        blocked.push({ phase, url: url.href }); return route.abort();
      }
      if (refuseAccount && url.pathname === '/account/graphql') {
        refusals.push({ phase, url: url.href }); return route.abort();
      }
      return route.continue();
    });
    context.on('response', response => {
      const url = new URL(response.url());
      if (!['http:', 'https:'].includes(url.protocol) || !(/\/(GetObject|GetCheckpoint|GetServiceInfo)$/.test(url.pathname) || url.pathname.endsWith('/account/graphql'))) return;
      const observedPhase = phase, request = response.request();
      jobs.push((async () => {
        const requestBytes = request.postDataBuffer() ?? Buffer.alloc(0), responseBytes = await response.body();
        const row = { phase: observedPhase, url: url.href, status: response.status(), requestBase64: requestBytes.toString('base64'), responseBase64: responseBytes.toString('base64'), requestSha256: sha(requestBytes), responseSha256: sha(responseBytes) };
        frames.push(row);
      })().catch(error => captureErrors.push({ phase: observedPhase, url: url.href, name: error.name, message: String(error.message).slice(0, 250) })));
    });
    let worker = context.serviceWorkers()[0] || await context.waitForEvent('serviceworker');
    const loaded = await require('./lib/current-extension-worker.cjs').ensure(context, worker, build.output);
    worker = loaded.worker; proof.workerSource = loaded.evidence.after ?? loaded.evidence.before;
    check('current C41 worker bytes', proof.workerSource.workerSha256 === build.artifacts['background.js']);
    page = await context.newPage();
    const base = new URL('ui.html', worker.url()).href;
    proof.uiSource = await require('./lib/current-extension-ui-source.cjs').inspect(context, page, build.output,
      Object.keys(build.artifacts).filter(file => file.endsWith('.js') && !['background.js', 'content-script.js', 'dapp-interface.js', 'egress-gate.js'].includes(file)),
      { url: base, navigate: async () => { await page.goto(base); await page.locator('button,a,input').first().waitFor(); } });
    stage = 'private normal import and protection';
    await page.goto(base + '#/accounts/import-private-key');
    await page.locator('[name="privateKey"]').fill(key.getSecretKey());
    await page.locator('[name="privateKey"]').blur();
    await expect(page.locator('button[type="submit"]')).toBeEnabled();
    await page.locator('button[type="submit"]').click(); await page.waitForURL(/protect-account/);
    await page.locator('[name="password.input"]').fill(password);
    await page.locator('[name="password.confirmation"]').fill(password);
    await page.locator('#acceptedTos').click(); await page.locator('button[type="submit"]').click();
    await page.waitForURL(/#\/tokens/);
    const command = (method, args) => page.evaluate(({ method, args }) => new Promise((resolve, reject) => {
      const port = chrome.runtime.connect({ name: 'rtd_ui<->background' }), id = crypto.randomUUID();
      const timer = setTimeout(() => { port.disconnect(); reject(Error('UI command timeout')); }, 20000);
      port.onMessage.addListener(message => {
        if (message?.kind === 'rtd-ui-source-challenge') { port.postMessage({ kind: 'rtd-ui-source-confirm', nonce: message.nonce }); return; }
        if (message.id === id) { clearTimeout(timer); port.disconnect(); resolve(message.payload); }
      });
      port.postMessage({ id, payload: method === '@setNetwork' ? { type: 'set-network', network: args } : { type: 'method-payload', method, args } });
    }), { method, args });
    stage = 'public actual local profile';
    const accounts = (await command('getStoredEntities', { type: 'accounts' })).args.entities;
    check('normal controlled recipient account', accounts.length === 1 && accounts[0].address === owner && !accounts[0].isLocked);
    assert.equal((await command('@setNetwork', { env: 'local', customRpcUrl: null })).type, 'done');
    const journal = require('./lib/lifecycle-journal-snapshot.cjs');
    proof.beforeJournal = await journal(page);
    check('initial three stores empty', Object.values(proof.beforeJournal).every(rows => Array.isArray(rows) && rows.length === 0));
    await page.goto(base + '#/nft-transfer/' + nft);
    const input = page.locator('[name="to"]'); await expect(input).toBeVisible({ timeout: 120000 });
    const body = () => page.locator('body').innerText();
    const set = async (name, address, pattern) => {
      stage = 'actual recipient ' + name; phase = name;
      await input.fill(address); await input.blur();
      await expect.poll(body, { timeout: 70000 }).toMatch(pattern);
      await Promise.all(jobs);
      const text = await body(); check('visible ' + name + ' warning', pattern.test(text));
      return { name, address, text };
    };
    proof.cases = [];
    proof.cases.push(await set('object', nft, /该地址是一个对象|This is an object address/));
    proof.cases.push(await set('empty-supported-window', '0x' + '9'.repeat(64), /历史窗口内未见受支持的活动|No supported activity/));
    proof.cases.push(await set('history-observed', owner, /内存在受支持的历史活动|Observed activity/));
    const invalid = await set('invalid', '0xxyz', /地址无效|Invalid.*address|有效的.*地址|Invalid address/);
    proof.cases.push(invalid);
    check('invalid format exposes no prior object or history positive text', !/该地址是一个对象|历史窗口内未见受支持的活动|内存在受支持的历史活动/.test(invalid.text));
    stage = 'fresh unknown transport case'; refuseAccount = true;
    const unknown = await set('account-transport-refused', '0x' + '8'.repeat(64), /收件人检查暂不可用|Unable to inspect|Inspection unavailable/);
    proof.cases.push(unknown);
    check('actual account transport refusal happened', refusals.length > 0);
    check('unknown does not retain preceding history positive or empty result', !/该地址是一个对象|历史窗口内未见受支持的活动|内存在受支持的历史活动/.test(unknown.text));
    refuseAccount = false;
    check('full journal unchanged before relock', JSON.stringify(await journal(page)) === JSON.stringify(proof.beforeJournal));
    phase = 'final'; stage = 'normal final relock';
    await page.goto(base + '#/tokens'); await page.getByTestId('lock-account-button').click();
    await page.getByTestId('unlock-account-button').waitFor();
    proof.afterJournal = await journal(page);
    check('full three stores unchanged after relock', JSON.stringify(proof.afterJournal) === JSON.stringify(proof.beforeJournal));
    await Promise.all(jobs);
    check('zero simulation signature dispatch and forbidden external calls', blocked.length === 0 && !traffic.some(row => /\/(ExecuteTransaction|SimulateTransaction)$/.test(new URL(row.url).pathname)));
    for (const [file, digest] of Object.entries(build.artifacts)) assert.equal(sha(fs.readFileSync(path.join(build.output, file))), digest);
    proof = { ...proof, passed: true, observedAt: new Date().toISOString(), fixture, profile, owner, nft,
      source: build.sourceAfter, checks, traffic, frames, captureErrors, blocked, refusals,
      simulations: 0, signatures: 0, executeRequests: 0, originalProfilesOpened: 0, certificateChanges: 0,
      inputsSha256: Object.fromEntries([__filename, buildFile, ownerFile].map(file => [file, sha(fs.readFileSync(file))])),
      scope: 'Actual current C41 protected new controlled recipient NFT address form. Real object warning, explicit no-supported-activity window, observed supported history, invalid input and actual account transport refusal showing unknown. Original three stores unchanged and normal relock; no preview/sign/Execute or original profile open. Not all RPC23 NFT branches, merchandising feature, ordinary Chrome TLS or parent completion.' };
  } catch (error) {
    proof = { ...proof, passed: false, stage, phase, errorType: error.name,
      message: stage.startsWith('private') ? 'Private import stage diagnostic redacted' : String(error.message).replaceAll(password, '[redacted]').replaceAll(key.getSecretKey(), '[redacted]').slice(0, 800),
      checks, traffic, frames, captureErrors, blocked, refusals, simulations: 0, signatures: 0, executeRequests: 0 };
    if (page && !stage.startsWith('private')) proof.publicDiagnostic = { route: new URL(page.url()).hash, text: (await page.locator('body').innerText().catch(() => '')).slice(0, 5000) };
    process.exitCode = 1;
  } finally {
    if (context) await context.close();
    await Promise.all(jobs);
    fs.writeFileSync(output, JSON.stringify(proof, null, 2) + '\n', { flag: 'wx', mode: 0o600 });
    console.log(JSON.stringify({ passed: proof.passed, stage: proof.stage, checks: checks.length, frames: frames.length, executeRequests: 0 }));
  }
})().catch(error => { console.error(JSON.stringify({ passed: false, errorType: error.name, stage: 'preflight' })); process.exitCode = 1; });
