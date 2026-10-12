// Offline cross-feature transport audit. Captures overlap; they are deduplicated before totals.
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),a=require('node:assert/strict');
const {GrpcTypes}=require('rtd-typescript/grpc');
const {parse}=require('graphql');
const {Transaction}=require('rtd-typescript/transactions');
const {verifyTransactionSignature}=require('rtd-typescript/verify');
const W=path.resolve(__dirname,'..'),L=path.join(W,'migrationToGRpcOrGraphQLDoc/workLog');
const inputs=new Map(), sha=b=>crypto.createHash('sha256').update(b).digest('hex');
function read(p){p=path.isAbsolute(p)?p:path.join(W,p);const b=fs.readFileSync(p);inputs.set(p,sha(b));return JSON.parse(b);}
const proofNames=[
 '20261011-C249-execution-audit-02.json','20261011-C250-browser-balances-audit-01.json',
 '20261011-C237-activity-audit-01.json','20261011-C237-assets-audit-02.json','20261011-C237-kiosk-audit-01.json',
 '20261011-C237-nft-detail-audit-01.json','20261011-C252-nft-restrictions-audit-01.json',
 '20261011-C258-nft-execution-audit-03.json','20261011-C270-network-audit-03.json',
 '20261011-C248-browser-dapp-audit-01.json','20261011-C259-execution-audit-01.json',
 '20261011-C243-readonly-pages-traffic-01.json','20261011-C275-stake-audit-01.json',
 '20261011-C276-withdraw-audit-01.json','20261011-C276-withdraw-post-write-audit-01.json',
 '20261011-C275-nft-browser-audit-01.json','20261012-C278-name-transfer-audit-01.json',
 '20261012-C278-name-mutations-audit-01.json','20261012-C279-name-registry-audit-01.json'];
const harNames=[
 '20261011-C243-settings-accounts-01.har','20261011-C250-current-balances-complete-01.har',
 '20261011-C237-activity-01.har','20261011-C237-assets-01.har','20261011-C237-kiosk-01.har',
 '20261011-C252-nft-restrictions-01.har','20261011-C258-nft-complete-02.har',
 '20261011-C270-generation-isolation-01.har','20261011-C259-worker-complete-01.har',
 '20261011-C275-stake-complete-01.har','20261011-C276-withdraw-complete-01.har',
 '20261011-C276-withdraw-post-write-01.har','20261011-C275-nft-post-write-01.har',
 '20261012-C278-name-transfer-01.har','20261012-C278-name-mutations-01.har',
 '20261012-C279-name-registry-negative-01.har'];
const H0={old:'BkuLHhdtnoK7yLxo2eQuvcjHtdyipE7MMyxgTJiyHGg4',current:'BTrU3deMDbnWcUWLJ2ruDj9vbCC4gaYnVj8qV3K2nFah'};
const ports={'41750':['fullnode',H0.old],'41957':['graphql',H0.old],'41903':['archive',H0.old],'41959':['account',H0.old],
 '43150':['fullnode',H0.current],'43210':['graphql',H0.current],'43203':['archive',H0.current],'43211':['account',H0.current],'41718':['fixture-media',null]};
