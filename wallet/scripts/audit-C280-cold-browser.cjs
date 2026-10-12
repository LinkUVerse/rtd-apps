// Offline audit of actual ordinary Chrome cold-recovery traffic; no browser or network access.
const fs=require('node:fs'),crypto=require('node:crypto'),a=require('node:assert/strict');
const {GrpcTypes}=require('rtd-typescript/grpc');
const {parse}=require('graphql');
const [capture,output]=process.argv.slice(2);a(!fs.existsSync(output));
const sha=b=>crypto.createHash('sha256').update(b).digest('hex');
const entries=JSON.parse(fs.readFileSync(capture)).log.entries;
const h0='BTrU3deMDbnWcUWLJ2ruDj9vbCC4gaYnVj8qV3K2nFah';
const methods={},surfaces={},exceptions=[],frames=[],infos=[],transactions=[];
const ports={'43150':'fullnode','43210':'graphql','43203':'archive','43211':'account','41718':'fixture-media'};
function response(e,type){
 const b=Buffer.from(e.response.content.text,e.response.content.encoding==='base64'?'base64':'latin1');let i=0,data,trailer;
 while(i<b.length){a(i+5<=b.length);const flag=b[i],n=b.readUInt32BE(i+1);a(i+5+n<=b.length);const v=b.subarray(i+5,i+5+n);i+=5+n;if(flag===0){a(!data);data=v;}else{a.equal(flag,128);a(!trailer);trailer=v.toString();}}
 const status=trailer?.match(/(?:^|\r\n)grpc-status:\s*(\d+)/)?.[1]??e.response.headers.find(h=>h.name.toLowerCase()==='grpc-status')?.value;a(status!==undefined);
 if(status!=='0')return {error:status};a(data);return {value:type.fromBinary(data)};
}
for(const [index,e] of entries.entries()){
 const u=new URL(e.request.url),surface=ports[u.port],method=u.pathname.split('/').pop();a.equal(u.hostname,'127.0.0.1');a(surface);a(!/Execute|Simulate|VerifySignature/.test(method));a(!e.request.postData?.text?.includes('"jsonrpc"'));
 methods[method]=(methods[method]??0)+1;surfaces[surface]=(surfaces[surface]??0)+1;
 const row={index,at:e.startedDateTime,surface,method,httpStatus:e.response.status};frames.push(row);
 if(e.response.status!==200||!e.response.content.text){exceptions.push({...row,error:e.response._error??'body-not-captured'});continue;}
 if(surface==='fixture-media'){a.equal(method,'display-v2.png');a.equal(Buffer.from(e.response.content.text,'base64').subarray(0,8).toString('hex'),'89504e470d0a1a0a');row.accepted=true;continue;}
 if(method==='graphql'){
  const q=JSON.parse(e.request.postData.text);parse(q.query);a(!/\bmutation\b|\bsubscription\b/.test(q.query));const body=JSON.parse(e.response.content.encoding==='base64'?Buffer.from(e.response.content.text,'base64').toString():e.response.content.text);
  row.operation=q.operationName??/query\s+(\w+)/.exec(q.query)?.[1];if(body.errors?.length){exceptions.push({...row,errors:body.errors});continue;}a(body.data);
  if(body.data.walletGenesis)a.equal(body.data.walletGenesis.digest,h0);if(row.operation==='WalletGenesisIdentity')a.equal(body.data.checkpoint.digest,h0);row.accepted=true;continue;
 }
 const req=Buffer.from(e.request.postData.text,'latin1');a.equal(req[0],0);a.equal(req.readUInt32BE(1)+5,req.length);a(GrpcTypes[method+'Request']&&GrpcTypes[method+'Response']);const request=GrpcTypes[method+'Request'].fromBinary(req.subarray(5));
 const res=response(e,GrpcTypes[method+'Response']);if(res.error){exceptions.push({...row,grpcStatus:res.error});continue;}row.accepted=true;
 if(method==='GetServiceInfo'){a.equal(res.value.chainId,h0);infos.push({surface,checkpoint:String(res.value.checkpointHeight)});}
 if(method==='GetTransaction'){a.equal(res.value.transaction.digest,request.digest);a(res.value.transaction.effects.status.success);transactions.push(request.digest);}
}
for(const s of ['fullnode','graphql','account','archive'])a(frames.some(r=>r.surface===s&&r.accepted));
a(infos.some(r=>r.surface==='fullnode')&&infos.some(r=>r.surface==='archive'));
a(transactions.includes('AQ2Jo739WgnovgmUHk2rPquJ8wJkBuk7aiNXXyzr1Rzu'));
const r={passed:true,observedAt:new Date().toISOString(),h0,capturedRequests:entries.length,methods,surfaces,exceptions,frames,infoResponses:infos,confirmedOriginalTransactions:transactions,executions:0,simulations:0,signatureVerifications:0,noObservedJsonRpcOrPublicSui:true,allFourApiSurfacesAccepted:true,inputsSha256:{[capture]:sha(fs.readFileSync(capture)),[__filename]:sha(fs.readFileSync(__filename))},scope:'Actual ordinary C51 saved capture after extension reload and complete G4 backend cold recovery. All successful native frames and GraphQL envelopes checked; failures/cancellations are exceptions, not successes. Business semantics from C280 production comparison plus actual UI observations. No claim of zero transient errors or full background coverage before DevTools opened.'};
fs.writeFileSync(output,JSON.stringify(r,null,2)+'\n',{flag:'wx'});console.log(JSON.stringify({passed:true,requests:entries.length,exceptions:exceptions.length,surfaces,executions:0}));
