// Actual current C42 framework post-transfer UI, two new controlled account profiles, no transaction actions.
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
  const [output, environmentAudit, role, attempt = '03'] = process.argv.slice(2);
  assert(["sender", "recipient"].includes(role));
  assert(/^\d{2}$/.test(attempt));
  assert(environmentAudit && fs.existsSync(environmentAudit));
  assert(output && !fs.existsSync(output));
  const wallet = path.resolve(__dirname, '..');
  const rt = path.join(os.homedir(), '.local/state/rtd-wallet-migration/dev-20261006-03');
  const logs = path.join(wallet, 'migrationToGRpcOrGraphQLDoc/workLog');
  const buildFile = path.join(logs, '20261007-default-generation-positive-C42-build-01.json');
  const build = read(buildFile);
  const fixture = path.join(rt, 'current-framework-' + role + '-C42-20261007-' + attempt);
  const profile = path.join(fixture, 'profile');
  assert(build.passed && !fs.existsSync(fixture));
  const ownerFile = path.join(logs, '20261007-C40-framework-single-native-audit-01.json');
  const original = read(ownerFile); assert(original.passed);
  const owner = role === 'sender' ? original.owner : original.recipient;
  const key = read(path.join(rt, 'config/rtd.keystore')).map(encoded => {
    const bytes = Buffer.from(encoded, 'base64');
    return bytes.length === 33 && bytes[0] === 0 ? Ed25519Keypair.fromSecretKey(bytes.subarray(1)) : null;
  }).find(key => key?.toRtdAddress() === owner);
  assert(key);
  fs.mkdirSync(fixture, { mode: 0o700 });
  const password = crypto.randomBytes(32).toString('base64url');
  fs.writeFileSync(path.join(fixture, 'recovery-private.json'), JSON.stringify({ password }) + '\n', { flag: 'wx', mode: 0o600 });
  for (const [file, digest] of Object.entries(build.artifacts)) assert.equal(sha(fs.readFileSync(path.join(build.output, file))), digest);
  const nft = original.nftId;
  let context, page, stage = 'launch', phase = 'initial', refuseAccount = false, proof = {}, closing = false;
  const checks = [], traffic = [], frames = [], jobs = [], captureErrors = [], blocked = [], refusals = [], inputTrace = [];
  let traceTimer, traceBusy = false;
  const check = (name, value) => {
    assert(value, name); checks.push({ name, passed: true });
    fs.writeFileSync(path.join(fixture, 'observation-progress.json'), JSON.stringify({ observedAt: new Date().toISOString(), stage, phase, checks, deliveryAccepted: false }) + '\n', { mode: 0o600 });
  };
  try {
    stage = 'production read-admission preflight';
    const env = read(environmentAudit);
    assert(env.passed && ['finite', 'restored'].includes(env.phase));
    assert(Date.now() - Date.parse(env.observedAt) < 300000);
    assert(env.effectiveAssetWindow.windowNonempty);
    for (const [file, digest] of Object.entries(env.inputsSha256)) assert.equal(sha(fs.readFileSync(file)), digest);
    const loader = require('tsx/cjs/api');
    const { validateNetworkProfile } = loader.require(path.join(wallet, 'src/shared/rpc/profile.ts'), __filename);
    const { WalletReadSession } = loader.require(path.join(wallet, 'src/shared/rpc/session.ts'), __filename);
    const { WalletAssetReader } = loader.require(path.join(wallet, 'src/shared/rpc/asset-reader.ts'), __filename);
    const { WalletFullnodeReader } = loader.require(path.join(wallet, 'src/shared/rpc/fullnode-reader.ts'), __filename);
    const session = new WalletReadSession(validateNetworkProfile(read(path.join(rt, 'certified-positive-transport-release-20261006-01/profile.json'))));
    try {
      const reader = await WalletAssetReader.open(session, { timeoutMs: 60000,
        window: { lower: env.effectiveAssetWindow.commonLo, upper: env.effectiveAssetWindow.commonHi } });
      assert(BigInt(reader.proof.checkpoint) >= 281963n);
      if (role === 'recipient') {
        const objects = await reader.ownedObjects(owner);
        const item = objects.value.find(object => object.objectId === nft);
        assert(item && item.owner.$kind === 'AddressOwner' && item.owner.AddressOwner === owner);
        const native = await new WalletFullnodeReader(session).object(nft); assert(native);
        assert(item.digest === native.digest && String(item.version) === String(native.version));
        proof.assetAdmissionBefore = { proof: reader.proof, objects: objects.value.length,
          object: { objectId: native.objectId, digest: native.digest, version: native.version, owner: native.owner } };
      } else {
        const kiosks = await reader.nativeKiosks(owner);
        const kiosk = kiosks.value.find(k => k.kioskId === original.sourceKiosk.id);
        assert(kiosk && kiosk.ownerCap.objectId === original.originalCapId && kiosk.items.length === 0);
        proof.assetAdmissionBefore = { proof: reader.proof, kioskId: kiosk.kioskId, capId: kiosk.ownerCap.objectId, items: 0 };
      }
      check('fresh post-transfer complete production admission matches controlled role', true);
    } finally { session.close(); }
    stage = 'launch';
    context = await chromium.launchPersistentContext(profile, {
      executablePath: path.join(os.homedir(), 'Library/Caches/ms-playwright/chromium-1243/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing'),
      headless: true, viewport: { width: 800, height: 600 },
      args: [`--disable-extensions-except=${build.output}`, `--load-extension=${build.output}`],
    });
    context.on('request', request => {
      const url = new URL(request.url());
      if (['http:', 'https:'].includes(url.protocol)) traffic.push({ phase, url: url.href, method: request.method() });
    });
    await context.route('**/*', async route => {
      const request = route.request(), url = new URL(request.url());
      if (!['http:', 'https:'].includes(url.protocol)) return route.continue();
      if (!['127.0.0.1', 'localhost'].includes(url.hostname) || /\/(ExecuteTransaction|SimulateTransaction)$/.test(url.pathname) || String(request.postData()).includes('"jsonrpc"')) {
        blocked.push({ phase, url: url.href }); return route.abort();
      }
      if (refuseAccount && url.pathname === '/account/graphql') {
        refusals.push({ phase, url: url.href }); return route.abort();
      }
      if (url.port === '41954' && url.pathname === '/graphql') {
        const observedPhase = phase;
        try {
          const response = await route.fetch(), responseBytes = await response.body();
          const requestBytes = request.postDataBuffer() ?? Buffer.alloc(0);
          frames.push({ phase: observedPhase, url: url.href, status: response.status(), requestBase64: requestBytes.toString('base64'),
            responseBase64: responseBytes.toString('base64'), requestSha256: sha(requestBytes), responseSha256: sha(responseBytes) });
          await route.fulfill({ response, body: responseBytes });
        } catch (error) {
          captureErrors.push({ phase: observedPhase, url: url.href, name: error.name, closing, message: String(error.message).slice(0, 250) });
          try { await route.abort(); } catch { /* Browser may already be closing; retain the capture diagnostic. */ }
        }
        return;
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
    check('current C42 worker bytes', proof.workerSource.workerSha256 === build.artifacts['background.js']);
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
    check('normal controlled selected account', accounts.length === 1 && accounts[0].address === owner && !accounts[0].isLocked);
    assert.equal((await command('@setNetwork', { env: 'local', customRpcUrl: null })).type, 'done');
    const journal = require('./lib/lifecycle-journal-snapshot.cjs');
    proof.beforeJournal = await journal(page);
    check('initial three stores empty', Object.values(proof.beforeJournal).every(rows => Array.isArray(rows) && rows.length === 0));
    const currentSnapshot = async () => {
      const rows = await page.evaluate(() => {
        const found = [];
        for (const el of document.querySelectorAll('*')) {
          let f = el[Object.keys(el).find(k => k.startsWith('__reactFiber'))];
          for (let i = 0; f && i < 40; i++, f = f.return)
            for (let d = f.dependencies?.firstContext; d; d = d.next) {
              const v = d.memoizedValue;
              if (v && typeof v.assetSnapshotKey === 'string' && v.state === 'configured' && v.hasFullnodeSession)
                found.push({ bindingKey: v.bindingKey, readSessionKey: v.readSessionKey, assetSnapshotKey: v.assetSnapshotKey });
            }
        }
        return found;
      });
      const row = rows.find(v => { try { return JSON.parse(v.assetSnapshotKey).length === 6; } catch { return false; } });
      assert(row); const key = JSON.parse(row.assetSnapshotKey);
      assert(BigInt(key[2]) >= 281963n && key[4].length === 10);
      assert.equal(key[5].coverage.snapshotCheckpoint, key[2]);
      assert.equal(key[5].coverage.snapshotCheckpointDigest, key[3]);
      return { authority: row, checkpoint: key[2], digest: key[3], dependencies: key[4] };
    };
    phase = role; stage = 'actual current controlled ' + role + ' assets';
    await page.goto(base + '#/nfts');
    if (role === 'recipient') {
      const card = page.locator('a[href*="nft-details"][href*="' + nft + '"]');
      await expect(card).toBeVisible({ timeout: 120000 });
      proof.cardHref = await card.getAttribute('href');
      check('actual received original framework NFT card', true);
      proof.listSnapshot = await currentSnapshot();
      await card.click();
      await expect(page.locator('a[href*="nft-transfer/' + nft + '"]')).toBeVisible({ timeout: 60000 });
      proof.detailsText = (await page.locator('body').innerText()).slice(0, 6000);
      proof.detailsSnapshot = await currentSnapshot();
      check('actual received NFT details and direct transfer link without preparation', true);
      await page.goto(base + '#/nfts');
      await expect(page.locator('a[href*="nft-details"][href*="' + nft + '"]')).toBeVisible({ timeout: 60000 });
      check('actual list navigation refresh preserves received NFT', true);
    } else {
      const card = page.locator('a[href*="kioskId=' + original.sourceKiosk.id + '"]');
      await expect(card).toBeVisible({ timeout: 120000 });
      proof.cardHref = await card.getAttribute('href'); proof.listSnapshot = await currentSnapshot();
      check('actual original sender framework Kiosk cap card', true);
      await card.click();
      await expect(page.getByText(/^(Kiosk 中暂无资产|Kiosk is empty)$/)).toBeVisible({ timeout: 120000 });
      assert.equal(await page.locator('a[href*="nft-details"]').count(), 0);
      proof.detailsText = (await page.locator('body').innerText()).slice(0, 6000);
      proof.detailsSnapshot = await currentSnapshot();
      check('actual original sender Kiosk empty after original transfer', true);
      await page.goto(base + '#/nfts'); await card.waitFor({ timeout: 60000 });
      check('actual list refresh retains original sender cap card', true);
    }
    check('full journal unchanged before relock', JSON.stringify(await journal(page)) === JSON.stringify(proof.beforeJournal));
    phase = 'final'; stage = 'normal final relock';
    await page.goto(base + '#/tokens'); await page.getByTestId('lock-account-button').click();
    await page.getByTestId('unlock-account-button').waitFor();
    proof.afterJournal = await journal(page);
    check('full three stores unchanged after relock', JSON.stringify(proof.afterJournal) === JSON.stringify(proof.beforeJournal));
    await Promise.all(jobs);
    check('zero simulation signature dispatch and forbidden external calls', blocked.length === 0 && !traffic.some(row => /\/(ExecuteTransaction|SimulateTransaction)$/.test(new URL(row.url).pathname)));
    for (const [file, digest] of Object.entries(build.artifacts)) assert.equal(sha(fs.readFileSync(path.join(build.output, file))), digest);
    proof = { ...proof, passed: true, observedAt: new Date().toISOString(), fixture, profile, owner, nft, role, originalDigest: original.digest, kioskId: original.sourceKiosk.id, capId: original.originalCapId,
      source: build.sourceAfter, checks, traffic, frames, captureErrors, blocked, refusals, inputTrace,
      simulations: 0, signatures: 0, executeRequests: 0, originalProfilesOpened: 0, certificateChanges: 0,
      inputsSha256: Object.fromEntries([__filename, buildFile, ownerFile, environmentAudit].map(file => [file, sha(fs.readFileSync(file))])),
      scope: 'Actual current C42 post-transfer framework UI. New normal controlled sender or recipient account; fresh complete production window first, original cap empty Kiosk or received original NFT card/details and actual navigation refresh, all three stores unchanged and normal relock. GraphQL raw captured from actual transport without body modification; all other errors retained. No original execution profile open, preparation/simulation/signature/dispatch or names/full parent acceptance.' };
  } catch (error) {
    proof = { ...proof, passed: false, stage, phase, errorType: error.name,
      message: stage.startsWith('private') ? 'Private import stage diagnostic redacted' : String(error.message).replaceAll(password, '[redacted]').replaceAll(key.getSecretKey(), '[redacted]').slice(0, 800),
      checks, traffic, frames, captureErrors, blocked, refusals, inputTrace, simulations: 0, signatures: 0, executeRequests: 0 };
    if (page && !stage.startsWith('private')) proof.publicDiagnostic = { route: new URL(page.url()).hash, text: (await page.locator('body').innerText().catch(() => '')).slice(0, 5000) };
    fs.writeFileSync(path.join(fixture, 'failure-before-close.json'), JSON.stringify(proof, null, 2) + '\n', { flag: 'wx', mode: 0o600 });
    process.exitCode = 1;
  } finally {
    if (traceTimer) clearInterval(traceTimer);
    if (!proof.passed && context && page && !stage.startsWith('private')) {
      try {
        await page.goto(new URL('ui.html', context.serviceWorkers()[0].url()).href + '#/tokens');
        if (await page.getByTestId('lock-account-button').isVisible()) {
          await page.getByTestId('lock-account-button').click(); await page.getByTestId('unlock-account-button').waitFor(); proof.cleanupRelock = true;
        }
      } catch (error) { proof.cleanupErrorType = error.name; }
    }
    fs.writeFileSync(path.join(fixture, 'observation-before-close.json'), JSON.stringify({ ...proof, browserTeardownComplete: false }, null, 2) + '\n', { flag: 'wx', mode: 0o600 });
    closing = true;
    if (context) {
      await context.unrouteAll({ behavior: 'ignoreErrors' });
      await context.close();
      proof.browserTeardownComplete = true;
    }
    await Promise.all(jobs);
    fs.writeFileSync(output, JSON.stringify(proof, null, 2) + '\n', { flag: 'wx', mode: 0o600 });
    console.log(JSON.stringify({ passed: proof.passed, stage: proof.stage, checks: checks.length, frames: frames.length, executeRequests: 0 }));
  }
})().catch(error => { console.error(JSON.stringify({ passed: false, errorType: error.name, stage: 'preflight' })); process.exitCode = 1; });
