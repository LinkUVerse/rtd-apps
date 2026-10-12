#!/usr/bin/env node
// Read-only receipt UI verification of the retained wallet failure. Never approves a transaction.
const {chromium,expect}=require('@playwright/test');
const fs=require('node:fs'),path=require('node:path'),os=require('node:os'),crypto=require('node:crypto');
const assert=require('node:assert/strict');
const {execFileSync}=require('node:child_process');
const {journal}=require('./lib/test-dapp-execution.cjs');
const root=path.join(os.homedir(),'.local/state/rtd-wallet-migration/dev-20261003-01/dapp-execution-browser-01');
let context,page,stage='launch',dispatches=0,simulations=0;
const command=(method,args)=>page.evaluate(({method,args})=>new Promise((resolve,reject)=>{
 const port=chrome.runtime.connect({name:'rtd_ui<->background'}),id=crypto.randomUUID();
 const timer=setTimeout(()=>{port.disconnect();reject(new Error('command timeout'));},30000);
 port.onMessage.addListener(m=>{if(m.id!==id)return;clearTimeout(timer);port.disconnect();resolve(m.payload);});
 port.postMessage({id,payload:{type:'method-payload',method,args}});
}),{method,args});
(async()=>{
 const confirmed=JSON.parse(fs.readFileSync(path.join(root,'fault-execution-failure-01.json'),'utf8'));assert.equal(confirmed.passed,true);
 const known=new Set(confirmed.journalAudit.map(row=>row.digest));assert.equal(known.size,5);
 const {password}=JSON.parse(fs.readFileSync(path.join(root,'recovery-private.json'),'utf8'));
 const cert=path.join(path.dirname(root),'publication-foundation/native-query-ingress/server/tls.crt');
 const pub=execFileSync('openssl',['x509','-in',cert,'-pubkey','-noout']);
 const pin=crypto.createHash('sha256').update(execFileSync('openssl',['pkey','-pubin','-outform','DER'],{input:pub})).digest('base64');
 context=await chromium.launchPersistentContext(path.join(root,'chromium-profile'),{
  executablePath:path.join(os.homedir(),'Library/Caches/ms-playwright/chromium-1243/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing'),headless:true,viewport:{width:800,height:600},
  args:[`--disable-extensions-except=${path.resolve('dist')}`,`--load-extension=${path.resolve('dist')}`,`--ignore-certificate-errors-spki-list=${pin}`],
 });
 context.on('request',r=>{if(/\/ExecuteTransaction(?:$|\?)/.test(r.url()))dispatches++;if(/\/SimulateTransaction(?:$|\?)/.test(r.url()))simulations++;});
 const worker=context.serviceWorkers()[0]||await context.waitForEvent('serviceworker');
 const loaded=await require('./lib/current-extension-worker.cjs').ensure(context,worker);
 page=await context.newPage();const base=`chrome-extension://${new URL(loaded.worker.url()).host}/ui.html`;
 await page.goto(base);
 stage='locked journal verification';
 const accounts=await command('getStoredEntities',{type:'accounts'});
 console.log(JSON.stringify({retainedAccounts:accounts.args.entities.map(({id,address,isLocked})=>({id,address,isLocked}))}));
 stage='locked account identity';assert.equal(accounts.args.entities.length,1);assert.equal(accounts.args.entities[0].id,confirmed.accountId);
 stage='account initially locked';assert.equal(accounts.args.entities[0].isLocked,true);
 stage='retained terminal record';const before=await journal(page);assert.equal(before.length,known.size);assert(before.every(row=>known.has(row.digest)&&row.state===(row.digest===confirmed.digest?'confirmed-failure':'confirmed-success')));
 stage='locked read-only recovery command';const recovery=await command('recoverPreparedTransaction',{accountId:confirmed.accountId});console.log(JSON.stringify({recoveryType:recovery.type,error:recovery.error,message:recovery.error?String(recovery.message).slice(0,180):undefined}));assert.notEqual(recovery.error,true);
 stage='unlock retained receipt';
 assert.equal((await command('unlockAccountSourceOrAccount',{id:confirmed.accountId,password})).type,'done');
 // Unlock was a background command; open a fresh UI document so its account
 // query observes that result instead of the original tab's cached locked account.
 page=await context.newPage();
 await page.goto(`${base}#/receipt?txdigest=${confirmed.digest}&from=tokens`);
 stage='confirmed receipt visible';
 await expect.poll(async()=>{
  const fallback=await page.getByText('交易已确认失败。',{exact:true}).count();
  const statuses=await page.getByTestId('transaction-status').allTextContents();
  const status=statuses[0];
  return fallback>0||status==='交易失败';
 },{timeout:60000,intervals:[500,1000,3000]}).toBe(true);
 stage='failure details visible';
 await expect(page.getByTestId('transaction-status')).toHaveText('交易失败',{timeout:60000});
 await expect(page.getByText(/MoveAbort|execution_gate|visit/).first()).toBeVisible({timeout:15000});
 stage='failure gas visible';
 await expect.poll(async()=>{const text=await page.locator('body').innerText();return /网络费用\n你支付\n[0-9.,]+\s*RTD/.test(text);},{timeout:60000,intervals:[500,1000,3000]}).toBe(true);
 const text=await page.locator('body').innerText();
 const after=await journal(page);assert.equal(after.length,known.size);assert(after.every(row=>known.has(row.digest)&&row.state===(row.digest===confirmed.digest?'confirmed-failure':'confirmed-success')));
 assert.equal(dispatches,0);assert.equal(simulations,0);
 console.log(JSON.stringify({passed:true,digest:confirmed.digest,lockedJournalPreserved:true,recoveryResponseType:recovery.type,confirmedReceiptVisible:true,failureReasonVisible:true,gasVisible:true,receiptText:text,dispatches,simulations,workerProvenance:loaded.evidence,scope:'retained actual wallet MoveAbort receipt UI from original digest; five terminal records preserved, no preparation, signing or execution'},null,2));
})().catch(async error=>{const diagnostic=stage==='confirmed receipt visible'||stage==='failure details visible'||stage==='failure gas visible'?{route:new URL(page.url()).hash,body:(await page.locator('body').innerText()).slice(0,3000)}:undefined;console.error(JSON.stringify({passed:false,stage,errorType:error.name,diagnostic}));process.exitCode=1;}).finally(async()=>{if(context)await context.close();});
