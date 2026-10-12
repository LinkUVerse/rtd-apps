// Audit saved ordinary Chrome HTTP/protobuf frames. No live queries or signing.
const fs=require('node:fs'),assert=require('node:assert/strict'),crypto=require('node:crypto');
const {GrpcTypes}=require('rtd-typescript/grpc'),{verifyTransactionSignature}=require('rtd-typescript/verify');
const L='migrationToGRpcOrGraphQLDoc/workLog',files=[__filename],sha=b=>crypto.createHash('sha256').update(b).digest('hex');
function read(n){const p=`${L}/${n}`;files.push(p);return JSON.parse(fs.readFileSync(p));}
function frame(bytes,type,response){assert(bytes.length>=5&&bytes[0]===0);const end=5+bytes.readUInt32BE(1);assert(end<=bytes.length);if(response){assert.equal(bytes[end],128);assert.equal(end+5+bytes.readUInt32BE(end+1),bytes.length);assert.match(bytes.subarray(end+5).toString(),/(?:^|\r\n)grpc-status:\s*0\r\n/);}else assert.equal(end,bytes.length);return type.fromBinary(bytes.subarray(5,end));}
(async()=>{
 const p=read('20261011-C249-transfer-preview-audit-01.json'),ui=read('20261011-C249-native-ui-02.json'),attempt=read('20261011-C249-submit-attempt-01.json');assert(p.passed&&p.preparedOnly);assert.equal(attempt.digest,p.digest);
 const captures=[],nativeBalances=[],snapshots=[],confirmed=[];let execution;
 for(const name of ['transfer-receipt','post-write-balances','worker-execution']){
  const entries=read(`20261011-C249-${name}-01.har`).log.entries,counts={},exceptions=[];let executions=0;
  for(const e of entries){
   const u=new URL(e.request.url),m=u.pathname.split('/').pop();assert.equal(u.hostname,'127.0.0.1');assert.equal(e.request.method,'POST');assert(!e.request.postData?.text?.includes('"jsonrpc"'));counts[m]=(counts[m]??0)+1;
   if(e.response.status===0){assert.equal(m,'graphql');assert(!e.response.content.text);exceptions.push({method:m,status:0,startedAt:e.startedDateTime,reason:'cancelled GraphQL; not successful'});continue;}
   assert.equal(e.response.status,200);
   if(m==='graphql'){
    assert(['http://127.0.0.1:41957','http://127.0.0.1:41959'].includes(u.origin));const r=JSON.parse(e.response.content.text);assert(!r.errors?.length);
    if(name==='post-write-balances')for(const value of Object.values(r.data??{})){const a=value?.query?.address;if(a?.balances){assert.equal(a.address,p.sender);for(const b of a.balances.nodes)snapshots.push({at:e.startedDateTime,checkpoint:value.sequenceNumber,owner:a.address,balance:b.totalBalance,coinType:b.coinType.repr});}}
    continue;
   }
   assert(['http://127.0.0.1:41750','https://127.0.0.1:41903'].includes(u.origin));
   assert(['GetServiceInfo','GetBalance','ListOwnedObjects','GetObject','SimulateTransaction','VerifySignature','ExecuteTransaction','GetTransaction'].includes(m));
   const req=frame(Buffer.from(e.request.postData.text,'latin1'),GrpcTypes[m+'Request'],false);
   const grpcStatus=e.response.headers.find(h=>h.name.toLowerCase()==='grpc-status')?.value;
   if(grpcStatus==='5'){
    assert(['GetObject','GetTransaction'].includes(m));if(m==='GetObject')assert.equal(req.objectId,p.recipient);else assert.equal(req.digest,p.digest);
    assert(!e.response.content.text);exceptions.push({method:m,url:e.request.url,grpcStatus:5,startedAt:e.startedDateTime,reason:'explicit NOT_FOUND; not a successful object/transaction lookup'});continue;
   }
   assert.equal(e.response.content.encoding,'base64');const res=frame(Buffer.from(e.response.content.text,'base64'),GrpcTypes[m+'Response'],true);
   if(m==='GetServiceInfo')assert.equal(res.chainId,'BkuLHhdtnoK7yLxo2eQuvcjHtdyipE7MMyxgTJiyHGg4');
   if(m==='GetBalance'&&name==='post-write-balances'){assert.equal(req.owner,p.sender);nativeBalances.push({at:e.startedDateTime,balance:res.balance.balance,coinBalance:res.balance.coinBalance});}
   if(m==='ExecuteTransaction'){
    executions++;assert.equal(u.port,'41750');assert.equal(Buffer.from(req.transaction.bcs.value).toString('base64'),p.bytesBase64);assert.equal(req.signatures.length,1);
    const signature=Buffer.from(req.signatures[0].bcs.value).toString('base64');assert.equal((await verifyTransactionSignature(Buffer.from(p.bytesBase64,'base64'),signature,{address:p.sender})).toRtdAddress(),p.sender);
    assert.equal(res.transaction.digest,p.digest);assert(res.transaction.effects.status.success);assert.equal(Buffer.from(res.transaction.transaction.bcs.value).toString('base64'),p.bytesBase64);
    const change=res.transaction.balanceChanges.find(b=>b.address===p.recipient);assert.equal(change.amount,p.amountAtomic);
    const gas=res.transaction.effects.gasUsed,netGas=BigInt(gas.computationCost)+BigInt(gas.storageCost)-BigInt(gas.storageRebate);
    assert.equal(res.transaction.balanceChanges.find(b=>b.address===p.sender).amount,(-BigInt(p.amountAtomic)-netGas).toString());
    execution={digest:p.digest,at:e.startedDateTime,durationMs:e.time,netGasAtomic:netGas.toString(),senderDebitAtomic:(BigInt(p.amountAtomic)+netGas).toString(),signatureSha256:sha(signature),success:true};
   }
   if(m==='GetTransaction'){
    assert.equal(req.digest,p.digest);assert.equal(res.transaction.digest,p.digest);assert(res.transaction.effects.status.success);assert.equal(Buffer.from(res.transaction.transaction.bcs.value).toString('base64'),p.bytesBase64);assert(res.transaction.checkpoint!==undefined);
    confirmed.push({capture:name,url:e.request.url,at:e.startedDateTime,checkpoint:String(res.transaction.checkpoint)});
   }
  }
  assert.equal(executions,1);captures.push({name,requests:entries.length,counts,executions,exceptions});
 }
 assert(execution&&confirmed.length);assert.equal(nativeBalances.length,3);
 assert.equal(BigInt(nativeBalances[0].balance)-BigInt(nativeBalances[2].balance),BigInt(execution.senderDebitAtomic));
 const old=snapshots.filter(s=>s.at>execution.at).at(-1);assert(old);assert(BigInt(old.checkpoint)<BigInt(confirmed[0].checkpoint));assert.notEqual(old.balance,nativeBalances[2].balance);
 assert.match(ui.receipt,/交易成功/);assert.match(ui.receipt,/0\.01 RTD/);assert.match(ui.receipt,/0\.00199788 RTD/);assert.match(ui.homeAfterReady,/999\.89/);assert.match(ui.balanceCrossCheckReady,/available 999\.89/);
 const report={passed:true,observedAt:new Date().toISOString(),scope:'One new ordinary Chrome dev transfer confirmed with original bytes/digest/signature; separately reproduces stale indexed balance display',intentId:p.intentId,execution,confirmed,captures,nativeBalances,indexedBalances:snapshots,postWriteHomeAccepted:false,defect:{nativeCurrent:nativeBalances[2].balance,indexedDisplayed:old.balance,indexedCheckpoint:old.checkpoint,transactionCheckpoint:confirmed[0].checkpoint,visibleHome:'999.89 RTD',visibleSendSelection:'999.89 RTD',currentExpectedDisplay:(BigInt(nativeBalances[2].balance)/10000000n/100n).toString()+'.'+(BigInt(nativeBalances[2].balance)/10000000n%100n).toString().padStart(2,'0')+' RTD'},executeRequestsPerCapture:1,capturesOverlap:true,parentCompletion:false,inputsSha256:Object.fromEntries(files.map(f=>[f,sha(fs.readFileSync(f))]))};
 fs.writeFileSync(`${L}/20261011-C249-execution-audit-02.json`,JSON.stringify(report,(_k,v)=>typeof v==='bigint'?v.toString():v,2)+'\n',{flag:'wx',mode:0o600});console.log(JSON.stringify({passed:true,execution,checkpoint:confirmed[0].checkpoint,postWriteHomeAccepted:false,defect:report.defect},(_k,v)=>typeof v==='bigint'?v.toString():v));
})().catch(e=>{console.error(e);process.exitCode=1;});