function requestFrame(e,type){const b=Buffer.from(e.request.postData.text,'latin1');a(b.length>=5&&b[0]===0);a.equal(5+b.readUInt32BE(1),b.length);return type.fromBinary(b.subarray(5));}
function responseFrame(e,type){
 const b=Buffer.from(e.response.content.text,e.response.content.encoding==='base64'?'base64':'latin1');let offset=0,data,trailer;
 while(offset<b.length){a(offset+5<=b.length);const flag=b[offset],n=b.readUInt32BE(offset+1);a(offset+5+n<=b.length);const part=b.subarray(offset+5,offset+5+n);offset+=5+n;
  if(flag===0){a(!data);data=part;}else{a.equal(flag,128);a(!trailer);trailer=part.toString();}}
 const status=trailer?.match(/(?:^|\r\n)grpc-status:\s*(\d+)/)?.[1]??e.response.headers.find(h=>h.name.toLowerCase()==='grpc-status')?.value;
 a(status!==undefined,'Missing gRPC status'); if(status!=='0')return {error:status};a(data,'Missing successful gRPC message');return {value:type.fromBinary(data)};
}
async function main(){
 const output=process.argv[2];a(output&&!fs.existsSync(output));const proofs=[];const captures=new Set(harNames.map(n=>path.join(L,n)));
 for(const name of proofNames){const p=path.join(L,name),v=read(p);a(v.passed,name);proofs.push({name,sha256:inputs.get(p),scope:v.scope});
  for(const [file,expected]of Object.entries(v.inputsSha256??v.files??{}))if(file.endsWith('.har')){const target=path.isAbsolute(file)?file:path.join(W,file);a.equal(sha(fs.readFileSync(target)),expected,target);captures.add(target);}}
 const methods={},surfaces={},exceptions=[],frames=[],executes=new Map(),seen=new Set(),captureStats=[];
 for(const capture of captures){const entries=read(capture).log.entries;let unique=0;captureStats.push({file:capture,entries:entries.length});
  for(const [index,e]of entries.entries()){
   const u=new URL(e.request.url);a.equal(u.hostname,'127.0.0.1',e.request.url);a(ports[u.port],e.request.url);
   const [surface,h0]=ports[u.port],method=u.pathname.split('/').pop();
   a(!e.request.postData?.text?.includes('"jsonrpc"'),'Legacy JSON-RPC body');a(!/json[-_]?rpc/i.test(u.pathname));
   const key=sha(JSON.stringify([e.startedDateTime,e.request.method,e.request.url,e.request.postData?.text,e.response.status,e.response.content.text]));
   if(seen.has(key))continue;seen.add(key);unique++;
   methods[method]=(methods[method]??0)+1;surfaces[surface]=(surfaces[surface]??0)+1;
   const row={capture:path.basename(capture),index,at:e.startedDateTime,surface,method,requestSha256:sha(e.request.postData?.text??''),responseSha256:sha(e.response.content.text??'')};frames.push(row);
   if(e.response.status!==200||!e.response.content.text){row.accepted=false;exceptions.push({...row,httpStatus:e.response.status,error:e.response._error,grpcStatus:e.response.headers.find(h=>h.name.toLowerCase()==='grpc-status')?.value});continue;}
   if(surface==='fixture-media'){a.equal(method,'display-v2.png');const b=Buffer.from(e.response.content.text,'base64');a.equal(b.subarray(0,8).toString('hex'),'89504e470d0a1a0a');row.accepted=true;continue;}
   if(method==='graphql'){
    a(['graphql','account'].includes(surface));const q=JSON.parse(e.request.postData.text);parse(q.query);a(!/\bmutation\b|\bsubscription\b/.test(q.query));
    const body=JSON.parse(e.response.content.encoding==='base64'?Buffer.from(e.response.content.text,'base64').toString():e.response.content.text);
    row.operation=q.operationName??/query\s+(\w+)/.exec(q.query)?.[1];
    if(body.errors?.length){row.accepted=false;exceptions.push({...row,graphqlErrors:body.errors});continue;}
    a(body.data&&typeof body.data==='object');
    if(body.data.walletGenesis)a.equal(body.data.walletGenesis.digest,h0);
    if(row.operation==='WalletGenesisIdentity')a.equal(body.data.checkpoint.digest,h0);
    row.accepted=true;row.validation='GraphQL syntax/envelope/available H0; feature semantics from referenced production-reader audits';continue;
   }
   a(['fullnode','archive'].includes(surface));a(GrpcTypes[method+'Request']&&GrpcTypes[method+'Response'],method);
   const req=requestFrame(e,GrpcTypes[method+'Request']),res=responseFrame(e,GrpcTypes[method+'Response']);
   if(res.error){row.accepted=false;exceptions.push({...row,grpcStatus:res.error});continue;}
   row.accepted=true;row.validation='Full unary gRPC-Web framing, native protobuf schema and status';
   const value=res.value;
   if(method==='GetServiceInfo'){a.equal(value.chainId,h0);row.h0=value.chainId;row.checkpoint=String(value.checkpointHeight);}
   if(method==='ExecuteTransaction'){
    a.equal(surface,'fullnode');const bytes=Buffer.from(req.transaction.bcs.value),tx=Transaction.from(bytes),digest=await tx.getDigest(),d=tx.getData();
    a.equal(d.expiration.Validity.chain,h0);a.equal(req.signatures.length,1);
    a.equal((await verifyTransactionSignature(bytes,Buffer.from(req.signatures[0].bcs.value).toString('base64'),{address:d.sender})).toRtdAddress(),d.sender);
    a.equal(value.transaction.digest,digest);a(value.transaction.effects.status.success);a(Buffer.from(value.transaction.transaction.bcs.value).equals(bytes));
    const old=executes.get(digest);a(!old||old.at===e.startedDateTime,'Distinct repeated execution of same digest');
    executes.set(digest,{digest,h0,at:e.startedDateTime,sender:d.sender,bytesSha256:sha(bytes),success:true});row.digest=digest;
   }
  }captureStats.at(-1).uniqueEntries=unique;
 }
 for(const s of ['fullnode','graphql','archive','account'])a(surfaces[s]>0);
 for(const m of ['ListBalances','GetBalance','ListOwnedObjects','GetObject','GetTransaction','SimulateTransaction','VerifySignature','ExecuteTransaction','GetPackage'])a(methods[m]>0,m);
 a(executes.size>=5);
 const result={passed:true,observedAt:new Date().toISOString(),captureStats,uniqueCapturedRequests:seen.size,methods,surfaces,executions:[...executes.values()],exceptions,frames,featureProofs:proofs,
  allObservedDestinationsExpected:true,noObservedJsonRpcOrPublicSui:true,duplicateCapturePrefixesRemoved:true,allFourApiSurfacesObserved:true,liveRequestsSent:0,
  scope:'Joint audit of saved ordinary Chrome feature captures across explicitly retained G3/G4 builds. Original feature semantics/UI and source-version applicability require the accompanying release matrix. Failed/cancelled/denied frames remain exceptions; transport validation is not semantic success of every read. Finite captured-traffic conclusion, not universal future-egress proof.',
  inputsSha256:{[__filename]:sha(fs.readFileSync(__filename)),...Object.fromEntries(inputs)}};
 fs.writeFileSync(output,JSON.stringify(result,null,2)+'\n',{flag:'wx',mode:0o600});
 console.log(JSON.stringify({passed:true,captures:captureStats.length,uniqueRequests:seen.size,surfaces,executions:executes.size,exceptions:exceptions.length}));
}
main().catch(e=>{console.error(e);process.exitCode=1});
