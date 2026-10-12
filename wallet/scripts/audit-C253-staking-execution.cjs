// Native ordinary Chrome HAR and UI evidence only. Never sends a transaction.
const fs=require('node:fs'),a=require('node:assert/strict'),crypto=require('node:crypto');
const {GrpcTypes}=require('rtd-typescript/grpc'),{verifyTransactionSignature}=require('rtd-typescript/verify');
const L='migrationToGRpcOrGraphQLDoc/workLog',files=[__filename],sha=b=>crypto.createHash('sha256').update(b).digest('hex');
function read(n){const p=`${L}/${n}`;files.push(p);return JSON.parse(fs.readFileSync(p));}
function frame(b,type,response){a(b.length>=5&&b[0]===0);const end=5+b.readUInt32BE(1);a(end<=b.length);if(response){a.equal(b[end],128);a.equal(end+5+b.readUInt32BE(end+1),b.length);a.match(b.subarray(end+5).toString(),/(?:^|\r\n)grpc-status:\s*0\r\n/);}else a.equal(end,b.length);return type.fromBinary(b.subarray(5,end));}
(async()=>{
 const p=read('20261011-C253-staking-preview-audit-01.json'),ui=read('20261011-C253-native-ui-03.json'),attempt=read('20261011-C253-submit-attempt-01.json');
 a(p.passed&&p.preparedOnly);a.equal(attempt.digest,p.digest);
 const entries=read('20261011-C253-staking-complete-01.har').log.entries,counts={},exceptions=[],confirmed=[],balances=[],stakingSnapshots=[];let execution,nativeFrames=0;
 for(const [index,e] of entries.entries()){
  const u=new URL(e.request.url),m=u.pathname.split('/').pop();a.equal(u.hostname,'127.0.0.1');a.equal(e.request.method,'POST');a(!e.request.postData?.text?.includes('"jsonrpc"'));counts[m]=(counts[m]??0)+1;
  if(e.response.status===0){a(['graphql','GetServiceInfo','GetBalance'].includes(m));a(!e.response.content.text);exceptions.push({index,method:m,status:0,reason:'cancelled; not successful'});continue;}
  a.equal(e.response.status,200);
  if(m==='graphql'){
   a.equal(u.origin,'http://127.0.0.1:41957');const r=JSON.parse(e.response.content.text);a(!r.errors?.length);
   for(const v of Object.values(r.data??{}))if(v?.query?.address?.stakedRtds)stakingSnapshots.push({at:e.startedDateTime,checkpoint:v.sequenceNumber,owner:v.query.address.address,positions:v.query.address.stakedRtds});
   continue;
  }
  a(['http://127.0.0.1:41750','https://127.0.0.1:41903'].includes(u.origin));
  a(['GetServiceInfo','GetBalance','ListBalances','GetObject','GetPackage','SimulateTransaction','VerifySignature','ExecuteTransaction','GetTransaction'].includes(m));
  const req=frame(Buffer.from(e.request.postData.text,'latin1'),GrpcTypes[m+'Request'],false);
  if(!e.response.content.text){
   a.equal(m,'GetTransaction');a.equal(req.digest,p.digest);
   const status=e.response.headers.find(h=>h.name.toLowerCase()==='grpc-status')?.value;
   a.equal(status,'5');exceptions.push({index,method:m,grpcStatus:5,browserError:e.response._error,reason:'explicit NOT_FOUND; not a successful transaction lookup'});continue;
  }
  a(!e._error&&!e.response._error);a.equal(e.response.content.encoding,'base64');
  const res=frame(Buffer.from(e.response.content.text,'base64'),GrpcTypes[m+'Response'],true);nativeFrames++;
  if(m==='GetServiceInfo')a.equal(res.chainId,'BkuLHhdtnoK7yLxo2eQuvcjHtdyipE7MMyxgTJiyHGg4');
  if(m==='ListBalances'){a.equal(req.owner,p.sender);a(!res.nextPageToken?.length);balances.push({at:e.startedDateTime,balances:res.balances});}
  if(m==='ExecuteTransaction'){
   a(!execution);a.equal(u.port,'41750');a.equal(Buffer.from(req.transaction.bcs.value).toString('base64'),p.bytesBase64);a.equal(req.signatures.length,1);
   const signature=Buffer.from(req.signatures[0].bcs.value).toString('base64');a.equal((await verifyTransactionSignature(Buffer.from(p.bytesBase64,'base64'),signature,{address:p.sender})).toRtdAddress(),p.sender);
   a.equal(res.transaction.digest,p.digest);a(res.transaction.effects.status.success);a.equal(Buffer.from(res.transaction.transaction.bcs.value).toString('base64'),p.bytesBase64);
   const gas=res.transaction.effects.gasUsed,net=BigInt(gas.computationCost)+BigInt(gas.storageCost)-BigInt(gas.storageRebate);
   a.equal(net,2429104n);a.equal(res.transaction.balanceChanges.find(b=>b.address===p.sender).amount,(-BigInt(p.amountAtomic)-net).toString());
   execution={at:e.startedDateTime,durationMs:e.time,digest:p.digest,amountAtomic:p.amountAtomic,gasAtomic:net.toString(),senderDebitAtomic:(BigInt(p.amountAtomic)+net).toString(),signatureSha256:sha(signature),success:true};
  }
  if(m==='GetTransaction'){
   a.equal(req.digest,p.digest);a.equal(res.transaction.digest,p.digest);a(res.transaction.effects.status.success);a.equal(Buffer.from(res.transaction.transaction.bcs.value).toString('base64'),p.bytesBase64);
   a.equal(res.transaction.checkpoint,1988842n);
   confirmed.push({at:e.startedDateTime,checkpoint:String(res.transaction.checkpoint),events:res.transaction.events?.events,objects:res.transaction.objects});
  }
 }
 a(execution);a.equal(confirmed.length,1);a.equal(balances.length,1);
 const native=balances[0].balances.find(b=>b.coinType.endsWith('::rtd::RTD'));a.equal(native.balance,'998867535440');a.equal(999869964544n-BigInt(native.balance),BigInt(execution.senderDebitAtomic));
 a(ui.receiptReady.ax.includes('交易成功'));a(ui.receiptReady.ax.includes('质押 1 RTD'));a(ui.receiptReady.ax.includes('0.002429104 RTD'));a(ui.receiptReady.ax.includes('第 6 轮'));a(ui.receiptReady.ax.includes('第 7 轮'));a(ui.receiptReady.ax.includes('交易已确认，资产数据仍在同步。'));a(ui.homeReady.ax.includes('998.86'));a(ui.stakeAfterReady.ax.includes('选择验证者'));
 const proof={passed:true,observedAt:new Date().toISOString(),scope:'One C250 ordinary Chrome dev stake with exact preview, signature, execution, original-digest confirmation and current balance; indexed position and withdrawal NOT accepted',requests:entries.length,counts,exceptions,nativeFrames,graphqlStructurallyCheckedOnly:true,execution,confirmed,balances,stakingSnapshots,confirmationReadAfterExecuteMs:Date.parse(confirmed[0].at)-Date.parse(execution.at),postWriteCurrentBalanceAccepted:true,indexedStakeAndWithdrawalAccepted:false,oldFormEpochDisplayAccepted:false,parentCompletion:false,inputsSha256:Object.fromEntries(files.map(p=>[p,sha(fs.readFileSync(p))]))};
 fs.writeFileSync(`${L}/20261011-C253-staking-execution-audit-01.json`,JSON.stringify(proof,(_k,v)=>typeof v==='bigint'?v.toString():v,2)+'\n',{flag:'wx',mode:0o600});
 console.log(JSON.stringify({passed:true,execution,checkpoint:confirmed[0].checkpoint,requests:entries.length,exceptions:exceptions.length,postWriteCurrentBalanceAccepted:true,indexedStakeAndWithdrawalAccepted:false}));
})().catch(e=>{console.error(e);process.exitCode=1});
