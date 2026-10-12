#!/usr/bin/env node
// Actual current metadata-backed stake preview. Formal simulations allowed; no final approval or Execute.
process.env.PW_EXPERIMENTAL_SERVICE_WORKER_NETWORK_EVENTS='1';
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),os=require('node:os'),crypto=require('node:crypto');
const {execFileSync}=require('node:child_process');
const {chromium,expect}=require('@playwright/test');
const {journal}=require('./lib/test-dapp-execution.cjs');
const {GrpcTypes}=require('rtd-typescript/grpc');
const {Transaction}=require('rtd-typescript/transactions');
const {bcs}=require('rtd-typescript/bcs');
const {Ed25519Keypair}=require('rtd-typescript/keypairs/ed25519');
const {normalizeRtdAddress}=require('rtd-typescript/utils');
const simulationWire=[];const simulationBytes=[];
const sha=value=>crypto.createHash('sha256').update(value).digest('hex');
const runtime=path.join(os.homedir(),'.local/state/rtd-wallet-migration/dev-20261003-01');
const original=path.join(runtime,'staking-current-preview-fresh-20261005-02');
const read=file=>JSON.parse(fs.readFileSync(file,'utf8'));
let context,page,stage='launch',dispatches=0,simulations=0;
const trace=[];
const traced=new Map();

async function uiProof(page){
 const cdp=await context.newCDPSession(page);
 try {
  let resolveScript;
  const parsed=new Promise(resolve=>{resolveScript=resolve});
  cdp.on('Debugger.scriptParsed',data=>{if(data.url===new URL('ui.js',page.url()).href)resolveScript(data.scriptId)});
  await cdp.send('Debugger.enable');
  let timer;const scriptId=await Promise.race([parsed,new Promise((_,reject)=>{timer=setTimeout(()=>reject(new Error('Current UI script lookup failed')),10000)})]);clearTimeout(timer);
  const {scriptSource}=await cdp.send('Debugger.getScriptSource',{scriptId});
  const disk=fs.readFileSync('dist/ui.js','utf8');assert.equal(scriptSource,disk);
  return {loadedSha256:sha(scriptSource),diskSha256:sha(disk),matchesDisk:true};
 } finally {await cdp.detach();}
}

async function command(method,args){
 const response=await page.evaluate(({method,args})=>new Promise((resolve,reject)=>{
  const port=chrome.runtime.connect({name:'rtd_ui<->background'}),id=crypto.randomUUID();
  const timer=setTimeout(()=>{port.disconnect();reject(new Error('Wallet command timed out'));},30000);
  port.onMessage.addListener(m=>{if(m.id!==id)return;clearTimeout(timer);port.disconnect();resolve(m.payload)});
  port.postMessage({id,payload:{type:'method-payload',method,args}});
 }),{method,args});
 assert.notEqual(response.error,true);return response;
}

