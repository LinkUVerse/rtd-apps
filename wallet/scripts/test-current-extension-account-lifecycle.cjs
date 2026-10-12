#!/usr/bin/env node
// Isolated extension UI/storage; optional public-key dApp message test or funded read-only assets.
const { chromium } = require('@playwright/test');
const { Ed25519Keypair } = require('rtd-typescript/keypairs/ed25519');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
(async () => {
  const fullnodeOnly = process.env.RTD_TEST_DAPP_FULLNODE_ONLY === '1';
  const publicExecutionRevision = process.env.RTD_TEST_C18_PUBLIC_EXECUTION === '1' ? 'C18' : 'C17';
  assert(!(process.env.RTD_TEST_C18_PUBLIC_EXECUTION === '1' && process.env.RTD_TEST_C17_PUBLIC_EXECUTION === '1'));
  const publicExecution = process.env.RTD_TEST_C17_PUBLIC_EXECUTION === '1' || process.env.RTD_TEST_C18_PUBLIC_EXECUTION === '1';
  let publicExecutionAdmission;
  if(publicExecution){
    assert.equal(process.env.RTD_TEST_LOCAL_PROFILE,'1');
    assert.equal(process.env.RTD_TEST_DAPP_EXECUTE,'1');
    assert.equal(fs.realpathSync(process.env.RTD_TEST_DAPP_DIR),path.join(os.homedir(),'.local/state/rtd-wallet-migration/dev-20261003-01/current-network-admission-demo-20261005-01'));
    for(const flag of ['RTD_TEST_DAPP_FULLNODE_ONLY','RTD_TEST_DAPP_POST_DISPATCH','RTD_TEST_DAPP_SIGN_TRANSACTION','RTD_TEST_DAPP_SIGN_RETURN_HOLD','RTD_TEST_DAPP_IDENTITY_FAULTS','RTD_TEST_NETWORK_OBSERVATIONS','RTD_TEST_DAPP_NETWORK_SWITCH','RTD_TEST_DAPP_ACCOUNT_SWITCH','RTD_TEST_DAPP_CANCEL','RTD_TEST_DAPP_ORIGIN_TABS','RTD_TEST_DAPP_LOCKED_APPROVAL','RTD_TEST_WAIT_ADMISSION_CLEAR','RTD_TEST_DEV_CERT','RTD_TEST_ARCHIVE_CERT','RTD_TEST_ACCOUNT_CERT','RTD_TEST_DEV_KEYSTORE','RTD_TEST_STAKING_EXECUTE','RTD_TEST_MIXED_EXECUTE','RTD_TEST_MIXED_NATIVE','RTD_TEST_CREATE_MNEMONIC','RTD_TEST_CUSTOM_NETWORK','RTD_TEST_COIN_PREVIEW','RTD_TEST_STAKING_PAGE','RTD_TEST_OWNED_ASSETS','RTD_TEST_FAILED_RECEIPT'])assert.equal(process.env[flag],undefined,'public execution scope must remain isolated');
    const auditFile=fs.realpathSync(process.env.RTD_TEST_ORIGINAL_JOURNAL_AUDIT);
    assert.equal(auditFile,path.resolve(__dirname,'../migrationToGRpcOrGraphQLDoc/workLog/'+(publicExecutionRevision==='C18'?'20261006-terminal-observation-c18-original-journals-01.json':'20261006-egress-producer-c17-original-journals-08.json')));
    const sha=crypto.createHash('sha256').update(fs.readFileSync(path.resolve(__dirname,'../dist/background.js'))).digest('hex');
    assert.equal(sha,publicExecutionRevision==='C18'?'c012b8514fd4eb063abe7a7f6f71532e83f00ac1241829568567e8b8cede5d24':'415b84f431fc2857daf2cf7e864cd3f307b77bea7661085a570984a844838fd9');
    require('./lib/fullnode-only-dapp-admission.cjs').auditOriginalJournals({audit:JSON.parse(fs.readFileSync(auditFile,'utf8')),backgroundSha256:sha,now:Date.now()});
    publicExecutionAdmission={revision:publicExecutionRevision,originalTerminalRecords:7,publicSeed:7,selfTransferSmallestUnits:'1',maxDispatches:1,normalCa:true,httpsAcceptance:false};
  }

  const identityFaults = process.env.RTD_TEST_DAPP_IDENTITY_FAULTS === '1';
  const observationFaults = process.env.RTD_TEST_NETWORK_OBSERVATIONS === '1';
  if(observationFaults){assert(fullnodeOnly);assert.equal(process.env.RTD_TEST_DAPP_SIGN_TRANSACTION,'1');assert(!identityFaults);assert.equal(process.env.RTD_TEST_DAPP_SIGN_RETURN_HOLD,undefined);}
  const signingHold = process.env.RTD_TEST_DAPP_SIGN_RETURN_HOLD === '1';
  const postDispatch = process.env.RTD_TEST_DAPP_POST_DISPATCH;
  const postDispatchHelper = postDispatch ? require('./lib/test-dapp-post-dispatch.cjs') : undefined;
  const postDispatchAdmission = postDispatch ? await postDispatchHelper.admit(postDispatch) : undefined;
  if(signingHold){assert(fullnodeOnly);assert.equal(process.env.RTD_TEST_DAPP_SIGN_TRANSACTION,'1');}

  if(identityFaults){assert(fullnodeOnly);assert.equal(process.env.RTD_TEST_DAPP_SIGN_TRANSACTION,'1');}
  const identityWire = [], identityResponses = [];

  let fullnodeAdmission;
  if(fullnodeOnly){
    const file=fs.realpathSync(process.env.RTD_TEST_ORIGINAL_JOURNAL_AUDIT);
    assert.equal(file,path.resolve(__dirname,'../migrationToGRpcOrGraphQLDoc/workLog/20261006-terminal-observation-c18-original-journals-01.json')); // Exact fresh C18 audit; all seven original records and current worker required.
    fullnodeAdmission=require('./lib/fullnode-only-dapp-admission.cjs')({env:process.env,audit:JSON.parse(fs.readFileSync(file,'utf8')),
      backgroundSha256:crypto.createHash('sha256').update(fs.readFileSync(path.resolve(__dirname,'../dist/background.js'))).digest('hex'),now:Date.now()});
  }
  const mixedNative=process.env.RTD_TEST_MIXED_NATIVE==='1';
  const mixedExecuting=process.env.RTD_TEST_MIXED_EXECUTE==='1';
  if(mixedExecuting)assert(mixedNative);
  const mixedHelper=mixedExecuting?require('./lib/test-mixed-native-execution.cjs'):undefined;
  const mixedAdmission=mixedExecuting?await mixedHelper.admit():undefined;
  if(mixedNative){
    assert.equal(process.env.RTD_TEST_LOCAL_PROFILE,'1');assert.equal(process.env.RTD_TEST_COIN_PREVIEW,'1');
    for(const flag of ['RTD_TEST_DAPP_EXECUTE','RTD_TEST_STAKING_EXECUTE','RTD_TEST_DAPP_DIR','RTD_TEST_DEV_KEYSTORE','RTD_TEST_CREATE_MNEMONIC','RTD_TEST_CUSTOM_NETWORK','RTD_TEST_STAKING_PAGE'])assert.equal(process.env[flag],undefined,'mixed fixture preview never executes');
  }
  const assetReadErrorUI = process.env.RTD_TEST_ASSET_READ_ERROR === '1';
  const querySwitchUI = process.env.RTD_TEST_QUERY_SWITCH === '1';
  const missingMetadataUI = process.env.RTD_TEST_TOKEN_METADATA_MISSING === '1';
  const ownedAssetsUI = process.env.RTD_TEST_OWNED_ASSETS === '1' || querySwitchUI || assetReadErrorUI || missingMetadataUI;
  if(ownedAssetsUI){assert.equal(process.env.RTD_TEST_LOCAL_PROFILE,'1');assert(process.env.RTD_TEST_DEV_KEYSTORE);for(const flag of ['RTD_TEST_DAPP_DIR','RTD_TEST_DAPP_EXECUTE','RTD_TEST_STAKING_EXECUTE','RTD_TEST_COIN_PREVIEW','RTD_TEST_STAKING_PAGE','RTD_TEST_CUSTOM_NETWORK','RTD_TEST_CREATE_MNEMONIC','RTD_TEST_FAILED_RECEIPT'])assert.equal(process.env[flag],undefined,'owned assets UI is read-only');}
  const failedReceipt = process.env.RTD_TEST_FAILED_RECEIPT === '1';
  if(failedReceipt){assert.equal(process.env.RTD_TEST_LOCAL_PROFILE,'1');assert(process.env.RTD_TEST_DEV_KEYSTORE);for(const flag of ['RTD_TEST_DAPP_DIR','RTD_TEST_DAPP_EXECUTE','RTD_TEST_STAKING_EXECUTE','RTD_TEST_COIN_PREVIEW','RTD_TEST_STAKING_PAGE','RTD_TEST_CUSTOM_NETWORK','RTD_TEST_CREATE_MNEMONIC'])assert.equal(process.env[flag],undefined,'failure receipt test is read-only');}
  const customNetwork = process.env.RTD_TEST_CUSTOM_NETWORK === '1';
  if(process.env.RTD_TEST_CUSTOM_HEADED==='1')assert(customNetwork && process.env.RTD_TEST_CUSTOM_MULTI_NETWORK==='1','headed mode restricted to readonly four-service scenario');
  if(customNetwork){for(const flag of ['RTD_TEST_DAPP_DIR','RTD_TEST_DAPP_EXECUTE','RTD_TEST_STAKING_EXECUTE','RTD_TEST_COIN_PREVIEW','RTD_TEST_STAKING_PAGE','RTD_TEST_LOCAL_PROFILE'])assert.equal(process.env[flag],undefined,'custom network scenario is read-only and independent');}
  const createMnemonic = process.env.RTD_TEST_CREATE_MNEMONIC === '1';
  if(createMnemonic){for(const flag of ['RTD_TEST_DAPP_DIR','RTD_TEST_DAPP_EXECUTE','RTD_TEST_STAKING_EXECUTE','RTD_TEST_DEV_KEYSTORE','RTD_TEST_COIN_PREVIEW','RTD_TEST_STAKING_PAGE'])assert.equal(process.env[flag],undefined,'new random-account lifecycle cannot reuse execution fixtures');}
  const dappExecuting = process.env.RTD_TEST_DAPP_EXECUTE === '1';
  const stakingExecuting = process.env.RTD_TEST_STAKING_EXECUTE === '1';
  assert(!(dappExecuting && stakingExecuting), 'one execution family per retained profile');
  const executing = dappExecuting || stakingExecuting || mixedExecuting;
  const evidenceDirectory = publicExecution ? path.join(os.homedir(),'.local/state/rtd-wallet-migration/dev-20261003-01',publicExecutionRevision==='C18'?'c18-public-execution-20261006-01':'c17-public-execution-20261006-01') : postDispatchAdmission?.root ?? (mixedExecuting ? mixedHelper.root : path.join(os.homedir(), '.local/state/rtd-wallet-migration/dev-20261003-01', stakingExecuting ? 'staking-execution-browser-01' : 'dapp-execution-browser-01'));
  if (executing) {
    assert.equal(process.env.RTD_TEST_LOCAL_PROFILE, '1');
    if (dappExecuting) assert(process.env.RTD_TEST_DAPP_DIR);
    if (stakingExecuting) {
      assert.equal(process.env.RTD_TEST_DAPP_DIR, undefined);
      assert.equal(process.env.RTD_TEST_STAKING_PAGE, '1');
      assert.equal(process.env.RTD_TEST_STAKING_PREVIEW, '1');
      const audit = JSON.parse(fs.readFileSync(path.join(path.dirname(evidenceDirectory), 'dapp-execution-browser-01/fault-abort-current-worker-01-readonly.json'), 'utf8'));
      assert(audit.passed && audit.recoveryOnly && audit.dispatches === 0);
      assert(Date.now() - Date.parse(audit.auditedAt) >= 0 && Date.now() - Date.parse(audit.auditedAt) < 600000, 'recent retained-journal audit required');
      assert.equal(audit.journalAudit?.length, 4);
      assert(audit.journalAudit.every(row => row.state === 'confirmed-success' && row.accountAddress === '0xa0ccc8bcc83f6c628340134f8546a21e0618fd1aaa02432bba454c4a2c2233da'));
    }
    assert.equal(process.env.RTD_TEST_DEV_KEYSTORE, undefined);
    fs.mkdirSync(evidenceDirectory, {mode:0o700}); // EEXIST forbids resetting an existing attempt.
    if(publicExecution)fs.writeFileSync(path.join(evidenceDirectory,'admission.json'),JSON.stringify(publicExecutionAdmission,null,2)+'\n',{flag:'wx',mode:0o600});
    if(postDispatch)postDispatchHelper.record(evidenceDirectory,'admission.json',postDispatchAdmission.admission);
    if(mixedExecuting)mixedHelper.record('admission.json',mixedAdmission);
  }
  const directory = executing ? path.join(evidenceDirectory,'chromium-profile') : fs.mkdtempSync(path.join(os.tmpdir(), 'wallet-account-lifecycle-'));
  const extension = path.resolve(__dirname, '../dist');
  const compiledProfileProof = process.env.RTD_TEST_LOCAL_PROFILE === '1'
    ? require('./lib/verify-extension-local-profile.cjs')({ extension,
      profileFile: path.join(os.homedir(), '.local/state/rtd-wallet-migration/dev-20261003-01/wallet-profile-20261004-03/profile.json') })
    : undefined;
  const executablePath = process.env.RTD_EXTENSION_CHROMIUM || path.join(os.homedir(), 'Library/Caches/ms-playwright/chromium-1243/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing');
  let key = Ed25519Keypair.fromSecretKey(new Uint8Array(32).fill(7));
  const fundedReadOnly = process.env.RTD_TEST_DEV_KEYSTORE !== undefined;
  if (fundedReadOnly) {
    assert.equal(process.env.RTD_TEST_LOCAL_PROFILE, '1');
    const file = fs.realpathSync(process.env.RTD_TEST_DEV_KEYSTORE);
    assert.equal(file, path.join(os.homedir(), '.local/state/rtd-wallet-migration/dev-20261003-01/config/rtd.keystore'));
    const candidates = JSON.parse(fs.readFileSync(file, 'utf8')).flatMap(value => {
      const bytes = Buffer.from(value, 'base64');
      return bytes.length === 33 && bytes[0] === 0 ? [Ed25519Keypair.fromSecretKey(bytes.subarray(1))] : [];
    });
    key = candidates.find(candidate => candidate.toRtdAddress() === '0xe7a76c2f40fdc7ca29b2495e06795bc86b5c73fafe1c2e025200e803fc1aaa9e');
    assert(key, 'designated dev account missing');
  }
  if(mixedNative){
    const fixtureRoot=path.join(os.homedir(),'.local/state/rtd-wallet-migration/dev-20261003-01/address-funding-fixture-01');
    const fixture=JSON.parse(fs.readFileSync(path.join(fixtureRoot,'fixture.json'),'utf8'));
    key=Ed25519Keypair.fromSecretKey(JSON.parse(fs.readFileSync(path.join(fixtureRoot,'keys.json'),'utf8')).target);
    assert.equal(key.toRtdAddress(),fixture.target);
    const proof=JSON.parse(fs.readFileSync(path.resolve('migrationToGRpcOrGraphQLDoc/workLog/20261004-mixed-native-preparation.json'),'utf8'));
    assert.equal(proof.owner,fixture.target);assert.equal(proof.dispatches,0);assert.equal(proof.balance.coinBalance,'1000000000');assert.equal(proof.balance.addressBalance,'1000000000');
  }
  let dispatchRequests = 0, simulationRequests = 0;
  const simulationWire = []; const currentReadTrace=[]; const currentStart=Date.now();
  const workerProvenance = [];
  // Observe real read-only browser traffic without persisting headers or payloads.
  const readDiagnostics = [];
  const readRequests = new WeakMap();
  const password = crypto.randomBytes(24).toString('base64url');
  if (executing) fs.writeFileSync(path.join(evidenceDirectory,'recovery-private.json'),JSON.stringify({password}),{flag:'wx',mode:0o600});
  const errors = [];
  let localAssets, dapp, stakingPage, coinPreview, customNetworkEvidence, failedReceiptEvidence, ownedAssetsEvidence, querySwitchEvidence, assetReadErrorEvidence, missingMetadataEvidence;
  if (process.env.RTD_TEST_DAPP_DIR) {
    assert.equal(fundedReadOnly, false, "dApp checks require public test key");
    assert.equal(process.env.RTD_TEST_LOCAL_PROFILE, "1");
  }
  const tlsArgs = [];
  const certificatePins = [];
  for (const certificate of [process.env.RTD_TEST_DEV_CERT, process.env.RTD_TEST_ARCHIVE_CERT, process.env.RTD_TEST_ACCOUNT_CERT].filter(Boolean)) {
    const pub = execFileSync('openssl', ['x509', '-in', certificate, '-pubkey', '-noout']);
    const der = execFileSync('openssl', ['pkey', '-pubin', '-outform', 'DER'], { input: pub });
    certificatePins.push(crypto.createHash('sha256').update(der).digest('base64'));
  }
  if(certificatePins.length)tlsArgs.push('--ignore-certificate-errors-spki-list=' + [...new Set(certificatePins)].join(','));
  let context, page, stage = 'launch';
  const start = async () => {
    context = await chromium.launchPersistentContext(directory, {
      executablePath, headless: process.env.RTD_TEST_CUSTOM_HEADED !== '1', viewport: { width: 800, height: 600 },
      args: [`--disable-extensions-except=${extension}`, `--load-extension=${extension}`, '--window-size=800,600', '--window-position=0,0', ...tlsArgs],
    });
    if(identityFaults||observationFaults)context.on('response',response=>{
      const request=response.request();if(!request.serviceWorker())return;
      const url=request.url();let role;
      if(/\/GetServiceInfo(?:$|\?)/.test(url))role=url.startsWith('http://127.0.0.1:39400/')?'fullnode':url.startsWith('https://127.0.0.1:39603/archive/')?'archive':undefined;
      if(url==='https://127.0.0.1:39600/graphql'&&JSON.parse(request.postData()||'{}').query==='query WalletGenesisIdentity { checkpoint(sequenceNumber: 0) { digest } }')role='graphql';
      if(!role)return;const currentStage=stage;
      identityResponses.push((async()=>{const row={role,stage:currentStage,status:response.status(),fromWorker:true};identityWire.push(row);
        try{if(role==='graphql')row.genesisDigest=(await response.json()).data?.checkpoint?.digest;
        else{const {GrpcTypes}=require('rtd-typescript/grpc'),buf=await response.body();assert.equal(buf[0],0);const m=GrpcTypes.GetServiceInfoResponse.fromBinary(buf.subarray(5,5+buf.readUInt32BE(1)));row.genesisDigest=m.chainId;row.height=String(m.checkpointHeight);}
        row.sameChain=row.genesisDigest==='3tEPxLxUysGx4gfr8UEycvH7xohMWuwKVbTX5np4TCYj';}catch{row.decodeFailed=true;}
      })());
    });
    context.on('request', request => {
      const requestUrl = new URL(request.url());
      if (['39400','39600','39603','39606'].includes(requestUrl.port)) currentReadTrace.push({stage,ms:Date.now()-currentStart,role:requestUrl.port,method:requestUrl.pathname.split('/').pop()});
      if (/\/ExecuteTransaction(?:$|\?)/.test(request.url())) dispatchRequests++;
      if (/\/SimulateTransaction(?:$|\?)/.test(request.url())) {
        simulationRequests++;
        if((fullnodeOnly && process.env.RTD_TEST_DAPP_SIGN_TRANSACTION === '1')||postDispatch||publicExecution){
          try{
            const {GrpcTypes}=require('rtd-typescript/grpc');
            const body=request.postDataBuffer();
            assert(body && body.length>=5 && body[0]===0 && body.readUInt32BE(1)===body.length-5);
            const input=GrpcTypes.SimulateTransactionRequest.fromBinary(body.subarray(5));
            const bytes=input.transaction?.bcs?.value;
            simulationWire.push({stage,checksEnabled:input.checks===GrpcTypes.SimulateTransactionRequest_TransactionChecks.ENABLED,
              doGasSelection:input.doGasSelection===true,bytesSha256:bytes?.length?crypto.createHash('sha256').update(bytes).digest('hex'):null,
              targetIsReviewedFullnode:request.url().startsWith('http://127.0.0.1:39400/'),decodePassed:true});
          }catch{simulationWire.push({decodePassed:false});}
        }
      }
    });
    if (ownedAssetsUI) {
      context.on('request', request => {
        const url = new URL(request.url());
        if (url.hostname !== '127.0.0.1' || url.port !== '39600') return;
        let query = '';
        try { query = JSON.parse(request.postData() || '{}').query || ''; } catch {}
        const row = { index: readDiagnostics.length, stage, startedAt: Date.now(),
          fields: ['availableRange', 'walletGenesis', 'walletSnapshot', 'balances', 'objects', 'dynamicFields'].filter(field => query.includes(field)) };
        readRequests.set(request, row);
        readDiagnostics.push(row);
      });
      context.on('response', async response => {
        const row = readRequests.get(response.request());
        if (!row) return;
        row.status = response.status();
        row.milliseconds = Date.now() - row.startedAt;
        try {
          const data = await response.json();
          row.errorCodes = (data.errors || []).map(error => error.extensions?.code || 'UNCLASSIFIED');
          row.errorPaths = (data.errors || []).map(error => error.path);
          if (data.data?.serviceConfig) {
            row.admission = {
              genesisMatches: data.data.walletGenesis?.digest === '3tEPxLxUysGx4gfr8UEycvH7xohMWuwKVbTX5np4TCYj',
              head: data.data.walletHead?.sequenceNumber,
              pinned: data.data.walletSnapshot?.sequenceNumber,
              ranges: Object.values(data.data.serviceConfig).filter(value => value && typeof value === 'object' && ('first' in value || 'last' in value))
                .map(value => ({ first: value.first?.sequenceNumber, last: value.last?.sequenceNumber })),
            };
          }
        } catch (error) { row.bodyErrorType = error.name; }
      });
      context.on('requestfailed', request => {
        const row = readRequests.get(request);
        if (row) { row.failed = true; row.milliseconds = Date.now() - row.startedAt; }
      });
    }
    let worker = context.serviceWorkers()[0] || await context.waitForEvent('serviceworker', { timeout: 15000 });
    const loaded = await require('./lib/current-extension-worker.cjs').ensure(context, worker);
    worker = loaded.worker; workerProvenance.push(loaded.evidence);
    const id = new URL(worker.url()).host;
    page = await context.newPage();
    if(mixedExecuting)await mixedHelper.observe(page);
    page.setDefaultTimeout(15000);
    page.on('pageerror', error => errors.push(error.message.replaceAll(password, '[redacted]').replaceAll(key.getSecretKey(), '[redacted]').slice(0, 240)));
    await page.goto(`chrome-extension://${id}/ui.html`, { waitUntil: 'domcontentloaded' });
    return id;
  };
  const command = (method, args) => page.evaluate(({ method, args }) => new Promise((resolve, reject) => {
    const port = chrome.runtime.connect({ name: 'rtd_ui<->background' });
    const id = crypto.randomUUID();
    // UI control commands may include real password derivation. Transport/read budgets stay unchanged.
    const timeout = setTimeout(() => { port.disconnect(); reject(new Error('command timeout')); }, 30000);
    port.onMessage.addListener(message => {
      if (message?.kind === 'rtd-ui-source-challenge') { port.postMessage({kind:'rtd-ui-source-confirm',nonce:message.nonce}); return; }
      if (message.id !== id) return;
      clearTimeout(timeout); port.disconnect(); resolve(message.payload);
    });
    port.postMessage({ id, payload: method === '@setNetwork' ? { type: 'set-network', network: args } : { type: 'method-payload', method, args } });
  }), { method, args });
  const accounts = async () => {
    const result = await command('getStoredEntities', { type: 'accounts' });
    assert.equal(result.method, 'storedEntitiesResponse');
    return result.args.entities;
  };
  try {
    const id = await start();
    if(createMnemonic){
      stage='new account: create option';
      await page.goto(`chrome-extension://${id}/ui.html#/accounts/add-account?sourceFlow=Onboarding`);
      await page.getByRole('link',{name:/^(创建新的助记词账户|Create a new passphrase account)$/i}).click();
    }else{
      stage = 'import form';
      await page.goto(`chrome-extension://${id}/ui.html#/accounts/import-private-key`);
      await page.locator('textarea[name="privateKey"]').fill(key.getSecretKey());
      await page.locator('textarea[name="privateKey"]').blur();
      await page.locator('button[type="submit"]').click();
    }
    stage = 'password form';
    await page.locator('input[name="password.input"]').fill(password);
    await page.locator('input[name="password.confirmation"]').fill(password);
    stage = 'terms checkbox';
    await page.locator('button#acceptedTos').click();
    stage = 'create wallet submit';
    await page.locator('button[type="submit"]').click();
    if(createMnemonic)key=await require('./lib/test-new-mnemonic-backup.cjs')({page,setStage:value=>{stage=value;}});
    stage = 'tokens navigation';
    await page.waitForURL(/#\/tokens/);
    stage = 'import persisted';
    const imported = await accounts();
    assert.equal(imported.length, 1);
    assert.equal(imported[0].address, key.getPublicKey().toRtdAddress());
    assert.equal(imported[0].type, createMnemonic?'mnemonic-derived':'imported');
    assert.equal(imported[0].isLocked, false);
    const accountId = imported[0].id;
    const browserVersion = context.browser().version();
    if(fullnodeOnly||postDispatch||publicExecution){
      stage='compiled Local Fullnode-only network selection';
      assert.equal((await command('@setNetwork',{env:'local',customRpcUrl:null})).type,'done');
    }
    if (process.env.RTD_TEST_LOCAL_PROFILE === '1' && !fullnodeOnly && !postDispatch && !publicExecution) {
      stage = 'local profile asset query';
      const pending = page.waitForResponse(response => {
        const request = response.request();
        return response.url() === 'https://127.0.0.1:39600/graphql' &&
          (request.postData() || '').includes('balances(first:');
      }, { timeout: 45000 });
      await command('@setNetwork', { env: 'local', customRpcUrl: null });
      const response = await pending;
      const payload = await response.json();
      assert.equal(response.status(), 200);
      if (payload.errors?.length) console.error(JSON.stringify({ stage, graphqlErrors: payload.errors.map(error => ({ message: String(error.message).slice(0, 160), code: error.extensions?.code })) }));
      assert.equal(payload.errors?.length || 0, 0);
      assert(payload.data, 'asset response has no admitted data');
      const snapshot = payload.data.walletSnapshot;
      assert.equal(snapshot?.query?.address?.address, key.getPublicKey().toRtdAddress());
      assert(Array.isArray(snapshot.query.address.balances.nodes));
      let renderedBalance;
      if (fundedReadOnly && !failedReceipt && !ownedAssetsUI) {
        const native = snapshot.query.address.balances.nodes.find(balance => balance.coinType.repr.endsWith('::rtd::RTD'));
        assert(native && BigInt(native.totalBalance) > 0n, 'funded account has no indexed RTD balance');
        // This fixture has 1M–1B RTD. Independent integer arithmetic verifies the visible 2-decimal M label.
        const atomic = BigInt(native.totalBalance);
        assert(atomic >= 1000000n * 1000000000n && atomic < 1000000000n * 1000000000n);
        const hundredths = atomic / 10000000000000n;
        const decimal = String(hundredths % 100n).padStart(2, '0').replace(/0+$/, '');
        renderedBalance = String(hundredths / 100n) + (decimal ? '.' + decimal : '') + ' M';
        stage = 'funded balance rendered';
        await page.getByText(renderedBalance, { exact: true }).first().waitFor();
      }
      localAssets = { status: response.status(), queriedThroughWalletUI: true, renderedBalance, checkpoint: snapshot.sequenceNumber, checkpointDigest: snapshot.digest, balanceEntries: snapshot.query.address.balances.nodes.length, balances: snapshot.query.address.balances.nodes.map(balance => ({ type: balance.coinType.repr, totalBalance: balance.totalBalance })),
        certificateMode: 'exact dev leaf SPKI exception; normal CA trust not accepted',
        configMode: 'compiled reviewed local profile; custom host permission UI not accepted' };
    }
    if (process.env.RTD_TEST_COIN_PREVIEW === '1') {
      coinPreview = mixedExecuting ? await mixedHelper.execute({page,accountId,accountAddress:key.toRtdAddress(),setStage:value=>{stage=value;}}) : await require('./lib/test-extension-coin-preview.cjs')({page,accountAddress:key.toRtdAddress(),...(mixedNative?{amountText:'1.5',atomicAmount:'1500000000'}:{}),setStage:value=>{stage=value;}});
    }
    if (process.env.RTD_TEST_STAKING_PAGE === '1') {
      stakingPage = await require('./lib/test-extension-staking-page.cjs')({ page, evidenceDirectory: stakingExecuting ? evidenceDirectory : undefined, accountId, accountAddress: key.toRtdAddress(), setStage: value => { stage = value; } });
    }
    if (process.env.RTD_TEST_DAPP_DIR) {
      dapp = await require('./lib/test-current-dapp-personal-message.cjs')({ context, key, command, accountId, unlockAccount: async () => { assert.equal((await command('unlockAccountSourceOrAccount',{id:accountId,password})).type,'done'); }, unlockPopup: async popup => {
        await popup.locator("input[name=password]").fill(password);
        await popup.getByRole("button", { name: /^(解锁|Unlock)$/ }).click();
      }, createTestAccount: async () => {
        const secondKey = Ed25519Keypair.fromSecretKey(new Uint8Array(32).fill(8));
        const response = await command("createAccounts", { type: "imported", keyPair: secondKey.getSecretKey(), password });
        assert.equal(response.method, "accountsCreatedResponse");
        return response.args.accounts[0];
      }, extensionPage: page, evidenceDirectory: dappExecuting ? evidenceDirectory : undefined, directory: process.env.RTD_TEST_DAPP_DIR, setStage: value => { stage = value; } });
    }
    if(ownedAssetsUI)ownedAssetsEvidence=await require('./lib/test-owned-assets-ui.cjs')({page,setStage:value=>{stage=value;}});
    if(missingMetadataUI)missingMetadataEvidence=await require('./lib/test-missing-token-metadata-ui.cjs')({page,setStage:value=>{stage=value;}});
    if(assetReadErrorUI)assetReadErrorEvidence=await require('./lib/test-asset-read-error-ui.cjs')({page,setStage:value=>{stage=value;}});
    if(querySwitchUI)querySwitchEvidence=await require('./lib/test-query-session-switch-ui.cjs')({page,command,accountId,setStage:value=>{stage=value;},createTestAccount:async()=>{
      const secondKey=Ed25519Keypair.fromSecretKey(new Uint8Array(32).fill(8));
      const response=await command('createAccounts',{type:'imported',keyPair:secondKey.getSecretKey(),password});
      assert.equal(response.method,'accountsCreatedResponse');
      const second=response.args.accounts[0];
      assert.equal((await command('unlockAccountSourceOrAccount',{id:second.id,password})).type,'done');
      return second;
    }});
    if(failedReceipt)failedReceiptEvidence=await require('./lib/test-failed-receipt-ui.cjs')({page,setStage:value=>{stage=value;}});
    if(customNetwork)customNetworkEvidence=await require('./lib/test-custom-network-ui.cjs')({page,setStage:value=>{stage=value;}});
    stage = 'lock';
    await command('lockAccountSourceOrAccount', { id: accountId });
    assert.equal((await accounts())[0].isLocked, true);
    stage = 'wrong password';
    const rejected = await command('unlockAccountSourceOrAccount', { id: accountId, password: 'incorrect-test-password' });
    assert.equal(rejected.error, true);
    assert.equal((await accounts())[0].isLocked, true);
    stage = 'correct password';
    await command('unlockAccountSourceOrAccount', { id: accountId, password });
    assert.equal((await accounts())[0].isLocked, false);
    // Response bodies belong to the live CDP context; persist their observations before closing it.
    await Promise.all(identityResponses);
    stage = 'browser restart';
    await context.close(); context = undefined;
    await start();
    const restored = await accounts();
    if(customNetwork)await require('./lib/test-custom-network-ui.cjs').verifyRestart({page,evidence:customNetworkEvidence,setStage:value=>{stage=value;}});
    stage = 'restored account count';
    assert.equal(restored.length, 1);
    stage = 'restored account identity';
    assert.equal(restored[0].id, accountId);
    assert.equal(restored[0].address, key.getPublicKey().toRtdAddress());
    stage = 'restored account locked';
    assert.equal(restored[0].isLocked, true);
    if(mixedExecuting){const verified=await mixedHelper.verify({page,command,accountId});mixedHelper.record('locked-restart-verified.json',verified);coinPreview.execution.restart=verified;}
    if(postDispatch){dapp.execution.restart=await postDispatchHelper.verifyLocked({root:evidenceDirectory,page,command,key,accountId});}
    stage = 'unlock after restart';
    const unlockAfterRestart = await command('unlockAccountSourceOrAccount', { id: accountId, password });
    if (unlockAfterRestart.error) {
      const safe = String(unlockAfterRestart.message).replaceAll(password, '[redacted]').replaceAll(key.getSecretKey(), '[redacted]');
      console.error(JSON.stringify({ stage, backgroundError: safe.slice(0, 160) }));
    }
    assert.equal(unlockAfterRestart.type, 'done');
    assert.equal((await accounts())[0].isLocked, false);
    if(observationFaults)dapp.networkObservations.restart=await require('./lib/test-dapp-network-observations.cjs').verifyRestart({context,page,command,accountId,setStage:value=>{stage=value;}});
    assert.equal(dispatchRequests, executing ? 1 : 0, 'unexpected transaction dispatch count');
    if (ownedAssetsUI) assert.equal(simulationRequests, 0, 'owned assets must not simulate');
    if (executing) {
      const records = await require('./lib/test-dapp-execution.cjs').journal(page);
      const execution = mixedExecuting ? coinPreview.execution : stakingExecuting ? stakingPage.execution : dapp.execution;
      assert.equal(records.length, 1); assert.equal(records[0].digest, execution.digest);
      assert.equal(records[0].state, 'confirmed-success');
      execution.persistedAcrossBrowserRestart = true;
      fs.writeFileSync(path.join(evidenceDirectory, 'restart-verified.json'), JSON.stringify({digest:execution.digest,state:records[0].state,dispatchRequests,simulationRequests,passed:true},null,2)+'\n',{flag:'wx',mode:0o600});
    }
    if (process.env.RTD_TEST_DAPP_SIGN_TRANSACTION === '1') assert(simulationRequests >= 3, 'expected resolution and same-byte formal simulations');
    await Promise.all(identityResponses);
    if(identityFaults){assert(dapp.transactionIdentity?.passed);const baseline=identityWire.filter(r=>!r.stage.startsWith('identity fault'));assert(baseline.every(r=>r.status===200&&r.sameChain&&!r.decodeFailed));for(const role of ['fullnode','graphql','archive'])assert(baseline.some(r=>r.role===role));}

    if(observationFaults){assert(dapp.networkObservations?.passed);assert(dapp.networkObservations.restart?.passed);assert(identityWire.length>0);assert(identityWire.every(r=>r.status===200&&r.sameChain&&!r.decodeFailed));for(const role of ['fullnode','graphql','archive'])assert(identityWire.some(r=>r.role===role));}

    if(fullnodeOnly && process.env.RTD_TEST_DAPP_SIGN_TRANSACTION === '1'){
      assert.equal(simulationWire.length,simulationRequests);
      assert(simulationWire.every(row=>row.decodePassed && row.checksEnabled && row.targetIsReviewedFullnode));
      const final=simulationWire.filter(row=>row.bytesSha256!==null);
      assert.equal(final.length,2+(identityFaults?1:0)+(observationFaults?1:0)+(signingHold?dapp.signReturnHold.cases.length*2:0),'each admitted prepared/approved fixed byte set is formally simulated');
      if(signingHold){for(const c of dapp.signReturnHold.cases){const pair=final.filter(r=>r.stage===`actual signing result held ${c.entry}`);assert.equal(pair.length,2,'each held-signing case requires two formal simulations');assert(pair.every(r=>r.bytesSha256===c.intentBytesSha256),'actual held intent must match this case fixed-byte formal simulations');}}
      assert(final.slice(0,2).every(row=>row.bytesSha256===dapp.signOnly.bytesSha256));
      assert.equal(final[0].doGasSelection,final[1].doGasSelection);
    }
    if(postDispatch){
      assert.equal(simulationRequests,3);assert.equal(simulationWire.length,3);
      assert(simulationWire.every(r=>r.decodePassed&&r.checksEnabled&&r.targetIsReviewedFullnode));
      const formal=simulationWire.filter(r=>r.bytesSha256!==null);assert.equal(formal.length,2);
      assert(formal.every(r=>r.bytesSha256===dapp.execution.wire.bytesSha256&&r.doGasSelection===false));
    }
    if(publicExecution){
      assert.equal(simulationRequests,3);assert.equal(simulationWire.length,3);
      assert(simulationWire.every(r=>r.decodePassed&&r.checksEnabled&&r.targetIsReviewedFullnode));
      const formal=simulationWire.filter(r=>r.bytesSha256!==null);assert.equal(formal.length,2);
      assert(formal.every(r=>r.bytesSha256===dapp.execution.bytesSha256&&r.doGasSelection===false));
    }
    stage = 'page runtime errors';
    if (errors.length) console.error(JSON.stringify({ stage, errors }));
    assert.deepEqual(errors, []);
    console.log(JSON.stringify({ passed: true, publicExecutionAdmission, certificateMode:tlsArgs.length?'precise-spki-exception':'normal-ca', fullnodeAdmission, postDispatchAdmission:postDispatchAdmission?.admission, simulationWire:fullnodeOnly||postDispatch||publicExecution?simulationWire:undefined, identityWire:identityFaults||observationFaults?identityWire:undefined, compiledProfileProof, workerProvenance, browser: browserVersion, localAssets, stakingPage, coinPreview, customNetworkEvidence, failedReceiptEvidence, ownedAssetsEvidence, querySwitchEvidence, assetReadErrorEvidence, missingMetadataEvidence, dapp, fundedReadOnly, createMnemonic, dispatchRequests, simulationRequests,
      checks: [createMnemonic?'actual UI random mnemonic creation, backup reveal/hide and acknowledgement gate':'actual UI private-key import and password setup', createMnemonic?'SDK address derived from displayed backup phrase matches stored account':'SDK address matches stored imported account',
        'background lock', 'incorrect password stays locked', 'correct password unlocks',
        'full browser restart preserves account and starts locked', 'unlock after restart'],
      uiBundleSha256: crypto.createHash('sha256').update(fs.readFileSync(path.join(extension, 'ui.js'))).digest('hex'),
      bundleSha256: crypto.createHash('sha256').update(fs.readFileSync(path.join(extension, 'background.js'))).digest('hex'),
      scope: publicExecution ? 'one current '+publicExecutionRevision+' public seed dev-chain execution with actual Wallet Standard approval, preview/final bytes/Intent/effects/journal/restart; normal CA flags, HTTPS acceptance not tested' : postDispatch ? 'one actual dev-chain execution; actual response held before lifecycle invalidation, pending retained through browser restart, original digest/bytes/signature/effects recovered while locked; precise SPKI exceptions, no normal CA or full trial acceptance' : mixedExecuting ? 'actual mixed native 1.5 RTD transfer from 1 RTD Coin plus 1 RTD address funds; fixed-byte digest/effects/balance changes and locked restart recovery verified; no indexed catch-up or full trial acceptance' : ownedAssetsUI ? 'actual existing owned-assets rows and kiosk navigation; no NFT execution or direct NFT display acceptance' : failedReceipt ? 'existing actual on-chain failed transaction read and displayed through archive in Chrome; no submitted failure or journal-recovery claim' : customNetwork ? 'actual custom-network settings in disposable extension profile; see customNetworkEvidence for saved versus legacy-repair scope; no new host permission prompt acceptance or chain execution' : createMnemonic ? 'actual random mnemonic account creation and backup acknowledgement; SDK derived address and restart/lock checks; unfunded asset query only, no chain execution or seed import recovery' : coinPreview ? 'actual native coin transfer form preparation, approved preview availability and return; no final approval or transaction execution' : stakingPage?.execution ? 'actual wallet staking UI preview and single execution; effects digest and terminal journal verified across restart; active-position indexing and withdrawal not accepted' : dapp?.execution ? 'isolated real extension dApp execution with preview digest and verified signature/effects, journal survives browser restart; compiled Local and precise SPKI exception; not full fault recovery or normal CA acceptance' : dapp?.signOnly ? 'isolated real extension sign-only with preview digest match and verified signature; no transaction execution; compiled Local profile; certificate mode reported separately; HTTPS query acceptance not tested' : dapp ? 'isolated extension connection and PersonalMessage signature; compiled Local profile and precise dev SPKI exception; no transaction signing or execution, normal CA or custom permission acceptance' : localAssets ? 'actual isolated extension UI GraphQL balance read with compiled local profile and precise dev SPKI exception; no signing, execution or custom permission acceptance' : 'isolated headless Chromium extension; import/password via UI, lock/unlock via actual UI-background commands; no network profile, live chain, signing or native permission acceptance',
    }, null, 2));
  } catch (error) {
    // Never dump page text, key, password, command payload, or Playwright call values.
    let assetPageState;
    if (ownedAssetsUI && stage === 'local profile asset query' && page && !page.isClosed()) {
      const text = await page.locator('body').innerText();
      const messages = { unconfigured: '当前网络尚未配置钱包数据服务', initializing: '钱包查询会话正在初始化',
        notAdmitted: '资产快照尚未准入', incomplete: '查询结果不完整或不兼容', coverage: '查询尚未覆盖所需快照',
        unavailable: '查询服务暂不可用', identity: '查询入口的链身份不匹配', reactBoundary: '出现错误', reactBoundaryEnglish: 'Something went wrong' };
      assetPageState = { route: new URL(page.url()).hash.split('?')[0],
        matchedStates: Object.keys(messages).filter(value => text.includes(messages[value])),
        hasDesignatedAddress: text.includes(key.toRtdAddress()) || text.includes(key.toRtdAddress().slice(2, 6)),
        hasUnlockButton: await page.getByRole('button', { name: /^(解锁|Unlock)$/ }).count() > 0 };
      if (process.env.RTD_TEST_READ_STATE_SCREENSHOT && assetPageState.route === '#/tokens') {
        const screenshot = path.resolve(process.env.RTD_TEST_READ_STATE_SCREENSHOT);
        assert.equal(path.dirname(screenshot), path.resolve(__dirname, '../migrationToGRpcOrGraphQLDoc/workLog'));
        assert.equal(path.extname(screenshot), '.png');
        assert(!fs.existsSync(screenshot));
        await page.screenshot({ path: screenshot });
        assetPageState.screenshotSaved = true;
      }
    }
    console.error(JSON.stringify({ passed: false, stage, pageErrors: errors, errorType: error.name, identityDiagnostics:{rows:identityWire.length,decodeFailures:identityWire.filter(r=>r.decodeFailed).length,mismatches:identityWire.filter(r=>r.sameChain===false).length},simulationDiagnostics:{rows:simulationWire.length,invalid:simulationWire.filter(r=>!r.decodePassed||!r.checksEnabled||!r.targetIsReviewedFullnode).length},failureLocation:String(error.stack).split('\n').find(line=>line.includes('/scripts/')&&/\.cjs:\d+:\d+/.test(line))?.trim(),controlCommandTimedOut:String(error.message).includes('command timeout'),pageClosed:page?.isClosed(),currentReadTrace,dispatchRequests, simulationRequests, assetPageState, readDiagnostics: ownedAssetsUI ? readDiagnostics.map(({ startedAt, ...row }) => row) : undefined, actualBoolean: typeof error.actual === 'boolean' ? error.actual : undefined, expectedBoolean: typeof error.expected === 'boolean' ? error.expected : undefined }));
    process.exitCode = 1;
  } finally {
    if (context) await context.close();
    if (!executing && (signingHold||observationFaults) && process.exitCode) { fs.writeFileSync(path.join(directory,'recovery-private.json'),JSON.stringify({password}),{flag:'wx',mode:0o600}); console.error(JSON.stringify({preservedSigningHoldFailureProfile:directory})); }
    else if (!executing) { fs.writeFileSync(path.join(directory,'recovery-private.json'),JSON.stringify({password}),{flag:'wx',mode:0o600}); console.error(JSON.stringify({preservedCurrentProfile:directory})); }
    else console.log(JSON.stringify({ preservedExecutionProfile: evidenceDirectory }));
  }
})().catch(error => { console.error(JSON.stringify({ passed: false, errorType: error.name })); process.exitCode = 1; });
