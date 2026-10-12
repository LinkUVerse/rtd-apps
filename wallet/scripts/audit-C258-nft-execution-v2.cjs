// Offline ordinary-Chrome HAR audit. No transaction submission or browser control.
const fs=require('node:fs'),a=require('node:assert/strict'),crypto=require('node:crypto');
const {GrpcTypes}=require('rtd-typescript/grpc'),{verifyTransactionSignature}=require('rtd-typescript/verify');
const L='migrationToGRpcOrGraphQLDoc/workLog',files=[__filename],sha=b=>crypto.createHash('sha256').update(b).digest('hex');
function read(n){const p=`${L}/${n}`;files.push(p);return JSON.parse(fs.readFileSync(p));}
function frame(b,type,response){a(b.length>=5&&b[0]===0);const end=5+b.readUInt32BE(1);a(end<=b.length);if(response){a.equal(b[end],128);a.equal(end+5+b.readUInt32BE(end+1),b.length);a.match(b.subarray(end+5).toString(),/(?:^|\r\n)grpc-status:\s*0\r\n/);}else a.equal(end,b.length);return type.fromBinary(b.subarray(5,end));}
(async()=>{
 const p=read('20261011-C258-nft-preview-audit-01.json'),ui=read('20261011-C258-native-ui-03.json'),attempt=read('20261011-C258-submit-attempt-01.json');
 a(p.passed&&p.preparedOnly);a.equal(attempt.digest,p.digest);
 const entries=read('20261011-C258-nft-complete-02.har').log.entries,counts={},exceptions=[],confirmed=[];let execution,nativeFrames=0;const balances=[];
 for(const [index,e] of entries.entries()){
  const u=new URL(e.request.url),m=u.pathname.split('/').pop();a.equal(u.hostname,'127.0.0.1');a.equal(e.request.method,'POST');a(!e.request.postData?.text?.includes('"jsonrpc"'));counts[m]=(counts[m]??0)+1;
  if(e.response.status===0){a.equal(m,'graphql');a.equal(e.response._error,'net::ERR_ABORTED');a(!e.response.content.text);exceptions.push({index,method:m,status:0,reason:'cancelled, not successful'});continue;}
  a.equal(e.response.status,200);
  if(m==='graphql'){
   a(['http://127.0.0.1:41957/graphql','http://127.0.0.1:41959/account/graphql'].includes(u.href));
   const r=JSON.parse(e.response.content.text);a(!r.errors?.length);a(r.data);continue;
  }
  a(['http://127.0.0.1:41750','https://127.0.0.1:41903'].includes(u.origin));
  a(['GetServiceInfo','ListBalances','GetObject','GetPackage','SimulateTransaction','VerifySignature','ExecuteTransaction','GetTransaction'].includes(m));
  const req=frame(Buffer.from(e.request.postData.text,'latin1'),GrpcTypes[m+'Request'],false);
  if(!e.response.content.text){
   a(['GetTransaction','GetObject'].includes(m));a.equal(e.response.headers.find(h=>h.name.toLowerCase()==='grpc-status')?.value,'5');
   if(m==='GetTransaction')a.equal(req.digest,p.digest);
   exceptions.push({index,method:m,origin:u.origin,grpcStatus:5,request:req,reason:'explicit NOT_FOUND, not a positive result'});continue;
  }
  a(!e._error&&!e.response._error);a.equal(e.response.content.encoding,'base64');
  const res=frame(Buffer.from(e.response.content.text,'base64'),GrpcTypes[m+'Response'],true);nativeFrames++;
  if(m==='GetServiceInfo')a.equal(res.chainId,p.expiration.Validity.chain);
  if(m==='ListBalances'){a.equal(req.owner,p.sender);a.equal(res.balances.find(b=>b.coinType.endsWith('::rtd::RTD')).balance,999989419592n);balances.push({at:e.startedDateTime,balances:res.balances});}
  if(m==='ExecuteTransaction'){
   a(!execution);a.equal(u.port,'41750');a.equal(Buffer.from(req.transaction.bcs.value).toString('base64'),p.bytesBase64);a.equal(req.signatures.length,1);
   const signature=Buffer.from(req.signatures[0].bcs.value).toString('base64');a.equal((await verifyTransactionSignature(Buffer.from(p.bytesBase64,'base64'),signature,{address:p.sender})).toRtdAddress(),p.sender);
   a.equal(res.transaction.digest,p.digest);a(res.transaction.effects.status.success);a.equal(Buffer.from(res.transaction.transaction.bcs.value).toString('base64'),p.bytesBase64);
   const gas=res.transaction.effects.gasUsed,net=BigInt(gas.computationCost)+BigInt(gas.storageCost)-BigInt(gas.storageRebate);
   a.equal(net,10580408n);a.equal(res.transaction.balanceChanges.find(b=>b.address===p.sender).amount,(-net).toString());
   execution={at:e.startedDateTime,durationMs:e.time,digest:p.digest,gasAtomic:net.toString(),signatureSha256:sha(signature),success:true};
  }
  if(m==='GetTransaction'){
   a.equal(req.digest,p.digest);a.equal(res.transaction.digest,p.digest);a(res.transaction.effects.status.success);a.equal(Buffer.from(res.transaction.transaction.bcs.value).toString('base64'),p.bytesBase64);
   a.equal(res.transaction.checkpoint,2001906n);const objects=res.transaction.effects.changedObjects;
   const nft=objects.find(o=>o.objectId===p.objectId);a(nft);a.equal(nft.outputOwner.kind,GrpcTypes.Owner_OwnerKind.OBJECT);
   const wrapper=objects.find(o=>o.objectId===nft.outputOwner.address);a(wrapper);a.equal(wrapper.outputOwner.kind,GrpcTypes.Owner_OwnerKind.OBJECT);
   const kiosk=objects.find(o=>o.objectId===wrapper.outputOwner.address);a(kiosk);a(kiosk.objectType.endsWith('::kiosk::Kiosk'));a.notEqual(kiosk.objectId,p.kioskId);
   const token=objects.find(o=>o.objectType?.endsWith('::ob_kiosk::OwnerToken')&&o.outputOwner?.address===p.recipient);a(token);
   confirmed.push({at:e.startedDateTime,checkpoint:String(res.transaction.checkpoint),nft,wrapper,kiosk,token,tokenBcsBoundByIndependentNativeProbe:true});
  }
 }
 a(execution);a.equal(confirmed.length,1);a.equal(counts.ExecuteTransaction,1);
 a(ui.outcome.ax.includes('交易成功'));a(ui.outcome.ax.includes('0.010580408 RTD'));a(ui.outcome.ax.includes('0x125e…19d9'));a(ui.outcome.ax.includes('0x9d76…e5bc'));a(ui.outcome.ax.includes('交易已确认，资产数据仍在同步。'));
 a.equal(balances.length,3);a(ui.homeReady.ax.includes('999.98'));a(ui.staleOwnershipCheck.ax.includes('藏品已离开 OriginByte Kiosk'));a(!ui.staleOwnershipCheck.ax.includes('立即发送 NFT'));
 const nativePost=read('20261011-C258-nft-post-write-01.json');a(nativePost.passed);a.equal(nativePost.digest,p.digest);a.equal(nativePost.token.owner,p.recipient);a.equal(nativePost.token.kioskId,confirmed[0].kiosk.objectId);
 const proof={passed:true,observedAt:new Date().toISOString(),scope:'C257 ordinary Chrome OriginByte NFT transfer: exact preview, signature, one execution, original-digest confirmation and success receipt. Indexed write visibility, hidden-assets and other NFT routes remain open.',requests:entries.length,counts,exceptions,nativeFrames,graphqlStructurallyCheckedOnly:true,postWriteCurrentBalanceAccepted:true,staleOwnershipPreparationRejected:true,balances,execution,confirmed,confirmationReadAfterExecuteMs:Date.parse(confirmed[0].at)-Date.parse(execution.at),indexedPostWriteAccepted:false,parentCompletion:false,inputsSha256:Object.fromEntries(files.map(p=>[p,sha(fs.readFileSync(p))]))};
 fs.writeFileSync(`${L}/20261011-C258-nft-execution-audit-03.json`,JSON.stringify(proof,(_k,v)=>typeof v==='bigint'?v.toString():v,2)+'\n',{flag:'wx',mode:0o600});console.log(JSON.stringify({passed:true,execution,checkpoint:confirmed[0].checkpoint,requests:entries.length,exceptions:exceptions.length}));
})().catch(e=>{console.error(e);process.exitCode=1});
