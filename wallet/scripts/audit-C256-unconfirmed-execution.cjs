// Offline evidence audit. A verified signature and HTTP 200 are not execution success.
const fs=require('node:fs'),a=require('node:assert/strict'),crypto=require('node:crypto');
const {GrpcTypes}=require('rtd-typescript/grpc'),{verifyTransactionSignature}=require('rtd-typescript/verify');
const L='migrationToGRpcOrGraphQLDoc/workLog',files=[__filename],sha=b=>crypto.createHash('sha256').update(b).digest('hex');
function read(n){const p=`${L}/${n}`;files.push(p);return JSON.parse(fs.readFileSync(p));}
function frame(b,type,response){a(b.length>=5&&b[0]===0);const end=5+b.readUInt32BE(1);a(end<=b.length);if(response){a.equal(b[end],128);a.equal(end+5+b.readUInt32BE(end+1),b.length);a.match(b.subarray(end+5).toString(),/(?:^|\r\n)grpc-status:\s*0\r\n/);}else a.equal(end,b.length);return type.fromBinary(b.subarray(5,end));}
(async()=>{
 const p=read('20261011-C256-execution-preview-audit-02.json'),ui=read('20261011-C256-native-ui-04.json'),attempt=read('20261011-C256-submit-attempt-01.json'),cleanup=read('20261011-C256-cleanup-01.json');
 a(p.passed&&p.preparedOnly&&cleanup.passed);a.equal(attempt.digest,p.digest);
 const reports=[];
 for(const name of ['20261011-C256-worker-complete-01.har','20261011-C256-demo-complete-01.har']){
  const es=read(name).log.entries,counts={},exceptions=[];let verified=0,native=0;const simulations=[];
  for(const [index,e] of es.entries()){
   const u=new URL(e.request.url),m=u.pathname.split('/').pop();a.equal(u.hostname,'127.0.0.1');a.equal(e.request.method,'POST');counts[m]=(counts[m]??0)+1;
   a(['graphql','GetServiceInfo','SimulateTransaction','VerifySignature','GetTransaction'].includes(m));
   if(e.response.status===0){a.equal(m,'GetServiceInfo');exceptions.push({index,method:m,status:0,reason:'cancelled; not successful'});continue;}
   a.equal(e.response.status,200);
   if(m==='graphql'){
    a.equal(u.origin,'http://127.0.0.1:41957');const r=JSON.parse(e.response.content.text);a(!r.errors?.length);a.equal(r.data.checkpoint.digest,'BkuLHhdtnoK7yLxo2eQuvcjHtdyipE7MMyxgTJiyHGg4');continue;
   }
   a(['http://127.0.0.1:41750','https://127.0.0.1:41903'].includes(u.origin));
   const req=frame(Buffer.from(e.request.postData.text,'latin1'),GrpcTypes[m+'Request'],false);
   if(m==='GetTransaction'){
    a.equal(req.digest,p.digest);a(!e.response.content.text);a.equal(e.response.headers.find(h=>h.name.toLowerCase()==='grpc-status')?.value,'5');
    exceptions.push({index,at:e.startedDateTime,method:m,origin:u.origin,grpcStatus:5,reason:'original digest NOT_FOUND; no terminal outcome inferred'});continue;
   }
   a(!e._error&&!e.response._error);a.equal(e.response.content.encoding,'base64');
   const res=frame(Buffer.from(e.response.content.text,'base64'),GrpcTypes[m+'Response'],true);native++;
   if(m==='GetServiceInfo')a.equal(res.chainId,'BkuLHhdtnoK7yLxo2eQuvcjHtdyipE7MMyxgTJiyHGg4');
   if(m==='SimulateTransaction'){
    a(res.transaction.effects.status.success);if(req.doGasSelection===false&&Buffer.from(req.transaction.bcs.value).toString('base64')===p.bytesBase64)simulations.push({at:e.startedDateTime,digest:res.transaction.effects.transactionDigest});
   }
   if(m==='VerifySignature'){
    a.equal(req.address,p.sender);a.equal(req.message.name,'TransactionData');a.equal(Buffer.from(req.message.value).toString('base64'),p.bytesBase64);a(res.isValid&&!res.reason);
    const sig=Buffer.from(req.signature.bcs.value).toString('base64');a.equal((await verifyTransactionSignature(Buffer.from(p.bytesBase64,'base64'),sig,{address:p.sender})).toRtdAddress(),p.sender);verified++;
   }
  }
  a.equal(verified,1);a(simulations.some(s=>s.digest===p.digest));a(exceptions.some(x=>x.grpcStatus===5));
  reports.push({name,requests:es.length,counts,exceptions,nativeFramesDecoded:native,signatureVerified:verified,simulations});
 }
 a(ui.recovery.ax.includes(p.digest)&&ui.recovery.ax.includes('正在核对原交易'));
 a(ui.closedRequest.ax.includes('Rejected from user'));a(ui.disconnected.ax.includes('[] Network:'));
 const out={passed:true,observedAt:new Date().toISOString(),scope:'Audit of actual unconfirmed C256 attempt and cleanup, NOT successful execution; worker/demo HAR overlap and must not be summed',intentId:p.intentId,digest:p.digest,reports,approvedClicks:1,executeRequestsObserved:0,executionAccepted:false,originalPendingRetained:true,rootCauseConfirmed:false,knownRisk:'Nested full identity probes consume original 30-second egress lease; original catch does not expose exact rejection reason',resubmissions:0,parentCompletion:false,inputsSha256:Object.fromEntries(files.map(f=>[f,sha(fs.readFileSync(f))]))};
 fs.writeFileSync(`${L}/20261011-C256-unconfirmed-audit-01.json`,JSON.stringify(out,null,2)+'\n',{flag:'wx',mode:0o600});console.log(JSON.stringify({passed:true,executionAccepted:false,digest:p.digest,reports:reports.map(x=>({requests:x.requests,exceptions:x.exceptions.length})),executeRequestsObserved:0}));
})().catch(e=>{console.error(e);process.exitCode=1});
