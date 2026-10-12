// Use real batches and explicitly offline protobuf mutants; retain the complete original auditor.
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),crypto=require('node:crypto'),cp=require('node:child_process');
const {GrpcTypes}=require('rtd-typescript/grpc'),parser=require('./lib/C88-post-write-bytes.cjs');
const logs=path.resolve(__dirname,'../migrationToGRpcOrGraphQLDoc/workLog'),read=f=>JSON.parse(fs.readFileSync(f)),sha=f=>crypto.createHash('sha256').update(fs.readFileSync(f)).digest('hex');
const[output]=process.argv.slice(2);assert(output&&!fs.existsSync(output));const files=[__filename];let result;
try{
 const load=(name,passed=true)=>{const f=path.join(logs,name);files.push(f);const p=read(f);assert.equal(p.passed,passed);for(const[f,h]of Object.entries(p.inputsSha256??{}))assert.equal(sha(f),h);return p;};
 const previous=load('20261008-C102-negative-http-qualification-01.json');assert(previous.wholePositiveBusinessAuditInverseHeld&&previous.negativeRepliesNeverDataProof&&previous.offlineChecks===25);
 const p=load('20261008-C102-current-three-owner-browser-02.json'),api=load('20261008-C102-full-post-write-positive-02.json');
 const failure=load('20261008-C102-current-three-owner-browser-independent-03.json',false);assert(failure.message.includes('assert(historicalReads.some'));assert.equal(failure.supplementalFrames.length,0);
 const deltaFile=path.join(logs,'20261008-C102-browser-audit-v7-source-delta-01.json');files.push(deltaFile);const delta=read(deltaFile);files.push(delta.originalSource,delta.candidateSource);assert.equal(previous.inputsSha256[delta.originalSource],sha(delta.originalSource));assert.equal(delta.changes.length,3);
 let inverse=fs.readFileSync(delta.candidateSource,'utf8');for(const[before,after]of delta.changes.slice().reverse()){assert.equal(inverse.split(after).length-1,1);inverse=inverse.replace(after,before);}assert.equal(inverse,fs.readFileSync(delta.originalSource,'utf8'));
 const helper=path.join(__dirname,'lib/C102-historical-object-batches.cjs');files.push(helper,path.join(__dirname,'lib/C88-post-write-bytes.cjs'),path.join(__dirname,'audit-C84-nft-post-write-positive.cjs'));const{batch}=require(helper);
 const native=parser.nativeObjects(p.frames.filter(f=>f.phase==='fresh native before'),api.freshNativeAndArchivedObjects.map(o=>o.objectId));
 const frames=[...p.frames,...p.consumerFrames].filter(f=>f.url.endsWith('/BatchGetObjects'));assert.equal(frames.length,24);const slots=frames.flatMap(f=>batch(f,native));assert.equal(slots.length,24);
 for(const role of ['source','existingTarget','newTarget'])assert.deepEqual([...new Set(slots.filter(s=>s.role===role).map(s=>s.objectId))].sort(),p.owners[role].receipts.map(r=>r.historicalObjectId).sort());
 const checks=['24 actual complete protobuf slots canonical and exact native BCS','all 12 actual receipt selections cover three roles','original whole business audit inverse held'];
 const actual=frames[0];
 function mutated(part,mutate){
  const codec=part==='request'?GrpcTypes.BatchGetObjectsRequest:GrpcTypes.BatchGetObjectsResponse;
  const key=part==='request'?'requestBase64':'responseBase64',original=Buffer.from(actual[key],'base64');const value=codec.fromBinary(parser.grpcBody(actual[key],part==='response'));mutate(value);
  const body=Buffer.from(codec.toBinary(value)),header=Buffer.alloc(5);header.writeUInt32BE(body.length,1);const trailing=part==='response'?original.subarray(5+original.readUInt32BE(1)):Buffer.alloc(0);
  return{...actual,[key]:Buffer.concat([header,body,trailing]).toString('base64')};
 }
 const requestCases={
  'missing explicit version':r=>{delete r.requests[0].version;},'wrong explicit version':r=>{r.requests[0].version++;},
  'wrong selector id':r=>{r.requests[0].objectId=Array.from(native.keys()).find(k=>k!==r.requests[0].objectId);},
  'unknown selector id':r=>{r.requests[0].objectId='0x'+'00'.repeat(32);},
  'missing selector':r=>{r.requests=[];},'extra selector without result':r=>{r.requests.push({...r.requests[0]});},
  'missing BCS mask':r=>{r.readMask.paths=r.readMask.paths.filter(s=>s!=='bcs');},'missing owner mask':r=>{r.readMask.paths=r.readMask.paths.filter(s=>s!=='owner');},
  'unknown extra mask':r=>{r.readMask.paths.push('unknown');}
 };
 for(const[name,mutate]of Object.entries(requestCases)){assert.throws(()=>batch(mutated('request',mutate),native));checks.push(name);}
 const responseCases={
  'missing result slot':r=>{r.objects=[];},'extra result slot':r=>{r.objects.push(r.objects[0]);},
  'error result is not positive':r=>{r.objects[0].result={oneofKind:'error',error:{code:5,message:'offline missing object'}};},
  'absent result oneof':r=>{r.objects[0].result={oneofKind:undefined};},
  'wrong output object id':r=>{r.objects[0].result.object.objectId='0x'+'00'.repeat(32);},
  'wrong output object version':r=>{r.objects[0].result.object.version++;},
  'wrong digest':r=>{r.objects[0].result.object.digest='different';},
  'changed full BCS':r=>{const v=r.objects[0].result.object.bcs.value;v[v.length-1]^=1;},
  'changed contents':r=>{const v=r.objects[0].result.object.contents.value;v[v.length-1]^=1;},
  'wrong wire owner':r=>{r.objects[0].result.object.owner.address='0x'+'00'.repeat(32);},
  'wrong wire type':r=>{r.objects[0].result.object.objectType='0x2::different::Type';},
  'wrong previous transaction':r=>{r.objects[0].result.object.previousTransaction='different';},
  'wrong public transfer hint':r=>{r.objects[0].result.object.hasPublicTransfer=!r.objects[0].result.object.hasPublicTransfer;}
 };
 for(const[name,mutate]of Object.entries(responseCases)){assert.throws(()=>batch(mutated('response',mutate),native));checks.push(name);}
 for(const[name,change]of [['wrong method',{url:actual.url.replace('BatchGetObjects','GetObject')}],['wrong prefix',{url:actual.url.replace('/archive/','/')}],['wrong role',{role:'other'}],['non200 cannot be data',{status:504}]]){assert.throws(()=>batch({...actual,...change},native));checks.push(name);}
 for(const f of [__filename,helper,delta.candidateSource])cp.execFileSync(process.execPath,['--check',f],{timeout:30000});
 result={passed:true,preparedOnly:true,observedAt:new Date().toISOString(),offlineChecks:checks.length,checks,wholeOriginalBusinessAuditInverseHeld:true,originalFailedIndependentAuditHeld:true,actualCanonicalBatchSlots:24,threeRoleUniqueHistoricalSelections:12,explicitSelectorMaskSlotAndCanonicalNativeChecksHeld:true,noSyntheticGetObjectFrame:true,mutatedFramesOnlyOfflineNegativeChecks:true,networkRequests:0,profilesOpened:0,parentCompletion:false,inputsSha256:Object.fromEntries([...new Set(files)].map(f=>[f,sha(f)]))};
}catch(error){result={passed:false,errorType:error.name,message:String(error.message).slice(0,1500)};process.exitCode=1;}
fs.writeFileSync(output,JSON.stringify(result,null,2)+'\n',{flag:'wx',mode:0o600});console.log(JSON.stringify({passed:result.passed,offlineChecks:result.offlineChecks,slots:result.actualCanonicalBatchSlots,errorType:result.errorType,message:result.message}));
