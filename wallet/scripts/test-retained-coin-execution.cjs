#!/usr/bin/env node
// Reuses the retained staking profile. One coin attempt only; subsequent runs are read-only.
const {chromium,expect}=require('@playwright/test');
const fs=require('node:fs'),path=require('node:path'),os=require('node:os'),crypto=require('node:crypto');
const assert=require('node:assert/strict');const {execFileSync}=require('node:child_process');
const {Transaction}=require('rtd-typescript/transactions');const {bcs}=require('rtd-typescript/bcs');
const {journal}=require('./lib/test-dapp-execution.cjs');
const root=path.join(os.homedir(),'.local/state/rtd-wallet-migration/dev-20261003-01/staking-execution-browser-01');
const execute=process.argv.includes('--execute');
let context,page,base,stage='admission',dispatches=0,simulations=0;
const provenance=[];
const write=(name,data)=>{const fd=fs.openSync(path.join(root,name),'wx',0o600);try{fs.writeFileSync(fd,JSON.stringify(data,null,2)+'\n');fs.fsyncSync(fd);}finally{fs.closeSync(fd);}};
const command=(method,args)=>page.evaluate(({method,args})=>new Promise((resolve,reject)=>{
 const port=chrome.runtime.connect({name:'rtd_ui<->background'}),id=crypto.randomUUID();const timer=setTimeout(()=>{port.disconnect();reject(new Error('command timeout'));},30000);
 port.onMessage.addListener(m=>{if(m.id!==id)return;clearTimeout(timer);port.disconnect();resolve(m.payload);});
 port.postMessage({id,payload:{type:'method-payload',method,args}});
}),{method,args});
(async()=>{
 const prior=JSON.parse(fs.readFileSync(path.join(root,'confirmed.json'),'utf8'));assert.equal(prior.passed,true);
 if(execute){
  assert.equal(fs.existsSync(path.join(root,'coin-attempt.json')),false,'existing coin attempt: recovery only');
  const audit=JSON.parse(fs.readFileSync(path.join(path.dirname(root),'dapp-execution-browser-01/fault-abort-current-worker-01-readonly.json'),'utf8'));
  assert(audit.passed&&audit.recoveryOnly&&audit.dispatches===0&&audit.journalAudit.length===4);
  assert(audit.journalAudit.every(row=>row.accountAddress===prior.accountAddress&&row.state==='confirmed-success'));
  const age=Date.now()-Date.parse(audit.auditedAt);assert(age>=0&&age<600000,'recent dApp journal audit required');
  const debug=JSON.parse(fs.readFileSync('migrationToGRpcOrGraphQLDoc/workLog/20261004-pre-coin-debug-recheck.json','utf8'));assert(Object.values(debug).every(value=>value===true));
 }else assert(fs.existsSync(path.join(root,'coin-attempt.json')),'no retained coin attempt');
 const {password}=JSON.parse(fs.readFileSync(path.join(root,'recovery-private.json'),'utf8'));
 const cert=path.join(path.dirname(root),'publication-foundation/native-query-ingress/server/tls.crt');
 const pub=execFileSync('openssl',['x509','-in',cert,'-pubkey','-noout']);const pin=crypto.createHash('sha256').update(execFileSync('openssl',['pkey','-pubin','-outform','DER'],{input:pub})).digest('base64');
 async function start(){
  stage='browser launch';
  context=await chromium.launchPersistentContext(path.join(root,'chromium-profile'),{executablePath:path.join(os.homedir(),'Library/Caches/ms-playwright/chromium-1243/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing'),headless:true,viewport:{width:800,height:600},args:[`--disable-extensions-except=${path.resolve('dist')}`,`--load-extension=${path.resolve('dist')}`,`--ignore-certificate-errors-spki-list=${pin}`]});
  context.on('request',r=>{if(/\/ExecuteTransaction(?:$|\?)/.test(r.url()))dispatches++;if(/\/SimulateTransaction(?:$|\?)/.test(r.url()))simulations++;});
  const worker=context.serviceWorkers()[0]||await context.waitForEvent('serviceworker');stage='current worker verification';const loaded=await require('./lib/current-extension-worker.cjs').ensure(context,worker);provenance.push(loaded.evidence);
  stage='open extension page';page=await context.newPage();
  await page.addInitScript(()=>{const connect=chrome.runtime.connect.bind(chrome.runtime);chrome.runtime.connect=(...args)=>{const port=connect(...args),post=port.postMessage.bind(port);port.postMessage=message=>{if(message?.payload?.method==='executePreparedTransaction'){const {digest,requestId,bytesBase64}=message.payload.args;window.__coinApproval={digest,requestId,bytesBase64};}return post(message);};return port;};});
  base=`chrome-extension://${new URL(loaded.worker.url()).host}/ui.html`;await page.goto(base);
 }
 await start();
 const accounts=await command('getStoredEntities',{type:'accounts'});assert.equal(accounts.args.entities.length,1);assert.equal(accounts.args.entities[0].id,prior.accountId);assert.equal(accounts.args.entities[0].isLocked,true);
 const before=await journal(page);assert(before.some(row=>row.digest===prior.digest&&row.state==='confirmed-success'));
 let execution;
 if(execute){
  assert.equal(before.length,1,'all previous records must be terminal and known');
  stage='actual account unlock UI';
  const unlock=page.getByRole('button',{name:/^(解锁账户|Unlock Account)$/});
  await expect(unlock).toBeVisible({timeout:60000});await unlock.click();
  await page.locator('input[name=password]').fill(password);
  await page.getByRole('button',{name:/^(解锁|Unlock)$/}).click();
  await expect(page.locator('input[name=password]')).toHaveCount(0);
  await expect(unlock).toHaveCount(0);
  assert.equal((await command('getStoredEntities',{type:'accounts'})).args.entities[0].isLocked,false);
  // Observe the real UI approval message without altering its payload or the background handler.

  execution=await require('./lib/test-extension-coin-preview.cjs')({page,accountAddress:prior.accountAddress,setStage:value=>{stage=value;},execute:async({send})=>{
   write('coin-attempt.json',{accountId:prior.accountId,accountAddress:prior.accountAddress,priorDigest:prior.digest,atomicAmount:'1',recipient:prior.accountAddress,startedAt:new Date().toISOString(),state:'about-to-approve'});
   stage='single coin approval';await send.click();
   await expect.poll(()=>page.evaluate(()=>!!window.__coinApproval),{timeout:60000}).toBe(true);
   const approved=await page.evaluate(()=>window.__coinApproval);
   write('coin-approved.json',{digest:approved.digest,requestId:approved.requestId});
   const transaction=Transaction.from(approved.bytesBase64);assert.equal(await transaction.getDigest(),approved.digest);assert.equal(transaction.getData().sender,prior.accountAddress);
   stage='coin terminal journal';await expect.poll(async()=>(await journal(page)).find(row=>row.digest===approved.digest)?.state,{timeout:90000,intervals:[500,1000,3000]}).toBe('confirmed-success');
   const record=(await journal(page)).find(row=>row.digest===approved.digest);assert.equal(record.requestId,approved.requestId);assert.equal(record.receipt.success,true);
   const effects=bcs.TransactionEffects.parse(Buffer.from(record.receipt.effectsBase64,'base64')),body=effects.$kind==='V2'?effects.V2:effects.V1;assert.equal(body.transactionDigest,approved.digest);assert.equal(body.status.$kind,'Success');
   await expect.poll(()=>new URL(page.url()).hash,{timeout:30000}).toContain('/receipt?');assert.equal(new URLSearchParams(new URL(page.url()).hash.split('?')[1]).get('txdigest'),approved.digest);
   const result={passed:true,digest:approved.digest,requestId:approved.requestId,approvedBytesDigestMatches:true,effectsSuccess:true,receiptNavigation:true};write('coin-confirmed.json',result);return result;
  }});
  stage='browser restart';await context.close();context=undefined;await start();
 }
 stage='locked original digest verification';
 const restored=await command('getStoredEntities',{type:'accounts'});assert.equal(restored.args.entities[0].isLocked,true);
 const recovery=await command('recoverPreparedTransaction',{accountId:prior.accountId});assert.notEqual(recovery.error,true);
 let approval;
 if(fs.existsSync(path.join(root,'coin-approved.json'))) approval=JSON.parse(fs.readFileSync(path.join(root,'coin-approved.json'),'utf8'));
 else {
  // If observation failed after dispatch, use the durable journal; never approve again.
  const candidates=(await journal(page)).filter(row=>row.digest!==prior.digest);
  assert.equal(candidates.length,1,'cannot identify a single retained coin digest');
  approval={digest:candidates[0].digest,requestId:candidates[0].requestId};
  write('coin-approved.json',approval);
 }
 await expect.poll(async()=>(await journal(page)).find(row=>row.digest===approval.digest)?.state,{timeout:45000}).toBe('confirmed-success');
 const after=await journal(page);assert.equal(after.length,2);assert(after.every(row=>[prior.digest,approval.digest].includes(row.digest)&&row.state==='confirmed-success'));
 assert.equal(dispatches,execute?1:0);
 const result={passed:true,recoveryOnly:!execute,digest:approval.digest,dispatches,simulations,lockedRestartJournalPreserved:true,records:after.map(({digest,state})=>({digest,state})),provenance,scope:execute?'real coin UI approval and original digest terminal persistence; no chain-failure or full trial acceptance':'read-only current-worker audit of retained coin and stake terminal journals; no new approval, simulation or dispatch'};
 if(execute)write('coin-restart-verified.json',result);
 console.log(JSON.stringify(result,null,2));
})().catch(error=>{console.error(JSON.stringify({passed:false,stage,errorType:error.name,message:['admission','browser launch','current worker verification','open extension page'].includes(stage)?String(error.message).slice(0,250):undefined,dispatches,simulations}));process.exitCode=1;}).finally(async()=>{if(context)await context.close();});
