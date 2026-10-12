// Saved ordinary-Chrome frames plus read-only original-digest confirmation.
const fs=require('node:fs'),a=require('node:assert/strict'),crypto=require('node:crypto');
const {GrpcTypes,RtdGrpcClient}=require('rtd-typescript/grpc'),{verifyTransactionSignature}=require('rtd-typescript/verify');
const L='migrationToGRpcOrGraphQLDoc/workLog',files=[__filename],sha=b=>crypto.createHash('sha256').update(b).digest('hex');
function read(n){const p=`${L}/${n}`;files.push(p);return JSON.parse(fs.readFileSync(p));}
function frame(b,type,response){a(b.length>=5&&b[0]===0);const end=5+b.readUInt32BE(1);a(end<=b.length);if(response){a.equal(b[end],128);a.equal(end+5+b.readUInt32BE(end+1),b.length);a.match(b.subarray(end+5).toString(),/(?:^|\r\n)grpc-status:\s*0\r\n/);}else a.equal(end,b.length);return type.fromBinary(b.subarray(5,end));}
(async()=>{
 const p=read('20261011-C259-execution-preview-audit-01.json'),ui=read('20261011-C259-native-ui-02.json'),attempt=read('20261011-C259-submit-attempt-01.json');
 a(p.passed&&p.preparedOnly);a.equal(attempt.digest,p.digest);
 const entries=read('20261011-C259-worker-complete-01.har').log.entries,counts={},decoded=[];let execution,verified;
 for(const e of entries){
  const u=new URL(e.request.url),m=u.pathname.split('/').pop();a.equal(u.hostname,'127.0.0.1');a.equal(e.request.method,'POST');a(!e.request.postData.text.includes('"jsonrpc"'));counts[m]=(counts[m]??0)+1;
  a.equal(e.response.status,200);a(!e._error&&!e.response._error);
  if(m==='graphql'){a.equal(u.href,'http://127.0.0.1:41957/graphql');const r=JSON.parse(e.response.content.text);a(!r.errors?.length);a.equal(r.data.checkpoint.digest,p.expiration.Validity.chain);decoded.push({at:e.startedDateTime,method:m,durationMs:e.time,origin:u.origin});continue;}
  a(['http://127.0.0.1:41750','https://127.0.0.1:41903'].includes(u.origin));a(['GetServiceInfo','SimulateTransaction','VerifySignature','ExecuteTransaction'].includes(m));a.equal(e.response.content.encoding,'base64');
  const req=frame(Buffer.from(e.request.postData.text,'latin1'),GrpcTypes[m+'Request'],false),res=frame(Buffer.from(e.response.content.text,'base64'),GrpcTypes[m+'Response'],true);
  decoded.push({at:e.startedDateTime,method:m,durationMs:e.time,origin:u.origin});
  if(m==='GetServiceInfo')a.equal(res.chainId,p.expiration.Validity.chain);
  if(m==='SimulateTransaction'){a.equal(req.checks,GrpcTypes.SimulateTransactionRequest_TransactionChecks.ENABLED);a(res.transaction.effects.status.success);}
  if(m==='VerifySignature'){
   a(!verified);a.equal(req.address,p.sender);a.equal(req.message.name,'TransactionData');a.equal(Buffer.from(req.message.value).toString('base64'),p.bytesBase64);a(res.isValid&&!res.reason);
   const signature=Buffer.from(req.signature.bcs.value).toString('base64');a.equal((await verifyTransactionSignature(Buffer.from(p.bytesBase64,'base64'),signature,{address:p.sender})).toRtdAddress(),p.sender);verified={at:e.startedDateTime,signatureSha256:sha(signature)};
  }
  if(m==='ExecuteTransaction'){
   a(!execution);a.equal(u.port,'41750');a.equal(Buffer.from(req.transaction.bcs.value).toString('base64'),p.bytesBase64);a.equal(req.signatures.length,1);
   const signature=Buffer.from(req.signatures[0].bcs.value).toString('base64');a.equal(sha(signature),verified.signatureSha256);a.equal(res.transaction.digest,p.digest);a(res.transaction.effects.status.success);a.equal(Buffer.from(res.transaction.transaction.bcs.value).toString('base64'),p.bytesBase64);
   const g=res.transaction.effects.gasUsed,net=BigInt(g.computationCost)+BigInt(g.storageCost)-BigInt(g.storageRebate);a.equal(net,1997880n);a.equal(res.transaction.balanceChanges.find(b=>b.address===p.sender).amount,(-net).toString());
   execution={at:e.startedDateTime,durationMs:e.time,digest:p.digest,gasAtomic:String(net),success:true};
  }
 }
 a(execution&&verified);a.equal(counts.ExecuteTransaction,1);a(ui.outcome.ax.includes(p.digest));a(ui.outcome.ax.includes('"success": true'));a.equal(ui.outcome.ax.includes('Rejected from user'),false);
 const calls=[],client=new RtdGrpcClient({network:'localnet',baseUrl:'http://127.0.0.1:41750',format:'binary',mvr:{url:''},fetch:async(input,init)=>{const url=String(input);a(/^http:\/\/127\.0\.0\.1:41750\/rtd\.rpc\.v2\.LedgerService\/(GetServiceInfo|GetTransaction)$/.test(url));const r=await fetch(input,{...init,redirect:'error',signal:AbortSignal.timeout(10000)});calls.push({url,status:r.status,requestBase64:Buffer.from(init.body).toString('base64'),responseBase64:Buffer.from(await r.clone().arrayBuffer()).toString('base64')});return r;}});
 const before=(await client.ledgerService.getServiceInfo({})).response;a.equal(before.chainId,p.expiration.Validity.chain);
 const tx=(await client.ledgerService.getTransaction({digest:p.digest,readMask:{paths:['digest','checkpoint','transaction','effects','balance_changes','objects','signatures']}})).response.transaction;
 a.equal(tx.digest,p.digest);a(tx.effects.status.success);a(tx.checkpoint>2001906n);a.equal(Buffer.from(tx.transaction.bcs.value).toString('base64'),p.bytesBase64);a.equal(tx.balanceChanges.find(b=>b.address===p.sender).amount,'-1997880');
 const after=(await client.ledgerService.getServiceInfo({})).response;a.equal(after.chainId,p.expiration.Validity.chain);a(after.checkpointHeight>=tx.checkpoint);
 const postSignature=decoded.filter(e=>Date.parse(e.at)>Date.parse(verified.at)&&Date.parse(e.at)<Date.parse(execution.at));
 const out={passed:true,observedAt:new Date().toISOString(),scope:'One ordinary Chrome C257 dApp dev execution, exact reviewed bytes and signature, successful dApp result, independently confirmed original digest. C256 remains unresolved.',digest:p.digest,requests:entries.length,counts,decoded,verified,execution,checkpoint:String(tx.checkpoint),confirmedTransaction:tx,nativeReadCalls:calls,approvedClicks:1,verifyToDispatchMs:Date.parse(execution.at)-Date.parse(verified.at),postSignatureCalls:postSignature,originalC256PendingRetained:true,parentCompletion:false,inputsSha256:Object.fromEntries(files.map(f=>[f,sha(fs.readFileSync(f))]))};
 fs.writeFileSync(`${L}/20261011-C259-execution-audit-01.json`,JSON.stringify(out,(_k,v)=>typeof v==='bigint'?String(v):v,2)+'\n',{flag:'wx',mode:0o600});console.log(JSON.stringify({passed:true,digest:p.digest,checkpoint:out.checkpoint,requests:entries.length,counts,verifyToDispatchMs:out.verifyToDispatchMs,executionMs:execution.durationMs}));
})().catch(e=>{console.error(e);process.exitCode=1});