(async()=>{
 const [output]=process.argv.slice(2);assert(output&&!fs.existsSync(output));
 fs.mkdirSync(original,{mode:0o700});
 const audit=read(path.join(runtime,'probe-deadline-original-journals-20261005-03.json'));
 assert(audit.passed && audit.lookups===7 && audit.simulations===0 && audit.dispatches===0);
 assert(Date.now()-Date.parse(audit.observedAt)<600000);
 const key=Ed25519Keypair.fromSecretKey(new Uint8Array(32).fill(7));
 const password=crypto.randomBytes(24).toString('base64url');
 fs.writeFileSync(path.join(original,'recovery-private.json'),JSON.stringify({password}),{flag:'wx',mode:0o600});
 const profileFile=path.join(runtime,'wallet-profile-20261004-03/profile.json');
 const profile=read(profileFile);assert.equal(profile.expectedGenesisDigest,'3tEPxLxUysGx4gfr8UEycvH7xohMWuwKVbTX5np4TCYj');
 const compiled=require('./lib/verify-extension-local-profile.cjs')({extension:path.resolve('dist'),profileFile});assert(compiled.passed);
 const cert=path.join(runtime,'publication-foundation/native-query-ingress/server/tls.crt');
 const pub=execFileSync('openssl',['x509','-in',cert,'-pubkey','-noout']);
 const pin=sha(execFileSync('openssl',['pkey','-pubin','-outform','DER'],{input:pub}));
 const spki=Buffer.from(pin,'hex').toString('base64');
 context=await chromium.launchPersistentContext(path.join(original,'chromium-profile'),{
  executablePath:path.join(os.homedir(),'Library/Caches/ms-playwright/chromium-1243/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing'),
  headless:true,viewport:{width:800,height:600},
  args:['--enable-unsafe-extension-debugging',`--disable-extensions-except=${path.resolve('dist')}`,`--load-extension=${path.resolve('dist')}`,`--ignore-certificate-errors-spki-list=${[spki,...['native-archive-bridge','native-account-ingress'].map(component=>{const cert=path.join(runtime,'publication-foundation',component,'server/tls.crt');const publicKey=execFileSync('openssl',['x509','-in',cert,'-pubkey','-noout']);return Buffer.from(sha(execFileSync('openssl',['pkey','-pubin','-outform','DER'],{input:publicKey})),'hex').toString('base64');})].join(',')}`],
 });
 const browserCDP=await context.browser().newBrowserCDPSession();await browserCDP.send('Extensions.loadUnpacked',{path:path.resolve('dist')});await browserCDP.detach();
 await context.route(/\/ExecuteTransaction(?:$|\?)/,route=>route.abort());
 context.on('request',request=>{
  if(/\/ExecuteTransaction(?:$|\?)/.test(request.url()))dispatches++;
  if(/\/SimulateTransaction(?:$|\?)/.test(request.url())){
    simulations++;
    try {
      const body=request.postDataBuffer();assert(body&&body.length>=5&&body[0]===0&&body.readUInt32BE(1)===body.length-5);
      const input=GrpcTypes.SimulateTransactionRequest.fromBinary(body.subarray(5));const bytes=input.transaction?.bcs?.value;
      simulationWire.push({decodePassed:true,checksEnabled:input.checks===GrpcTypes.SimulateTransactionRequest_TransactionChecks.ENABLED,targetIsReviewedFullnode:request.url().startsWith('http://127.0.0.1:39400/'),doGasSelection:input.doGasSelection===true,bytesSha256:bytes?.length?sha(bytes):null});
      if(bytes?.length)simulationBytes.push(Uint8Array.from(bytes));
    }catch{simulationWire.push({decodePassed:false});}
  }
  if(new URL(request.url()).pathname!=='/graphql')return;
  const body=request.postDataJSON(),query=body?.query??'';
  const entry={kind:query.match(/query\s+(\w+)/)?.[1]??'unknown',display:query.includes('walletDisplayService'),metadata:query.includes('coinMetadata(coinType:'),checkpoint:query.match(/walletSnapshot: checkpoint\(sequenceNumber: (\d+)/)?.[1]};
  trace.push(entry);traced.set(request,entry);
 });
 context.on('response',async response=>{
  const entry=traced.get(response.request());if(!entry)return;
  entry.status=response.status();
  try {const body=await response.json();entry.errorCount=body.errors?.length??0;if(entry.metadata)entry.metadataDecimals=body.data?.walletSnapshot?.query?.coinMetadata?.decimals;entry.finished=true;} catch {entry.responseFailed=true;}
 });
 stage='current-worker-proof';const worker=context.serviceWorkers()[0]||await context.waitForEvent('serviceworker');
 const loaded=await require('./lib/current-extension-worker.cjs').ensure(context,worker);
 page=await context.newPage();const base=`chrome-extension://${new URL(loaded.worker.url()).host}/ui.html`;
 await page.goto(base);
 stage='current-ui-proof';const loadedUi=await uiProof(page);
 stage='fresh-account-import';await page.goto(`${base}#/accounts/import-private-key`);
 await page.locator('textarea[name="privateKey"]').fill(key.getSecretKey());
 await page.locator('textarea[name="privateKey"]').blur();await page.locator('button[type="submit"]').click();
 await page.locator('input[name="password.input"]').fill(password);await page.locator('input[name="password.confirmation"]').fill(password);
 await page.locator('button#acceptedTos').click();await page.locator('button[type="submit"]').click();await page.waitForURL(/#\/tokens/);
 const accounts=(await command('getStoredEntities',{type:'accounts'})).args.entities;
 assert.equal(accounts.length,1);assert.equal(accounts[0].address,key.toRtdAddress());
 stage='fresh-local-network';
 const selected=await page.evaluate(()=>new Promise(resolve=>{const port=chrome.runtime.connect({name:'rtd_ui<->background'}),id=crypto.randomUUID();port.onMessage.addListener(m=>{if(m.id===id){port.disconnect();resolve(m.payload)}});port.postMessage({id,payload:{type:'set-network',network:{env:'local',customRpcUrl:null}}})}));assert.equal(selected.type,'done');
 const before=await journal(page);assert.equal(before.length,0);
 stage='public-validator-list';await page.evaluate(()=>{location.hash='/stake'});await page.waitForURL(/#\/stake$/);
 const rows=page.getByTestId('validator-list-item');await expect(rows.first()).toBeVisible({timeout:30000});
 const validatorCount=await rows.count();assert(validatorCount>0);
  stage='validator-selection';await rows.first().click();
  const next=page.getByTestId('select-validator-cta');await expect(next).toBeVisible();
  const displayFailures=()=>trace.filter(r=>r.kind==='WalletSnapshotAdmission'&&r.display&&r.finished&&r.errorCount>0).length;
  const failuresBeforeSelection=displayFailures();
  // Keep the current owning UI session while navigating, as the product links do.
 // Record unrelated Display outcome; do not require a manufactured failure.
 await page.waitForTimeout(500);
  await page.waitForTimeout(250);
  await expect(next).toBeVisible();
  const validatorsImage=output.replace(/\.json$/, '-validators.png');
  assert(!fs.existsSync(validatorsImage));await page.screenshot({path:validatorsImage});
 await next.click();await page.waitForURL(/#\/stake\/new\?address=/);
 const validator=new URLSearchParams(new URL(page.url()).hash.split('?')[1]).get('address');assert.match(validator,/^0x[0-9a-f]{64}$/);
 stage='metadata-backed-amount-form';
 const amount=page.getByTestId('stake-amount-input');await expect(amount).toBeVisible({timeout:30000});
 await expect.poll(()=>trace.filter(r=>r.metadata&&r.finished&&r.status===200&&r.errorCount===0&&r.metadataDecimals===9).length,{timeout:10000}).toBeGreaterThan(0);
 const review=page.getByRole('button',{name:/^(预览交易|Review transaction)$/});
 await amount.fill('1.0000000001');await amount.blur();await expect(review).toBeDisabled();
 await amount.fill('1.000000001');await amount.blur();await expect(review).toBeEnabled();
 const amountText=await amount.inputValue();assert.match(amountText,/^1\.000000001 RTD$/);
 assert(trace.filter(r=>r.metadata&&r.finished&&r.errorCount===0).every(r=>r.checkpoint&&Number(r.checkpoint)>0));
 const formImage=output.replace(/\.json$/, '-form.png');assert(!fs.existsSync(formImage));await page.screenshot({path:formImage});
 stage='formal-stake-preview';await review.click();
 const approve=page.getByRole('button',{name:/^(立即质押|Stake now)$/});await expect(approve).toBeEnabled({timeout:30000});
 assert(simulations>0);assert(simulationWire.every(r=>r.decodePassed&&r.checksEnabled&&r.targetIsReviewedFullnode));assert(simulationBytes.length>0);
 const finalBytes=simulationBytes.at(-1),transaction=Transaction.from(finalBytes),data=transaction.getData();assert.equal(data.sender,accounts[0].address);
 const stakeCall=data.commands.find(c=>c.MoveCall?.function==='request_add_stake')?.MoveCall;assert(stakeCall);assert.equal(stakeCall.package,normalizeRtdAddress('0x3'));assert.equal(stakeCall.module,'rtd_system');
 const split=data.commands.find(c=>c.SplitCoins)?.SplitCoins;assert(split&&split.amounts.length===1);const amountIndex=split.amounts[0].Input;assert.equal(typeof amountIndex,'number');
 assert.equal(bcs.u64().parse(Buffer.from(data.inputs[amountIndex].Pure.bytes,'base64')),'1000000001');
 const validatorIndex=stakeCall.arguments[2].Input;assert.equal(typeof validatorIndex,'number');assert.equal(normalizeRtdAddress(bcs.Address.parse(Buffer.from(data.inputs[validatorIndex].Pure.bytes,'base64'))),validator);
 const digest=await transaction.getDigest();await expect(page.getByText(new RegExp(digest))).toBeVisible();
 const previewImage=output.replace(/\.json$/, '-preview.png');assert(!fs.existsSync(previewImage));await page.screenshot({path:previewImage});
 const preview={passed:true,digest,bytesSha256:sha(finalBytes),atomicAmount:'1000000001',validator,sender:data.sender,approvalEnabled:true,approvalClicks:0,simulationWire,previewImage};
 await page.getByRole('button',{name:/^(返回|Back)$/}).click();await expect(amount).toBeVisible();
 stage='final-journal-and-lock';const after=await journal(page);assert.deepEqual(after,before);
 await command('lockAccountSourceOrAccount',{id:accounts[0].id});
 assert.equal(dispatches,0);
 const evidence={passed:true,observedAt:new Date().toISOString(),accountAddress:accounts[0].address,validatorCount,validator,loadedUi,
  workerProvenance:loaded.evidence,compiledProfile:compiled,trace,originalAuditRecords:7,freshTerminalRecords:0,journalUnchanged:true,
  preview,validatorNavigationPassed:true,actualUnrelatedDisplayFailures:displayFailures()-failuresBeforeSelection,metadataBackedFormPassed:true,overPrecisionRefused:true,validAmountText:amountText,validatorsImage,formImage,simulations,dispatches,
  certificateMode:'Exact local SPKI exception; not normal CA or custom permission acceptance',
  scope:'Current actual UI public GraphQL staking list/selection/navigation with fresh imported public dev account; metadata-backed form accepts 9 decimal input and rejects 10; actual atomic conversion and formal stake preview verified; no final approval, new execution, active position, redemption or complete trial acceptance.'};
 fs.writeFileSync(output,JSON.stringify(evidence,null,2)+'\n',{flag:'wx',mode:0o600});
 console.log(JSON.stringify({passed:true,validatorCount,validator,loadedUiSha256:loadedUi.loadedSha256,previewDigest:preview.digest,atomicAmount:preview.atomicAmount,journalUnchanged:true,metadataBackedFormPassed:true,overPrecisionRefused:true,validAmountText:amountText,simulations,dispatches}));
})().catch(error=>{fs.writeFileSync(path.join(original,'failure-private.txt'),error.stack||String(error),{flag:'wx',mode:0o600});console.error(JSON.stringify({passed:false,stage,errorType:error.name,simulations,dispatches,trace}));process.exitCode=1}).finally(async()=>{if(context)await context.close()});
