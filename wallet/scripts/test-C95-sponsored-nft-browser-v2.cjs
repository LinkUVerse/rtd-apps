// Current production Wallet Standard sender approval, independent sponsor and external gRPC execution.
process.env.PW_EXPERIMENTAL_SERVICE_WORKER_NETWORK_EVENTS = '1';
const fs = require('node:fs'), path = require('node:path'), os = require('node:os'), crypto = require('node:crypto');
const assert = require('node:assert/strict'), cp = require('node:child_process'), http = require('node:http');
const { chromium, expect } = require('@playwright/test');
const { Transaction } = require('rtd-typescript/transactions'), { bcs } = require('rtd-typescript/bcs');
const { RtdGrpcClient } = require('rtd-typescript/grpc');
const { Ed25519Keypair } = require('rtd-typescript/keypairs/ed25519');
const { verifyTransactionSignature } = require('rtd-typescript/verify');
const { normalizeStructTag } = require('rtd-typescript/utils');
const wallet = path.resolve(__dirname, '..'), root = path.resolve(wallet, '../..');
const logs = path.join(wallet, 'migrationToGRpcOrGraphQLDoc/workLog');
const read = f => JSON.parse(fs.readFileSync(f)), hash = v => crypto.createHash('sha256').update(v).digest('hex');
const sha = f => hash(fs.readFileSync(f));
function record(f, value) {
  const fd = fs.openSync(f, 'wx', 0o600);
  try { fs.writeFileSync(fd, JSON.stringify(value, (_, v) => typeof v === 'bigint' ? v.toString() : v instanceof Uint8Array ? Buffer.from(v).toString('base64') : v, 2) + '\n'); fs.fsyncSync(fd); }
  finally { fs.closeSync(fd); }
  const dir = fs.openSync(path.dirname(f), 'r'); try { fs.fsyncSync(dir); } finally { fs.closeSync(dir); }
}
(async () => {
  const [operation, stage, output] = process.argv.slice(2);
  assert(['mint', 'approve', 'execute', 'recover-mint', 'recover-execute'].includes(stage));
  const op = path.resolve(operation), intent = read(path.join(op, 'intent.json'));
  assert.equal(op, intent.operation); assert(intent.onceOnly && read(path.join(op, 'prepared.json')).passed);
  assert(output && !fs.existsSync(output));
  const dir = path.join(op, stage); assert(!fs.existsSync(dir));
  const fixture = intent.fixture, oldIntent = read(path.join(fixture, 'intent.json'));
  const addresses = read(path.join(fixture, 'addresses.json')), keyFile = path.join(fixture, 'keys.json');
  const keys = read(keyFile), sender = Ed25519Keypair.fromSecretKey(keys.source), sponsor = Ed25519Keypair.fromSecretKey(keys.sponsor);
  assert.equal(sender.toRtdAddress(), addresses.source); assert.equal(sponsor.toRtdAddress(), addresses.sponsor);
  const protectedOracle = read(path.join(logs, '20261008-C94-current-nft-core-authorization-03.json'));
  const nativeOracle = read(path.join(logs, '20261008-C93-recovered-native-independent-01.json'));
  const ids = [...nativeOracle.nfts, ...nativeOracle.obNfts].map(o => o.objectId).concat(
    [nativeOracle.frameworkCap.objectId, nativeOracle.personalCap.objectId, nativeOracle.purchaseCap.objectId],
    nativeOracle.originByte.map(o => o.tokenId), oldIntent.original13ObjectIds, read(path.join(fixture, 'inspect/policy.json')).map(o => o.objectId));
  assert.equal(new Set(ids).size, 27);
  const productSource = require('./build-reviewed-generation-production-extension.cjs').productSource;
  const pinned = { ...intent.inputsSha256, ...intent.artifactPins, [path.join(op, 'intent.json')]: sha(path.join(op, 'intent.json')) };
  const held = () => {
    for (const [f, h] of Object.entries(pinned)) assert.equal(sha(f), h);
    assert.deepEqual(productSource(), intent.source);
    cp.execFileSync(path.join(root, 'rtd-archive-service/localDeploy/data/publisher-venv/bin/python'), ['-c',
      'import sys,json;sys.path.insert(0,sys.argv[1]);from prepare_wallet_C93_independent_nft_fixture import held;held(json.load(open(sys.argv[2])))',
      path.join(root, 'link-u-smart-contract/all-in-one-deploy/localDeploy'), path.join(fixture, 'intent.json')], { stdio: ['ignore', 'pipe', 'pipe'], timeout: 120000 });
  };
  const qualificationFile = path.join(logs, '20261008-C95-rpc-error-driver-qualification-01.json');
  const qualification = read(qualificationFile); assert(qualification.passed && qualification.exactOriginalInverse);
  assert.equal(qualification.inputsSha256[__filename], sha(__filename));
  for (const [f, h] of Object.entries(qualification.inputsSha256)) assert.equal(sha(f), h);
  pinned[__filename] = sha(__filename); pinned[qualificationFile] = sha(qualificationFile);
  held(); fs.mkdirSync(dir, { mode: 0o700 });
  const frames = [], browserFrames = [], jobs = [], captureErrors = [], checks = [];
  let executeRequests = 0, signatures = 0, browserSignatures = 0, phase = 'initial scope', context, server, page, password;
  const check = (name, condition) => { assert(condition, name); checks.push({ name, passed: true }); };
  const write = (name, value) => record(path.join(dir, name + '.json'), value);
  write('intent', { stage, observedAt: new Date().toISOString(), onceOnly: true, runnerSha256: sha(__filename), automaticRetry: false });
  const beforeFetch = globalThis.fetch;
  globalThis.fetch = async (input, init) => {
    const u = new URL(input instanceof Request ? input.url : String(input));
    assert.equal(u.origin, 'http://127.0.0.1:41750');
    assert(u.pathname.startsWith('/rtd.rpc.v2.') && !u.pathname.includes('faucet'));
    if (u.pathname.endsWith('/ExecuteTransaction')) { assert(['mint', 'execute'].includes(stage)); assert.equal(++executeRequests, 1); }
    const row = { phase, url: u.href, startedAt: new Date().toISOString(), requestBase64: Buffer.from(init?.body ?? []).toString('base64') }; frames.push(row);
    try { const r = await beforeFetch(input, init); Object.assign(row, { status: r.status, headers: Object.fromEntries(r.headers), responseBase64: Buffer.from(await r.clone().arrayBuffer()).toString('base64'), endedAt: new Date().toISOString() }); return r; }
    catch (e) { row.transportError = e.name; throw e; }
  };
  const sdk = new RtdGrpcClient({ network: 'localnet', baseUrl: 'http://127.0.0.1:41750', format: 'binary', mvr: { url: '' } });
  const projection = o => ({ objectId: o.objectId, version: o.version, digest: o.digest, owner: o.owner, type: normalizeStructTag(o.type), contentBase64: Buffer.from(o.content).toString('base64') });
  const objects = async objectIds => { const r = await sdk.core.getObjects({ objectIds, include: { content: true } }); assert(r.objects.every(o => !(o instanceof Error))); return r.objects.map(projection); };
  const identity = async () => { const info = (await sdk.ledgerService.getServiceInfo({})).response; assert.equal(info.chainId, intent.h0); return info; };
  const balances = async () => ({ source: (await sdk.core.getBalance({ owner: addresses.source })).balance, sponsor: (await sdk.core.getBalance({ owner: addresses.sponsor })).balance });
  const ref = c => ({ objectId: c.objectId, version: c.version, digest: c.digest });
  async function recover(which) {
    const pending = read(path.join(op, which, 'pending.json')); let result;
    for (let attempt = 0; attempt < 60; attempt++) {
      try {
        result = await sdk.core.getTransaction({ digest: pending.digest, include: { bcs: true, effects: true, objectTypes: true } }); write('recovery-' + String(attempt).padStart(2, '0'), result);
        if (result.$kind === 'Transaction') break;
      } catch (e) {
        const actual = frames.at(-1);
        assert.equal(e.name, 'RpcError'); assert.equal(actual.url, 'http://127.0.0.1:41750/rtd.rpc.v2.LedgerService/GetTransaction');
        assert.equal(actual.status, 200); assert.equal(actual.headers['grpc-status'], '5');
        assert.equal(decodeURIComponent(actual.headers['grpc-message']), 'Transaction ' + pending.digest + ' not found');
        assert.equal(actual.responseBase64, '');
        write('recovery-' + String(attempt).padStart(2, '0'), { pending: true, actualGrpcStatus: '5', originalDigest: pending.digest });
      }
      await new Promise(r => setTimeout(r, 500));
    }
    assert(result?.$kind === 'Transaction' && result.Transaction.status.success);
    assert.equal(result.Transaction.digest, pending.digest); assert.equal(Buffer.from(result.Transaction.bcs).toString('base64'), pending.bytesBase64);
    const effects = bcs.TransactionEffects.parse(result.Transaction.effects.bcs);
    assert.equal(effects.V2.transactionDigest, pending.digest); assert.equal(effects.V2.status.$kind, 'Success');
    assert.equal(bcs.TransactionEffects.serialize(effects).toBase64(), Buffer.from(result.Transaction.effects.bcs).toString('base64'));
    check('original digest complete canonical BCS and successful typed effects', true); write('recovered', result); return result;
  }
  async function nftAfterMint(result) {
    const binding = read(path.join(fixture, 'inspect/binding.json'));
    const nftIds = Object.entries(result.Transaction.objectTypes).filter(([, type]) => normalizeStructTag(type) === normalizeStructTag(binding.nftType)).map(([id]) => id);
    assert.equal(nftIds.length, 1); assert(!ids.includes(nftIds[0]));
    const [nft] = await objects(nftIds); assert.equal(nft.owner.AddressOwner, addresses.source);
    const parsed = bcs.struct('C95FixtureNFT', { id: bcs.Address, serial: bcs.u64() }).parse(Buffer.from(nft.contentBase64, 'base64'));
    assert.equal(parsed.serial, '95'); check('dedicated serial95 NFT newly minted without moving 27 protected objects', true); write('nft', nft); return nft;
  }
  async function admission(page) {
    return page.evaluate(async () => {
      const name = 'RtdWallet NetworkAdmission'; if (!(await indexedDB.databases()).some(x => x.name === name)) return { present: false, pending: 0, faults: [] };
      return new Promise((resolve, reject) => { const r = indexedDB.open(name); r.onupgradeneeded = () => { r.transaction.abort(); reject(Error('Readonly admission forbids upgrade')); }; r.onerror = () => reject(Error('Readonly admission failed')); r.onsuccess = () => { const db = r.result, tx = db.transaction('admission-v1', 'readonly'), q = tx.objectStore('admission-v1').getAll(); let rows; q.onsuccess = () => { rows = q.result; }; tx.oncomplete = () => { db.close(); resolve({ present: true, pending: rows.reduce((n, x) => n + x.pending.length, 0), faults: rows.flatMap(x => x.faults) }); }; tx.onabort = tx.onerror = () => { db.close(); reject(Error('Readonly admission aborted')); }; }; });
    });
  }
  try {
    write('service-info-before', await identity()); phase = '27 protected objects before'; const before = await objects(ids); write('protected-before', before);
    assert.deepEqual(before.slice(-14, -1), read(path.join(fixture, 'inspect/original-objects.json')));
    assert.deepEqual(before.slice(-1), read(path.join(fixture, 'inspect/policy.json')));
    // C94 contains complete new stock proof; exact order is separately bound in the raw audit.
    assert(protectedOracle.newEightNFTFiveCapsHeld && protectedOracle.original13AndPolicyHeld);
    write('balances-before', await balances());
    if (stage === 'mint') {
      const binding = read(path.join(fixture, 'inspect/binding.json')), tx = new Transaction(); tx.setSender(addresses.source);
      const nft = tx.moveCall({ target: binding.packageId + '::nonempty_kiosk::mint', arguments: [tx.pure.u64(95)] }); tx.transferObjects([nft], addresses.source);
      phase = 'dedicated NFT mint enabled build'; const bytes = await tx.build({ client: sdk }), digest = await tx.getDigest();
      const sim = await sdk.core.simulateTransaction({ transaction: bytes, include: { bcs: true, effects: true, objectTypes: true } }); write('simulation', sim); assert(sim.$kind === 'Transaction' && sim.Transaction.status.success);
      const effects = bcs.TransactionEffects.parse(sim.Transaction.effects.bcs); assert(!effects.V2.changedObjects.some(([id]) => ids.includes(id)));
      held(); const signed = await sender.signTransaction(bytes); signatures++; assert.equal((await verifyTransactionSignature(bytes, signed.signature)).toRtdAddress(), addresses.source);
      write('pending', { digest, bytesBase64: signed.bytes, signatures: [signed.signature], h0: intent.h0, onceOnly: true });
      phase = 'one dedicated NFT mint Execute'; write('receipt', await sdk.core.executeTransaction({ transaction: bytes, signatures: [signed.signature], include: { bcs: true, effects: true, objectTypes: true } }));
      await nftAfterMint(await recover('mint'));
    } else if (stage === 'recover-mint') {
      await nftAfterMint(await recover('mint'));
    } else if (stage === 'approve') {
      const seed = ['mint', 'recover-mint'].map(s => path.join(op, s, 'evidence.json')).find(f => fs.existsSync(f) && read(f).passed); assert(seed);
      const nft = read(path.join(path.dirname(seed), 'nft.json')), fresh = (await objects([nft.objectId]))[0]; assert.deepEqual(fresh, nft);
      const coins = await sdk.core.listCoins({ owner: addresses.sponsor, coinType: '0x2::rtd::RTD', limit: 20 }); assert(!coins.hasNextPage && coins.objects.length);
      const price = (await sdk.core.getReferenceGasPrice()).referenceGasPrice, info = await identity(), tx = new Transaction();
      tx.setSender(addresses.source); tx.setGasOwner(addresses.sponsor); tx.setGasPayment([ref(coins.objects[0])]); tx.setGasPrice(price); tx.setGasBudget('100000000'); tx.setExpiration({ Epoch: (info.epoch + 1n).toString() }); tx.transferObjects([tx.objectRef(ref(nft))], addresses.newTarget);
      const bytes = await tx.build({ client: sdk }), data = tx.getData();
      const variant = { name: 'C95-external-sponsor-dedicated-NFT', sponsored: true, json: await tx.toJSON(), bytesSha256: hash(bytes), gasData: data.gasData, expiration: data.expiration };
      write('authorization-input', { variant, bytesBase64: Buffer.from(bytes).toString('base64'), nft, destination: addresses.newTarget });
      phase = 'current production fresh testing Chrome'; password = crypto.randomBytes(24).toString('base64url');
      context = await chromium.launchPersistentContext(path.join(dir, 'profile'), { executablePath: path.join(os.homedir(), 'Library/Caches/ms-playwright/chromium-1243/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing'), headless: true, viewport: { width: 800, height: 600 }, args: [`--disable-extensions-except=${intent.extension}`, `--load-extension=${intent.extension}`] });
      const allowed = new Set(['http://127.0.0.1:41750', 'http://127.0.0.1:41957', 'http://127.0.0.1:41958', 'http://127.0.0.1:41959', 'http://127.0.0.1:41718']);
      context.on('response', response => { const u = new URL(response.url()); if (!['http:', 'https:'].includes(u.protocol) || !u.pathname.includes('/rtd.rpc.v2.')) return; const p = phase; jobs.push((async () => browserFrames.push({ phase: p, url: u.href, status: response.status(), headers: await response.allHeaders(), requestBase64: (response.request().postDataBuffer() ?? Buffer.alloc(0)).toString('base64'), responseBase64: (await response.body()).toString('base64') }))().catch(e => captureErrors.push({ phase: p, url: u.href, errorType: e.name }))); });
      await context.route('**/*', async route => { const u = new URL(route.request().url()); if (['http:', 'https:'].includes(u.protocol)) { assert(allowed.has(u.origin), 'Unreviewed browser origin'); assert(!u.pathname.endsWith('/ExecuteTransaction') && !u.pathname.includes('/v2/gas')); } await route.continue(); });
      const worker0 = context.serviceWorkers()[0] || await context.waitForEvent('serviceworker');
      const loaded = await require('./lib/current-extension-worker.cjs').ensure(context, worker0, intent.extension), worker = loaded.worker;
      write('worker-source', loaded.evidence); const build = read(path.join(logs, '20261007-default-generation-positive-C46-build-03.json'));
      check('exact current production background loaded', (loaded.evidence.after ?? loaded.evidence.before).matchesDisk);
      page = await context.newPage(); page.setDefaultTimeout(20000); const ui = new URL('ui.html', worker.url()).href;
      const uiSource = await require('./lib/current-extension-ui-source.cjs').inspect(context, page, intent.extension, Object.keys(build.artifacts).filter(f => f.endsWith('.js') && !['background.js', 'content-script.js', 'dapp-interface.js', 'egress-gate.js'].includes(f)), { url: ui, navigate: async () => { await page.goto(ui); await page.locator('button,a,input').first().waitFor(); } }); write('ui-source', uiSource); check('exact current production UI loaded', uiSource.matchesDisk);
      phase = 'new test sender normal private key UI import'; await page.goto(ui + '#/accounts/import-private-key'); await page.locator('textarea[name="privateKey"]').fill(sender.getSecretKey()); await page.locator('textarea[name="privateKey"]').blur(); await page.locator('button[type="submit"]').click();
      await page.locator('input[name="password.input"]').fill(password); await page.locator('input[name="password.confirmation"]').fill(password); await page.locator('button#acceptedTos').click(); await page.locator('button[type="submit"]').click(); await page.waitForURL(/#\/tokens/);
      const command = (method, args) => page.evaluate(({ method, args }) => new Promise((resolve, reject) => { const port = chrome.runtime.connect({ name: 'rtd_ui<->background' }), id = crypto.randomUUID(), timer = setTimeout(() => { port.disconnect(); reject(Error('Account control timeout')); }, 20000); port.onMessage.addListener(m => { if (m?.kind === 'rtd-ui-source-challenge') { port.postMessage({ kind: 'rtd-ui-source-confirm', nonce: m.nonce }); return; } if (m.id === id) { clearTimeout(timer); port.disconnect(); resolve(m.payload); } }); port.postMessage({ id, payload: method === '@setNetwork' ? { type: 'set-network', network: args } : { type: 'method-payload', method, args } }); }), { method, args });
      const getAccounts = async () => { const r = await command('getStoredEntities', { type: 'accounts' }); assert.equal(r.method, 'storedEntitiesResponse'); return r.args.entities; };
      const accounts = await getAccounts(); assert.equal(accounts.length, 1); assert.equal(accounts[0].address, addresses.source);
      check('new profile normal UI imports only independent C93 test sender', true); assert.equal((await command('@setNetwork', { env: 'local', customRpcUrl: null })).type, 'done');
      const journal = async () => { const present = await page.evaluate(async () => (await indexedDB.databases()).some(x => x.name === 'RtdWallet TransactionJournal')); return { present, rows: present ? await require('./lib/lifecycle-journal-snapshot.cjs')(page) : { 'journal-v2': [], 'pending-scopes-v2': [], 'metadata-v2': [] } }; };
      const journalBefore = await journal(); write('journal-before', journalBefore);
      server = http.createServer((request, response) => { const name = new URL(request.url, 'http://localhost').pathname, f = path.resolve(intent.demo, '.' + (name === '/' ? '/index.html' : name)); if (!f.startsWith(intent.demo + path.sep) || !fs.existsSync(f) || !fs.statSync(f).isFile()) { response.writeHead(404).end(); return; } response.setHeader('Content-Type', f.endsWith('.js') ? 'text/javascript' : f.endsWith('.css') ? 'text/css' : 'text/html'); fs.createReadStream(f).pipe(response); });
      await new Promise(resolve => server.listen(0, '127.0.0.1', resolve)); const demoOrigin = 'http://127.0.0.1:' + server.address().port; allowed.add(demoOrigin);
      const demo = await context.newPage(); demo.setDefaultTimeout(20000); await demo.goto(demoOrigin); await expect(demo.getByRole('button', { name: 'Connect', exact: true })).toBeEnabled({ timeout: 15000 });
      phase = 'actual same-chain Wallet Standard connection approval'; const opened = context.waitForEvent('page', { timeout: 20000 }); opened.catch(() => {}); await demo.getByRole('button', { name: 'Connect', exact: true }).click(); const popup = await opened;
      await popup.getByRole('button', { name: /^(继续|Continue)$/ }).click(); await popup.getByRole('button', { name: /^(连接|Connect)$/ }).click(); await demo.getByTestId('accounts-list').getByText(addresses.source, { exact: true }).waitFor();
      phase = 'actual sponsored NFT sender preview and full-byte signature';
      const result = await require('./lib/test-reviewed-authorization-matrix.cjs')({ context, demo, key: sender, extensionPage: page, variants: [variant], setStage: v => { phase = v; } });
      assert(result.passed && result.records.length === 1 && result.transactionSignatures === 1); browserSignatures = 1; write('wallet-standard-authorization', result);
      check('real sponsor Epoch UI approval returns same complete NFT bytes and sender signature', result.records[0].verified && result.records[0].previewDigestMatches && result.records[0].uiSponsorAndValidityAccepted);
      const journalAfter = await journal(); write('journal-after', journalAfter); assert.deepEqual(journalAfter, journalBefore); check('single-sign wallet Execute is disabled and rejected with all three journal stores held', result.singleSignExecuteDenied.approvalDisabled && result.singleSignExecuteDenied.journalUnchanged);
      const accountBefore = hash(JSON.stringify((await getAccounts()).map(x => ({ id: x.id, address: x.address, type: x.type, encrypted: x.encrypted }))));
      for (const a of await getAccounts()) assert.equal((await command('lockAccountSourceOrAccount', { id: a.id })).type, 'done'); assert((await getAccounts()).every(a => a.isLocked));
      const accountAfter = hash(JSON.stringify((await getAccounts()).map(x => ({ id: x.id, address: x.address, type: x.type, encrypted: x.encrypted })))); assert.equal(accountAfter, accountBefore);
      await demo.close(); const deadline = Date.now() + 120000; let admitted;
      do { admitted = await admission(page); if (admitted.pending === 0) break; assert(Date.now() < deadline); await new Promise(r => setTimeout(r, 100)); } while (true);
      write('normal-exit', { allAccountsLocked: true, encryptedAccountSha256: accountBefore, admission: admitted, originalProfilesOpened: 0 }); assert.equal(admitted.faults.length, 0);
      check('normal relock and original encrypted account unchanged before natural profile close', true);
      await page.close(); await context.close(); context = undefined; server.closeAllConnections(); await new Promise(resolve => server.close(resolve)); server = undefined;
    } else if (stage === 'execute') {
      assert(read(path.join(op, 'approve/evidence.json')).passed);
      const input = read(path.join(op, 'approve/authorization-input.json')), signed = read(path.join(op, 'approve/wallet-standard-authorization.json')).records[0];
      const bytes = Buffer.from(signed.bytesBase64, 'base64'); assert.equal(signed.bytesBase64, input.bytesBase64); assert.equal(await Transaction.from(bytes).getDigest(), signed.digest);
      assert.equal((await verifyTransactionSignature(bytes, signed.signature)).toRtdAddress(), addresses.source);
      const data = bcs.TransactionData.parse(bytes); assert.equal(bcs.TransactionData.serialize(data).toBase64(), signed.bytesBase64); assert.equal(data.V1.sender, addresses.source); assert.equal(data.V1.gasData.owner, addresses.sponsor);
      assert.deepEqual((await objects([input.nft.objectId]))[0], input.nft);
      const gasBefore = (await objects(data.V1.gasData.payment.map(x => x.objectId))); for (const [i, gas] of gasBefore.entries()) { assert.equal(gas.owner.AddressOwner, addresses.sponsor); assert.deepEqual(ref(gas), data.V1.gasData.payment[i]); } write('gas-before', gasBefore);
      phase = 'same approved sponsor NFT enabled simulation'; const sim = await sdk.core.simulateTransaction({ transaction: bytes, include: { bcs: true, effects: true, objectTypes: true } }); write('simulation', sim); assert(sim.$kind === 'Transaction' && sim.Transaction.status.success);
      const effects = bcs.TransactionEffects.parse(sim.Transaction.effects.bcs); assert.equal(effects.V2.transactionDigest, signed.digest); assert(!effects.V2.changedObjects.some(([id]) => ids.includes(id)));
      held(); const sponsorSigned = await sponsor.signTransaction(bytes); signatures++; assert.equal(sponsorSigned.bytes, signed.bytesBase64); assert.equal((await verifyTransactionSignature(bytes, sponsorSigned.signature)).toRtdAddress(), addresses.sponsor);
      const oldSignatures = [signed.signature, sponsorSigned.signature], mutations = [];
      for (const kind of ['gas', 'expiration']) { const changed = Transaction.from(bytes); if (kind === 'gas') changed.setGasBudget(BigInt(signed.gasData.budget) + 1000n); else changed.setExpiration({ None: true }); const mutated = await changed.build(); for (const sig of oldSignatures) { let rejected = false; try { await verifyTransactionSignature(mutated, sig); } catch { rejected = true; } assert(rejected); } mutations.push({ kind, changedBytesBase64: Buffer.from(mutated).toString('base64'), bothOriginalSignaturesRejected: true }); }
      write('old-signature-mutations', mutations); check('wallet sender and independent sponsor sign exact same full bytes and reject changed gas or expiration', true);
      write('pending', { digest: signed.digest, h0: intent.h0, bytesBase64: signed.bytesBase64, signatures: oldSignatures, onceOnly: true, senderSignatureFromWalletStandard: true, externalSponsor: true });
      phase = 'one external dual-sign sponsored NFT Execute'; write('receipt', await sdk.core.executeTransaction({ transaction: bytes, signatures: oldSignatures, include: { bcs: true, effects: true, objectTypes: true } })); await recover('execute');
      const nftAfter = (await objects([input.nft.objectId]))[0]; assert.equal(nftAfter.owner.AddressOwner, addresses.newTarget); write('nft-after', nftAfter); check('external original digest confirms dedicated NFT new owner', true);
      const after = await balances(), balanceBefore = read(path.join(dir, 'balances-before.json')); assert.equal(after.source.balance, balanceBefore.source.balance); assert(BigInt(after.sponsor.balance) < BigInt(balanceBefore.sponsor.balance)); write('sponsored-balance-proof', { before: balanceBefore, after, sourceUnchanged: true, sponsorSpent: (BigInt(balanceBefore.sponsor.balance) - BigInt(after.sponsor.balance)).toString() });
      check('sender RTD balance unchanged and independent sponsor pays actual chain gas', true);
    } else {
      await recover('execute'); const input = read(path.join(op, 'approve/authorization-input.json')); const nftAfter = (await objects([input.nft.objectId]))[0]; assert.equal(nftAfter.owner.AddressOwner, addresses.newTarget); write('nft-after', nftAfter);
    }
    phase = '27 protected objects after'; const after = await objects(ids); write('protected-after', after); assert.deepEqual(after, before); check('all 27 C93 stock and original13 policy full native objects unchanged', true);
    held(); write('service-info-after', await identity()); write('balances-after', await balances()); await Promise.all(jobs); assert.equal(captureErrors.length, 0);
    write('node-frames', frames); write('browser-frames', browserFrames);
    const result = { passed: true, observedAt: new Date().toISOString(), stage, operation: op, source: intent.source, checks, executeRequests, localSignatures: signatures, actualWalletStandardSignatures: browserSignatures, nodeFrames: frames.length, browserFrames: browserFrames.length, captureErrors,
      all27ProtectedObjectsHeld: true, originalC93InventoryTransferred: false, originalSixReexecuted: false, faucetRequests: 0, newContainers: 0, serviceSignals: 0, originalProfilesOpened: 0, ordinaryChromeAccepted: false, fullNFTAuthorizationAccepted: false, indexedAccepted: false, parentAcceptance: false, inputsSha256: pinned };
    write('evidence', result); record(output, result); console.log(JSON.stringify({ passed: true, stage, executeRequests, actualWalletStandardSignatures: browserSignatures, checks: checks.length }));
  } catch (e) {
    await Promise.all(jobs); write('node-frames-failed', frames); write('browser-frames-failed', browserFrames);
    let message = String(e.message); for (const secret of [keys.source, keys.sponsor, password].filter(Boolean)) message = message.replaceAll(secret, '[redacted]');
    const failure = { passed: false, observedAt: new Date().toISOString(), stage, operation: op, phase, errorType: e.name, message: message.slice(0, 1200), executeRequests, localSignatures: signatures, actualWalletStandardSignatures: browserSignatures, checks, captureErrors, inputsSha256: pinned, automaticRetry: false, parentAcceptance: false };
    write('failure', failure); record(output, failure); console.error(JSON.stringify({ passed: false, stage, phase, errorType: e.name, executeRequests })); process.exitCode = 1;
  } finally {
    globalThis.fetch = beforeFetch;
    if (context) await context.close();
    if (server) { server.closeAllConnections(); await new Promise(resolve => server.close(resolve)); }
  }
})().catch(e => { console.error(JSON.stringify({ passed: false, errorType: e.name, preflight: true })); process.exitCode = 1; });
