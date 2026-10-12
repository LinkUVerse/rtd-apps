#!/usr/bin/env node
// Real extension fault test. Reuses retained profile; one attempt, then recovery only.
const {chromium,expect}=require('@playwright/test');
const fs=require('node:fs'),path=require('node:path'),os=require('node:os'),http=require('node:http'),crypto=require('node:crypto');
const assert=require('node:assert/strict');
const {execFileSync}=require('node:child_process');
const {journal}=require('./lib/test-dapp-execution.cjs');
const root=path.join(os.homedir(),'.local/state/rtd-wallet-migration/dev-20261003-01/dapp-execution-browser-01');
const verifiedCallerAbort=process.argv.includes('--verified-caller-abort');
const callerAbort=verifiedCallerAbort||process.argv.includes('--caller-abort');
const markerName=verifiedCallerAbort?'fault-abort-current-worker-01':callerAbort?'fault-abort-01':'fault-timeout-01';
const marker=path.join(root,markerName+'.json');
const recoveryOnly=process.argv.includes('--recover-only');
let context,server,page,worker,stage='initialization',dispatches=0,simulations=0;
const save=data=>fs.writeFileSync(marker,JSON.stringify(data,null,2)+'\n',{mode:0o600});
const command=(method,args)=>page.evaluate(({method,args})=>new Promise((resolve,reject)=>{
 const port=chrome.runtime.connect({name:'rtd_ui<->background'}),id=crypto.randomUUID();
 const timeout=setTimeout(()=>{port.disconnect();reject(new Error('command timeout'));},30000);
 port.onMessage.addListener(m=>{if(m.id!==id)return;clearTimeout(timeout);port.disconnect();resolve(m.payload);});
 port.postMessage({id,payload:{type:'method-payload',method,args}});
}),{method,args});
(async()=>{
 const prior=JSON.parse(fs.readFileSync(path.join(root,'confirmed.json'),'utf8'));
 assert.equal(prior.passed,true);
 const {password}=JSON.parse(fs.readFileSync(path.join(root,'recovery-private.json'),'utf8'));
 let evidence=recoveryOnly?JSON.parse(fs.readFileSync(marker,'utf8')):undefined;
 if(!recoveryOnly) assert.equal(fs.existsSync(marker),false,'existing attempt requires --recover-only');
 const certificate=path.join(os.homedir(),'.local/state/rtd-wallet-migration/dev-20261003-01/publication-foundation/native-query-ingress/server/tls.crt');
 const pub=execFileSync('openssl',['x509','-in',certificate,'-pubkey','-noout']);
 const der=execFileSync('openssl',['pkey','-pubin','-outform','DER'],{input:pub});
 const pin=crypto.createHash('sha256').update(der).digest('base64');
 async function start(){
  context=await chromium.launchPersistentContext(path.join(root,'chromium-profile'),{
   executablePath:path.join(os.homedir(),'Library/Caches/ms-playwright/chromium-1243/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing'),headless:true,viewport:{width:800,height:600},
   args:[`--disable-extensions-except=${path.resolve('dist')}`,`--load-extension=${path.resolve('dist')}`,'--window-size=800,600','--window-position=0,0',`--ignore-certificate-errors-spki-list=${pin}`],
  });
  context.on('request',r=>{if(/\/ExecuteTransaction(?:$|\?)/.test(r.url()))dispatches++;if(/\/SimulateTransaction(?:$|\?)/.test(r.url()))simulations++;});
  worker=context.serviceWorkers()[0]||await context.waitForEvent('serviceworker');
  const loaded=await require('./lib/current-extension-worker.cjs').ensure(context,worker);worker=loaded.worker;
  console.log(JSON.stringify({workerProvenance:loaded.evidence}));
  page=await context.newPage();await page.goto(`chrome-extension://${new URL(worker.url()).host}/ui.html`);
 }
 await start();
 if(!recoveryOnly){
  stage='prior journal admission';
  const before=await journal(page);
  const admitted=[prior.digest];
  if(callerAbort){const timeout=JSON.parse(fs.readFileSync(path.join(root,'fault-timeout-01.json'),'utf8'));assert.equal(timeout.passed,true);admitted.push(timeout.digest);}
  if(verifiedCallerAbort){const old=JSON.parse(fs.readFileSync(path.join(root,'fault-abort-01-readonly.json'),'utf8'));assert.equal(old.passed,true);assert.equal(old.recovered.receipt.success,true);admitted.push(old.digest);}
  assert.equal(before.length,admitted.length);
  assert(before.every(record=>admitted.includes(record.digest)&&record.state==='confirmed-success'));
  const accounts=await command('getStoredEntities',{type:'accounts'});assert.equal(accounts.args.entities.length,1);
  const account=accounts.args.entities[0];assert.equal(account.address,prior.journal.accountAddress);
  assert.equal((await command('unlockAccountSourceOrAccount',{id:account.id,password})).type,'done');
  const demoRoot=fs.realpathSync('/tmp/rtd-wallet-modern-demo-20261004');
  server=http.createServer((req,res)=>{const name=new URL(req.url,'http://localhost').pathname;const file=path.resolve(demoRoot,'.'+(name==='/'?'/index.html':name));
   if(!file.startsWith(demoRoot+path.sep)||!fs.existsSync(file)||!fs.statSync(file).isFile()){res.writeHead(404).end();return;}
   res.setHeader('Content-Type',file.endsWith('.js')?'text/javascript':file.endsWith('.css')?'text/css':'text/html');fs.createReadStream(file).pipe(res);
  });await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  const demo=await context.newPage();await demo.goto(`http://127.0.0.1:${server.address().port}`);
  stage='connect';const connection=context.waitForEvent('page',{timeout:20000});connection.catch(()=>{});
  await demo.getByRole('button',{name:'Connect',exact:true}).click();const connectPage=await connection;
  await connectPage.getByRole('button',{name:/^(继续|Continue)$/}).click();await connectPage.getByRole('button',{name:/^(连接|Connect)$/}).click();
  await demo.getByTestId('accounts-list').waitFor();
  stage='install worker timeout fault';
  await worker.evaluate(()=>{
   const nativeFetch=globalThis.fetch.bind(globalThis);
   const state=globalThis.__walletFault={dispatches:0,upstreamResponded:false,timeoutObserved:false,abortObserved:false,lookupsBlocked:0};
   globalThis.fetch=async(input,init)=>{
    const url=String(input instanceof Request?input.url:input);
    if(/\/ExecuteTransaction(?:$|\?)/.test(url)){
     if(++state.dispatches!==1)throw new Error('fault test forbids another dispatch');
     const response=await nativeFetch(input,init);await response.arrayBuffer();state.upstreamResponded=true;state.status=response.status;
     const signal=init.signal;
     return new Promise((resolve,reject)=>{const abort=()=>{state.abortObserved=true;state.timeoutObserved=signal.reason?.name==='TimeoutError';reject(signal.reason);};if(signal.aborted)abort();else signal.addEventListener('abort',abort,{once:true});});
    }
    if(state.dispatches&&/\/(?:GetTransaction|BatchGetTransactions)(?:$|\?)/.test(url)){state.lookupsBlocked++;throw new TypeError('fault test withholds recovery until restart');}
    return nativeFetch(input,init);
   };
  });
  stage='prepare execution';const opened=context.waitForEvent('page',{timeout:20000});opened.catch(()=>{});
  await demo.getByRole('button',{name:callerAbort?'Start cancellable execute':'Send transaction',exact:true}).click();const approval=await opened;
  const approve=approval.getByRole('button',{name:/^(批准|Approve)$/});await expect(approve).toBeEnabled({timeout:60000});
  const digest=(await approval.getByText(/^(交易摘要|Transaction digest):/).innerText()).split(':').pop().trim();
  evidence={state:'about-to-approve',digest,requestId:new URL(approval.url()).hash.split('/').pop(),accountId:account.id,account:account.address,priorDigest:prior.digest,startedAt:new Date().toISOString()};
  fs.writeFileSync(marker,JSON.stringify(evidence,null,2)+'\n',{flag:'wx',mode:0o600});
  stage=callerAbort?'caller abort after upstream response':'wait real execution timeout';await approve.click();
  if(callerAbort){
   await expect.poll(()=>worker.evaluate(()=>globalThis.__walletFault.upstreamResponded),{timeout:15000,intervals:[100,250]}).toBe(true);
   await demo.getByRole('button',{name:'Cancel transaction request',exact:true}).click();
   await expect(demo.getByRole('alert')).toContainText('Demo transaction cancelled');
   assert.equal(await demo.getByTestId('action-result').count(),0);
   stage='caller abort closes approval';
   await expect.poll(()=>approval.isClosed()).toBe(true);
   stage='caller abort reaches execution transport';
   await expect.poll(()=>worker.evaluate(()=>globalThis.__walletFault.abortObserved)).toBe(true);
   assert.equal(await worker.evaluate(()=>globalThis.__walletFault.timeoutObserved),false);
  }else await expect.poll(()=>worker.evaluate(()=>globalThis.__walletFault.timeoutObserved),{timeout:45000,intervals:[500,1000,2000]}).toBe(true);
  const fault=await worker.evaluate(()=>globalThis.__walletFault);assert.equal(fault.dispatches,1);assert.equal(fault.upstreamResponded,true);assert.equal(fault.status,200);
  const pending=(await journal(page)).find(row=>row.digest===digest);assert.equal(pending?.state,'dispatch-pending');
  evidence={...evidence,state:callerAbort?'pending-after-caller-abort':'pending-after-timeout',fault,dispatchesBeforeRestart:dispatches,pending};save(evidence);
  stage='close approval and browser';if(!approval.isClosed())await approval.close();await context.close();context=undefined;
  evidence={...evidence,popupClosed:true,browserClosed:true};save(evidence);
  await start();
 }
 stage='recover original digest after restart';
 // Startup/account wakeups may already recover while locked. The explicit command is read-only.
 const restoredAccounts=await command('getStoredEntities',{type:'accounts'});
 const lockedAccount=restoredAccounts.args.entities.find(account=>account.id===evidence.accountId);
 assert(lockedAccount&&lockedAccount.isLocked===true,'restart recovery must work without unlocking');
 const response=await command('recoverPreparedTransaction',{accountId:evidence.accountId});
 await expect.poll(async()=> (await journal(page)).find(row=>row.digest===evidence.digest)?.state,{timeout:45000,intervals:[500,1000,3000]}).toBe('confirmed-success');
 const records=await journal(page);
 const known=new Set([prior.digest,evidence.digest]);
 for(const name of ['fault-timeout-01','fault-abort-01','fault-abort-current-worker-01']){
  const file=path.join(root,name+'.json');
  if(fs.existsSync(file))known.add(JSON.parse(fs.readFileSync(file,'utf8')).digest);
 }
 assert(records.length>=(verifiedCallerAbort?4:callerAbort?3:2)&&records.length<=known.size&&records.every(row=>known.has(row.digest)));
 assert.equal(records.length,known.size,'all retained attempts must be present');
 assert(records.every(row=>row.state==='confirmed-success'&&row.receipt?.success===true),'all retained attempts must be terminal before another test');
 const journalAudit=records.map(({requestId,digest,state,accountAddress})=>({requestId,digest,state,accountAddress}));
 const recovered=records.find(row=>row.digest===evidence.digest);assert.equal(recovered.requestId,evidence.requestId);assert.equal(recovered.receipt.success,true);
 assert.equal(dispatches,recoveryOnly?0:1);
 const result={...evidence,state:'recovered-success',journalAudit,auditedAt:new Date().toISOString(),recovered,dispatches,simulations,recoveryResponseType:response.type,recoveryOnly,recoveredWhileLocked:true,passed:true,scope:recoveryOnly?'read-only recovery of retained original digest while locked; no claim about prior caller cancellation assertions':callerAbort?'real extension caller AbortSignal after real upstream response; durable pending survives approval cancellation and whole-browser restart; locked recovery with no resubmission':'real extension upstream response withheld until actual AbortSignal timeout; pending preserved through popup close and whole-browser worker restart; same digest recovered without resubmission'};
 if(recoveryOnly) fs.writeFileSync(path.join(root,markerName+'-readonly.json'),JSON.stringify(result,null,2)+'\n',{mode:0o600}); else save(result);
 console.log(JSON.stringify(result,null,2));
})().catch(async error=>{
 const failure={passed:false,stage,errorType:error.name,message:error.message.slice(0,220)};
 if(callerAbort&&!recoveryOnly&&fs.existsSync(marker)){
  try{failure.fault=await worker.evaluate(()=>globalThis.__walletFault);}catch{}
  try{failure.records=await journal(page);}catch{}
  failure.dispatches=dispatches;failure.simulations=simulations;
  fs.writeFileSync(path.join(root,markerName+'-failure.json'),JSON.stringify(failure,null,2)+'\n',{flag:'wx',mode:0o600});
 }
 console.error(JSON.stringify(failure));process.exitCode=1;
}).finally(async()=>{
 if(context)await context.close();if(server){server.closeAllConnections();await new Promise(resolve=>server.close(resolve));}
 // Never delete retained browser data or attempt markers.
});
