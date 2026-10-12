// Audit the two actual transport contracts without fabricating archive headers.
const assert=require('node:assert/strict'),{GrpcTypes}=require('rtd-typescript/grpc');
const parser=require('./C88-post-write-bytes.cjs');
const archive='http://127.0.0.1:42012',native='http://127.0.0.1:41750';
function time(row,event){const found=row.events.find(x=>x.event===event);assert(found);const at=Date.parse(found.at);assert(Number.isFinite(at));return at}
function identities(p){
 const infos=p.completeCaptureRecords.filter(r=>r.url===archive+'/archive/rtd.rpc.v2.LedgerService/GetServiceInfo');assert(infos.length>=2);
 for(const row of infos){assert(row.upstreamBodyComplete&&row.status===200);const response=GrpcTypes.GetServiceInfoResponse.fromBinary(parser.grpcBody(row.responseBase64,true));assert.equal(response.chainId,p.h0)}
 const genesis=p.completeCaptureRecords.filter(r=>r.url===archive+'/archive/rtd.rpc.v2.LedgerService/GetCheckpoint').filter(row=>GrpcTypes.GetCheckpointRequest.fromBinary(parser.grpcBody(row.requestBase64,false)).checkpointId.sequenceNumber===0n);assert(genesis.length>0);
 for(const row of genesis){assert(row.upstreamBodyComplete&&row.status===200);const c=GrpcTypes.GetCheckpointResponse.fromBinary(parser.grpcBody(row.responseBase64,true)).checkpoint;assert(c);assert.equal(c.sequenceNumber,0n);assert.equal(c.digest,p.h0)}
 return infos;
}
function decode(frame,p,row){
 const url=new URL(frame.url);assert.equal(frame.status,200);
 if(url.origin===native)return require('../audit-C138-current-non-nft-pending-creator.cjs').decode(frame);
 assert.equal(url.origin,archive);assert.equal(url.pathname,'/archive/rtd.rpc.v2.LedgerService/GetTransaction');assert.equal(row.method,'POST');assert.equal(frame.headers['grpc-status'],'5');assert.equal(frame.responseBase64,'');assert.equal(Number(frame.headers['content-length']),0);
 assert.equal(decodeURIComponent(frame.headers['grpc-message']),'Transaction '+p.digest+' not found');assert.equal(frame.headers['access-control-allow-origin'],p.currentGatewayAuthority.origin);assert(row.requestHeadersArray.some(h=>h.name.toLowerCase()==='origin'&&h.value===p.currentGatewayAuthority.origin));assert(/^[a-f0-9]{32}$/.test(frame.headers['x-rtd-request-id']));
 const request=GrpcTypes.GetTransactionRequest.fromBinary(parser.grpcBody(frame.requestBase64,false));assert.equal(request.digest,p.digest);
 const infos=identities(p),start=time(row,'request observed'),end=time(row,'capture settled');
 const before=infos.filter(i=>time(i,'complete upstream entity persisted')<=start).at(-1),after=infos.find(i=>time(i,'request observed')>=end);assert(before&&after);assert(start-time(before,'complete upstream entity persisted')<=25000);assert(time(after,'request observed')-end<=25000);
 return{method:'GetTransaction',request,notFound:true,actualArchiveIdentityBookendsAndGenesisAccepted:true};
}
module.exports={decode,identities};
