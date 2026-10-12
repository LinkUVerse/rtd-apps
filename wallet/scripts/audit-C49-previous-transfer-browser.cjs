// Original UI and canonical native ownership refusals; no network, signing or replay.
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),assert=require('node:assert/strict'),cp=require('node:child_process');
const {GrpcTypes}=require('rtd-typescript/grpc'),{bcs}=require('rtd-typescript/bcs'),{toBase58}=require('rtd-typescript/utils'),{blake2b}=require('@noble/hashes/blake2.js');
const read=f=>JSON.parse(fs.readFileSync(f)),sha=f=>crypto.createHash('sha256').update(fs.readFileSync(f)).digest('hex');
function frame(v,c,response){const r=Buffer.from(v,'base64');assert.equal(r[0],0);const end=5+r.readUInt32BE(1);assert(end<=r.length);if(response){assert.equal(r[end],128);assert.equal(end+5+r.readUInt32BE(end+1),r.length);assert.match(r.subarray(end+5).toString(),/(^|\r\n)grpc-status:[ \t]*0(\r\n|$)/);}else assert.equal(end,r.length);return c.fromBinary(r.subarray(5,end));}
const typed=(v)=>toBase58(blake2b(Buffer.concat([Buffer.from('Object::'),Buffer.from(v)]),{dkLen:32}));
const [proofFile,priorExecutionFile,output]=process.argv.slice(2);assert(output&&!fs.existsSync(output));let result;
try{
 const p=read(proofFile),prior=read(priorExecutionFile);assert(p.passed&&p.chromeClosed&&p.accountsNormallyRelocked&&prior.passed&&prior.originalExecutions===6);
 assert.equal(p.signatures+p.executeRequests+p.faucetRequests+p.seedRequests+p.contractsDeployed+p.certificateChanges+p.originalProfilesOpened,0);assert.equal(p.simulations.length,0);
 assert.equal(p.denials.length,6);assert.equal(p.previews.length,0);assert(!p.captureErrors.length&&!p.pageErrors.length&&!p.blocked.length);
 for(const [f,h]of Object.entries({...p.inputsSha256,...prior.inputsSha256}))assert.equal(sha(f),h);
 assert.deepEqual(p.initialJournal,p.finalJournal);assert(Object.values(p.finalJournal).every(r=>Array.isArray(r)&&r.length===0));assert.deepEqual(p.cipherBefore,p.cipherAfter);
 assert(p.workerSource.matchesDisk&&p.uiSource.matchesDisk);assert.equal(p.h0,prior.h0);assert.equal(p.generation,prior.generation);
 assert.deepEqual(require('./build-reviewed-generation-production-extension.cjs').productSource(),p.source);assert.deepEqual(p.source,prior.source);
 const buildFile=Object.keys(p.inputsSha256).find(f=>f.endsWith('/20261007-default-generation-positive-C46-build-03.json'));assert(buildFile);const build=read(buildFile);
 for(const [f,h]of Object.entries(build.artifacts))assert.equal(sha(path.join(build.output,f)),h);assert.equal(p.workerSource.workerSha256,build.artifacts['background.js']);
 const intentFile=Object.keys(p.inputsSha256).find(f=>f.endsWith('/nonempty-kiosk-C43-20261007-01/intent.json'));assert(intentFile);const pins=read(intentFile).protectedOriginalsSha256;assert.equal(Object.keys(pins).length,1015);for(const [f,h]of Object.entries(pins))assert.equal(sha(f),h);
 assert(!cp.execFileSync('ps',['-Ao','command=']).toString().split('\n').some(s=>s.includes('Google Chrome')&&s.includes('--user-data-dir='+path.join(p.fixture,'profile'))));
 for(const r of p.failedRequests){const u=new URL(r.url);assert.equal(u.hostname,'127.0.0.1');assert.equal(r.method,'POST');assert.equal(r.errorText,'net::ERR_ABORTED');assert(['/graphql','/account/graphql'].includes(u.pathname)||/\/(GetObject|GetServiceInfo|GetCheckpoint|GetAvailableRange)$/.test(u.pathname));}
 for(const r of p.abortedResponses)assert(p.failedRequests.some(f=>f.requestId===r.requestId&&f.url===r.url&&f.method===r.method&&f.requestBase64===r.requestBase64&&f.errorText===r.failureText&&r.failureText==='net::ERR_ABORTED'));
 assert(!p.traffic.some(r=>/\/(SimulateTransaction|VerifySignature|ExecuteTransaction)$/.test(new URL(r.url).pathname)));
 const native=[];
 for(const r of p.frames){const u=new URL(r.url);assert.equal(u.hostname,'127.0.0.1');if(u.pathname.endsWith('/GetObject')&&r.status===200){const req=frame(r.requestBase64,GrpcTypes.GetObjectRequest,false),res=frame(r.responseBase64,GrpcTypes.GetObjectResponse,true);if(res.object){const o=res.object;assert.equal(req.objectId,o.objectId);assert(o.bcs?.value);const obj=bcs.Object.parse(o.bcs.value);assert.deepEqual(Buffer.from(bcs.Object.serialize(obj).toBytes()),Buffer.from(o.bcs.value));assert.equal(typed(o.bcs.value),o.digest);assert.equal(obj.previousTransaction,o.previousTransaction);native.push({stage:r.stage,raw:o,object:obj});}}}
 const refusals=[];
 for(let i=0;i<6;i++){
  const d=p.denials[i],expected=prior.sixFirstDispatches[i],current=prior.currentTransferredNFTs[i];assert.equal(d.label,expected.label);assert.equal(d.id,expected.objectId);assert.equal(d.to,expected.recipient);
  assert.equal(d.simulations+d.approvals,0);assert.equal(d.outcome,'form');const message=d.route==='originbyte-kiosk'?'藏品已离开 OriginByte Kiosk':'当前账户没有可用于转出的藏品所有权';assert.equal(d.message,message);assert(d.text.includes(message));
  const reads=native.filter(n=>n.raw.objectId===d.id&&n.stage===d.label+' previous-transfer fresh native refusal');assert(reads.length>0);
  for(const n of reads){assert.equal(n.raw.digest,current.digest);assert.equal(String(n.raw.version),current.version);assert.equal(n.object.previousTransaction,expected.digest);assert.deepEqual(n.object.owner,current.owner);assert(n.object.owner.AddressOwner!==p.owner&&n.object.owner.ConsensusAddressOwner?.owner!==p.owner);}
  refusals.push({label:d.label,objectId:d.id,previousSuccessfulDigest:expected.digest,actualNativeReads:reads.length,visibleError:message,noSimulationOrApproval:true});
 }
 result={passed:true,observedAt:new Date().toISOString(),h0:p.h0,generation:p.generation,source:p.source,sixPreviousTransferRefusals:refusals,actualFrames:p.frames.length,originalSimulations:0,originalSignatures:0,originalExecuteRequests:0,additionalNetworkRequests:0,normalRelockChromeAbsent:true,journalsAndCipherHeld:true,protectedPrivateFilesHeld:1015,postWriteIndexAccepted:false,wholeParentAccepted:false,inputsSha256:Object.fromEntries([__filename,path.resolve(proofFile),path.resolve(priorExecutionFile),intentFile,buildFile].map(f=>[f,sha(f)])),scope:'Independent original six visible current C46 prior-transfer fresh native ownership refusals under real stale indexing. Canonical native Object digest/version/owner/previousTransaction matches the six earlier actual successes. No simulation, signature, Execute or original-profile reopening; journals/cipher/private sources held, normal relock and Chrome absence. Full minimum524022 indexed refresh remains a separate open contract.'};
}catch(e){result={passed:false,observedAt:new Date().toISOString(),errorType:e.name,message:String(e.message).slice(0,1400)};process.exitCode=1;}
fs.writeFileSync(output,JSON.stringify(result,null,2)+'\n',{flag:'wx',mode:0o600});console.log(JSON.stringify({passed:result.passed,message:result.message,denials:result.sixPreviousTransferRefusals?.length}));
