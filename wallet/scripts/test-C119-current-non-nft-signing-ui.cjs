// Actual current unsigned internal approvals; fault only a cloned revalidation parameter.
process.env.PW_EXPERIMENTAL_SERVICE_WORKER_NETWORK_EVENTS = '1';
const fs=require('node:fs'),path=require('node:path'),os=require('node:os'),crypto=require('node:crypto'),assert=require('node:assert/strict');
const {chromium,expect}=require('@playwright/test'),{Transaction}=require('rtd-typescript/transactions'),{GrpcTypes}=require('rtd-typescript/grpc');
const {Ed25519Keypair}=require('rtd-typescript/keypairs/ed25519'),loader=require('tsx/cjs/api');
const read=f=>JSON.parse(fs.readFileSync(f)),sha=f=>crypto.createHash('sha256').update(fs.readFileSync(f)).digest('hex');
const wallet=path.resolve(__dirname,'..'),logs=path.join(wallet,'migrationToGRpcOrGraphQLDoc/workLog');
(async()=>{
 const [windowFile,output,fixture]=process.argv.slice(2),rt=path.join(os.homedir(),'.local/state/rtd-wallet-migration/dev-20261006-03');
 assert(output&&!fs.existsSync(output)&&path.dirname(path.resolve(fixture))===rt&&!fs.existsSync(fixture));
 assert(path.basename(fixture).startsWith('current-C119-non-nft-authorization-'));
 const buildFile=path.join(logs,'20261008-default-generation-positive-C109-build-01.json'),build=read(buildFile),window=read(windowFile);
 const originalFile=path.join(logs,'20261007-C43-staking-forms-live-lock-chrome-01.json'),original=read(originalFile);
 const profileFile=path.join(rt,'publication-foundation/C119-isolated-query-runtime-20261008-01/profile.json'),fixtureIntent=path.join(rt,'nonempty-kiosk-C43-20261007-01/intent.json');
 const gatewayFile=path.join(logs,'20261008-C119-isolated-query-network-qualified-01.json'),gateway=read(gatewayFile);assert(gateway.passed&&gateway.actualOriginOnly&&gateway.originalTlsAndMethodsHeld&&!gateway.businessAccepted&&gateway.original29And14Held);for(const[f,h]of Object.entries(gateway.inputsSha256))assert.equal(sha(f),h);
 assert(build.passed&&window.passed&&window.newOriginInstalled&&window.currentWalletContainers===29&&window.healthyChecks===14);
 assert(window.h0==='BkuLHhdtnoK7yLxo2eQuvcjHtdyipE7MMyxgTJiyHGg4'&&window.generation===path.basename(rt));
 assert(window.targetCheckpoint===524022&&window.infrastructureReadyForProductionProbe&&Object.values(window.coverageGates).every(v=>v===true)&&window.effectiveAssetWindow.commonHi>=524022&&Date.now()-Date.parse(window.observedAt)<300000);
 assert(original.passed&&original.executeRequests===0);
 const lineage=require('./lib/C109-product-source-lineage.cjs'),q=read(lineage.qualificationFile);assert.deepEqual(lineage.validate(q.originalSource,buildFile),build.sourceAfter);const heldGateway=require('./lib/C119-current-core-gateway-ownership.cjs').capture;const gatewayAuthority=heldGateway();
 for(const [f,h] of Object.entries(build.artifacts))assert.equal(sha(path.join(build.output,f)),h);
 const protectedPins=read(fixtureIntent).protectedOriginalsSha256;assert.equal(Object.keys(protectedPins).length,1015);
 for(const [f,h] of Object.entries(protectedPins))assert.equal(sha(f),h);
 const owner=original.owner,stakeId=original.stakeId,validator=original.validator;
 const key=read(path.join(rt,'config/rtd.keystore')).map(e=>{const b=Buffer.from(e,'base64');return b.length===33&&b[0]===0?Ed25519Keypair.fromSecretKey(b.subarray(1)):null}).find(k=>k?.toRtdAddress()===owner);assert(key);
 const password=crypto.randomBytes(32).toString('base64url'),profile=path.join(fixture,'profile');
 fs.mkdirSync(fixture,{mode:0o700});fs.writeFileSync(path.join(fixture,'recovery-private.json'),JSON.stringify({password})+'\n',{flag:'wx',mode:0o600});
 const checks=[],singleUiSurfaces=[],simulations=[],frames=[],traffic=[],forbidden=[],captureErrors=[],pageErrors=[],cases=[],jobs=[],validityRows=[],validityCleanup=[],validityDiagnostics=[];
 let context,page,worker,hook,privateStage=false,closing=false,stage='fresh native original stake preflight',proof={},executeRequests=0;
 const check=(label,value)=>{assert(value,label);checks.push({label,passed:true});console.log(JSON.stringify({stage,checks:checks.length}));};
 const snapshot=()=>require('./lib/lifecycle-journal-snapshot.cjs')(page);
 const approvals=()=>page.evaluate(()=>{
  const seen=new Set(),stack=[],rows=[];
  for(const n of document.querySelectorAll('*')){const k=Object.keys(n).find(k=>k.startsWith('__reactFiber$'));if(k){let f=n[k];while(f.return)f=f.return;if(!f.stateNode?.current)throw Error('Committed React root required');stack.push(f.stateNode.current)}}
  while(stack.length){const f=stack.pop();if(!f||seen.has(f))continue;seen.add(f);for(let h=f.memoizedState;h;h=h.next){const v=h.memoizedState;if(v?.prepared?.bytesBase64&&typeof v.requestId==='string')rows.push(JSON.parse(JSON.stringify(v)))}stack.push(f.child,f.sibling)}
  return Array.from(new Map(rows.map(v=>[v.requestId,v])).values());
 });
 const contexts=()=>page.evaluate(()=>{
  const seen=new Set(),stack=[],rows=[];
  for(const n of document.querySelectorAll('*')){const k=Object.keys(n).find(k=>k.startsWith('__reactFiber$'));if(k){let f=n[k];while(f.return)f=f.return;if(!f.stateNode?.current)throw Error('Committed React root required');stack.push(f.stateNode.current)}}
  while(stack.length){const f=stack.pop();if(!f||seen.has(f))continue;seen.add(f);for(let d=f.dependencies?.firstContext;d;d=d.next){const v=d.memoizedValue;if(v&&typeof v.readSessionKey==='string'&&v.assetSnapshotKey)rows.push({bindingKey:v.bindingKey,readSessionKey:v.readSessionKey,assetSnapshotKey:v.assetSnapshotKey,state:v.state})}stack.push(f.child,f.sibling)}
  return rows;
 });
 const cipher=()=>page.evaluate(async()=>{
  const db=await new Promise((resolve,reject)=>{const q=indexedDB.open('RtdWallet DB');q.onupgradeneeded=()=>{q.transaction.abort();reject(Error('Existing owner required'))};q.onsuccess=()=>resolve(q.result);q.onerror=()=>reject(Error('Readonly accounts failed'))});
  try{const rows=await new Promise((resolve,reject)=>{const tx=db.transaction('accounts','readonly'),q=tx.objectStore('accounts').getAll();q.onsuccess=()=>resolve(q.result.map(r=>({id:r.id,address:r.address,publicKey:r.publicKey,encrypted:r.encrypted,type:r.type})));tx.onerror=()=>reject(Error('Readonly cipher failed'))});
   const assertExisting=rows.length===1&&rows[0].type==='imported'&&typeof rows[0].encrypted==='string'&&rows[0].encrypted.length>0;if(!assertExisting)throw Error('Protected imported owner required');
   const digest=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(JSON.stringify(rows)));return{owner:rows[0].address,sha256:Array.from(new Uint8Array(digest)).map(x=>x.toString(16).padStart(2,'0')).join('')};
  }finally{db.close()}
 });
 try{
  const load=n=>loader.require(path.join(wallet,'src/shared/rpc',n+'.ts'),__filename);
  const {validateNetworkProfile}=load('profile'),{WalletReadSession}=load('session'),{WalletFullnodeReader}=load('fullnode-reader');
  const session=new WalletReadSession(validateNetworkProfile(read(profileFile)));
  try{const object=await new WalletFullnodeReader(session).object(stakeId);assert(object&&object.owner.AddressOwner===owner);
   proof.nativeStakeBefore={objectId:object.objectId,type:object.type,version:object.version,digest:object.digest,owner:object.owner,contentBase64:Buffer.from(object.content).toString('base64'),objectBcsBase64:Buffer.from(object.objectBcs).toString('base64')};
  }finally{session.close()}
  check('fresh actual original stake owner/type and complete native bytes',proof.nativeStakeBefore.type.includes('::staking_pool::StakedRtd'));
  context=await chromium.launchPersistentContext(profile,{executablePath:path.join(os.homedir(),'Library/Caches/ms-playwright/chromium-1243/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing'),headless:true,viewport:{width:800,height:700},args:[`--disable-extensions-except=${build.output}`,`--load-extension=${build.output}`]});
  const allowed=new Set(['http://127.0.0.1:41750','http://127.0.0.1:42011','http://127.0.0.1:42012','http://127.0.0.1:42013','http://127.0.0.1:41718']);
  await context.route('**/*',route=>{const r=route.request(),u=new URL(r.url());if(['http:','https:'].includes(u.protocol)){
   traffic.push({url:u.href,method:r.method()});if(u.pathname.endsWith('/ExecuteTransaction'))executeRequests++;
   if(!allowed.has(u.origin)||(/\/ExecuteTransaction$/.test(u.pathname)||(/\/VerifySignature$/.test(u.pathname)&&!(u.origin==='http://127.0.0.1:41750'&&u.pathname==='/rtd.rpc.v2.SignatureVerificationService/VerifySignature')))||String(r.postData()).includes('"jsonrpc"')){forbidden.push(u.href);return route.abort()}
  }return route.continue()});
  context.on('response',r=>{const atStage=stage,u=new URL(r.url());if(!['http:','https:'].includes(u.protocol))return;
   jobs.push((async()=>{const request=r.request().postDataBuffer()??Buffer.alloc(0);let response,bodyUnavailable=false;try{response=await r.body()}catch(error){assert(u.pathname.endsWith('/SimulateTransaction')&&['3','13'].includes(r.headers()['grpc-status']));response=Buffer.alloc(0);bodyUnavailable=true}const row={stage:atStage,url:u.href,status:r.status(),headers:r.headers(),responseHeaders:r.headers(),bodyUnavailable,requestBase64:request.toString('base64'),responseBase64:response.toString('base64')};frames.push(row);
    if(u.pathname.endsWith('/SimulateTransaction')){assert(request[0]===0&&request.readUInt32BE(1)+5===request.length);const decoded=GrpcTypes.SimulateTransactionRequest.fromBinary(request.subarray(5));assert.equal(decoded.checks,GrpcTypes.SimulateTransactionRequest_TransactionChecks.ENABLED);simulations.push({...row,bytesBase64:decoded.transaction?.bcs?.value?Buffer.from(decoded.transaction.bcs.value).toString('base64'):null})}
   })().catch(e=>captureErrors.push({stage:atStage,url:u.href,status:r.status(),closing,errorType:e.name,bodyCaptured:false})))
  });
  const initial=context.serviceWorkers()[0]||await context.waitForEvent('serviceworker'),loaded=await require('./lib/current-extension-worker.cjs').ensure(context,initial,build.output);worker=loaded.worker;proof.workerSource=loaded.evidence.after??loaded.evidence.before;
  assert.equal('chrome-extension://'+new URL(worker.url()).host,read(path.join(logs,'20261008-C109-current-origin-probe-01.json')).origin);assert.equal(proof.workerSource.workerSha256,build.artifacts['background.js']);
  const base=new URL('ui.html',worker.url()).href;await expect.poll(()=>context.pages().filter(p=>p.url().startsWith(base)).length,{timeout:30000}).toBe(1);page=context.pages().find(p=>p.url().startsWith(base));page.on('pageerror',e=>pageErrors.push({stage,errorType:e.name,message:String(e.message).slice(0,180)}));singleUiSurfaces.push({stage:'reuse existing startup UI',pages:context.pages().map(p=>({url:p.url()}))});
  proof.uiSource=await require('./lib/current-extension-ui-source.cjs').inspect(context,page,build.output,Object.keys(build.artifacts).filter(f=>f.endsWith('.js')&&!['background.js','content-script.js','dapp-interface.js','egress-gate.js'].includes(f)),{url:base,navigate:async()=>{await page.goto(base);await page.locator('a[href*="add-account"]').first().waitFor()}});
  const command=(method,args)=>page.evaluate(({method,args})=>new Promise((resolve,reject)=>{const port=chrome.runtime.connect({name:'rtd_ui<->background'}),id=crypto.randomUUID(),timer=setTimeout(()=>{port.disconnect();reject(Error('Account command timeout'))},20000);port.onMessage.addListener(m=>{if(m?.kind==='rtd-ui-source-challenge'){port.postMessage({kind:'rtd-ui-source-confirm',nonce:m.nonce});return}if(m.id===id){clearTimeout(timer);port.disconnect();resolve(m.payload)}});port.postMessage({id,payload:method==='@setNetwork'?{type:'set-network',network:args}:{type:'method-payload',method,args}})}),{method,args});
  stage='private import and protection';privateStage=true;await page.goto(base+'#/accounts/import-private-key');await page.locator('[name="privateKey"]').fill(key.getSecretKey());await page.locator('[name="privateKey"]').blur();await expect(page.locator('button[type="submit"]')).toBeEnabled();await page.locator('button[type="submit"]').click();await page.waitForURL(/protect-account/);
  await page.locator('[name="password.input"]').fill(password);await page.locator('[name="password.confirmation"]').fill(password);await page.locator('#acceptedTos').click();await page.locator('button[type="submit"]').click();await page.waitForURL(/#\/tokens/,{timeout:45000});privateStage=false;
  const accounts=(await command('getStoredEntities',{type:'accounts'})).args.entities;assert(accounts.length===1&&accounts[0].address===owner&&!accounts[0].isLocked);assert.equal((await command('@setNetwork',{env:'local',customRpcUrl:null})).type,'done');
  proof.initialJournal=await snapshot();assert(Object.values(proof.initialJournal).every(rows=>Array.isArray(rows)&&!rows.length));proof.cipherBefore=await cipher();assert.equal(proof.cipherBefore.owner,owner);
  stage='normal complete read admission before first form';await expect.poll(async()=>page.evaluate(()=>{const seen=new Set(),stack=[];for(const n of document.querySelectorAll('*')){const k=Object.keys(n).find(k=>k.startsWith('__reactFiber$'));if(k){let f=n[k];while(f.return)f=f.return;stack.push(f.stateNode.current)}}while(stack.length){const f=stack.pop();if(!f||seen.has(f))continue;seen.add(f);for(let d=f.dependencies?.firstContext;d;d=d.next){const v=d.memoizedValue;if(v?.readSessionKey&&v.state==='configured'&&v.readAdmission?.phase==='observed'&&v.readAdmission.blocked.length===0)return true;}stack.push(f.child,f.sibling)}return false;}),{timeout:120000}).toBe(true);
  check('fresh dedicated owner/profile actual C109 renderer/worker and empty all stores',true);
  for(const kind of ['coin','stake','withdraw']){
   stage='actual '+kind+' original approval';await Promise.all(jobs);const start=simulations.length;
   const route=kind==='coin'?'#/send?type=0x2%3A%3Artd%3A%3ARTD':kind==='stake'?'#/stake/new?address='+validator:'#/stake/new?unstake=true&staked='+stakeId;
   await page.goto(base+route);assert.equal(context.pages().filter(p=>p.url().startsWith(base)).length,1);singleUiSurfaces.push({stage,pages:context.pages().map(p=>({url:p.url()}))});
   if(kind==='coin'){await page.locator('[name="to"]').waitFor({timeout:180000});await page.locator('[name="to"]').fill(owner);await page.locator('[name="to"]').blur();await page.getByTestId('coin-amount-input').fill('0.000000001');await page.getByTestId('coin-amount-input').blur()}
   if(kind==='stake'){const input=page.locator('[name="amount"]');await input.waitFor({timeout:180000});await input.fill('1');await input.blur()}
   const review=page.getByRole('button',{name:kind==='coin'?/^(Review|检查)$/:/^(Review transaction|Review Transaction|预览交易)$/});await expect(review).toBeEnabled({timeout:180000});await review.click();
   const send=page.getByRole('button',{name:kind==='coin'?/^(Send Now|立即发送)$/:kind==='stake'?/^(Stake Now|立即质押)$/:/^(Unstake Now|立即解除质押)$/});await expect(send).toBeEnabled({timeout:180000});await Promise.all(jobs);
   const rows=await approvals();assert.equal(rows.length,1);const approval=rows[0],prepared=approval.prepared,tx=Transaction.from(prepared.bytesBase64),data=tx.getData();
   assert.equal(await tx.getDigest(),prepared.digest);assert.equal(data.sender,owner);assert.equal(data.gasData.owner,owner);assert.equal(String(data.gasData.budget),prepared.gasBudget);
   assert(kind==='coin'?prepared.input.to===owner:prepared.input.kind===kind);assert.deepEqual(await snapshot(),proof.initialJournal);
   const originalSimulations=simulations.slice(start);assert(originalSimulations.some(s=>s.bytesBase64===prepared.bytesBase64));assert(originalSimulations.every(s=>s.status===200));
   const textBefore=(await page.locator('body').innerText()).slice(0,7000);assert(textBefore.includes(prepared.digest));
   check(kind+' actual final bytes/sender/full GasData/expiration and formal final simulation',true);
   const changed=Transaction.from(prepared.bytesBase64);changed.setGasBudget((BigInt(prepared.gasBudget)+1000n).toString());const changedBytes=Buffer.from(await changed.build()).toString('base64'),changedDigest=await changed.getDigest();assert.notEqual(changedDigest,prepared.digest);
   hook=await require(kind==='coin'?'./lib/current-ui-coin-gas-fault.cjs':'./lib/current-ui-staking-gas-fault.cjs')(context,page,build.output);
   const sourceProof=hook.evidence;stage='actual '+kind+' gas fault revalidation';const faultStart=simulations.length;
   const click=send.click({timeout:90000});click.catch(()=>{});const pause=await hook.wait(),injection=await hook.inject(pause,prepared,changedBytes);await click;
   const expected=kind==='coin'?'已授权的交易模拟未通过，请重新预览并授权':'原批准交易模拟未通过，请重新预览并授权';await expect(page.getByText(expected,{exact:true})).toBeVisible({timeout:90000});
   await hook.close();hook=undefined;await Promise.all(jobs);const faultSimulations=simulations.slice(faultStart);assert.equal(faultSimulations.length,1);assert.equal(faultSimulations[0].bytesBase64,changedBytes);assert.equal(faultSimulations[0].status,200);
   assert.deepEqual(await approvals(),rows);assert.deepEqual(await snapshot(),proof.initialJournal);const textAfter=(await page.locator('body').innerText()).slice(0,7000);assert(textAfter.includes(prepared.digest)&&!textAfter.includes(changedDigest));
   check(kind+' precise cloned GasBudget+1000 rejects old digest and keeps actual approval/journal',true);
   await page.getByRole('button',{name:/^(Back|返回)$/}).click();await expect(review).toBeEnabled({timeout:180000});
   if(kind!=='coin')assert.deepEqual(await approvals(),[]);
   cases.push({kind,route,approval,gasData:data.gasData,expiration:data.expiration,changedGas:{bytesBase64:changedBytes,digest:changedDigest,budget:changed.getData().gasData.budget},sourceProof,injection,textBefore,textAfter,originalSimulations,faultSimulations,partial:true});
   stage='actual '+kind+' fresh visible approval after Back';const againStart=simulations.length;await review.click();await expect(send).toBeEnabled({timeout:180000});await Promise.all(jobs);
   const againRows=await approvals();assert.equal(againRows.length,1);const freshApproval=againRows[0];assert.notEqual(freshApproval.requestId,approval.requestId);assert.equal(await Transaction.from(freshApproval.prepared.bytesBase64).getDigest(),freshApproval.prepared.digest);assert.deepEqual(await snapshot(),proof.initialJournal);
   const repeatedSimulations=simulations.slice(againStart);
   const actualContexts=await contexts();assert(actualContexts.length&&actualContexts.every(r=>BigInt(JSON.parse(r.assetSnapshotKey)[2])>=332734n));
   Object.assign(cases[cases.length-1],{freshApproval,repeatedSimulations,actualContexts,partial:false});
   check(kind+' actual Back then new visible requestId without signing or submission',true);
   await page.getByRole('button',{name:/^(Back|返回)$/}).click();
  }
  stage='normal non-NFT Wallet Standard validity matrix';
  const validityOrigin={actualOrigin:gatewayAuthority.origin};
  proof.validityUi=await require('./lib/C119-real-non-nft-signing-ui.cjs').run({context,extensionPage:page,owner,
   forms:cases.map(r=>({name:r.kind,kind:r.kind,route:r.route})),approvals:cases.map(r=>({name:r.kind,prepared:r.approval.prepared})),
   demoFile:path.join(logs,'20261008-C114-validity-demo-build-02.json'),setStage:value=>{stage=value},
   onOrigin:origin=>allowed.add(origin),onCase:row=>{if(row.diagnosticOnly)validityDiagnostics.push(row);else if(row.cleanupOnly)validityCleanup.push(row);else validityRows.push(row);console.log(JSON.stringify({stage,validityCases:validityRows.length,cleanupOnly:!!row.cleanupOnly}))},
   journal:snapshot,initialJournal:proof.initialJournal,frames,flush:()=>Promise.all(jobs),environment:validityOrigin,build});
  proof.validityCleanup=validityCleanup;proof.validityDiagnostics=validityDiagnostics;check('12 normal non-NFT sign-only popups and Approve/Disconnect with unchanged journal',proof.validityUi.signatures===12);
  stage='normal relock and private-source preservation';await page.goto(base+'#/tokens');await page.getByTestId('lock-account-button').click();await expect(page.getByTestId('unlock-account-button')).toBeVisible();
  proof.finalJournal=await snapshot();assert.deepEqual(proof.finalJournal,proof.initialJournal);proof.cipherAfter=await cipher();assert.deepEqual(proof.cipherAfter,proof.cipherBefore);
  for(const[f,h]of Object.entries(protectedPins))assert.equal(sha(f),h);for(const[f,h]of Object.entries(build.artifacts))assert.equal(sha(path.join(build.output,f)),h);
  assert.deepEqual(forbidden,[]);assert.deepEqual(pageErrors,[]);assert.equal(executeRequests,0);assert(!captureErrors.some(r=>r.url.endsWith('/SimulateTransaction')));
  check('all original1015 private files and imported ciphertext held; normal relock; zero Execute',true);
  assert.deepEqual(heldGateway(),gatewayAuthority);proof.gatewayAuthority=gatewayAuthority;proof={...proof,passed:true,observedAt:new Date().toISOString(),source:build.sourceAfter,profile,fixture,h0:window.h0,generation:window.generation,owner,stakeId,validator,
   cases,checks,simulations,frames,traffic,forbidden,captureErrors,pageErrors,singleUiSurfaces,ownExistingStartupUiReused:true,extraPagesCreatedByTest:0,extraPagesCreatedCountScope:'internal startup only',actualNormalDappValidityPagesCreated:14,signatures:12,executeRequests,certificateChanges:0,originalProfilesOpened:0,protectedOriginalFilesHeld:1015,
   faultInjectionExplicit:true,originalApprovalObjectsModified:false,responsesOrJournalInjected:false,currentC109UnsignedInternalAccepted:true,isolatedGatewayOnly:true,C44RuntimeReplaced:false,coinUnhandledRejectionResolved:true,parentTX01Complete:false,actualNonNftWalletStandardValidityUiAccepted:true,actualNonNftWalletStandardSigningAccepted:true,nftBusinessRequests:0,fullNonNftAuthorizationAccepted:false,fullNonNftPhaseAccepted:false,
   inputsSha256:Object.fromEntries([__filename,path.join(logs,'20261008-C119-non-nft-signing-tools-source-prepared-01.json'),path.join(logs,'20261008-C119-non-nft-signing-tools-qualified-01.json'),path.resolve(windowFile),buildFile,originalFile,profileFile,fixtureIntent,gatewayFile,lineage.qualificationFile,path.join(__dirname,'lib/C119-current-core-gateway-ownership.cjs'),path.join(__dirname,'lib/current-ui-staking-gas-fault.cjs'),path.join(__dirname,'lib/current-ui-coin-gas-fault.cjs'),path.join(logs,'20261008-C110-single-ui-complete-matrix-design.md'),path.join(logs,'20261008-C110-single-ui-staking-independent-01.json'),path.join(logs,'20261008-C118-non-nft-signing-tools-source-prepared-01.json'),path.join(logs,'20261008-C118-preview-diagnostic-source-prepared-02.json'),path.join(logs,'20261008-C118-signature-result-wait-source-prepared-03.json'),path.join(logs,'20261008-C118-non-nft-signing-ui-02.json'),path.join(logs,'20261008-C118-non-nft-signing-ui-01.json'),path.join(logs,'20261008-C118-non-nft-signing-tools-qualified-03.json'),path.join(logs,'20261008-C118-non-nft-sign-only-design.md'),path.join(logs,'20261008-C117-popup-url-wait-source-prepared-02.json'),path.join(logs,'20261008-C117-non-nft-validity-ui-01.json'),path.join(logs,'20261008-C114-validity-demo-build-02.json'),path.join(__dirname,'lib/C119-real-non-nft-signing-ui.cjs'),path.join(__dirname,'lib/C114-nft-validity-variants-v2.cjs'),path.join(__dirname,'lib/C114-nft-wire-contract-v3.cjs')].map(f=>[f,sha(f)])),
   scope:'Actual current C109 dedicated profile unsigned coin/stake/original stake withdrawal final previews and GasData/expiration. Explicit source-mapped cloned-parameter gas-only fault, real enabled simulation, stale digest rejection and normal Back/new requestId. Twelve normal Wallet Standard sign-only results with final same-byte simulation and native VerifySignature; no original profile, Execute, response/journal/approval injection, native market gas change or full TX01/NFT acceptance.'};
 }catch(error){proof={...proof,passed:false,observedAt:new Date().toISOString(),stage,errorType:error.name,message:privateStage?'Private diagnostic withheld':String(error.message).replaceAll(password,'[redacted]').replaceAll(key.getSecretKey(),'[redacted]').slice(0,1000),cases,checks,simulations,frames,traffic,forbidden,captureErrors,pageErrors,executeRequests,partialValidityUiCases:validityRows,validityCleanup,validityDiagnostics,signatures:'not-finally-audited',returnedSignatures:validityRows.filter(r=>r.signedResult?.signature).length};
  if(page&&!privateStage&&!hook)proof.publicDiagnostic={route:new URL(page.url()).hash,text:(await page.locator('body').innerText().catch(()=>'')).slice(0,4000)};process.exitCode=1;
 }finally{
  if(hook)await hook.close().catch(()=>{});
  if(page&&!privateStage){try{await page.goto(new URL('ui.html',worker.url()).href+'#/tokens');if(await page.getByTestId('lock-account-button').isVisible())await page.getByTestId('lock-account-button').click()}catch{}}
  closing=true;if(context)await context.close();await Promise.all(jobs);
  fs.writeFileSync(output,JSON.stringify(proof,null,2)+'\n',{flag:'wx',mode:0o600});console.log(JSON.stringify({passed:proof.passed,stage:proof.stage,checks:checks.length,cases:cases.length,simulations:simulations.length,executeRequests}));
 }
})().catch(e=>{console.error(JSON.stringify({passed:false,errorType:e.name,stage:'preflight'}));process.exitCode=1});
