// Actual source, type, tests and compiler proof; UI acceptance is separate.
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {auditDelta,sha,read}=require('./qualify-C131-product-delta.cjs');
const lineage=require('./lib/C131-product-source-lineage.cjs');
const wallet=path.resolve(__dirname,'..'),logs=path.join(wallet,'migrationToGRpcOrGraphQLDoc/workLog');
const [output]=process.argv.slice(2);assert(output&&!fs.existsSync(output));let result;
try{
  const delta=auditDelta(),typedFile=path.join(logs,'20261009-C131-typecheck-01.json'),typed=read(typedFile);
  const closureFile=path.join(logs,'20261009-default-generation-positive-C131-closure-01.json'),closure=read(closureFile);
  const buildFile=path.join(logs,'20261009-default-generation-positive-C131-build-02.json'),build=read(buildFile);
  assert(typed.passed&&closure.passed&&build.passed);assert(typed.checks.every(c=>c.processExitCode===0));
  for(const p of [typed.source,typed.sourceAfter,closure.source,build.sourceAfter])assert.deepEqual(p,delta.currentSource);
  assert(build.compiledProfile.passed&&build.reviewedRelease.inputsUnchanged&&build.reviewedRelease.compiled.passed);
  for(const[f,h]of Object.entries(closure.inputsSha256))assert.equal(sha(f),h);
  const wanted=new Map(['background/Transactions.ts','background/connections/UiConnection.ts'].map(p=>[p,fs.readFileSync(path.join(wallet,'src',p),'utf8')]));
  const mapProof=[];
  for(const f of Object.keys(build.artifacts).filter(f=>f.endsWith('.js.map'))){const m=read(path.join(build.output,f));for(let i=0;i<m.sources.length;i++)for(const[p,text]of wanted)if(m.sources[i].endsWith('/'+p)){assert.equal(m.sourcesContent[i],text);mapProof.push({map:f,source:m.sources[i],sha256:sha(path.join(build.output,f))});}}
  assert.equal(mapProof.length,2);assert(mapProof.every(r=>r.map==='background.js.map'));
  const inputs=[__filename,require.resolve('./lib/C131-product-source-lineage.cjs'),typedFile,closureFile,buildFile,...typed.checks.map(c=>path.resolve(wallet,c.log)),...Object.keys(delta.inputsSha256),...Object.keys(closure.inputsSha256)];
  const proof={...delta,buildFile,fullProductionTypecheck:true,emittedProductionClosure:true,isolatedProductionBuild:true,currentProductMapsVerified:2,mapProof,inputsSha256:Object.fromEntries([...new Set(inputs)].map(f=>[f,sha(f)]))};
  assert.deepEqual(lineage.validateWithProof(proof,delta.originalSource,buildFile),delta.currentSource);
  let negatives=0;for(const mutate of [p=>p.passed=false,p=>p.changed.push('unknown'),p=>p.currentSource.sha256='0'.repeat(64),p=>p.durableJournalHeld=false,p=>p.onlyOrphanExplicitFalseMetadataCleanup=false,p=>p.activeApprovalSubjectTimingHeld=false,p=>p.orphanTrueRemainsNonDeliverable=false,p=>p.currentProductMapsVerified=0,p=>p.signOrExecuteRetries=1,p=>p.regressionTests=0]){const bad=structuredClone(proof);mutate(bad);assert.throws(()=>lineage.validateWithProof(bad,delta.originalSource,buildFile));negatives++;}
  const prior=read(path.join(logs,'20261009-C124-production-source-independent-02.json'));
  assert.throws(()=>require('./lib/C124-product-source-lineage-v2.cjs').validate(prior.originalSource,prior.buildFile));
  result={...proof,observedAt:new Date().toISOString(),sourceLineageRejectChecks:negatives,oldC124SourceGuardRejectsNewSource:true,currentCoreBrowserAccepted:false,signatures:0,executeRequests:0,parentAcceptance:false};
}catch(e){result={passed:false,errorType:e.name,message:String(e.message).slice(0,1500),parentAcceptance:false};process.exitCode=1;}
fs.writeFileSync(output,JSON.stringify(result,null,2)+'\n',{flag:'wx',mode:0o600});console.log(JSON.stringify({passed:result.passed,source:result.currentSource,message:result.message}));
