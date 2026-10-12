// Copyright (c) LinkU Labs, Inc.
// SPDX-License-Identifier: Apache-2.0
// One new dev-chain execution per named case. Existing attempts are never reset or resent.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),os=require('node:os'),crypto=require('node:crypto');
const {execFileSync}=require('node:child_process');
const {chromium,expect}=require('@playwright/test');
const {GrpcTypes,RtdGrpcClient}=require('rtd-typescript/grpc');
const {Transaction}=require('rtd-typescript/transactions');
const {Ed25519Keypair}=require('rtd-typescript/keypairs/ed25519');
const {bcs}=require('rtd-typescript/bcs');
const snapshot=require('./lifecycle-journal-snapshot.cjs');
const events=['lock','network','account','cancel'];
const H0='3tEPxLxUysGx4gfr8UEycvH7xohMWuwKVbTX5np4TCYj',generation='dev-20261003-01';
const runtime=path.join(os.homedir(),'.local/state/rtd-wallet-migration',generation);
const address='0xa0ccc8bcc83f6c628340134f8546a21e0618fd1aaa02432bba454c4a2c2233da';
const sha=bytes=>crypto.createHash('sha256').update(bytes).digest('hex');
const read=file=>JSON.parse(fs.readFileSync(file,'utf8'));
function reviewedProfile(){
 const {validateNetworkProfile,networkBindingKey}=require('tsx/cjs/api').require(path.resolve('src/shared/rpc/profile.ts'),__filename);
 const profile=validateNetworkProfile(read(path.join(runtime,'wallet-profile-20261004-03/profile.json')));
 assert.equal(profile.expectedGenesisDigest,H0);assert.equal(profile.generation,generation);
 return {profile,bindingKey:networkBindingKey(profile)};
}
const directory=event=>path.join(runtime,`dapp-post-dispatch-${event}-20261005-01`);
const client=()=>new RtdGrpcClient({network:'localnet',baseUrl:'http://127.0.0.1:39400',format:'binary',mvr:{url:''}});
function record(root,name,data){
 const fd=fs.openSync(path.join(root,name),'wx',0o600);
 try{fs.writeFileSync(fd,JSON.stringify(data,null,2)+'\n');fs.fsyncSync(fd);}finally{fs.closeSync(fd);}
 const dir=fs.openSync(root,'r');try{fs.fsyncSync(dir);}finally{fs.closeSync(dir);}
}
function validate(rows,attempt,terminal){
 assert.equal(rows['journal-v2'].length,1);
 const row=rows['journal-v2'][0];
 for(const [key,value]of Object.entries({digest:attempt.digest,requestId:attempt.requestId,accountId:attempt.accountId,accountAddress:address,chainId:H0,generation}))assert.equal(row[key],value);
 assert.equal(row.schemaVersion,2);assert.equal(row.scope,JSON.stringify([2,H0,generation,address]));assert.equal(row.id,JSON.stringify([row.scope,attempt.requestId]));
 const reviewed=reviewedProfile();assert.equal(row.bindingKey,reviewed.bindingKey);assert.equal(row.endpointRevision,reviewed.profile.revision);
 const origin=new URL(row.originRef);assert.equal(origin.origin,row.originRef);assert.equal(origin.protocol,'http:');assert.equal(origin.hostname,'127.0.0.1');assert.equal(origin.username,'');assert.equal(origin.password,'');
 if(attempt.origin)assert.equal(row.originRef,attempt.origin);
 assert.equal(row.state,terminal?'confirmed-success':'dispatch-pending');
 assert.equal(rows['pending-scopes-v2'].length,terminal?0:1);
 if(!terminal)assert.equal(rows['pending-scopes-v2'][0].recordId,row.id);
 assert(!rows['metadata-v2'].some(r=>r.key==='legacy-quarantined'&&r.value));
 assert(!['bytesBase64','signature','secret','keyPair'].some(k=>k in row));
 return row;
}
async function verifyNative(row,wire,key){
 const c=client();assert.equal((await c.ledgerService.getServiceInfo({})).response.chainId,H0);
 const result=await c.core.getTransaction({digest:row.digest,include:{bcs:true,transaction:true,effects:true}});
 assert.equal(result.$kind,'Transaction');const tx=result.Transaction;
 assert.equal(tx.digest,row.digest);assert.equal(tx.status.success,true);
 const bytes=Buffer.from(tx.bcs),signature=tx.signatures[0];
 assert.equal(tx.signatures.length,1);assert.equal(sha(bytes),wire.bytesSha256);
 assert.equal(await Transaction.from(bytes).getDigest(),row.digest);
 assert.equal(sha(Buffer.from(signature,'base64')),wire.signatureSha256);
 assert.equal(await key.getPublicKey().verifyTransaction(bytes,signature),true);
 assert.equal(row.receipt.success,true);assert.deepEqual(Buffer.from(tx.effects.bcs),Buffer.from(row.receipt.effectsBase64,'base64'));
 const effects=bcs.TransactionEffects.parse(tx.effects.bcs),body=effects.$kind==='V2'?effects.V2:effects.V1;
 assert.equal(body.transactionDigest,row.digest);assert.equal(body.status.$kind,'Success');
 return {digest:row.digest,bytesSha256:wire.bytesSha256,signatureSha256:wire.signatureSha256,effectsSha256:sha(tx.effects.bcs),signatureVerified:true,nativeEffectsMatch:true,checkpoint:tx.checkpoint};
}
async function verifyUpstream(response,attempt,wire){
 assert.equal(response.status(),200);const frames=await response.body();let offset=0,raw,trailers='';
 assert(frames.length>5&&frames.length<=3000000);
 while(offset<frames.length){
  assert(offset+5<=frames.length);const flag=frames[offset],length=frames.readUInt32BE(offset+1);offset+=5;
  assert(offset+length<=frames.length);
  if(flag===0){assert(!raw);raw=GrpcTypes.ExecuteTransactionResponse.fromBinary(frames.subarray(offset,offset+length));}
  else{assert.equal(flag,128);trailers+=frames.subarray(offset,offset+length).toString('utf8');}
  offset+=length;
 }
 const status=trailers.match(/^grpc-status:\s*(\d+)\s*$/mi)?.[1]??await response.headerValue('grpc-status');assert.equal(status,'0');
 const tx=raw?.transaction;assert.equal(tx?.digest,attempt.digest);assert.equal(tx.signatures.length,1);
 assert.equal(sha(tx.transaction.bcs.value),wire.bytesSha256);assert.equal(sha(tx.signatures[0].bcs.value),wire.signatureSha256);
 const effects=bcs.TransactionEffects.parse(tx.effects.bcs.value),body=effects.$kind==='V2'?effects.V2:effects.V1;
 assert.equal(body.transactionDigest,attempt.digest);assert.equal(body.status.$kind,'Success');
 return {passed:true,digest:attempt.digest,httpStatus:200,grpcStatus:0,bytesSha256:wire.bytesSha256,signatureSha256:wire.signatureSha256,effectsSha256:sha(tx.effects.bcs.value),responseSha256:sha(frames)};
}
function certificateArgs(){
 return ['--ignore-certificate-errors-spki-list='+['native-query-ingress','native-archive-bridge'].map(name=>{
  const pub=execFileSync('openssl',['x509','-in',path.join(runtime,`publication-foundation/${name}/server/tls.crt`),'-pubkey','-noout']);
  return crypto.createHash('sha256').update(execFileSync('openssl',['pkey','-pubin','-outform','DER'],{input:pub})).digest('base64');
 }).join(',')];
}
async function auditPrevious(){
 const results=[];
 for(const event of events){
  const root=directory(event);if(!fs.existsSync(root))continue;
  assert.equal(read(path.join(root,'confirmed.json')).passed,true,'Existing lifecycle attempt must be recovered before another execution');
  assert.equal(read(path.join(root,'restart-verified.json')).passed,true);
  const attempt=read(path.join(root,'attempt.json')),wire=read(path.join(root,'dispatch-wire.json'));
  let context,dispatches=0,simulations=0,currentWorkerVerified=false;
  try{
   const extension=path.resolve('dist');context=await chromium.launchPersistentContext(path.join(root,'chromium-profile'),{
    executablePath:path.join(os.homedir(),'Library/Caches/ms-playwright/chromium-1243/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing'),headless:true,
    args:[`--disable-extensions-except=${extension}`,`--load-extension=${extension}`,...certificateArgs()],
   });
   context.on('request',r=>{if(/\/ExecuteTransaction(?:$|\?)/.test(r.url()))dispatches++;if(/\/SimulateTransaction(?:$|\?)/.test(r.url()))simulations++;});
   const worker=context.serviceWorkers()[0]||await context.waitForEvent('serviceworker');
   const current=await require('./current-extension-worker.cjs').ensure(context,worker);
   currentWorkerVerified=true;
   const page=await context.newPage();await page.goto(new URL('ui.html',current.worker.url()).href);
   const before=await snapshot(page),row=validate(before,attempt,true);
   const native=await verifyNative(row,wire,Ed25519Keypair.fromSecretKey(new Uint8Array(32).fill(7)));
   assert.equal(native.effectsSha256,read(path.join(root,'dispatch-response.json')).effectsSha256);
   assert.deepEqual(await snapshot(page),before);assert.equal(dispatches,0);assert.equal(simulations,0);
   results.push({event,passed:true,logicalSha256:sha(JSON.stringify(before)),native,workerProvenance:current.evidence,dispatches,simulations});
  }catch(error){console.error(JSON.stringify({retainedAuditFailureEvent:event,errorType:error.name,currentWorkerVerified,dispatches,simulations}));throw error;}
  finally{if(context)await context.close();}
 }
 return results;
}
async function admit(event){
 assert(events.includes(event));assert.equal(process.env.RTD_TEST_DAPP_EXECUTE,'1');assert.equal(process.env.RTD_TEST_LOCAL_PROFILE,'1');assert(process.env.RTD_TEST_DAPP_DIR);
 for(const flag of ['RTD_TEST_DAPP_FULLNODE_ONLY','RTD_TEST_DEV_KEYSTORE','RTD_TEST_STAKING_EXECUTE','RTD_TEST_MIXED_EXECUTE','RTD_TEST_MIXED_NATIVE','RTD_TEST_DAPP_SIGN_RETURN_HOLD','RTD_TEST_DAPP_SIGN_TRANSACTION','RTD_TEST_COIN_PREVIEW','RTD_TEST_OWNED_ASSETS','RTD_TEST_CREATE_MNEMONIC'])assert.equal(process.env[flag],undefined);
 const root=directory(event);assert(!fs.existsSync(root),'Existing attempt requires read-only recovery; never create another directory to retry');
 const file=fs.realpathSync(process.env.RTD_TEST_ORIGINAL_JOURNAL_AUDIT);
 assert.equal(path.dirname(file),path.resolve('migrationToGRpcOrGraphQLDoc/workLog'));
 const audit=read(file),backgroundSha256=sha(fs.readFileSync('dist/background.js'));
 require('./fullnode-only-dapp-admission.cjs').auditOriginalJournals({audit,backgroundSha256,now:Date.now()});
 // Invoke the contract repository's original current-source validator; no deployment or restart.
 const sourceProof=JSON.parse(execFileSync(path.resolve('../../rtd-archive-service/localDeploy/data/publisher-venv/bin/python'),['-c',`
import sys,json
from pathlib import Path
base=Path(${JSON.stringify(path.resolve('../..'))})
sys.path.insert(0,str(base/'link-u-smart-contract/all-in-one-deploy/localDeploy'))
from prepare_wallet_display_history_replay import validate_current
runtime=Path(${JSON.stringify(runtime)})
proof=json.loads((runtime/'publication-foundation/display-debug-install-20261005-01/installed-provenance.json').read_text())
tests=json.loads((base/'rtd-apps/wallet/migrationToGRpcOrGraphQLDoc/workLog/20261005-display-indexer-current-test-01.json').read_text())
validate_current(base/'rtd',proof,tests)
print(json.dumps({'currentDebugValidated':True,'sourceHead':proof['sourceHead'],'sourceDiffSha256':proof['sourceDiffSha256'],'binaries':proof['binaries']}))
`],{encoding:'utf8'}));
 const previous=await auditPrevious();
 require('./fullnode-only-dapp-admission.cjs').auditOriginalJournals({audit,backgroundSha256,now:Date.now()});
 const c=client();assert.equal((await c.ledgerService.getServiceInfo({})).response.chainId,H0);
 const balance=(await c.stateService.getBalance({owner:address,coinType:'0x2::rtd::RTD'})).response.balance;
 assert(balance&&balance.balance>10000000n,'Fresh original-account native gas balance required');
 return {root,admission:{event,admittedAt:new Date().toISOString(),originalJournalAuditAt:audit.observedAt,originalTerminalRecords:7,previous,sourceProof,backgroundSha256,nativeBalanceAtomic:String(balance.balance),oneNewDevExecutionAllowed:true,assetSnapshotAccepted:false,scope:'Only this named post-dispatch attempt; original and previous lifecycle journals audited without signing or execution.'}};
}
async function execute({event,root,context,demo,extensionPage,command,accountId,unlockAccount,createTestAccount,key,setStage}){
 assert(events.includes(event));const worker=context.serviceWorkers()[0];let popup,second,phase='initialization',wirePromise,attempt;const simulations=[];
 const savedApprovals=()=>extensionPage.evaluate(async()=>Object.keys((await chrome.storage.local.get('transactions')).transactions??{}).length);
 const onRequest=request=>{
  if(/\/SimulateTransaction(?:$|\?)/.test(request.url())){
   const frame=request.postDataBuffer();assert(frame&&frame[0]===0&&frame.readUInt32BE(1)===frame.length-5);
   const input=GrpcTypes.SimulateTransactionRequest.fromBinary(frame.subarray(5)),bytes=input.transaction?.bcs?.value;
   simulations.push({checksEnabled:input.checks===GrpcTypes.SimulateTransactionRequest_TransactionChecks.ENABLED,doGasSelection:input.doGasSelection===true,bytesSha256:bytes?.length?sha(bytes):null,targetIsReviewedFullnode:request.url().startsWith('http://127.0.0.1:39400/')});
   return;
  }
  if(!/\/ExecuteTransaction(?:$|\?)/.test(request.url()))return;
  assert(!wirePromise,'Only one dispatch may enter the transport');
  wirePromise=(async()=>{
   assert(request.url().startsWith('http://127.0.0.1:39400/'));
   const frame=request.postDataBuffer();assert(frame&&frame[0]===0&&frame.readUInt32BE(1)===frame.length-5);
   const input=GrpcTypes.ExecuteTransactionRequest.fromBinary(frame.subarray(5)),bytes=input.transaction?.bcs?.value;
   assert(bytes&&bytes.length);assert.equal(input.signatures.length,1);const sig=input.signatures[0].bcs?.value;assert(sig?.length);
   assert.equal(await Transaction.from(bytes).getDigest(),attempt.digest);
   assert.equal(await key.getPublicKey().verifyTransaction(bytes,Buffer.from(sig).toString('base64')),true);
   return {passed:true,digest:attempt.digest,bytesSha256:sha(bytes),signatureSha256:sha(sig),signatureVerified:true,targetIsReviewedFullnode:true};
  })();wirePromise.catch(()=>{});
 };
 context.on('request',onRequest);
 try{
  setStage(`post-dispatch ${event}`);assert.equal((await require('./test-dapp-execution.cjs').journal(extensionPage)).length,0);
  if(event==='account')second=await createTestAccount();
  await demo.getByLabel('Cancellation stage').selectOption('approval');
  await worker.evaluate(()=>{
   const original=globalThis.fetch,state=globalThis.__postDispatch={dispatches:0,responseReady:false,abortObserved:false,lookupsBlocked:0};
   globalThis.fetch=async(input,init)=>{
    const url=input instanceof Request?input.url:String(input);
    if(/\/ExecuteTransaction(?:$|\?)/.test(url)){
     if(++state.dispatches!==1)throw new Error('Lifecycle test forbids another dispatch');
     const response=await original(input,init);const bytes=await response.clone().arrayBuffer();state.status=response.status;
     state.responseSha256=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',bytes))).map(x=>x.toString(16).padStart(2,'0')).join('');
     state.responseReady=true;
     return new Promise((_resolve,reject)=>{
      const signal=init?.signal;if(!signal){reject(new Error('Original execution AbortSignal absent'));return;}
      const abort=()=>{state.abortObserved=true;state.abortReason=signal.reason?.name;reject(signal.reason);};
      if(signal.aborted)abort();else signal.addEventListener('abort',abort,{once:true});
     });
    }
    if(state.dispatches&&/\/(GetTransaction|BatchGetTransactions)(?:$|\?)/.test(url)){state.lookupsBlocked++;throw new Error('Original receipt recovery waits for whole-browser restart');}
    return original(input,init);
   };
  });
  phase='prepare';const opening=context.waitForEvent('page',{timeout:20000});opening.catch(()=>{});
  await demo.getByRole('button',{name:'Start cancellable execute',exact:true}).click();popup=await opening;
  const approve=popup.getByRole('button',{name:/^(批准|Approve)$/});await expect(approve).toBeEnabled({timeout:60000});
  attempt={event,digest:(await popup.getByText(/^(交易摘要|Transaction digest):/).innerText()).split(':').pop().trim(),requestId:new URL(popup.url()).hash.split('/').pop(),accountId,accountAddress:address,origin:new URL(demo.url()).origin,genesisDigest:H0,generation,startedAt:new Date().toISOString()};
  record(root,'attempt.json',attempt);phase='one-approval';
  const upstream=context.waitForEvent('response',{predicate:r=>/\/ExecuteTransaction(?:$|\?)/.test(r.url()),timeout:30000});upstream.catch(()=>{});
  await approve.click();
  phase='real-response-held';await expect.poll(()=>worker.evaluate(()=>globalThis.__postDispatch.responseReady),{timeout:15000}).toBe(true);
  const wire=await wirePromise;assert(wire);record(root,'dispatch-wire.json',wire);
  assert.equal(simulations.length,3);assert(simulations.every(s=>s.checksEnabled&&s.targetIsReviewedFullnode));
  const formal=simulations.filter(s=>s.bytesSha256!==null);assert.equal(formal.length,2);assert(formal.every(s=>s.bytesSha256===wire.bytesSha256&&s.doGasSelection===false));
  record(root,'simulation-wire.json',{passed:true,simulations});
  const upstreamProof=await verifyUpstream(await upstream,attempt,wire);record(root,'dispatch-response.json',upstreamProof);
  const response=await worker.evaluate(()=>globalThis.__postDispatch);assert.equal(response.dispatches,1);assert.equal(response.status,200);assert.equal(response.abortObserved,false);
  assert.equal(response.responseSha256,upstreamProof.responseSha256);
  validate(await snapshot(extensionPage),attempt,false);
  phase='lifecycle-invalidation';
  if(event==='lock')assert.equal((await command('lockAccountSourceOrAccount',{id:accountId})).type,'done');
  if(event==='network')assert.equal((await command('@setNetwork',{env:'devNet',customRpcUrl:null})).type,'done');
  if(event==='account')assert.equal((await command('switchAccount',{accountID:second.id})).type,'done');
  if(event==='cancel')await demo.getByRole('button',{name:'Cancel transaction request',exact:true}).click();
  await expect.poll(()=>worker.evaluate(()=>globalThis.__postDispatch.abortObserved)).toBe(true);
  if(event==='lock')await demo.getByRole('button',{name:'Cancel transaction request',exact:true}).click();
  await expect.poll(()=>popup.isClosed(),{timeout:15000}).toBe(true);await expect.poll(savedApprovals).toBe(0);
  await expect(demo.getByRole('alert')).toBeVisible();assert.equal(await demo.getByTestId('action-result').count(),0);
  const pending=validate(await snapshot(extensionPage),attempt,false),fault=await worker.evaluate(()=>globalThis.__postDispatch);
  assert.equal(fault.dispatches,1);assert.notEqual(fault.abortReason,'TimeoutError');
  const result={passed:true,event,digest:attempt.digest,requestId:attempt.requestId,wire,upstream:upstreamProof,fault,pendingPreserved:true,originalRequestRemoved:true,returnedSignature:false,scope:'One real upstream HTTP response was received and withheld; lifecycle invalidation preserved the exact pending digest. Locked browser restart recovery is still required.'};
  record(root,'post-dispatch-pending.json',result);return result;
 }catch(error){
  record(root,'post-dispatch-failure.json',{passed:false,event,phase,errorType:error.name,attemptRecorded:!!attempt,fault:await worker.evaluate(()=>globalThis.__postDispatch).catch(()=>undefined)});
  throw error;
 }finally{
  context.off('request',onRequest);
  // Keep dispatch and lookup barriers until Chrome closes; never re-enable transport after an uncertain attempt.
  if(popup&&!popup.isClosed())await demo.getByRole('button',{name:'Cancel transaction request',exact:true}).click().catch(()=>{});
  try{
   if(event==='network'){
    assert.equal((await command('@setNetwork',{env:'local',customRpcUrl:null})).type,'done');
    await expect.poll(async()=>{
     await demo.getByRole('button',{name:'Inspect wallet network',exact:true}).click();
     return JSON.parse(await demo.getByTestId('wallet-network').innerText()).accounts?.[0]?.chains;
    },{timeout:15000}).toEqual(['rtd:localnet']);
   }
   if(second){await command('switchAccount',{accountID:accountId});await command('removeAccount',{accountID:second.id});}
   if(event==='lock')await unlockAccount();
  }catch(error){
   record(root,'post-dispatch-cleanup-failure.json',{passed:false,event,errorType:error.name,commandTimedOut:String(error.message).includes('command timeout'),extensionPageClosed:extensionPage.isClosed()});
   throw error;
  }
 }
}
async function verifyLocked({root,page,command,key,accountId}){
 const attempt=read(path.join(root,'attempt.json')),wire=read(path.join(root,'dispatch-wire.json'));
 assert.equal(attempt.accountId,accountId);
 assert.equal((await command('getStoredEntities',{type:'accounts'})).args.entities.find(a=>a.id===accountId).isLocked,true);
 const reply=await command('recoverPreparedTransaction',{accountId});assert.notEqual(reply.error,true);
 await expect.poll(async()=>(await snapshot(page))['journal-v2'][0]?.state,{timeout:45000}).toBe('confirmed-success');
 const row=validate(await snapshot(page),attempt,true),native=await verifyNative(row,wire,key);
 assert.equal(native.effectsSha256,read(path.join(root,'dispatch-response.json')).effectsSha256);
 const result={passed:true,event:attempt.event,digest:attempt.digest,requestId:attempt.requestId,lockedRestart:true,originalDigestOnly:true,native,scope:'Actual locked whole-browser restart recovery, original bytes/signature/effects matched using hashes and Intent verification; no resubmission.'};
 record(root,'confirmed.json',result);return result;
}
module.exports={admit,execute,verifyLocked,auditPrevious,record,directory,certificateArgs};
