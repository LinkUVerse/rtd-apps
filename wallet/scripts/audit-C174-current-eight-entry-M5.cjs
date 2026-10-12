// Bind full current live/cold M5 contracts of all eight production entries; no approvals or requests.
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const assert=require('./lib/C158-bounded-strict-assert.cjs');
const logs=path.resolve(__dirname,'../migrationToGRpcOrGraphQLDoc/workLog');
const read=f=>JSON.parse(fs.readFileSync(f)),sha=f=>crypto.createHash('sha256').update(fs.readFileSync(f)).digest('hex');
const methods=['accounts/ImportedAccount','accounts/MnemonicAccount','accounts/zklogin/ZkLoginAccount'];
const env=require('./lib/C161-current-nft-environment.cjs');
function complete(non,live,cold,liveActual,coldActual,nonLive,nonCold,source){
 assert(non.passed&&non.nonNftFourEntryFullM5Accepted&&non.allOriginalEvidenceSha256Held);
 assert.equal(non.actualAggregateMutationRefusals,22);assert.equal(non.matrix.length,4);assert.deepEqual(non.matrix.map(r=>r.entry),['coin','stake','withdraw','dApp']);
 for(const r of non.matrix)for(const k of ['actualLiveRefusal','actualDurableRefusal','entireInitialSourceAndHttpBodiesAccepted','actualPrivateCallsSeparatelyObserved','originalThreeStoresAndCipherHeld'])assert(r[k]);
 for(const r of [non,liveActual,coldActual,nonLive,nonCold]){assert(r.passed);assert.equal(r.h0,read(env.profileFile).expectedGenesisDigest);assert.deepEqual(r.source,source);}
 assert.equal(source.files,1122);assert.equal(source.sha256,'cf896265507583ccda66d584e9b207d4524a277f41e7eb5fe730aa624d201817');
 assert.equal(live.mode,'live');assert.equal(cold.mode,'durable');
 for(const [report,p]of [[live,liveActual],[cold,coldActual]]){
  for(const k of ['passed','fullCurrentM5BranchAccepted','currentFourNFTFormsAccepted','actualCurrentOneBranchAccepted','actualCompleteJournalAndEncryptionRetained','freshFourteenObjectsAndGasHeld'])assert(report[k]);
  assert.equal(report.completeEntities.allOriginalEntitiesAndTeardownAccepted,true);assert(report.completeEntities.mutationsRejected>=13);
  assert.equal(report.completeEntities.capturedOriginalEntities,p.completeCaptureRecords.length);assert(report.completeEntities.intermediateEvents>p.completeCaptureRecords.length);
  assert.deepEqual(report.completeEntities.actualThreePrivateEntryCalls,Object.fromEntries(methods.map((k,i)=>[k,i===0?1:0])));
  assert.equal(report.originalPrivateSignatureVerified,1);assert.equal(report.competingSignatures,0);assert.equal(report.forwardedExecuteRequests,0);assert.equal(report.parentCompletion,false);
  assert.equal(p.currentFourNFTFormsAccepted,true);assert.equal(p.actualFourFormTestExecuted,true);assert.equal(p.allOriginalHttpResponseBodiesCaptured,true);
  assert.equal(p.captureScopeIncludesTeardown,true);assert.equal(p.ownedBrowserNaturallyClosed,true);assert.deepEqual(p.cleanupFailures,[]);assert.deepEqual(p.captureErrors,[]);
  assert.equal(p.forwardedExecuteRequests,0);assert.equal(p.journalSeeded,false);assert.equal(p.newContainers,0);assert.equal(p.certificateChanges,0);assert.equal(p.originalProfilesOpened,0);
  assert.equal(p.encryptedBefore,p.encryptedAfter);assert.deepEqual(p.cases.map(r=>r.route),['direct','framework-kiosk','personal-kiosk','originbyte-kiosk']);
  assert.equal(p.variant.scope,p.scopeKey);assert.deepEqual(JSON.parse(p.scopeKey),[2,p.h0,p.generation,p.owner]);
  assert.deepEqual(report.actualFormRoutes,p.cases.map(r=>r.route));
 }
 assert.equal(liveActual.mode,'live');assert.equal(coldActual.mode,'durable');assert.equal(liveActual.owner,coldActual.owner);assert.equal(liveActual.generation,coldActual.generation);assert.equal(liveActual.scopeKey,coldActual.scopeKey);
 assert.equal(nonLive.owner,nonCold.input.sender);assert.deepEqual(JSON.parse(nonLive.scopeKey),[2,nonLive.h0,liveActual.generation,nonCold.input.sender]);
 assert(liveActual.distinctFromOriginalC162Approval);assert.notEqual(liveActual.variant.digest,coldActual.variant.digest);assert.equal(live.actualEnabledSimulations,10);assert.equal(cold.actualEnabledSimulations,2);
 assert.equal(liveActual.signaturesReturnedToDapp,0);assert.equal(liveActual.executeAttempts,0);assert(liveActual.releaseAt-liveActual.heldAt>=31000);assert(liveActual.realSignerRestored);
 assert.deepEqual(liveActual.finalJournal,liveActual.initialJournal);assert(liveActual.competitions.length===4&&liveActual.previews.length===4);
 for(const r of liveActual.competitions){assert(r.nativeLockUnavailable);assert.equal(r.simulationsAfter,r.simulationsBefore);assert.deepEqual(r.state.approvals,[]);}
 assert(coldActual.productCreatedPending&&coldActual.pendingJournalHeld&&coldActual.originalWorkerClosed&&coldActual.nativeScopeFreeAfterOriginalClose);assert.equal(coldActual.executeAttempts,1);assert.equal(coldActual.signaturesInInterceptedRequest,1);
 assert.deepEqual(coldActual.finalJournal,coldActual.pendingJournal);assert.equal(coldActual.pendingForms.length,4);assert.equal(coldActual.signerObservations.length,2);
 for(const r of coldActual.signerObservations[1].snapshots)assert(Object.values(r.counts).every(n=>n===0));
 return [...non.matrix,...liveActual.cases.map(r=>({entry:'NFT/'+r.route,actualLiveRefusal:true,actualDurableRefusal:true,entireInitialSourceAndHttpBodiesAccepted:true,actualPrivateCallsSeparatelyObserved:true,originalThreeStoresAndCipherHeld:true}))];
}
(async()=>{
 const[liveFile,coldFile,output]=process.argv.slice(2);assert(liveFile&&coldFile&&output&&!fs.existsSync(output));let result;
 try{
  const nonFile=path.join(logs,'20261009-C155-current-non-nft-m5-complete-01.json'),nonLiveFile=path.join(logs,'20261009-C154-current-non-nft-live-01.json'),nonColdFile=path.join(logs,'20261009-C148-current-non-nft-pending-cold-05.json');
  const liveActualFile=path.join(logs,'20261010-C165-current-four-nft-live-03.json'),coldActualFile=path.join(logs,'20261009-C162-current-four-nft-durable-01.json');
  const reports={non:read(nonFile),live:read(liveFile),cold:read(coldFile),liveActual:read(liveActualFile),coldActual:read(coldActualFile),nonLive:read(nonLiveFile),nonCold:read(nonColdFile)};
  const source=env.validateBuild(env.buildFile,env.profileFile).sourceAfter;
  const run=p=>complete(p.non,p.live,p.cold,p.liveActual,p.coldActual,p.nonLive,p.nonCold,source);const matrix=run(reports);
  const inputPins=Object.fromEntries([__filename,nonFile,liveFile,coldFile,liveActualFile,coldActualFile,nonLiveFile,nonColdFile,...env.pins].map(f=>[path.resolve(f),sha(f)]));
  for(const q of Object.values(reports))for(const[f,h]of Object.entries(q.inputsSha256)){assert.equal(sha(f),h);if(inputPins[f])assert.equal(inputPins[f],h);inputPins[f]=h;}
  assert.equal(reports.live.inputsSha256[path.resolve(liveActualFile)],sha(liveActualFile));assert.equal(reports.cold.inputsSha256[path.resolve(coldActualFile)],sha(coldActualFile));
  const mutations=[['non',x=>x.matrix.pop()],['non',x=>x.allOriginalEvidenceSha256Held=false],['non',x=>x.actualAggregateMutationRefusals=21],
   ...['live','cold'].flatMap(side=>[[side,x=>x.passed=false],[side,x=>x.fullCurrentM5BranchAccepted=false],[side,x=>x.completeEntities.allOriginalEntitiesAndTeardownAccepted=false],[side,x=>x.completeEntities.mutationsRejected=12],[side,x=>x.forwardedExecuteRequests=1],[side,x=>x.originalPrivateSignatureVerified=0]]),
   ...['liveActual','coldActual'].flatMap(side=>[[side,x=>x.allOriginalHttpResponseBodiesCaptured=false],[side,x=>x.captureScopeIncludesTeardown=false],[side,x=>x.encryptedAfter='wrong'],[side,x=>x.cases.pop()],[side,x=>x.journalSeeded=true],[side,x=>x.scopeKey='[2,"wrong","wrong","wrong"]']]),
   ['liveActual',x=>x.signaturesReturnedToDapp=1],['liveActual',x=>x.releaseAt=x.heldAt],['coldActual',x=>x.pendingJournalHeld=false],['coldActual',x=>x.signerObservations[1].snapshots[0].counts[methods[0]]=1],['nonCold',x=>x.input.sender='wrong']];
  for(const[side,mutate]of mutations){const changed={...reports,[side]:structuredClone(reports[side])};mutate(changed[side]);assert.throws(()=>run(changed));if(global.gc)global.gc();}
  const oracle=read(path.join(logs,'20261008-C93-recovered-native-independent-01.json'));env.held(path.join(oracle.operation,'intent.json'));
  result={passed:true,observedAt:new Date().toISOString(),source,h0:reports.non.h0,fullCurrentEightEntryM5Accepted:true,matrix,actualAggregateMutationRefusals:mutations.length,
   actualNftLiveEnabledSimulations:10,actualNftColdEnabledSimulations:2,actualNftPrivateCallsLive:reports.live.completeEntities.actualThreePrivateEntryCalls,actualNftPrivateCallsCold:reports.cold.completeEntities.actualThreePrivateEntryCalls,
   coldRestartPrivateCalls:0,competingSignatures:0,forwardedExecuteRequests:0,allOriginalEvidenceSha256Held:true,original98DenominatorHeld:true,newSignatures:0,newExecuteRequests:0,oldCreatorReplayed:false,parentTX04Complete:true,parentTX01Complete:false,
   duplicateBrowserCopiesNotRead:{live:reports.live.completeEntities.duplicateBrowserCopiesNotRead,cold:reports.cold.completeEntities.duplicateBrowserCopiesNotRead},inputsSha256:inputPins};
 }catch(e){console.error(String(e.stack).slice(0,1600));result={passed:false,errorType:e.name,message:String(e.message).slice(0,600)};process.exitCode=1;}
 fs.writeFileSync(output,JSON.stringify(result,null,2)+'\n',{flag:'wx',mode:0o600});console.log(JSON.stringify({passed:result.passed,fullCurrentEightEntryM5Accepted:result.fullCurrentEightEntryM5Accepted}));
})();
