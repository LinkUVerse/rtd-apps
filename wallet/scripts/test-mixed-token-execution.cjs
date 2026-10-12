#!/usr/bin/env node
// Controlled existing local account. Execute once explicitly; default is locked read-only recovery.
const {chromium,expect}=require('@playwright/test');
const fs=require('node:fs'),path=require('node:path'),os=require('node:os'),http=require('node:http'),crypto=require('node:crypto');
const assert=require('node:assert/strict');const {execFileSync}=require('node:child_process');
const {Transaction}=require('rtd-typescript/transactions'),{RtdGrpcClient}=require('rtd-typescript/grpc');
const {bcs}=require('rtd-typescript/bcs'),{verifyTransactionSignature}=require('rtd-typescript/verify');
const {RTD_TYPE_ARG,normalizeStructTag}=require('rtd-typescript/utils');
const {journal}=require('./lib/test-dapp-execution.cjs');
const runtime=path.join(os.homedir(),'.local/state/rtd-wallet-migration/dev-20261003-01');
const root=path.join(runtime,'mixed-execution-browser-01'),marker=path.join(root,'mixed-token-attempt-01.json');
const execute=process.argv.includes('--execute');
const json=file=>JSON.parse(fs.readFileSync(file,'utf8'));
const fixture=json(path.join(runtime,'token-mixed-funding-01/fixture.json'));
const native=json(path.join(root,'confirmed.json')),accountId=json(path.join(root,'attempt.json')).accountId;
const client=new RtdGrpcClient({network:'localnet',baseUrl:fixture.endpoint,format:'binary',mvr:{url:''}});
let context,page,worker,server,approval,evidence,stage='admission',dispatches=0,simulations=0,uncollectedTraffic=false;
const stringify=data=>JSON.stringify(data,(_,v)=>typeof v==='bigint'?v.toString():v,2)+'\n';
function persist(file,data,exclusive=false){
 const temporary=exclusive?file:file+'.'+crypto.randomUUID()+'.tmp';
 const fd=fs.openSync(temporary,'wx',0o600);try{fs.writeFileSync(fd,stringify(data));fs.fsyncSync(fd);}finally{fs.closeSync(fd);}
 if(!exclusive)fs.renameSync(temporary,file);
 const dir=fs.openSync(path.dirname(file),'r');try{fs.fsyncSync(dir);}finally{fs.closeSync(dir);}
}
const save=data=>persist(marker,data);
const command=(method,args)=>page.evaluate(({method,args})=>new Promise((resolve,reject)=>{
 const port=chrome.runtime.connect({name:'rtd_ui<->background'}),id=crypto.randomUUID();const timer=setTimeout(()=>{port.disconnect();reject(new Error('command timeout'));},30000);
 port.onMessage.addListener(m=>{if(m.id!==id)return;clearTimeout(timer);port.disconnect();resolve(m.payload);});
 port.postMessage({id,payload:{type:'method-payload',method,args}});
}),{method,args});
const balance=async(owner,type)=>{
 const raw=(await client.stateService.getBalance({owner,coinType:type})).response.balance;
 assert(raw);assert.equal(normalizeStructTag(raw.coinType),normalizeStructTag(type));assert.equal(typeof raw.balance,'bigint');
 // RTD render_balance omits exactly-zero components; require the typed envelope and exact total.
 const result={...raw,coinBalance:raw.coinBalance??0n,addressBalance:raw.addressBalance??0n};
 assert.equal(result.coinBalance+result.addressBalance,result.balance);return result;
};
const bytes=value=>Uint8Array.from(Object.entries(value).map(([key,byte],i)=>{assert.equal(key,String(i));assert(Number.isInteger(byte)&&byte>=0&&byte<=255);return byte;}));
const sum=(changes,owner,type)=>changes.filter(row=>row.address===owner&&normalizeStructTag(row.coinType)===normalizeStructTag(type)).reduce((n,row)=>n+BigInt(row.amount),0n);
function effectBody(encoded,digest){const e=bcs.TransactionEffects.parse(encoded);const body=e.$kind==='V2'?e.V2:e.V1;assert.equal(body.transactionDigest,digest);assert.equal(body.status.$kind,'Success');return body;}
function admitBuild(){
 const proof=json(path.resolve('migrationToGRpcOrGraphQLDoc/evidence/20261003-rtd-debug-reverified.json'));
 const source=path.resolve('../../rtd'),hash=value=>crypto.createHash('sha256').update(value).digest('hex');
 assert.equal(execFileSync('git',['-C',source,'rev-parse','HEAD']).toString().trim(),proof.source.head);
 assert.equal(hash(execFileSync('git',['-C',source,'diff','--binary','HEAD'])),proof.source.diffSha256);
 for(const [file,sha]of Object.entries(proof.source.changedFiles))assert.equal(hash(fs.readFileSync(path.join(source,file))),sha);
 for(const binary of Object.values(proof.binaries))assert.equal(hash(fs.readFileSync(binary.path)),binary.sha256);
 const meta=json(path.join(runtime,'runtime.json'));assert(meta.ready);assert.equal(meta.binary,proof.binaries.rtd.path);process.kill(meta.pid,0);
 assert.equal(fixture.endpoint,'http://127.0.0.1:39400');assert.equal(meta.rpcUrl,fixture.endpoint);
 return {sourceHead:proof.source.head,currentDebugBinariesMatch:true,pid:meta.pid};
}
async function verifyResult(transaction,approved,includeBalanceChanges=true){
 assert.equal(transaction.digest,approved.digest);assert.equal(transaction.status.success,true);
 const fixed=Buffer.from(approved.bytesBase64,'base64'),actual=Buffer.from(transaction.bcs);
 assert.deepEqual(actual,fixed);assert.equal(await Transaction.from(actual).getDigest(),approved.digest);
 assert.equal(Transaction.from(actual).getData().sender,fixture.target);assert.equal(transaction.signatures.length,1);
 const key=await verifyTransactionSignature(actual,transaction.signatures[0]);assert.equal(key.toRtdAddress(),fixture.target);
 const body=effectBody(transaction.effects.bcs,approved.digest);
 const gas=body.gasUsed,netGas=BigInt(gas.computationCost)+BigInt(gas.storageCost)-BigInt(gas.storageRebate);
 if(includeBalanceChanges){
  assert(Array.isArray(transaction.balanceChanges),'independent Ledger query must request balanceChanges');
  assert.equal(sum(transaction.balanceChanges,fixture.sender,fixture.coinType),1500000n);
  assert.equal(sum(transaction.balanceChanges,fixture.target,fixture.coinType),-1500000n);
  assert.equal(sum(transaction.balanceChanges,fixture.target,RTD_TYPE_ARG),-netGas);
  assert.equal(sum(transaction.balanceChanges,fixture.sender,RTD_TYPE_ARG),0n);
 }
 return {netGas:netGas.toString(),signatureVerified:true,approvedBytesUnchanged:true,effectsDigestMatches:true};
}
(async()=>{
 const build=admitBuild();assert.equal((await client.ledgerService.getServiceInfo({})).response.chainId,fixture.h0);
 assert.equal(native.passed,true);
 if(execute)assert.equal(fs.existsSync(marker),false,'existing attempt requires read-only recovery; never approve again');
 else evidence=json(marker);
 const certificate=path.join(runtime,'publication-foundation/native-query-ingress/server/tls.crt');
 const pub=execFileSync('openssl',['x509','-in',certificate,'-pubkey','-noout']);const pin=crypto.createHash('sha256').update(execFileSync('openssl',['pkey','-pubin','-outform','DER'],{input:pub})).digest('base64');
 async function start(){
  context=await chromium.launchPersistentContext(path.join(root,'chromium-profile'),{executablePath:path.join(os.homedir(),'Library/Caches/ms-playwright/chromium-1243/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing'),headless:true,viewport:{width:800,height:600},args:[`--disable-extensions-except=${path.resolve('dist')}`,`--load-extension=${path.resolve('dist')}`,`--ignore-certificate-errors-spki-list=${pin}`]});
  worker=context.serviceWorkers()[0]||await context.waitForEvent('serviceworker');const loaded=await require('./lib/current-extension-worker.cjs').ensure(context,worker);worker=loaded.worker;
  console.log(JSON.stringify({workerProvenance:loaded.evidence}));
  await worker.evaluate(()=>{
   const nativeFetch=globalThis.fetch.bind(globalThis),state=globalThis.__tokenTraffic={dispatches:0,simulations:0};
   globalThis.fetch=(input,init)=>{const url=String(input instanceof Request?input.url:input);
    if(/\/SimulateTransaction(?:$|\?)/.test(url))state.simulations++;
    if(/\/ExecuteTransaction(?:$|\?)/.test(url)&&++state.dispatches>1)throw new Error('test forbids repeated dispatch');
    return nativeFetch(input,init);
   };
  });
  uncollectedTraffic=true;
  page=await context.newPage();await page.goto(`chrome-extension://${new URL(worker.url()).host}/ui.html`);
 }
 await start();
 if(execute){
  stage='prior journal and live funding admission';
  const records=await journal(page);assert.equal(records.length,1);assert.equal(records[0].digest,native.digest);assert.equal(records[0].state,'confirmed-success');
  effectBody(Buffer.from(records[0].receipt.effectsBase64,'base64'),native.digest);
  const reviewed=[];
  for(const directory of fs.readdirSync(runtime,{withFileTypes:true}).filter(row=>row.isDirectory())){
   const pendingFile=path.join(runtime,directory.name,'pending.json');if(!fs.existsSync(pendingFile))continue;const pending=json(pendingFile);
   if(![fixture.sender,fixture.target].includes(pending.sender))continue;
   const digest=await Transaction.from(pending.bytesBase64).getDigest();if(pending.digest!==undefined)assert.equal(digest,pending.digest);
   const saved=json(path.join(runtime,directory.name,'receipt.json'));assert.equal((saved.Transaction??saved).digest,digest);
   const live=await client.core.getTransaction({digest,include:{effects:true}});assert.equal(live.$kind,'Transaction');assert.equal(live.Transaction.digest,digest);assert.equal(live.Transaction.status.success,true);reviewed.push(digest);
  }
  assert(reviewed.includes(fixture.digest));
  const original=await client.core.getTransaction({digest:native.digest,include:{effects:true}});assert.equal(original.$kind,'Transaction');assert.equal(original.Transaction.status.success,true);
  const tokenBefore=await balance(fixture.target,fixture.coinType),nativeBefore=await balance(fixture.target,RTD_TYPE_ARG),recipientBefore=await balance(fixture.sender,fixture.coinType);
  assert.equal(tokenBefore.coinBalance,1000000n);assert.equal(tokenBefore.addressBalance,1000000n);assert.equal(tokenBefore.balance,2000000n);assert.equal(nativeBefore.balance,498990120n);assert.equal(nativeBefore.coinBalance,0n);
  const coins=await client.core.listCoins({owner:fixture.target,coinType:fixture.coinType,limit:50});assert.equal(coins.hasNextPage,false);assert.equal(coins.objects.length,1);
  const coin=coins.objects[0];assert.equal(coin.balance,'1000000');assert.equal(coin.owner.$kind,'AddressOwner');assert.equal(coin.owner.AddressOwner,fixture.target);
  const accounts=(await command('getStoredEntities',{type:'accounts'})).args.entities;assert.equal(accounts.length,1);assert.equal(accounts[0].id,accountId);assert.equal(accounts[0].address,fixture.target);
  const {password}=json(path.join(root,'recovery-private.json'));assert.equal((await command('unlockAccountSourceOrAccount',{id:accountId,password})).type,'done');
  await context.addInitScript(()=>{
   if(!globalThis.chrome?.runtime?.connect)return;const connect=chrome.runtime.connect.bind(chrome.runtime);
   chrome.runtime.connect=(...args)=>{const port=connect(...args);port.onMessage.addListener(m=>{if(m.payload?.method==='prepareDappTransactionResponse')globalThis.__tokenPrepared=m.payload.args.result.prepared;});return port;};
  });
  const demoRoot=fs.realpathSync('/tmp/rtd-wallet-token-demo-20261004');server=http.createServer((req,res)=>{
   const file=path.resolve(demoRoot,'.'+(new URL(req.url,'http://localhost').pathname==='/'?'/index.html':new URL(req.url,'http://localhost').pathname));
   if(!file.startsWith(demoRoot+path.sep)||!fs.existsSync(file)||!fs.statSync(file).isFile()){res.writeHead(404).end();return;}
   res.setHeader('Content-Type',file.endsWith('.js')?'text/javascript':file.endsWith('.css')?'text/css':'text/html');fs.createReadStream(file).pipe(res);
  });await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  const query=new URLSearchParams({tokenType:fixture.coinType,tokenCoin:coin.objectId,tokenVersion:coin.version,tokenDigest:coin.digest,tokenRecipient:fixture.sender});
  const demo=await context.newPage();await demo.goto(`http://127.0.0.1:${server.address().port}/?${query}`);
  stage='authorize actual modern dApp';const opening=context.waitForEvent('page',{timeout:20000});opening.catch(()=>{});await demo.getByRole('button',{name:'Connect',exact:true}).click();const connecting=await opening;
  await connecting.getByRole('button',{name:/^(继续|Continue)$/}).click();await connecting.getByRole('button',{name:/^(连接|Connect)$/}).click();await demo.getByTestId('accounts-list').waitFor();
  stage='actual non-native approval preview';const waiting=context.waitForEvent('page',{timeout:20000});waiting.catch(()=>{});await demo.getByRole('button',{name:'Send mixed token fixture',exact:true}).click();approval=await waiting;
  const approve=approval.getByRole('button',{name:/^(批准|Approve)$/});await expect(approve).toBeEnabled({timeout:60000});
  const digest=(await approval.getByText(/^(交易摘要|Transaction digest):/).innerText()).split(':').pop().trim(),prepared=await approval.evaluate(()=>globalThis.__tokenPrepared);assert(prepared?.bytesBase64);
  const data=Transaction.from(prepared.bytesBase64).getData();assert.equal(await Transaction.from(prepared.bytesBase64).getDigest(),digest);assert.equal(data.sender,fixture.target);assert.equal(data.gasData.payment.length,0);assert(BigInt(data.gasData.price)>0n);
  assert.deepEqual(data.commands.map(c=>c.$kind),['MoveCall','MergeCoins','SplitCoins','TransferObjects','TransferObjects']);assert.equal(data.commands[0].MoveCall.function,'redeem_funds');
  evidence={state:'about-to-approve',digest,requestId:new URL(approval.url()).hash.split('/').pop(),bytesBase64:prepared.bytesBase64,accountId,accountAddress:fixture.target,h0:fixture.h0,coinType:fixture.coinType,recipient:fixture.sender,amount:'1500000',coin,tokenBefore,nativeBefore,recipientBefore,reviewed,build,startedAt:new Date().toISOString()};
  persist(marker,evidence,true);
  stage='single real approval';await approve.click();
  await expect.poll(async()=>{
   if(await demo.getByTestId('action-result').count())return true;
   if(!approval.isClosed()){const recovered=approval.getByRole('button',{name:'返回原执行结果',exact:true});if(await recovered.count()&&await recovered.isEnabled())await recovered.click();}
   return false;
  },{timeout:90000,intervals:[500,1000,3000]}).toBe(true);
  const output=JSON.parse(await demo.getByTestId('action-result').innerText());assert.equal(output.$kind,'Transaction');
  const traffic=await worker.evaluate(()=>globalThis.__tokenTraffic);dispatches+=traffic.dispatches;simulations+=traffic.simulations;uncollectedTraffic=false;assert.equal(dispatches,1);assert(simulations>=2);
  evidence={...evidence,state:'modern-result-received',dappResult:output,executionTraffic:traffic};save(evidence);
  const result={...output.Transaction,bcs:bytes(output.Transaction.bcs),effects:{...output.Transaction.effects,bcs:bytes(output.Transaction.effects.bcs)}};
  // Standard default includes bytes/effects/signatures; balanceChanges are independently requested below.
  const verified=await verifyResult(result,evidence,false);
  evidence={...evidence,state:'modern-result-success',dappResult:output,verified,executionTraffic:traffic};save(evidence);
  stage='whole browser restart';await context.close();context=undefined;await start();
 }
 stage='locked original digest recovery';
 assert.equal(evidence.accountId,accountId);assert.equal(evidence.accountAddress,fixture.target);assert.equal(evidence.h0,fixture.h0);
 assert.equal((await command('getStoredEntities',{type:'accounts'})).args.entities.find(row=>row.id===accountId)?.isLocked,true);
 assert.notEqual((await command('recoverPreparedTransaction',{accountId})).error,true);
 await expect.poll(async()=>(await journal(page)).find(row=>row.digest===evidence.digest)?.state,{timeout:60000,intervals:[500,1000,3000]}).toBe('confirmed-success');
 const records=await journal(page);assert.equal(records.length,2);assert.deepEqual(new Set(records.map(row=>row.digest)),new Set([native.digest,evidence.digest]));
 const row=records.find(row=>row.digest===evidence.digest);assert.equal(row.requestId,evidence.requestId);assert.equal(row.accountAddress,fixture.target);assert.equal(row.receipt.success,true);
 const original=records.find(row=>row.digest===native.digest);assert.equal(original.state,'confirmed-success');effectBody(Buffer.from(original.receipt.effectsBase64,'base64'),native.digest);
 const live=await client.core.getTransaction({digest:evidence.digest,include:{effects:true,balanceChanges:true,transaction:true,bcs:true}});assert.equal(live.$kind,'Transaction');assert.deepEqual(Buffer.from(live.Transaction.effects.bcs),Buffer.from(row.receipt.effectsBase64,'base64'));
 const verified=await verifyResult(live.Transaction,evidence),netGas=BigInt(verified.netGas);let tokenAfter,nativeAfter,recipientAfter;
 await expect.poll(async()=>{
  tokenAfter=await balance(fixture.target,fixture.coinType);nativeAfter=await balance(fixture.target,RTD_TYPE_ARG);recipientAfter=await balance(fixture.sender,fixture.coinType);
  return [tokenAfter.balance,nativeAfter.balance,recipientAfter.balance].map(String);
 },{timeout:45000,intervals:[500,1000,3000]}).toEqual(['500000',(BigInt(evidence.nativeBefore.balance)-netGas).toString(),(BigInt(evidence.recipientBefore?.balance??0)+1500000n).toString()]);
 assert.equal(tokenAfter.coinBalance,500000n);assert.equal(tokenAfter.addressBalance,0n);
 const recoveryTraffic=await worker.evaluate(()=>globalThis.__tokenTraffic);assert.equal(recoveryTraffic.dispatches,0);assert.equal(recoveryTraffic.simulations,0);
 let priorExecutionTraffic=evidence.executionTraffic;
 if(!priorExecutionTraffic){
  const failures=fs.readdirSync(root).filter(name=>/^mixed-token-failure-.*\.json$/.test(name)).map(name=>json(path.join(root,name))).filter(f=>f.journalAudit?.some(row=>row.digest===evidence.digest)&&f.currentWorkerTraffic?.dispatches===1);
  assert.equal(failures.length,1,'missing or ambiguous prior execution counters');priorExecutionTraffic=failures[0].currentWorkerTraffic;
 }
 assert.equal(priorExecutionTraffic.dispatches,1);
 const result={passed:true,recoveryOnly:!execute,digest:evidence.digest,checkpoint:live.Transaction.checkpoint,receiptCheckpoint:row.receipt.checkpoint,...verified,lockedRestartJournalPreserved:true,tokenAfter,nativeAfter,recipientAfter,dispatches,simulations,priorExecutionTraffic,dappReturnPersisted:!!evidence.dappResult,journalAudit:records.map(({digest,state,requestId,accountAddress})=>({digest,state,requestId,accountAddress})),build,
  scope:'Actual modern dApp and wallet approval, one mixed non-native transfer with address-funded native gas, signature/effects/balances and locked same-profile original-digest recovery; indexed token list and transfer-form UI not accepted'};
 if(execute)save({...evidence,state:'confirmed-success',result});else {
  const recoveryFile='mixed-token-recovery-'+crypto.randomUUID()+'.json';persist(path.join(root,recoveryFile),result,true);
  save({...evidence,state:'confirmed-success',lastRecoveryFile:recoveryFile,result});
 }
 console.log(stringify(result));
})().catch(async error=>{
 const failure={passed:false,stage,errorType:error.name,message:String(error.message).slice(0,600),dispatches,simulations};
 try{const traffic=await worker.evaluate(()=>globalThis.__tokenTraffic);failure.currentWorkerTraffic=traffic;failure.dispatches=dispatches+(uncollectedTraffic?traffic.dispatches:0);failure.simulations=simulations+(uncollectedTraffic?traffic.simulations:0);}catch{}
 try{if(approval&&!approval.isClosed())failure.approvalText=(await approval.locator('body').innerText()).slice(0,3500);}catch{}
 try{failure.journalAudit=(await journal(page)).map(({digest,state,requestId})=>({digest,state,requestId}));}catch{}
 if(fs.existsSync(marker))persist(path.join(root,'mixed-token-failure-'+crypto.randomUUID()+'.json'),failure,true);
 console.error(JSON.stringify(failure));process.exitCode=1;
}).finally(async()=>{if(context)await context.close();if(server){server.closeAllConnections();await new Promise(resolve=>server.close(resolve));}});
