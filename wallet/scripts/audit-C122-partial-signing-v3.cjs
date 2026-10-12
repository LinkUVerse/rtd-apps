// Independently validate returned signatures while keeping the complete matrix failed.
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const audit=require('./lib/C122-non-nft-signing-audit-v2.cjs'),base=require('./lib/C117-non-nft-validity-audit.cjs'),wire=require('./lib/C114-nft-wire-contract-v3.cjs');
const wallet=path.resolve(__dirname,'..'),logs=path.join(wallet,'migrationToGRpcOrGraphQLDoc/workLog'),read=f=>JSON.parse(fs.readFileSync(f));
(async()=>{
 const[input,output]=process.argv.slice(2);assert(output&&!fs.existsSync(output));const p=read(input);
 assert.equal(p.passed,false);assert.equal(p.returnedSignatures,7);assert.equal(p.executeRequests,0);assert.deepEqual(p.forbidden,[]);
 const lineage=require('./lib/C109-product-source-lineage.cjs'),q=read(lineage.qualificationFile),source=lineage.validate(q.originalSource,q.buildFile),build=read(q.buildFile);
 assert.equal(p.workerSource.workerSha256,build.artifacts['background.js']);assert(p.workerSource.matchesDisk&&p.uiSource.matchesDisk);for(const row of p.uiSource.loadedBundles)assert.equal(row.loadedSha256,build.artifacts[row.file]);
 const cfg={owner:p.cipherBefore.owner,origin:'chrome-extension://peclhkjgdmgekmgkebipphiehekngdpe',demoOrigin:p.validityCleanup[0].demoOrigin,initialJournal:p.initialJournal,build};
 assert.equal(p.partialValidityUiCases.length,7);const records=[];let mutants=0;
 for(const row of p.partialValidityUiCases){const prepared=p.cases.find(c=>c.kind===row.kind).approval.prepared;base.requireNonNft(prepared,row.kind,cfg.owner);records.push(await audit.auditOne(row,prepared,cfg));for(const f of [...row.simulations,...row.verificationFrames])assert.equal(p.frames.filter(v=>JSON.stringify(v)===JSON.stringify(f)).length,1);
  for(const change of [x=>x.simulations[0].status=503,x=>x.variant.digest+='bad',x=>x.approvalEnabled=false,x=>x.request.tx.justSign=false,x=>x.signedResult.bytes+='AQ==',x=>{const b=Buffer.from(x.signedResult.signature,'base64');b[1]^=1;x.signedResult.signature=b.toString('base64')},x=>x.verificationFrames[0]=audit.replaceRequest(x.verificationFrames[0],r=>r.address='0x'+'0'.repeat(63)+'1')]){const broken=structuredClone(row);change(broken);await assert.rejects(()=>audit.auditOne(broken,prepared,cfg));mutants++}
 }
 assert.equal(mutants,49);assert.equal(p.frames.filter(f=>f.url.endsWith('/VerifySignature')).length,7);
 const failedStage='stake/validDuringNoTimestamp',prepared=p.cases.find(c=>c.kind==='stake').approval.prepared,want=await base.expected(prepared,'validDuringNoTimestamp');
 const preview=p.frames.filter(f=>f.stage.startsWith(failedStage)&&f.url.endsWith('/SimulateTransaction'));assert.equal(preview.length,2);assert(preview[0].stage.endsWith('/real validity UI'));assert(preview[1].stage.endsWith('/real signing UI'));for(const frame of preview)assert((await wire.simulation(frame,want,{})).canonicalFinalBytesAndEffects);
 assert.equal(p.frames.filter(f=>f.stage.startsWith(failedStage)&&f.url.endsWith('/VerifySignature')).length,0);assert(p.message.includes('后台签名或执行未成功'));
 assert.deepEqual(p.cases.map(c=>c.kind),['coin','stake','withdraw']);assert.equal(p.simulations.length,31);assert.equal(p.validityCleanup.length,1);assert(p.validityCleanup[0].demoClosed&&p.validityCleanup[0].serverClosed);
 const files=[__filename,path.resolve(input),lineage.qualificationFile,q.buildFile,path.join(__dirname,'lib/C122-non-nft-signing-audit-v2.cjs'),path.join(__dirname,'lib/C117-non-nft-validity-audit.cjs'),path.join(__dirname,'lib/C114-nft-wire-contract-v3.cjs')];
 const result={passed:true,observedAt:new Date().toISOString(),readOnlyPartialDiagnostic:true,source,actualDappReturnedSignaturesIndependentlyVerified:7,actualCanonicalFinalSimulationPairs:14,actualNativeVerificationFrames:7,actualMutationRefusals:49,records,failedEighthPreviewCanonical:true,failedEighthFinalSimulationFrames:1,failedEighthNativeVerifyFrames:0,failedEighthRootCauseConfirmed:false,actualCompleteSigningUiAccepted:false,originalNormalMatrixPassed:false,fullNonNftPhaseAccepted:false,parentCompletion:false,nftBusinessRequests:0,auditNetworkRequests:0,auditSignatures:0,auditExecuteRequests:0,inputsSha256:Object.fromEntries(files.map(f=>[f,audit.sha(f)]))};
 fs.writeFileSync(output,JSON.stringify(result,null,2)+'\n',{flag:'wx',mode:0o600});console.log(JSON.stringify({passed:true,returnedSignatures:7,mutationRefusals:49,completeMatrixAccepted:false}));
})().catch(error=>{console.error(JSON.stringify({passed:false,message:String(error.message).slice(0,1100)}));process.exitCode=1});
