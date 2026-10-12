#!/usr/bin/env node
// Actual original-account metadata-backed staking amount form. No review click, approval, simulation or dispatch.
process.env.PW_EXPERIMENTAL_SERVICE_WORKER_NETWORK_EVENTS='1';
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),os=require('node:os'),crypto=require('node:crypto');
const {execFileSync}=require('node:child_process');
const {chromium,expect}=require('@playwright/test');
const {journal}=require('./lib/test-dapp-execution.cjs');
const sha=value=>crypto.createHash('sha256').update(value).digest('hex');
const runtime=path.join(os.homedir(),'.local/state/rtd-wallet-migration/dev-20261003-01');
const original=path.join(runtime,'staking-execution-browser-01');
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
 const known=read(path.join(original,'confirmed.json'));assert(known.passed);
 const expected=new Set([known.digest,read(path.join(original,'coin-approved.json')).digest]);
 const {password}=read(path.join(original,'recovery-private.json'));
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
  args:[`--disable-extensions-except=${path.resolve('dist')}`,`--load-extension=${path.resolve('dist')}`,`--ignore-certificate-errors-spki-list=${spki}`],
 });
 await context.route(/\/ExecuteTransaction(?:$|\?)/,route=>route.abort());
 await context.route(/\/SimulateTransaction(?:$|\?)/,route=>route.abort());
 context.on('request',request=>{
  if(/\/ExecuteTransaction(?:$|\?)/.test(request.url()))dispatches++;
  if(/\/SimulateTransaction(?:$|\?)/.test(request.url()))simulations++;
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
 stage='original-account-and-journal';const accounts=(await command('getStoredEntities',{type:'accounts'})).args.entities;
 assert.equal(accounts.length,1);assert.equal(accounts[0].id,known.accountId);
 assert.equal(accounts[0].address,'0xa0ccc8bcc83f6c628340134f8546a21e0618fd1aaa02432bba454c4a2c2233da');
 const before=await journal(page);assert.equal(before.length,2);assert(before.every(r=>expected.has(r.digest)&&r.state==='confirmed-success'));
 await command('unlockAccountSourceOrAccount',{id:known.accountId,password});
 stage='public-validator-list';await page.goto(`${base}#/stake`);
 const rows=page.getByTestId('validator-list-item');await expect(rows.first()).toBeVisible({timeout:30000});
 const validatorCount=await rows.count();assert(validatorCount>0);
  stage='validator-selection';await rows.first().click();
  const next=page.getByTestId('select-validator-cta');await expect(next).toBeVisible();
  const displayFailures=()=>trace.filter(r=>r.kind==='WalletSnapshotAdmission'&&r.display&&r.finished&&r.errorCount>0).length;
  const failuresBeforeSelection=displayFailures();
  // Wait for an actual unrelated Display admission attempt; selection stays reachable.
 await expect.poll(displayFailures,{timeout:30000,intervals:[500,1000]}).toBeGreaterThan(failuresBeforeSelection);
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
 stage='final-journal-and-lock';const after=await journal(page);assert.deepEqual(after,before);
 await command('lockAccountSourceOrAccount',{id:known.accountId});
 assert.equal(dispatches,0);assert.equal(simulations,0);
 const evidence={passed:true,observedAt:new Date().toISOString(),accountAddress:accounts[0].address,validatorCount,validator,loadedUi,
  workerProvenance:loaded.evidence,compiledProfile:compiled,trace,originalTerminalRecords:2,journalUnchanged:true,
  validatorNavigationPassed:true,selectionSurvivedActualDisplayFailure:true,metadataBackedFormPassed:true,overPrecisionRefused:true,validAmountText:amountText,validatorsImage,formImage,simulations,dispatches,
  certificateMode:'Exact local SPKI exception; not normal CA or custom permission acceptance',
  scope:'Current actual UI public GraphQL staking list/selection/navigation with original account; metadata-backed form accepts 9 decimal input and rejects 10; no actual amount conversion, active position, preview, approval, redemption or trial acceptance.'};
 fs.writeFileSync(output,JSON.stringify(evidence,null,2)+'\n',{flag:'wx',mode:0o600});
 console.log(JSON.stringify({passed:true,validatorCount,validator,loadedUiSha256:loadedUi.loadedSha256,journalUnchanged:true,metadataBackedFormPassed:true,overPrecisionRefused:true,validAmountText:amountText,simulations,dispatches}));
})().catch(error=>{console.error(JSON.stringify({passed:false,stage,errorType:error.name}));process.exitCode=1}).finally(async()=>{if(context)await context.close()});
