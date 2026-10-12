#!/usr/bin/env node
// Real local-chain MoveAbort after successful final simulation; exactly one wallet attempt.
const {chromium,expect}=require('@playwright/test');
const fs=require('node:fs'),path=require('node:path'),os=require('node:os'),http=require('node:http'),crypto=require('node:crypto');
const assert=require('node:assert/strict');
const {execFileSync,execFile}=require('node:child_process');
const {promisify}=require('node:util');
const {Transaction}=require('rtd-typescript/transactions');
const {bcs}=require('rtd-typescript/bcs');
const {journal}=require('./lib/test-dapp-execution.cjs');
const runtime=path.join(os.homedir(),'.local/state/rtd-wallet-migration/dev-20261003-01');
const root=path.join(runtime,'dapp-execution-browser-01');
const marker=path.join(root,'fault-execution-failure-01.json');
const recoveryOnly=process.argv.includes('--recover-only');
const fixtureFile=path.resolve('migrationToGRpcOrGraphQLDoc/workLog/20261004-failure-fixture-objects.json');
const fixture=JSON.parse(fs.readFileSync(fixtureFile,'utf8'));
let context,server,page,worker,approval,stage='initialization',dispatches=0,simulations=0,evidence;
function persist(file,data,exclusive=false){
 const fd=fs.openSync(file,exclusive?'wx':'w',0o600);
 try{fs.writeFileSync(fd,JSON.stringify(data,null,2)+'\n');fs.fsyncSync(fd);}finally{fs.closeSync(fd);}
 const dir=fs.openSync(path.dirname(file),'r');try{fs.fsyncSync(dir);}finally{fs.closeSync(dir);}
}
const save=data=>persist(marker,data);
const command=(method,args)=>page.evaluate(({method,args})=>new Promise((resolve,reject)=>{
 const port=chrome.runtime.connect({name:'rtd_ui<->background'}),id=crypto.randomUUID();
 const timeout=setTimeout(()=>{port.disconnect();reject(new Error('command timeout'));},30000);
 port.onMessage.addListener(m=>{if(m.id!==id)return;clearTimeout(timeout);port.disconnect();resolve(m.payload);});
 port.postMessage({id,payload:{type:'method-payload',method,args}});
}),{method,args});
(async()=>{
 const prior=JSON.parse(fs.readFileSync(path.join(root,'confirmed.json'),'utf8'));assert.equal(prior.passed,true);
 const known=new Set([prior.digest]);
 for(const name of ['fault-timeout-01','fault-abort-01','fault-abort-current-worker-01'])
  known.add(JSON.parse(fs.readFileSync(path.join(root,name+'.json'),'utf8')).digest);
 assert.equal(known.size,4);
 if(recoveryOnly)evidence=JSON.parse(fs.readFileSync(marker,'utf8'));
 else assert.equal(fs.existsSync(marker),false,'existing attempt requires --recover-only');
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
  const before=await journal(page);assert.equal(before.length,4);
  assert(before.every(row=>known.has(row.digest)&&row.state==='confirmed-success'&&row.receipt.success===true));
  const accounts=await command('getStoredEntities',{type:'accounts'});assert.equal(accounts.args.entities.length,1);
  const account=accounts.args.entities[0];assert.equal(account.address,prior.journal.accountAddress);
  const {password}=JSON.parse(fs.readFileSync(path.join(root,'recovery-private.json'),'utf8'));
  assert.equal((await command('unlockAccountSourceOrAccount',{id:account.id,password})).type,'done');
  // Passive observer: capture the actual approved bytes, never replace IPC or simulation output.
  await context.addInitScript(()=>{
   if(!globalThis.chrome?.runtime?.connect)return;
   const connect=chrome.runtime.connect.bind(chrome.runtime);
   chrome.runtime.connect=(...args)=>{
    const port=connect(...args);const ids=new Set();const post=port.postMessage.bind(port);
    port.postMessage=m=>{if(m.payload?.method==='prepareDappTransaction')ids.add(m.id);return post(m);};
    port.onMessage.addListener(m=>{
     if(ids.has(m.id))globalThis.__failurePreparationResponse=m.payload;
     if(m.payload?.method==='prepareDappTransactionResponse')globalThis.__failurePrepared=m.payload.args.result.prepared;
    });return port;
   };
  });
  const demoRoot=fs.realpathSync('/tmp/rtd-wallet-failure-demo-20261004');
  server=http.createServer((req,res)=>{const name=new URL(req.url,'http://localhost').pathname;const file=path.resolve(demoRoot,'.'+(name==='/'?'/index.html':name));
   if(!file.startsWith(demoRoot+path.sep)||!fs.existsSync(file)||!fs.statSync(file).isFile()){res.writeHead(404).end();return;}
   res.setHeader('Content-Type',file.endsWith('.js')?'text/javascript':file.endsWith('.css')?'text/css':'text/html');fs.createReadStream(file).pipe(res);
  });await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  const demo=await context.newPage();await demo.goto(`http://127.0.0.1:${server.address().port}/?failurePackage=${fixture.packageId}&failureGate=${fixture.gateId}`);
  stage='connect';const connection=context.waitForEvent('page',{timeout:20000});connection.catch(()=>{});
  await demo.getByRole('button',{name:'Connect',exact:true}).click();const connectPage=await connection;
  await connectPage.getByRole('button',{name:/^(继续|Continue)$/}).click();await connectPage.getByRole('button',{name:/^(连接|Connect)$/}).click();
  await demo.getByTestId('accounts-list').waitFor();
  await worker.evaluate(()=>{
   const nativeFetch=globalThis.fetch.bind(globalThis);
   const state=globalThis.__failureRace={attempts:0,forwarded:0,simulations:0,intercepted:false,released:false,aborted:false};
   globalThis.fetch=async(input,init)=>{
    const url=String(input instanceof Request?input.url:input);
    if(/\/SimulateTransaction(?:$|\?)/.test(url)){
     const response=await nativeFetch(input,init);state.simulations++;state.lastSimulationHttpStatus=response.status;return response;
    }
    if(/\/ExecuteTransaction(?:$|\?)/.test(url)){
     if(++state.attempts!==1)throw new Error('test forbids another dispatch');
     state.intercepted=true;state.interceptedAt=new Date().toISOString();
     await new Promise((resolve,reject)=>{
      const signal=init.signal;
      const abort=()=>{state.aborted=true;reject(signal.reason);};
      globalThis.__releaseFailureDispatch=()=>{signal.removeEventListener('abort',abort);state.released=true;resolve();};
      if(signal.aborted)abort();else signal.addEventListener('abort',abort,{once:true});
     });
     if(init.signal.aborted)throw init.signal.reason;
     state.forwarded++;return nativeFetch(input,init);
    }
    return nativeFetch(input,init);
   };
  });
  stage='prepare visit';const opened=context.waitForEvent('page',{timeout:20000});opened.catch(()=>{});
  await demo.getByRole('button',{name:'Visit failure fixture',exact:true}).click();approval=await opened;
  if(process.argv.includes('--diagnose-preview')){await new Promise(resolve=>setTimeout(resolve,10000));throw new Error('read-only preview diagnosis');}
  const approve=approval.getByRole('button',{name:/^(批准|Approve)$/});await expect(approve).toBeEnabled({timeout:60000});
  const digest=(await approval.getByText(/^(交易摘要|Transaction digest):/).innerText()).split(':').pop().trim();
  const prepared=await approval.evaluate(()=>globalThis.__failurePrepared);assert(prepared?.bytesBase64);
  const tx=Transaction.from(Buffer.from(prepared.bytesBase64,'base64'));assert.equal(await tx.getDigest(),digest);
  assert.equal(tx.getData().sender,account.address);assert.equal(tx.getData().commands.length,1);
  const call=tx.getData().commands[0].MoveCall;assert.equal(call.package,fixture.packageId);assert.equal(call.module,'execution_gate');assert.equal(call.function,'visit');
  evidence={state:'about-to-approve',digest,bytesBase64:prepared.bytesBase64,requestId:new URL(approval.url()).hash.split('/').pop(),accountId:account.id,accountAddress:account.address,h0:fixture.h0,gateId:fixture.gateId,startedAt:new Date().toISOString()};
  persist(marker,evidence,true);
  stage='hold original dispatch after final simulation';await approve.click();
  await expect.poll(()=>worker.evaluate(()=>globalThis.__failureRace.intercepted),{timeout:15000,intervals:[50,100]}).toBe(true);
  const race=await worker.evaluate(()=>globalThis.__failureRace);assert.equal(race.attempts,1);assert(race.simulations>=2);assert.equal(race.lastSimulationHttpStatus,200);
  const pending=(await journal(page)).find(row=>row.digest===digest);assert.equal(pending?.state,'dispatch-pending');
  const armingFile=path.join(root,'failure-fixture-arming-01.json');
  persist(armingFile,{...evidence,state:'dispatch-pending',stage:'before-dispatch-after-final-simulation',observedAt:new Date().toISOString()},true);
  evidence={...evidence,state:'dispatch-pending',race,pending};save(evidence);
  stage='independent gate close';
  const output=path.join(runtime,'failure-fixture-close-01');
  const close=await promisify(execFile)(process.execPath,[
   path.resolve('../../link-u-smart-contract/all-in-one-deploy/localDeploy/close_wallet_failure_fixture.mjs'),
   fs.realpathSync('node_modules/rtd-typescript'),runtime,path.resolve('migrationToGRpcOrGraphQLDoc/evidence/20261003-rtd-debug-reverified.json'),fixtureFile,
   path.join(runtime,'address-funding-fixture-01'),fixture.h0,output,armingFile,
  ],{timeout:60000,maxBuffer:1024*1024});
  const closed=JSON.parse(close.stdout.trim());assert.equal(closed.success,true);
  evidence={...evidence,adminCloseDigest:closed.digest};save(evidence);
  stage='release unchanged wallet dispatch';
  assert.equal(await worker.evaluate(()=>globalThis.__failureRace.aborted),false,'wallet timeout: recover only, never repeat');
  await worker.evaluate(()=>globalThis.__releaseFailureDispatch());
  await expect.poll(async()=>(await journal(page)).find(row=>row.digest===digest)?.state,{timeout:45000,intervals:[200,500,1000]}).toBe('confirmed-failure');
  const finalRace=await worker.evaluate(()=>globalThis.__failureRace);assert.equal(finalRace.forwarded,1);assert.equal(finalRace.attempts,1);
  stage='modern dApp failed union';
  await expect(demo.getByTestId('action-result')).toBeVisible({timeout:15000});
  const dappResult=JSON.parse(await demo.getByTestId('action-result').innerText());
  assert.equal(dappResult.$kind,'FailedTransaction');assert.equal(dappResult.FailedTransaction.digest,digest);
  assert.equal(dappResult.FailedTransaction.status.success,false);
  const returnedBytes=Uint8Array.from(Object.values(dappResult.FailedTransaction.bcs));
  assert.equal(Buffer.from(returnedBytes).toString('base64'),prepared.bytesBase64);
  evidence={...evidence,race:finalRace,failedBeforeRestart:true,dappResult};save(evidence);
  stage='whole browser restart';await context.close();context=undefined;await start();
 }
 stage='locked original digest recovery';
 const accounts=await command('getStoredEntities',{type:'accounts'});
 assert.equal(accounts.args.entities.find(account=>account.id===evidence.accountId)?.isLocked,true);
 await command('recoverPreparedTransaction',{accountId:evidence.accountId});
 await expect.poll(async()=>(await journal(page)).find(row=>row.digest===evidence.digest)?.state,{timeout:45000,intervals:[500,1000]}).toBe('confirmed-failure');
 const records=await journal(page);assert.equal(records.length,5);
 assert(records.filter(row=>known.has(row.digest)).every(row=>row.state==='confirmed-success'&&row.receipt.success===true));
 const failed=records.find(row=>row.digest===evidence.digest);assert.equal(failed.requestId,evidence.requestId);assert.equal(failed.receipt.success,false);
 const effects=bcs.TransactionEffects.parse(Buffer.from(failed.receipt.effectsBase64,'base64'));
 assert.equal(effects.V2.transactionDigest,evidence.digest);assert.equal(effects.V2.status.$kind,'Failure');
 const error=effects.V2.status.Failure.error;assert.equal(error.$kind,'MoveAbort');assert.equal(String(error.MoveAbort[1]),'1');
 assert.equal(dispatches,recoveryOnly?0:1);
 const result={...evidence,state:'confirmed-failure',passed:true,recoveryOnly,recoveredWhileLocked:true,failed,executionError:error,dispatches,simulations,
  journalAudit:records.map(({requestId,digest,state,accountAddress})=>({requestId,digest,state,accountAddress})),
  scope:'Actual local-chain wallet MoveAbort after successful final simulation, durable failed receipt and locked same-profile restart recovery; one wallet dispatch, independent administrative gate-close transaction.'};
 if(recoveryOnly)persist(path.join(root,'fault-execution-failure-01-readonly.json'),result);else save(result);
 console.log(JSON.stringify(result,null,2));
})().catch(async error=>{
 const failure={passed:false,stage,errorType:error.name,message:error.message.slice(0,500),dispatches,simulations};
 try{if(approval&&!approval.isClosed())failure.approvalText=(await approval.locator('body').innerText()).slice(0,5000);}catch{}
 try{if(approval&&!approval.isClosed())failure.preparationResponse=await approval.evaluate(()=>globalThis.__failurePreparationResponse);}catch{}
 try{if(approval&&!approval.isClosed())failure.react=await approval.evaluate(()=>{
  const el=document.querySelector('#root')||document.body.firstElementChild;
  const key=Object.keys(el).find(key=>key.startsWith('__reactContainer$')||key.startsWith('__reactFiber$'));
  let root=el[key];while(root?.return)root=root.return;
  const seen=new Set(),found=[],todo=[root,root?.alternate];
  while(todo.length&&seen.size<10000){const f=todo.pop();if(!f||seen.has(f))continue;seen.add(f);todo.push(f.child,f.sibling);
   let h=f.memoizedState;let n=0;while(h&&n++<100){const v=h.memoizedState;const e=v?.error||v?.current?.error;if(e)found.push({component:f.type?.name,message:e.message,stack:e.stack});h=h.next;}
   if(f.memoizedProps?.txRequest)found.push({component:f.type?.name,binding:f.memoizedProps.txRequest.binding});
   let dep=f.dependencies?.firstContext;while(dep){if(dep.memoizedValue?.getQueryCache)found.push({queries:dep.memoizedValue.getQueryCache().getAll().filter(q=>q.queryKey[0]==='wallet-transaction-preview').map(q=>({key:q.queryKey,status:q.state.status,error:q.state.error?.message}))});if(dep.memoizedValue?.bindingKey)found.push({component:f.type?.name,contextBinding:dep.memoizedValue.bindingKey});dep=dep.next;}
  }return found;
 });}catch{}
 try{failure.race=await worker.evaluate(()=>globalThis.__failureRace);}catch{}
 try{failure.records=await journal(page);}catch{}
 if(fs.existsSync(marker))persist(path.join(root,'fault-execution-failure-01-failure.json'),failure);
 console.error(JSON.stringify(failure));process.exitCode=1;
}).finally(async()=>{
 if(context)await context.close();if(server){server.closeAllConnections();await new Promise(resolve=>server.close(resolve));}
});
