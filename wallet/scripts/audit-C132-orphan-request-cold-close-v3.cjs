// Separately accept the saved unapproved request and its actual browser-cold close.
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {Transaction}=require('rtd-typescript/transactions'),{bcs}=require('rtd-typescript/bcs');
const {GrpcTypes}=require('rtd-typescript/grpc'),parser=require('./lib/C88-post-write-bytes.cjs');
const {read,sha,owner,sponsor,h0}=require('./test-C129-fresh-sponsored-withdraw-ui-v2.cjs');
const wallet=path.resolve(__dirname,'..'),logs=path.join(wallet,'migrationToGRpcOrGraphQLDoc/workLog');
const rt=path.join(process.env.HOME,'.local/state/rtd-wallet-migration/dev-20261006-03');
const op=path.join(rt,'publication-foundation/C132-orphan-cold-close-20261009-01');
const failureFile=path.join(logs,'20261009-C132-orphan-request-cold-close-01.json');
const savedFile=path.join(op,'unapproved.json'),oldInputFile=path.join(rt,'current-C129-single-sign-coin-20261009-03/negative-input.json');
const current=x=>assert((x.after??x.before??x).matchesDisk);
async function audit(p,f,s){
  assert(p.passed&&p.actualColdBrowserAndWorker&&p.normalLockedClose&&p.metadataRemovedByProduct);
  assert(p.previousExtensionReloadRequested&&p.previousWorkerWakeObserved===false&&p.previousFailurePreserved);
  assert(!f.passed&&f.stage==='actual extension restart without approval');assert(f.message.includes('waiting for event "serviceworker"'));
  assert(f.approvedClicked===false&&f.signatures===0&&f.executeRequests===0);
  assert(s.approvedClicked===false&&s.approvalDisabled);assert.deepEqual(s.actualRequest,f.actualRequest);
  assert.deepEqual(p.actualRequest,s.actualRequest);assert.deepEqual(p.input,f.input);assert.deepEqual(p.input,read(path.join(op,'input.json')));
  assert.equal(p.owner,owner);assert.equal(p.h0,h0);assert.equal(p.input.sender,owner);assert.equal(p.input.sponsor,sponsor);
  for(const k of ['unlocks','storageWritesByTool','simulations','nativeVerifications','signatures','executeRequests','nftBusinessRequests'])assert.equal(p[k],0);
  assert(p.fullNonNftM5Accepted===false&&p.ordinaryChromeAccepted===false&&p.parentAcceptance===false);
  assert.deepEqual(p.beforeProcesses,[]);assert.equal(p.currentProcesses.length,1);assert(p.currentProcesses[0].includes('--user-data-dir='+p.profile));
  assert.deepEqual(p.beforeJournal,s.initialJournal);assert.deepEqual(p.afterJournal,p.beforeJournal);assert.equal(Object.keys(p.beforeJournal).length,3);
  assert(Object.values(p.beforeJournal).every(v=>Array.isArray(v)&&v.length===0));
  assert.deepEqual(p.beforeCipher,s.cipherBefore);assert.deepEqual(p.afterCipher,p.beforeCipher);assert.equal(p.beforeCipher.owner,owner);
  assert.deepEqual(p.requests,{[p.actualRequest.id]:p.actualRequest});assert.deepEqual(p.afterRequests,{});assert(p.body.includes('\u5173\u95ed\u8bf7\u6c42'));
  const r=p.actualRequest;assert.equal(r.approved,null);assert.equal(r.binding.mode,'execute');assert.equal(r.binding.account,owner);assert.equal(r.binding.chain,'rtd:localnet');
  assert.equal(r.tx.account,owner);assert.equal(r.tx.chain,'rtd:localnet');assert.equal(r.tx.type,'transaction');assert.equal(r.tx.justSign,undefined);assert.equal(r.tx.data,p.input.json);
  const origin=new URL(r.origin);assert.equal(origin.protocol,'http:');assert.equal(origin.hostname,'127.0.0.1');
  assert(p.input.onlyTwoReferencesChanged&&p.input.previousSignaturesUsed===false);
  const bytes=Buffer.from(p.input.bytesBase64,'base64');assert.equal(bytes.toString('base64'),p.input.bytesBase64);
  assert.equal(Buffer.from(await Transaction.from(p.input.json).build()).toString('base64'),p.input.bytesBase64);assert.equal(await Transaction.from(bytes).getDigest(),p.input.digest);
  const data=bcs.TransactionData.parse(bytes);assert.equal(data.V1.sender,owner);assert.equal(data.V1.gasData.owner,sponsor);
  assert.deepEqual(data.V1.kind.ProgrammableTransaction.commands.map(c=>c.$kind),['SplitCoins','TransferObjects']);
  const original=bcs.TransactionData.parse(Buffer.from(read(oldInputFile).bytesBase64,'base64')),inverse=structuredClone(data);
  inverse.V1.kind.ProgrammableTransaction.inputs[2]=original.V1.kind.ProgrammableTransaction.inputs[2];inverse.V1.gasData.payment=original.V1.gasData.payment;assert.deepEqual(inverse,original);
  assert.equal(f.nativeFrames.length,3);
  const decode=(row,req,res)=>{assert.equal(row.status,200);assert.equal(new URL(row.url).origin,'http://127.0.0.1:41750');assert.equal(row.headers['x-rtd-chain-id'],h0);return{request:req.fromBinary(parser.grpcBody(row.requestBase64,false)),response:res.fromBinary(parser.grpcBody(row.responseBase64,true))};};
  const infos=f.nativeFrames.filter(x=>x.url.endsWith('/GetServiceInfo'));assert.equal(infos.length,1);assert.equal(decode(infos[0],GrpcTypes.GetServiceInfoRequest,GrpcTypes.GetServiceInfoResponse).response.chainId,h0);
  const objects=f.nativeFrames.filter(x=>x.url.endsWith('/GetObject')).map(x=>decode(x,GrpcTypes.GetObjectRequest,GrpcTypes.GetObjectResponse));assert.equal(objects.length,2);
  for(const[ref,address]of[[data.V1.kind.ProgrammableTransaction.inputs[2].Object.ImmOrOwnedObject,owner],[data.V1.gasData.payment[0],sponsor]]){const rows=objects.filter(x=>x.request.objectId===ref.objectId);assert.equal(rows.length,1);const o=rows[0].response.object;assert.equal(o.owner.kind,GrpcTypes.Owner_OwnerKind.ADDRESS);assert.equal(o.owner.address,address);assert.equal(String(o.version),ref.version);assert.equal(o.digest,ref.digest);}
  for(const x of [s.workerSource,s.uiSource,s.popupSource,p.currentWorkerSource,p.currentUiSource])current(x);
  assert.equal(p.authority.origin,'chrome-extension://gfjgbndhkmndbgclghagipneaiajhnnm');assert.deepEqual(p.forbidden,[]);
  for(const row of [...f.traffic,...p.traffic])assert(!/\/(SimulateTransaction|VerifySignature|ExecuteTransaction)$/.test(new URL(row.url).pathname));
  assert.equal(f.forbidden.length,4);assert(f.forbidden.every(url=>new URL(url).origin==='https://www.gstatic.com'));
  for(const row of f.traffic.filter(row=>f.forbidden.includes(row.url)))assert(row.stage==='actual extension restart without approval'&&row.method==='GET');
  // The producer computed this claim before teardown completed; do not accept it.
  assert.equal(p.fullUiCapture,true);assert.equal(p.captureErrors.length,2);
  assert(p.captureErrors.every(e=>e.duringClosing===true&&e.errorType==='Error'&&e.stage==='normal locked-account recovery request close'));
  assert.deepEqual(p.captureErrors.map(e=>e.url).sort(),['http://127.0.0.1:42011/graphql','http://127.0.0.1:42012/archive/rtd.rpc.v2.LedgerService/GetServiceInfo'].sort());
}
module.exports={audit};
if(require.main===module)(async()=>{
  const[file,out]=process.argv.slice(2);assert(file&&out&&!fs.existsSync(out));let result;
  try{
    const p=read(file),f=read(failureFile),s=read(savedFile);for(const[a,h]of Object.entries(p.inputsSha256))assert.equal(sha(a),h);
    await audit(p,f,s);let mutations=0;
    for(const mutate of [x=>x.normalLockedClose=false,x=>x.metadataRemovedByProduct=false,x=>x.actualColdBrowserAndWorker=false,
      x=>x.previousWorkerWakeObserved=true,x=>x.signatures=1,x=>x.executeRequests=1,x=>x.simulations=1,x=>x.storageWritesByTool=1,
      x=>x.afterRequests[x.actualRequest.id]=x.actualRequest,x=>x.afterJournal['journal-v2']=[{pending:true}],x=>x.afterCipher.sha256='0'.repeat(64),
      x=>x.actualRequest.binding.account=sponsor,x=>x.currentUiSource.matchesDisk=false,x=>x.input.digest+='bad',x=>x.currentProcesses=[],
      x=>x.captureErrors[0].duringClosing=false,x=>x.captureErrors[0].url='http://127.0.0.1:41750/rtd.rpc.v2.TransactionExecutionService/ExecuteTransaction',x=>x.captureErrors.pop()]){
      const bad=structuredClone(p);mutate(bad);await assert.rejects(()=>audit(bad,f,s));mutations++;
    }
    const lineage=require('./lib/C131-product-source-lineage.cjs'),q=read(lineage.qualificationFile);assert.deepEqual(lineage.validate(q.originalSource,q.buildFile),p.source);assert.deepEqual(require('./lib/C132-current-core-gateway-ownership-v3.cjs').capture(),p.authority);
    result={passed:true,observedAt:new Date().toISOString(),source:p.source,h0,profile:p.profile,
      savedActualUnapprovedCoinMetadataAccepted:true,actualColdBrowserAndWorkerAccepted:true,actualLockedNormalMetadataCloseAccepted:true,
      cipherAndAllThreeJournalStoresHeld:true,actualSourceLoadedAccepted:true,previousWakeFailurePreserved:true,
      previousBlockedGstaticRequests:4,previousBlockedRequestInitiatorConfirmed:false,previousWholeActorAccepted:false,
      fullColdUiCapture:false,producerFullUiCaptureClaimAccepted:false,unavailableBodyCauseConfirmed:false,captureErrors:p.captureErrors,artifactMutationRefusals:mutations,
      scope:'Saved genuine unapproved Coin request and browser-cold locked UI close only; no natural pending, M5 or ordinary Chrome acceptance',
      signatures:0,simulations:0,executeRequests:0,nftBusinessRequests:0,fullNonNftM5Accepted:false,parentAcceptance:false,
      inputsSha256:{...p.inputsSha256,[__filename]:sha(__filename),[path.resolve(file)]:sha(file),[oldInputFile]:sha(oldInputFile)}};
  }catch(e){result={passed:false,errorType:e.name,message:String(e.message).slice(0,1600),signatures:0,executeRequests:0,parentAcceptance:false};process.exitCode=1;}
  fs.writeFileSync(out,JSON.stringify(result,null,2)+'\n',{flag:'wx',mode:0o600});console.log(JSON.stringify({passed:result.passed,mutations:result.artifactMutationRefusals,message:result.message}));
})();
