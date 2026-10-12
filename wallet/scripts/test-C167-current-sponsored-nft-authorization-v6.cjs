// Current six unsigned internal NFT scenarios, original production revalidation and native wires.
process.env.PW_EXPERIMENTAL_SERVICE_WORKER_NETWORK_EVENTS = '1';
const fs = require('node:fs'), path = require('node:path'), os = require('node:os'), crypto = require('node:crypto');
const assert = require('node:assert/strict'), {chromium, expect} = require('@playwright/test');
const {Transaction} = require('rtd-typescript/transactions'), {Ed25519Keypair} = require('rtd-typescript/keypairs/ed25519');
const {GrpcTypes} = require('rtd-typescript/grpc');
const environment = require('./lib/C161-current-nft-environment.cjs');
const gate = require('./lib/C161-current-nft-inventory-contract.cjs');
const mutations = require('./lib/C114-nft-parameter-variants.cjs');
const wallet = path.resolve(__dirname, '..'), logs = path.join(wallet, 'migrationToGRpcOrGraphQLDoc/workLog');
const read = f => JSON.parse(fs.readFileSync(f, 'utf8'));
const sha = f => crypto.createHash('sha256').update(fs.readFileSync(f)).digest('hex');
const pins = q => {for (const [f, h] of Object.entries(q.inputsSha256)) assert.equal(sha(f), h)};
function record(file, value) {const fd = fs.openSync(file, 'wx', 0o600); try {fs.writeFileSync(fd, JSON.stringify(value, (_, v) => typeof v === 'bigint' ? v.toString() : v, 2) + '\n'); fs.fsyncSync(fd)} finally {fs.closeSync(fd)}}
function forms(oracle) {
  const nft = serial => {const rows = oracle.nfts.filter(n => n.value.serial === serial); assert.equal(rows.length, 1); return rows[0].objectId};
  const ob = serial => {const rows = oracle.obNfts.filter(n => n.value.serial === serial); assert.equal(rows.length, 1); return rows[0].objectId};
  return [['direct', 'direct', nft('6'), 'existingTarget'], ['framework-ordinary', 'framework-kiosk', nft('1'), 'existingTarget'],
    ['framework-listed', 'framework-kiosk', nft('2'), 'existingTarget'], ['personal', 'personal-kiosk', nft('5'), 'existingTarget'],
    ['originbyte-existing-target', 'originbyte-kiosk', ob('1'), 'existingTarget'], ['originbyte-new-target', 'originbyte-kiosk', ob('2'), 'newTarget']]
    .map(([name, route, objectId, role]) => ({name, route, objectId, to:oracle.addresses[role], otherTo:oracle.addresses[role === 'newTarget' ? 'existingTarget' : 'newTarget']}));
}
async function main() {
  const [inventoryFile, inventoryAuditFile, readinessFile, output, owned] = process.argv.slice(2);
  const root = path.join(os.homedir(), '.local/state/rtd-wallet-migration/dev-20261006-03');
  assert(output && owned && !fs.existsSync(output) && !fs.existsSync(owned));
  assert.equal(path.dirname(path.resolve(owned)), root); assert(path.basename(owned).startsWith('current-C167-sponsored-nft-authorization-'));
  const inventory = read(inventoryFile), independent = read(inventoryAuditFile), readiness = read(readinessFile);
  for (const q of [inventory, independent, readiness]) {assert(q.passed); pins(q)}
  const files = [__filename, path.resolve(inventoryFile), path.resolve(inventoryAuditFile), path.resolve(readinessFile),
    require.resolve('./lib/C161-current-nft-inventory-contract.cjs'), require.resolve('./lib/C114-nft-parameter-variants.cjs'),
    require.resolve('./lib/C114-current-ui-nft-parameter-fault.cjs'), ...environment.pins,path.join(os.homedir(),'.local/state/rtd-wallet-migration/dev-20261006-03/sponsored-nft-C95-20261008-01/approve/wallet-standard-authorization.json')];
  assert.equal(independent.inputsSha256[path.resolve(inventoryFile)], sha(inventoryFile));
  if (!inventory.indexedFixtureAccepted) {
    assert.equal(inventory.mode, 'uncovered-preflight-denied'); assert.equal(inventory.sessionsCreated, 0);
    assert.throws(() => gate.admission(readiness), /Complete current NFT inventory coverage is incomplete/);
    record(output, {passed:true, observedAt:new Date().toISOString(), mode:'uncovered-internal-nft-preflight-denied',
      inventoryFile:path.resolve(inventoryFile), inventoryAuditFile:path.resolve(inventoryAuditFile), readinessFile:path.resolve(readinessFile), owned:path.resolve(owned),
      profilesOpened:0, requests:0, privateKeyFilesRead:0, signatures:0, executeRequests:0, newContainers:0,
      actualCurrentInternalNftFormsAccepted:false, fullNFTAuthorizationAccepted:false, parentCompletion:false,
      inputsSha256:Object.fromEntries(files.map(f => [f, sha(f)]))});
    console.log(JSON.stringify({passed:true, mode:'uncovered-internal-nft-preflight-denied', profilesOpened:0})); return;
  }
  const positiveAdmissionAt = new Date().toISOString();gate.admission(readiness,Date.parse(positiveAdmissionAt));
  assert(independent.allFourteenCanonicalObjectsAccepted && inventory.originalThirteenPlusSerial95Accepted);
  assert.equal(inventory.mode, 'covered-current-inventory'); assert.equal(inventory.targetCheckpoint, 696489);
  assert(Date.now() - Date.parse(inventory.observedAt) >= 0 && Date.now() - Date.parse(inventory.observedAt) < 300000);
  assert.equal(inventory.buildFile, environment.buildFile); assert.equal(inventory.profileFile, environment.profileFile);
  const build = environment.validateBuild(inventory.buildFile, inventory.profileFile);
  const fixture = inventory.fixture, intentFile = path.join(fixture, 'intent.json'), intent = read(intentFile);
  environment.held(intentFile);
  const oracleFile = path.join(logs, '20261008-C93-recovered-native-independent-01.json'), oracle = read(oracleFile); pins(oracle);
  const allForms = forms(oracle).filter(r=>['direct','framework-ordinary','personal','originbyte-existing-target'].includes(r.name)); assert.equal(allForms.length, 4);
  const keyFile = path.join(fixture, 'keys.json'), keys = read(keyFile), key = Ed25519Keypair.fromSecretKey(keys.source);
  const sponsor=Ed25519Keypair.fromSecretKey(keys.sponsor);const owner = key.toRtdAddress(); assert.equal(owner, oracle.addresses.source);
  const password = crypto.randomBytes(32).toString('base64url'), profile = path.join(owned, 'profile');
  fs.mkdirSync(owned, {mode:0o700}); record(path.join(owned, 'recovery-private.json'), {password});
  const frames = [], captureErrors = [], jobs = [], cases = [], recipients = [], surfaces = [], pageErrors = [], forbidden = [],denials=[];const demoFile=path.join(logs,'20261010-C167-sponsored-demo-build-02.json');files.push(demoFile,require.resolve('./lib/C167-real-sponsored-nft-ui-v6.cjs'));files.push(path.join(logs,'20261010-C167-current-sponsored-nft-authorization-01.json'));const priorOwned=path.join(root,'current-C167-sponsored-nft-authorization-20261010-01');const priorOnce=fs.readdirSync(priorOwned).filter(n=>n.startsWith('once-approve-'));assert.equal(priorOnce.length,3);files.push(...priorOnce.map(n=>path.join(priorOwned,n)));files.push(path.join(logs,'20261010-C167-current-sponsored-nft-authorization-02.json'));const priorOwned2=path.join(root,'current-C167-sponsored-nft-authorization-20261010-02'),priorOnce2=fs.readdirSync(priorOwned2).filter(n=>n.startsWith('once-approve-'));assert.equal(priorOnce2.length,4);files.push(...priorOnce2.map(n=>path.join(priorOwned2,n)));
  let context, page, worker, base, hook, session, privateStage = false, phase = 'native before', executeRequests = 0, proof = {};
  const initialFetch = globalThis.fetch;let completeEvidence,signerObserver,signerCleanup;const signerSnapshots=[],cleanupFailures=[];const drain=async()=>{await completeEvidence?.drain();await Promise.all(jobs.slice());};files.push(require.resolve('./lib/C167-nft-browser-evidence.cjs'),require.resolve('./lib/C151-validation-body-capture.cjs'),require.resolve('./lib/C143-private-signer-entry-observation.cjs'),require.resolve('./lib/current-extension-worker-source-bytes.cjs'),require.resolve('./lib/current-extension-ui-source-bytes.cjs'));
  const typedObjects = values => values.map(o => ({objectId:o.objectId, version:o.version, digest:o.digest, owner:o.owner, type:o.type,
    contentBase64:Buffer.from(o.content).toString('base64'), objectBcsBase64:Buffer.from(o.objectBcs).toString('base64')}));
  try {
    globalThis.fetch = async (input, init) => {
      const url = new URL(input instanceof Request ? input.url : String(input));
      assert.equal(url.origin, 'http://127.0.0.1:41750'); assert(/\/(GetServiceInfo|GetObject|ListOwnedObjects)$/.test(url.pathname));
      const row = {channel:'native', phase, url:url.href, requestBase64:Buffer.from(init?.body ?? []).toString('base64')}; frames.push(row);
      const r = await initialFetch(input, init); Object.assign(row, {status:r.status, headers:Object.fromEntries(r.headers), responseBase64:Buffer.from(await r.clone().arrayBuffer()).toString('base64')}); return r;
    };
    const loader = require('tsx/cjs/api'), load = n => loader.require(path.join(wallet, 'src/shared/rpc', n + '.ts'), __filename);
    const {WalletReadSession} = load('session'), {validateNetworkProfile} = load('profile'), {WalletFullnodeReader} = load('fullnode-reader');
    session = new WalletReadSession(validateNetworkProfile(read(environment.profileFile)));
    const native = new WalletFullnodeReader(session), ids = inventory.freshNativeObjects.map(o => o.objectId);
    assert.equal(ids.length, 14); assert.equal(new Set(ids).size, 14);
    const before = []; for (const id of ids) {const o = await native.object(id); assert(o?.objectBcs); before.push(o)}
    proof.nativeBefore = typedObjects(before);
    for (const row of proof.nativeBefore) {const old = inventory.freshNativeObjects.find(o => o.objectId === row.objectId); for (const field of ['version','digest','type','contentBase64','objectBcsBase64']) assert.equal(row[field], old[field]); assert.deepEqual(row.owner, old.owner)}
    phase = 'fresh sponsor coins'; const sponsorCoins = await native.coins(oracle.addresses.sponsor, '0x2::rtd::RTD'); assert(sponsorCoins.length);
    const sponsorObject = await native.object(sponsorCoins[0].objectId); assert(sponsorObject && sponsorObject.owner.AddressOwner === oracle.addresses.sponsor);
    proof.sponsorCoin = {objectId:sponsorObject.objectId, version:sponsorObject.version, digest:sponsorObject.digest};
    proof.sponsorObjectBefore = typedObjects([sponsorObject])[0];
    globalThis.fetch = initialFetch;
    context = await chromium.launchPersistentContext(profile, {executablePath:path.join(os.homedir(), 'Library/Caches/ms-playwright/chromium-1243/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing'),
      headless:true, viewport:{width:800,height:700}, args:[`--disable-extensions-except=${build.output}`, `--load-extension=${build.output}`]});
    context.on('request',req=>{if(req.url().endsWith('/ExecuteTransaction'))executeRequests++;});
    completeEvidence=await require('./lib/C167-nft-browser-evidence.cjs').create(context,{output,phase:()=>phase,frames,captureErrors,forbidden,jobs});
    const initial = context.serviceWorkers()[0] || await context.waitForEvent('serviceworker');
    const loaded = await require('./lib/current-extension-worker-source-bytes.cjs').ensure(context, initial, build.output); worker = loaded.worker;signerObserver=await require('./lib/C143-private-signer-entry-observation.cjs').observe(context,worker,build.output);signerSnapshots.push(signerObserver.evidence.initial);
    proof.workerSource = loaded.evidence.after ?? loaded.evidence.before; assert(proof.workerSource.matchesDisk);
    assert.equal('chrome-extension://' + new URL(worker.url()).host, environment.actualOrigin);
    base = new URL('ui.html', worker.url()).href;
    await expect.poll(() => context.pages().filter(p => p.url().startsWith(base)).length, {timeout:30000}).toBe(1);
    page = context.pages().find(p => p.url().startsWith(base)); page.setDefaultTimeout(30000);
    page.on('pageerror', e => pageErrors.push({phase,errorType:e.name,message:privateStage ? 'Private error withheld' : String(e.message).slice(0,160)}));
    await drain();await page.waitForLoadState('networkidle',{timeout:30000});await drain();proof.uiSource = await require('./lib/current-extension-ui-source-bytes.cjs').inspect(context, page, build.output,
      Object.keys(build.artifacts).filter(f => f.endsWith('.js') && !['background.js','content-script.js','dapp-interface.js','egress-gate.js'].includes(f)),
      {url:base,navigate:async () => {await page.goto(base); await page.locator('a[href*="add-account"]').first().waitFor()}});
    const command = (method, args) => page.evaluate(({method,args}) => new Promise((resolve,reject) => {
      const port = chrome.runtime.connect({name:'rtd_ui<->background'}), id = crypto.randomUUID(), timer = setTimeout(() => {port.disconnect();reject(Error('UI command timeout'))},20000);
      port.onMessage.addListener(m => {if (m?.kind === 'rtd-ui-source-challenge') {port.postMessage({kind:'rtd-ui-source-confirm',nonce:m.nonce});return} if (m.id === id) {clearTimeout(timer);port.disconnect();resolve(m.payload)}});
      port.postMessage({id,payload:method === '@setNetwork' ? {type:'set-network',network:args} : {type:'method-payload',method,args}});
    }), {method,args});
    const journal = () => require('./lib/lifecycle-journal-snapshot.cjs')(page);
    const cipher = () => page.evaluate(async () => {
      const db = await new Promise((resolve,reject) => {const r = indexedDB.open('RtdWallet DB');r.onupgradeneeded = () => {r.transaction.abort();reject(Error('Existing account required'))};r.onsuccess = () => resolve(r.result);r.onerror = () => reject(Error('Readonly account unavailable'))});
      try {const rows = await new Promise((resolve,reject) => {const t = db.transaction('accounts','readonly'),r = t.objectStore('accounts').getAll();r.onsuccess = () => resolve(r.result.map(({id,address,publicKey,encrypted,type}) => ({id,address,publicKey,encrypted,type})));t.onerror = t.onabort = () => reject(Error('Readonly account failed'))});
        if (rows.length !== 1 || rows[0].type !== 'imported' || !rows[0].encrypted) throw Error('Exactly one protected account required');
        return Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(JSON.stringify(rows))))).map(n => n.toString(16).padStart(2,'0')).join('');
      } finally {db.close()}
    });
    const state = () => page.evaluate(() => {
      const seen = new Set(), stack = [], approvals = [], contexts = [];
      for (const n of document.querySelectorAll('*')) {const k = Object.keys(n).find(k => k.startsWith('__reactFiber$'));if (k) {let f = n[k];while (f.return) f = f.return;if (!f.stateNode?.current) throw Error('Committed React root required');stack.push(f.stateNode.current)}}
      while (stack.length) {const f = stack.pop();if (!f || seen.has(f)) continue;seen.add(f);
        for (let h = f.memoizedState;h;h = h.next) {const v = h.memoizedState;if (v?.prepared?.bytesBase64 && v.requestId) approvals.push(JSON.parse(JSON.stringify(v)))}
        for (let d = f.dependencies?.firstContext;d;d = d.next) {const v = d.memoizedValue;if (v?.readSessionKey && v.assetSnapshotKey) contexts.push({bindingKey:v.bindingKey,readSessionKey:v.readSessionKey,assetSnapshotKey:v.assetSnapshotKey,state:v.state})}
        stack.push(f.child,f.sibling);
      } return {approvals:Array.from(new Map(approvals.map(a => [a.requestId,a])).values()),contexts};
    });
    phase = 'private account import'; privateStage = true;
    await page.goto(base + '#/accounts/import-private-key'); await page.locator('[name="privateKey"]').fill(key.getSecretKey()); await page.locator('[name="privateKey"]').blur(); await page.locator('button[type="submit"]').click(); await page.waitForURL(/protect-account/);
    await page.locator('[name="password.input"]').fill(password); await page.locator('[name="password.confirmation"]').fill(password); await page.locator('#acceptedTos').click(); await page.locator('button[type="submit"]').click(); await page.waitForURL(/#\/tokens/); privateStage = false;
    const accounts = (await command('getStoredEntities',{type:'accounts'})).args.entities; assert.equal(accounts.length,1); assert.equal(accounts[0].address,owner); assert(!accounts[0].isLocked);
    assert.equal((await command('@setNetwork',{env:'local',customRpcUrl:null})).type,'done');
    proof.initialJournal = await journal(); assert(Object.values(proof.initialJournal).every(r => r.length === 0)); proof.cipherBefore = await cipher();
    const simulations = () => frames.filter(f => f.url.endsWith('/SimulateTransaction'));
    async function preview(item, to) {
      await page.goto(base + '#/tokens');await expect(page.getByTestId('lock-account-button')).toBeVisible();await drain();await page.goto(base + '#/nft-transfer/' + item.objectId); assert.equal(context.pages().filter(p => p.url().startsWith(base)).length,1); surfaces.push({phase,url:page.url(),extensionUiPages:1});
      await expect(page.locator('[name="to"]')).toBeVisible({timeout:150000}); await page.locator('[name="to"]').fill(to); await page.locator('[name="to"]').blur();
      const review = page.locator('form button[type="submit"]'); await expect(review).toBeEnabled({timeout:150000}); await drain(); const start = simulations().length;
      await review.click(); const send = page.getByRole('button',{name:/^(Send NFT Now|立即发送 NFT)$/}); await expect(send).toBeEnabled({timeout:150000}); await drain();
      const actual = await state(); assert.equal(actual.approvals.length,1); assert(actual.contexts.length); const approval = actual.approvals[0], prepared = approval.prepared;
      assert.equal(prepared.route,item.route); assert.equal(prepared.sender,owner); assert.equal(prepared.input.objectId,item.objectId); assert.equal(prepared.input.to,to);
      assert.equal(await Transaction.from(prepared.bytesBase64).getDigest(),prepared.digest);
      assert.equal(simulations().length - start,2); assert.deepEqual(await journal(),proof.initialJournal);
      for (const c of actual.contexts) {const s = JSON.parse(c.assetSnapshotKey); assert.equal(s[0],c.readSessionKey); assert(BigInt(s[2]) >= 696489n)}
      return {approval,state:actual,simulations:simulations().slice(start),text:(await page.locator('body').innerText()).slice(0,7000),send};
    }
    const approvals=[];for(const item of allForms){phase=item.name+'/current production NFT preparation';const current=await preview(item,item.to);approvals.push({name:item.name,prepared:current.approval.prepared,approval:current.approval,state:current.state,simulations:current.simulations});await page.getByRole('button',{name:/^(Back|返回)$/}).click();assert.equal((await state()).approvals.length,0);signerSnapshots.push(await signerObserver.snapshot(phase));}
    const result=await require('./lib/C167-real-sponsored-nft-ui-v6.cjs').run({context,extensionPage:page,owner,sponsor,sponsorCoin:proof.sponsorCoin,forms:allForms,approvals,demoFile,dataDirectory:path.join(owned,'authorization-data'),ensureUnlocked:async()=>{await page.bringToFront();if(page.url()!==base+'#/tokens'){await drain();await page.goto(base+'#/tokens');await page.waitForLoadState('networkidle',{timeout:60000});await drain();}await expect(page.getByTestId('lock-account-button').or(page.getByTestId('unlock-account-button'))).toBeVisible({timeout:60000});if(await page.getByTestId('unlock-account-button').isVisible()){privateStage=true;await page.getByTestId('unlock-account-button').click();const dialog=page.getByRole('dialog');await dialog.locator('[name="password"]').fill(password);await dialog.locator('[name="password"]').blur();await dialog.locator('button[type="submit"]').click();await expect(page.getByTestId('lock-account-button')).toBeVisible({timeout:60000});privateStage=false;proof.actualNormalUnlocks=(proof.actualNormalUnlocks??0)+1;}},setStage:v=>{phase=v},onOrigin:(o,artifacts)=>completeEvidence.addStatic(o,artifacts),onCase:async row=>{if(row.failureOnly){proof.sponsoredFailureUi={...row,windows:row.windows.map(w=>({...w,body:w.body.replaceAll(password,'[redacted]').replaceAll(key.getSecretKey(),'[redacted]').replaceAll(sponsor.getSecretKey(),'[redacted]')}))};}else if(row.cleanupOnly)proof.sponsoredOwnedCleanup=row;else{if(row.approvedClicked)cases.push(row);else denials.push(row);signerSnapshots.push(await signerObserver.snapshot(phase));console.log(JSON.stringify({phase,signatures:cases.length,denials:denials.length}));}},onBeforeApprove:async row=>{const old=read(path.join(inventory.fixture,'..','sponsored-nft-C95-20261008-01','approve','wallet-standard-authorization.json'));assert(old.records.every(r=>r.digest!==row.variant.digest));const failed=read(path.join(logs,'20261010-C167-current-sponsored-nft-authorization-01.json'));assert(!failed.passed&&failed.cases.length===3);assert(failed.cases.every(r=>r.variant.digest!==row.variant.digest));const failed2=read(path.join(logs,'20261010-C167-current-sponsored-nft-authorization-02.json'));assert(!failed2.passed&&failed2.cases.length===4);assert(failed2.cases.every(r=>r.variant.digest!==row.variant.digest));record(path.join(owned,'once-approve-'+row.variant.digest+'.json'),{digest:row.variant.digest,bytesSha256:require('node:crypto').createHash('sha256').update(Buffer.from(row.variant.bytesBase64,'base64')).digest('hex'),requestId:row.requestId,onceOnly:true,automaticRetry:false,ExecuteForwarding:false});},journal,initialJournal:proof.initialJournal,frames,flush:drain,environment,build,retainUISource:v=>completeEvidence.retainUISource(v)});
    proof.productionPreparations=approvals;proof.sponsoredUiResult=result;for(const r of result.authorizationResources)files.push(r.file);files.push(require.resolve('./lib/C179-full-authorization-resources.cjs'));assert.equal(cases.length,16);assert.equal(denials.length,4);assert(proof.sponsoredOwnedCleanup.demoClosed&&proof.sponsoredOwnedCleanup.serverClosed);
    phase = 'normal relock and complete unchanged state'; await page.goto(base + '#/tokens'); await page.getByTestId('lock-account-button').click(); await expect(page.getByTestId('unlock-account-button')).toBeVisible();
    proof.finalJournal = await journal(); proof.cipherAfter = await cipher(); assert.deepEqual(proof.finalJournal,proof.initialJournal); assert.equal(proof.cipherAfter,proof.cipherBefore);
    globalThis.fetch = async (input,init) => {const u = new URL(input instanceof Request ? input.url : String(input));assert.equal(u.origin,'http://127.0.0.1:41750');assert(/\/(GetServiceInfo|GetObject)$/.test(u.pathname));const r = await initialFetch(input,init);frames.push({channel:'native',phase,url:u.href,status:r.status,headers:Object.fromEntries(r.headers),requestBase64:Buffer.from(init?.body ?? []).toString('base64'),responseBase64:Buffer.from(await r.clone().arrayBuffer()).toString('base64')});return r};
    const after = []; for (const id of ids) {const o = await native.object(id);assert(o?.objectBcs);after.push(o)} proof.nativeAfter = typedObjects(after); assert.deepEqual(proof.nativeAfter,proof.nativeBefore);
    const sponsorAfter = await native.object(proof.sponsorCoin.objectId); assert(sponsorAfter); proof.sponsorObjectAfter = typedObjects([sponsorAfter])[0]; assert.deepEqual(proof.sponsorObjectAfter,proof.sponsorObjectBefore);
    assert.deepEqual(forbidden,[]); assert.deepEqual(pageErrors,[]); assert.equal(executeRequests,0); environment.held(intentFile);
    proof = {...proof,passed:true,observedAt:new Date().toISOString(),positiveAdmissionAt,mode:'current-four-nft-real-sponsored-signature-matrix',source:build.sourceAfter,
      profile,owned,owner,h0:inventory.h0,forms:allForms,cases,denials,recipients,surfaces,frames,captureErrors,pageErrors,forbidden,
      currentFourNftRealSponsoredSignatureMatrixAccepted:true,explicitNormalWalletStandardApprovals:true,originalApprovalObjectsModified:false,sponsor:sponsor.toRtdAddress(),sponsorSignatures:16,actualSponsoredExecutionAccepted:false,
      inventoryFile:path.resolve(inventoryFile), inventoryAuditFile:path.resolve(inventoryAuditFile), readinessFile:path.resolve(readinessFile),
      ownExistingStartupUiReused:true,extraStartupPagesCreated:0,profilesOpened:1,executeRequests,signatures:16,
      realValidityUiVariantsAccepted:false,actualSponsoredExecutionAccepted:false,fullNFTAuthorizationAccepted:false,parentCompletion:false,
      inputsSha256:Object.fromEntries([...files,intentFile,oracleFile,keyFile,environment.profileFile,
        path.join(logs,'20261008-C114-current-preparation-delivery-01.json')].map(f => [f,sha(f)]))};
  } catch (error) {
    if(page&&!privateStage)try{proof.failureUi={url:page.url(),text:(await page.locator('body').innerText()).replaceAll(password,'[redacted]').replaceAll(key.getSecretKey(),'[redacted]').replaceAll(sponsor.getSecretKey(),'[redacted]').slice(0,9000)};}catch{};process.exitCode = 1; proof = {...proof,passed:false,observedAt:new Date().toISOString(),phase,errorType:error.name,
      message:privateStage ? 'Private diagnostic withheld' : String(error.message).replaceAll(password,'[redacted]').replaceAll(key.getSecretKey(),'[redacted]').replaceAll(sponsor.getSecretKey(),'[redacted]').slice(0,900),
      cases,recipients,frames,captureErrors,pageErrors,forbidden,executeRequests,fullNFTAuthorizationAccepted:false,parentCompletion:false};
  } finally {
    if (hook) await hook.close().catch(() => {}); globalThis.fetch = initialFetch; session?.close();
    if (page && !privateStage) {try {await page.goto(base + '#/tokens'); if (await page.getByTestId('lock-account-button').isVisible()) await page.getByTestId('lock-account-button').click()} catch {}}
    if(context)try{await drain();for(const p of context.pages())if(!p.isClosed())await p.goto('about:blank');await drain();if(signerObserver){signerSnapshots.push(await signerObserver.snapshot('all sponsored NFT cases and normal relock'));signerCleanup=await signerObserver.close();}await context.close();proof.ownedChromeNaturallyClosed=true;}catch(error){cleanupFailures.push({stage:'complete normal unsigned teardown',errorType:error.name});await context.close().catch(()=>{});}
    await Promise.all(jobs.slice());if(completeEvidence){Object.assign(proof,await completeEvidence.finish());proof.inputsSha256={...proof.inputsSha256,...proof.captureFilePins};}
    Object.assign(proof,{frames,captureErrors,signerObservation:signerObserver?.evidence,signerSnapshots,signerCleanup,cleanupFailures,captureScopeIncludesTeardown:cleanupFailures.length===0,normalOwnBrowserAndDemoClosed:cleanupFailures.length===0,directPrivateSignDataObserved:Boolean(signerCleanup),actualPrivateSignDataCalls:signerSnapshots.at(-1)?.counts});proof.passed=Boolean(proof.passed&&proof.allOriginalHttpResponseBodiesCaptured&&proof.directPrivateSignDataObserved&&cleanupFailures.length===0&&proof.actualPrivateSignDataCalls['accounts/ImportedAccount']===16&&proof.actualPrivateSignDataCalls['accounts/MnemonicAccount']===0&&proof.actualPrivateSignDataCalls['accounts/zklogin/ZkLoginAccount']===0);if(!proof.passed)process.exitCode=1;
    record(output,proof); console.log(JSON.stringify({passed:proof.passed,phase,cases:cases.length,recipientChanges:recipients.length,executeRequests,actualCurrentNftAccepted:proof.passed === true}));
  }
}
module.exports = {forms};
if (require.main === module) main().catch(e => {console.error(JSON.stringify({passed:false,phase:'preflight',errorType:e.name}));process.exitCode = 1});
