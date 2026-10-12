// Pin the full original business audit and test actual negative reply correlation offline.
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),crypto=require('node:crypto'),cp=require('node:child_process');
const logs=path.resolve(__dirname,'../migrationToGRpcOrGraphQLDoc/workLog'),read=f=>JSON.parse(fs.readFileSync(f)),sha=f=>crypto.createHash('sha256').update(fs.readFileSync(f)).digest('hex');
const[output]=process.argv.slice(2);assert(output&&!fs.existsSync(output));const files=[__filename];let result;
try{
 const load=(name,passed=true)=>{const f=path.join(logs,name);files.push(f);const p=read(f);assert.equal(p.passed,passed);for(const[f,h]of Object.entries(p.inputsSha256??{}))assert.equal(sha(f),h);return p;};
 const previous=load('20261008-C102-response-header-qualification-01.json');assert(previous.wholeOriginalAuditorInverseHeld&&previous.offlineChecks===58&&previous.incompleteCloneNeverPositive);
 const browserFile=path.join(logs,'20261008-C102-current-three-owner-browser-02.json'),browser=load(path.basename(browserFile));
 const diagnostic=load('20261008-C102-browser-02-gateway-diagnostic-01.json');assert.equal(diagnostic.inputsSha256[browserFile],sha(browserFile));
 const failed=load('20261008-C102-current-three-owner-browser-independent-02.json',false);assert(failed.message.includes('504 !== 200'));assert.equal(failed.supplementalFrames.length,0);
 const archive=load('20261008-C102-before-implementation-archive-01.json'),contract=archive.snapshots.find(r=>r.path.endsWith('/20261008-C101-current-three-owner-browser-design.md'));assert(contract);files.push(contract.snapshot);assert.equal(sha(contract.snapshot),contract.sha256);assert(fs.readFileSync(contract.snapshot,'utf8').includes('迟到只读cancel与未成功帧保留分类，任何业务必需回复不得用失败替代'));
 const deltaFile=path.join(logs,'20261008-C102-browser-audit-v6-source-delta-01.json');files.push(deltaFile);const delta=read(deltaFile);files.push(delta.originalSource,delta.candidateSource);assert.equal(previous.inputsSha256[delta.originalSource],sha(delta.originalSource));assert.equal(delta.changes.length,3);
 let inverse=fs.readFileSync(delta.candidateSource,'utf8');for(const[before,after]of delta.changes.slice().reverse()){assert.equal(inverse.split(after).length-1,1);inverse=inverse.replace(after,before);}assert.equal(inverse,fs.readFileSync(delta.originalSource,'utf8'));
 const helper=path.join(__dirname,'lib/C102-retained-http-negatives.cjs');files.push(helper);const {classify}=require(helper),classified=classify(browser,diagnostic);
 assert.equal(classified.positiveFrames.length,1305);assert.equal(classified.retainedHttpNegatives.length,3);assert(classified.allRetainedFramesAccountedFor);assert(classified.positiveFrames.every(f=>f.status===200));
 for(const f of [...browser.frames,...browser.consumerFrames])assert(classified.positiveFrames.includes(f)||classified.retainedHttpNegatives.some(n=>n.network===f||n.consumer===f));
 const checks=['all 1311 retained frames accounted for','three actual negative Network-consumer pairs and gateway logs','no 504 enters positive data proof'];
 const clone=v=>JSON.parse(JSON.stringify(v));
 const cases={
  'missing negative Network reply':p=>{p.frames.splice(p.frames.findIndex(f=>f.status===504),1);},
  'missing negative consumer reply':p=>{p.consumerFrames.splice(p.consumerFrames.findIndex(f=>f.status===504),1);},
  'extra negative pair':p=>{p.frames.push(clone(p.frames.find(f=>f.status===504)));p.consumerFrames.push(clone(p.consumerFrames.find(f=>f.status===504)));},
  '503 cannot be waived':p=>{p.frames.find(f=>f.status===504).status=503;},
  'wrong role':p=>{p.frames.find(f=>f.status===504).role='source';},
  'wrong endpoint':p=>{p.frames.find(f=>f.status===504).url='http://127.0.0.1:42012/graphql';},
  'wrong request body':p=>{p.frames.find(f=>f.status===504).requestBase64=Buffer.from('different').toString('base64');},
  'mutation cannot be waived':p=>{const f=p.frames.find(f=>f.status===504);const q=JSON.parse(Buffer.from(f.requestBase64,'base64'));q.query='mutation WalletSnapshotRead { execute }';f.requestBase64=Buffer.from(JSON.stringify(q)).toString('base64');},
  'wrong response body':p=>{p.consumerFrames.find(f=>f.status===504).responseBase64=Buffer.from('changed').toString('base64');},
  'missing response header':p=>{delete p.consumerFrames.find(f=>f.status===504).headers.server;},
  'changed Date header':p=>{p.consumerFrames.find(f=>f.status===504).headers.date='Thu, 08 Oct 2026 04:51:24 GMT';},
  'changed Content-Length':p=>{p.frames.find(f=>f.status===504).headers['content-length']='570';},
  'unknown Content-Type':p=>{p.frames.find(f=>f.status===504).headers['content-type']='application/json';},
  'added reply identity header':p=>{p.consumerFrames.find(f=>f.status===504).headers['x-rtd-request-id']='made-up';},
  'unknown request id':p=>{p.frames.find(f=>f.status===504).requestId=null;},
  'unmatched extra successful consumer with negative status':p=>{p.consumerFrames.find(f=>f.status===200).status=504;}
 };
 for(const[name,mutate]of Object.entries(cases)){const p=clone(browser);mutate(p);assert.throws(()=>classify(p,diagnostic));checks.push(name);}
 const badDiagnostics={
  'no gateway proof':d=>{d.passed=false;},'gateway count changed':d=>{d.negativeResponseCount=2;},
  'gateway log missing':d=>{d.upstreamConnectTimeouts.pop();},
  'gateway error time mismatch':d=>{d.upstreamConnectTimeouts[0]=d.upstreamConnectTimeouts[0].replace('04:51:23','04:51:24');},
  'gateway endpoint mismatch':d=>{d.upstreamConnectTimeouts[0]=d.upstreamConnectTimeouts[0].replace('41981','41982');},
  'gateway error stage mismatch':d=>{d.upstreamConnectTimeouts[0]=d.upstreamConnectTimeouts[0].replace('connecting to upstream','reading response header from upstream');}
 };
 for(const[name,mutate]of Object.entries(badDiagnostics)){const d=clone(diagnostic);mutate(d);assert.throws(()=>classify(browser,d));checks.push(name);}
 for(const f of [__filename,helper,delta.candidateSource])cp.execFileSync(process.execPath,['--check',f],{timeout:30000});
 result={passed:true,preparedOnly:true,observedAt:new Date().toISOString(),offlineChecks:checks.length,checks,originalFailedAuditsHeld:true,wholePositiveBusinessAuditInverseHeld:true,originalNegativeRetentionContractHeld:true,pinnedActualBrowserReplies:1311,actualPositiveReplies:1305,actualNegativeNetworkReplies:3,actualNegativeConsumerReplies:3,negativeRepliesNeverDataProof:true,missingOrChangedReplyOrHeaderOrLogRejected:true,networkRequests:0,profilesOpened:0,parentCompletion:false,inputsSha256:Object.fromEntries([...new Set(files)].map(f=>[f,sha(f)]))};
}catch(e){result={passed:false,errorType:e.name,message:String(e.message).slice(0,1500)};process.exitCode=1;}
fs.writeFileSync(output,JSON.stringify(result,null,2)+'\n',{flag:'wx',mode:0o600});console.log(JSON.stringify({passed:result.passed,offlineChecks:result.offlineChecks,errorType:result.errorType,message:result.message}));
