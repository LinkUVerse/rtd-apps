// Join original completed contracts with current full API and independently decoded current browser evidence.
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),assert=require('node:assert/strict');
const logs=path.resolve(__dirname,'../migrationToGRpcOrGraphQLDoc/workLog'),read=f=>JSON.parse(fs.readFileSync(f)),sha=f=>crypto.createHash('sha256').update(fs.readFileSync(f)).digest('hex');
const [browserFile,independentFile,output]=process.argv.slice(2);assert(browserFile&&independentFile&&output&&!fs.existsSync(output));
const files=[__filename];let result;
try{
 const load=f=>{files.push(f);const p=read(f);assert(p.passed);for(const[f,h]of Object.entries(p.inputsSha256??{}))assert.equal(sha(f),h);return p;};
 const archive=load(path.join(logs,'20261008-C102-before-implementation-archive-01.json'));
 const task=archive.snapshots.find(r=>r.path.endsWith('/Task.md'));assert(task);files.push(task.snapshot);assert.equal(sha(task.snapshot),task.sha256);
 const originalTask=fs.readFileSync(task.snapshot,'utf8'),parents=['RPC-22','RPC-23','TX-08','TRY-05','QA-A07'];
 const originalParentContracts=Object.fromEntries(parents.map(id=>{const lines=originalTask.split('\n').filter(s=>s.startsWith('- [ ] `'+id+'` '));assert.equal(lines.length,1);return[id,lines[0]];}));
 const original=load(path.join(logs,'20261007-C48-nft-execution-browser-independent-02.json'));assert.equal(original.originalExecutions,6);
 const apiFile=path.join(logs,'20261008-C102-full-post-write-positive-02.json'),apiIndependentFile=path.join(logs,'20261008-C102-full-post-write-independent-01.json');
 const api=load(apiFile),apiIndependent=load(apiIndependentFile);
 require('./lib/C101-current-browser-prerequisites.cjs').validate(api,apiIndependent,apiFile);
 const browser=load(path.resolve(browserFile)),independent=load(path.resolve(independentFile));
 assert.equal(independent.inputsSha256[path.resolve(browserFile)],sha(browserFile));
 assert.equal(browser.inputsSha256[apiFile],sha(apiFile));assert.equal(browser.inputsSha256[apiIndependentFile],sha(apiIndependentFile));
 for(const p of [api,apiIndependent,browser,independent])assert.equal(p.h0,original.h0);
 assert.deepEqual(browser.source,api.source);assert.equal(browser.profilesOpened,3);
 assert(browser.allOriginalEightNftFiveCapsAccepted&&browser.allThreeSupportedWindowsAccepted&&browser.originalSixReceiptsAccepted);
 for(const n of ['executeRequests','simulations','signatures','containersCreated','serviceSignals'])assert.equal(browser[n],0);
 assert.equal(browser.nativeChecks.length,26);assert.equal(browser.blocked.length,0);
 const expected={nativeObjectsBeforeAndAfter:13,actualCurrentGraphqlObjects:13,fiveCaps:5,fiveKioskPages:5,eightNftDetails:8,originalTransactions:6,renderedOriginalReceipts:12};
 for(const[k,v]of Object.entries(expected))assert.equal(independent[k],v);
 for(const k of ['actualLoadedProductionSourceAccepted','threeOwnedProfilesNormallyLockedAndClosed','journalsUnchangedAndEmpty','riskUnavailablePreserved','currentThreeOwnerBrowserAccepted'])assert.equal(independent[k],true);
 assert(!independent.ordinaryChromeAccepted&&!independent.parentCompletion&&!independent.wholeAccountCertified);
 let kioskPages=0,nftDetails=0,receipts=0;
 for(const role of ['source','existingTarget','newTarget']){
  const owner=browser.owners[role],rows=role==='source'?9:role==='existingTarget'?6:1;
  assert(owner.contextClosed&&owner.normallyRelocked&&owner.worker.matchesDisk&&owner.ui.matchesDisk);
  assert.equal(owner.encryptedBefore,owner.encryptedAfter);assert.deepEqual(owner.initialJournal,owner.finalJournal);assert(Object.values(owner.initialJournal).every(s=>s.length===0));
  assert.equal(owner.history.totalTransactions,rows);assert.equal(owner.historyLinks.length,rows);assert.equal(independent.actualHistories[role].allRowsCanonical,rows);
  assert.equal(independent.actualHistories[role].originalDispatchesVerified,role==='source'?6:role==='existingTarget'?5:1);
  assert(!owner.history.coverage.allAccountActivityCertified&&!owner.history.coverage.registrationComplete);
  kioskPages+=owner.renderedKiosks.length;nftDetails+=owner.details.length;receipts+=owner.receipts.length;
 }
 assert.equal(kioskPages,5);assert.equal(nftDetails,8);assert.equal(receipts,12);assert.equal(browser.screenshots.length,3);
 for(const f of browser.screenshots){files.push(f);assert(fs.statSync(f).size>0);}
 const sourceFile=path.join(logs,'20261008-C102-production-source-independent-02.json'),source=load(sourceFile);
 require('./lib/C102-product-source-lineage-v2.cjs').validate(original.source,browser.buildFile);assert.deepEqual(source.currentSource,browser.source);
 const transport=load(path.join(logs,'20261008-C102-current-browser-transport-qualification-01.json'));
 assert(transport.originalFullBrowserAndRawAuditHeld&&transport.actualLoadedRendererWorkerAndPermissionsHeld);
 const observer=load(path.join(logs,'20261008-C102-consumer-cancellation-qualification-01.json'));assert(observer.offlineChecks===14&&observer.incompleteCloneNeverPositive&&observer.nonCancelledOrBindingOrCloneFailureStillRejected);
 const headers=load(path.join(logs,'20261008-C102-response-header-qualification-01.json'));assert(headers.offlineChecks===58&&headers.wholeOriginalAuditorInverseHeld&&headers.everyOtherHeaderAndRequestIdentityExact);
 const negative=load(path.join(logs,'20261008-C102-negative-http-qualification-01.json'));assert(negative.offlineChecks===25&&negative.wholePositiveBusinessAuditInverseHeld&&negative.negativeRepliesNeverDataProof);
 assert(independent.allRetainedFramesAccountedFor&&independent.positiveRetainedFrames===1305&&independent.retainedHttpNegatives.length===3);assert(independent.retainedHttpNegatives.every(r=>r.negativeOnly&&r.network.status===504&&r.consumer.status===504));
 const batches=load(path.join(logs,'20261008-C102-historical-batch-qualification-01.json'));assert(batches.offlineChecks===29&&batches.wholeOriginalBusinessAuditInverseHeld&&batches.actualCanonicalBatchSlots===24&&batches.noSyntheticGetObjectFrame);assert.equal(independent.actualHistoricalBatchArchiveReads,24);
 const gateway=require('./lib/C102-current-gateway-ownership.cjs').capture();assert.equal(gateway.originalRuntimeCaptureSha256,browser.runtimeCaptureSha256);assert.equal(gateway.origin,transport.actualOrigin);
 files.push(path.join(__dirname,'lib/C101-current-browser-prerequisites.cjs'),path.join(__dirname,'lib/C102-product-source-lineage-v2.cjs'),path.join(__dirname,'lib/C102-current-gateway-ownership.cjs'));
 result={passed:true,observedAt:new Date().toISOString(),acceptedParents:parents,originalParentContracts,original98DenominatorHeld:true,fullOriginalFiveRemainingParentContractsAccepted:true,currentCompleteApiAndBrowserAccepted:true,ordinaryChromeAccepted:false,otherNineParentsAccepted:false,trialReady:false,originalSixExecutionsNotRepeated:true,currentSource:source.currentSource,expectedCounts:expected,gatewayAuthority:gateway,additionalWalletNetworkRequests:0,signatures:0,executeRequests:0,serviceSignals:0,inputsSha256:Object.fromEntries([...new Set(files)].map(f=>[f,sha(f)]))};
}catch(e){result={passed:false,errorType:e.name,message:String(e.message).slice(0,1400),fullOriginalFiveRemainingParentContractsAccepted:false};process.exitCode=1;}
fs.writeFileSync(output,JSON.stringify(result,null,2)+'\n',{flag:'wx',mode:0o600});console.log(JSON.stringify({passed:result.passed,parents:result.acceptedParents,errorType:result.errorType,message:result.message}));
