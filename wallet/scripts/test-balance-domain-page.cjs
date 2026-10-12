#!/usr/bin/env node
// Copyright (c) LinkU Labs, Inc.
// SPDX-License-Identifier: Apache-2.0
// Actual current complete balances and native transfer preview. No final approval or Execute.
process.env.PW_EXPERIMENTAL_SERVICE_WORKER_NETWORK_EVENTS='1';
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),os=require('node:os'),crypto=require('node:crypto');
const {execFileSync}=require('node:child_process');
const {chromium,expect}=require('@playwright/test');
const {journal}=require('./lib/test-dapp-execution.cjs');
const {GrpcTypes}=require('rtd-typescript/grpc');
const {Transaction}=require('rtd-typescript/transactions');
const {bcs}=require('rtd-typescript/bcs');
const {normalizeRtdAddress}=require('rtd-typescript/utils');
const simulationWire=[];const simulationBytes=[];const freshReads=[];
const sha=value=>crypto.createHash('sha256').update(value).digest('hex');
const runtime=path.join(os.homedir(),'.local/state/rtd-wallet-migration/dev-20261003-01');
const original=path.join(runtime,'staking-execution-browser-01');
const read=file=>JSON.parse(fs.readFileSync(file,'utf8'));
let context,page,stage='launch',dispatches=0,simulations=0,outputFile,accountId;
let loadedEvidence;
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
 const [output]=process.argv.slice(2);assert(output&&!fs.existsSync(output));outputFile=output;
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
  if(/\/(GetBalance|ListOwnedObjects)(?:$|\?)/.test(request.url()))freshReads.push({method:request.url().match(/\/(GetBalance|ListOwnedObjects)(?:$|\?)/)[1],reviewedFullnode:request.url().startsWith('http://127.0.0.1:39400/')});
  if(new URL(request.url()).pathname!=='/graphql')return;
  const body=request.postDataJSON(),query=body?.query??'';
  const entry={kind:query.match(/query\s+(\w+)/)?.[1]??'unknown',display:query.includes('walletDisplayService'),metadata:query.includes('coinMetadata(coinType:'),balances:query.includes('balances(first:'),balanceCoverage:query.includes('type: \"Address\", field: \"balances\"'),checkpoint:query.match(/walletSnapshot: checkpoint\(sequenceNumber: (\d+)/)?.[1]};
  trace.push(entry);traced.set(request,entry);
 });
 context.on('response',async response=>{
  const entry=traced.get(response.request());if(!entry)return;
  entry.status=response.status();
  try {const body=await response.json();entry.errorCount=body.errors?.length??0;if(entry.metadata)entry.metadataDecimals=body.data?.walletSnapshot?.query?.coinMetadata?.decimals;if(entry.balances)entry.balancePage=body.data?.walletSnapshot?.query?.address?.balances;entry.finished=true;} catch {entry.responseFailed=true;}
 });
 stage='current-worker-proof';const worker=context.serviceWorkers()[0]||await context.waitForEvent('serviceworker');
 const loaded=await require('./lib/current-extension-worker.cjs').ensure(context,worker);
 page=await context.newPage();const base=`chrome-extension://${new URL(loaded.worker.url()).host}/ui.html`;
 await page.goto(base);
 stage='current-ui-proof';const loadedUi=await uiProof(page);
 stage='original-account-and-journal';const accounts=(await command('getStoredEntities',{type:'accounts'})).args.entities;
 assert.equal(accounts.length,1);assert.equal(accounts[0].id,known.accountId);accountId=known.accountId;
 assert.equal(accounts[0].address,'0xa0ccc8bcc83f6c628340134f8546a21e0618fd1aaa02432bba454c4a2c2233da');
 const before=await journal(page);assert.equal(before.length,2);assert(before.every(r=>expected.has(r.digest)&&r.state==='confirmed-success'));
 await command('unlockAccountSourceOrAccount',{id:known.accountId,password});
 stage='current-token-home';await page.goto(`${base}#/tokens`);
 const balance=page.getByTestId('coin-balance');await expect(balance).toBeVisible({timeout:30000});
 const publicBalance=read('migrationToGRpcOrGraphQLDoc/workLog/20261005-balance-domain-public-tls-01.json');assert(publicBalance.passed);
 const expectedBalance=publicBalance.result.value.find(b=>b.coinType.endsWith('::rtd::RTD'));assert(expectedBalance);
 const rounded=BigInt(expectedBalance.balance)/10000000n;
 const formatted=`${rounded/100n}.${String(rounded%100n).padStart(2,'0')}`;
 await expect(balance).toContainText(formatted);await expect(balance).toContainText('RTD');
 const displayFailures=()=>trace.filter(r=>r.kind==='WalletSnapshotAdmission'&&r.display&&r.finished&&r.errorCount>0).length;
 await expect.poll(displayFailures,{timeout:30000,intervals:[500,1000]}).toBeGreaterThan(0);
 await expect(balance).toBeVisible();await expect(balance).toContainText(formatted);
 const balancePages=()=>trace.filter(r=>r.balances&&r.finished&&r.status===200&&r.errorCount===0);
 await expect.poll(()=>balancePages().length,{timeout:10000}).toBeGreaterThan(0);
 assert(balancePages().every(r=>r.checkpoint===publicBalance.result.snapshot.checkpoint&&r.balancePage.pageInfo.hasNextPage===false&&r.balancePage.nodes.some(b=>b.totalBalance===expectedBalance.balance)));
 assert(trace.some(r=>r.kind==='WalletSnapshotRevalidate'&&r.balanceCoverage&&r.finished&&r.status===200&&r.errorCount===0));
 const homeImage=output.replace(/\.json$/, '-tokens.png');assert(!fs.existsSync(homeImage));await page.screenshot({path:homeImage});
 const send=page.getByTestId('send-coin-button');await expect(send).toBeEnabled();await send.click();await page.waitForURL(/#\/send\?type=/);
 stage='current-active-coins-card';
 const activeCard=page.locator('a[href*="#/send/select?"]');await expect(activeCard).toBeVisible({timeout:30000});await expect(activeCard).toContainText('available');await expect(activeCard).toContainText(formatted);
 const activeCardText=await activeCard.innerText();
 const amount=page.getByTestId('coin-amount-input');await expect(amount).toBeVisible({timeout:30000});
 await amount.fill('1.000000001');await amount.blur();
 await page.locator('[name="to"]').fill(accounts[0].address);await page.locator('[name="to"]').blur();
 const review=page.getByRole('button',{name:/^(检查|Review)$/});await expect(review).toBeEnabled({timeout:30000});
 const formImage=output.replace(/\.json$/, '-form.png');assert(!fs.existsSync(formImage));await page.screenshot({path:formImage});
 stage='formal-native-transfer-preview';await review.click();
 const approve=page.getByRole('button',{name:/^(立即发送|Send Now)$/});await expect(approve).toBeEnabled({timeout:30000});
 await expect(page.getByText(/^(交易有效期|Transaction validity)$/)).toBeVisible();
 assert(simulations>0);assert(simulationWire.every(r=>r.decodePassed&&r.checksEnabled&&r.targetIsReviewedFullnode));assert(simulationBytes.length>0);
 assert(freshReads.some(r=>r.method==='GetBalance')&&freshReads.some(r=>r.method==='ListOwnedObjects'));assert(freshReads.every(r=>r.reviewedFullnode));
 const finalBytes=simulationBytes.at(-1),transaction=Transaction.from(finalBytes),data=transaction.getData();assert.equal(data.sender,accounts[0].address);
 const split=data.commands.find(c=>c.SplitCoins)?.SplitCoins;assert(split&&split.amounts.length===1);const amountIndex=split.amounts[0].Input;assert.equal(typeof amountIndex,'number');
 assert.equal(bcs.u64().parse(Buffer.from(data.inputs[amountIndex].Pure.bytes,'base64')),'1000000001');
 const transfer=data.commands.find(c=>c.TransferObjects)?.TransferObjects;assert(transfer);const toIndex=transfer.address.Input;assert.equal(typeof toIndex,'number');assert.equal(normalizeRtdAddress(bcs.Address.parse(Buffer.from(data.inputs[toIndex].Pure.bytes,'base64'))),accounts[0].address);
 const digest=await transaction.getDigest();await expect(page.getByTestId('coin-preview-digest')).toContainText(digest);
 await expect(page.getByText('1.000000001',{exact:true})).toBeVisible();
 const previewImage=output.replace(/\.json$/, '-preview.png');assert(!fs.existsSync(previewImage));await page.screenshot({path:previewImage});
 const preview={passed:true,digest,bytesSha256:sha(finalBytes),atomicAmount:'1000000001',recipient:accounts[0].address,sender:data.sender,approvalEnabled:true,approvalClicks:0,simulationWire,previewImage};
 await page.getByRole('button',{name:/^(返回|Back)$/}).click();await expect(amount).toBeVisible();
 await page.goto(`${base}#/tokens`);
 stage='final-journal-and-lock';const after=await journal(page);assert.deepEqual(after,before);
 await command('lockAccountSourceOrAccount',{id:known.accountId});
 assert.equal(dispatches,0);
 const evidence={passed:true,observedAt:new Date().toISOString(),accountAddress:accounts[0].address,loadedUi,
  workerProvenance:loaded.evidence,compiledProfile:compiled,trace,freshReads,originalTerminalRecords:2,journalUnchanged:true,
  preview,homepageBalancePassed:true,activeCoinsCardPassed:true,balanceSurvivedActualDisplayFailure:true,
  historicalBalance:expectedBalance.balance,checkpoint:publicBalance.result.snapshot.checkpoint,formattedBalance:formatted,activeCardText,homeImage,formImage,simulations,dispatches,
  certificateMode:'Exact local SPKI exception; not normal CA or custom permission acceptance',
  scope:'Current actual original-account UI complete balance homepage and ActiveCoinsCard at independently covered S while full Display asset admission fails. Native form uses separate fresh Fullnode funds, converts metadata-backed 9-place amount exactly and completes formal preview. No final approval, signature, execution, nonnative/all-pay or complete trial acceptance.'};
 fs.writeFileSync(output,JSON.stringify(evidence,null,2)+'\n',{flag:'wx',mode:0o600});
 console.log(JSON.stringify({passed:true,loadedUiSha256:loadedUi.loadedSha256,homepageBalancePassed:true,activeCoinsCardPassed:true,checkpoint:evidence.checkpoint,historicalBalance:evidence.historicalBalance,previewDigest:preview.digest,atomicAmount:preview.atomicAmount,journalUnchanged:true,simulations,dispatches}));
})().catch(async error=>{
 const diagnostic={passed:false,stage,errorType:error.name,messageFirstLine:String(error.message).split('\n')[0].slice(0,200),simulations,dispatches,freshReads,simulationWire,loadedEvidence,trace};
 if(page&&!page.isClosed()){
  diagnostic.route=new URL(page.url()).hash;
  diagnostic.alerts=(await page.getByRole('alert').allTextContents()).map(t=>t.slice(0,500));
  diagnostic.buttons=await page.getByRole('button').allTextContents();
  if(outputFile){diagnostic.failureImage=outputFile.replace(/\.json$/, '-failure.png');await page.screenshot({path:diagnostic.failureImage}).catch(()=>{});}
 }
 if(outputFile&&!fs.existsSync(outputFile))fs.writeFileSync(outputFile,JSON.stringify(diagnostic,null,2)+'\n',{flag:'wx',mode:0o600});
 console.error(JSON.stringify({passed:false,stage,errorType:error.name,messageFirstLine:diagnostic.messageFirstLine,alerts:diagnostic.alerts,simulations,dispatches}));process.exitCode=1;
}).finally(async()=>{if(context){if(accountId&&page&&!page.isClosed())await command('lockAccountSourceOrAccount',{id:accountId}).catch(()=>{});await context.close();}});
