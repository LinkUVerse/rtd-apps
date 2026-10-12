// Offline audit of saved ordinary Chrome transaction bytes and native confirmations.
const fs=require('node:fs'),a=require('node:assert/strict'),crypto=require('node:crypto');
const {GrpcTypes}=require('rtd-typescript/grpc'),{Transaction}=require('rtd-typescript/transactions');
const {verifyTransactionSignature}=require('rtd-typescript/verify');
const sha=x=>crypto.createHash('sha256').update(x).digest('hex');
function frame(b,type,response){a(b.length>=5&&b[0]===0);const end=5+b.readUInt32BE(1);a(end<=b.length);if(response){a.equal(b[end],128);a.equal(end+5+b.readUInt32BE(end+1),b.length);a.match(b.subarray(end+5).toString(),/(?:^|\r\n)grpc-status:\s*0\r\n/);}else a.equal(end,b.length);return type.fromBinary(b.subarray(5,end));}
(async()=>{
 const [intentFile,harFile,output]=process.argv.slice(2),intent=JSON.parse(fs.readFileSync(intentFile)),entries=JSON.parse(fs.readFileSync(harFile)).log.entries;
 a(!fs.existsSync(output));const counts={},exceptions=[],confirmed=[],simulations=[];let execution,decoded,bytes;
 const kind=intent.kind;a.equal(kind,'coin-transfer');
 for(const[index,e]of entries.entries()){
  const url=new URL(e.request.url),method=url.pathname.split('/').pop();
  a.equal(url.hostname,'127.0.0.1');a([43150,43210,43211,43203,41718].includes(Number(url.port)));
  a(!e.request.postData?.text?.includes('"jsonrpc"'));counts[method]=(counts[method]??0)+1;
  if(e.response.status===0){exceptions.push({index,method,error:e.response._error,accepted:false});continue;}
  if(method==='graphql'&&e.response.status===503){exceptions.push({index,method,status:503,at:e.startedDateTime,accepted:false,reason:'Actual guarded query unavailable; never counted as successful read'});continue;}
  a.equal(e.response.status,200);
  if(!['ExecuteTransaction','SimulateTransaction','GetTransaction'].includes(method))continue;
  const req=frame(Buffer.from(e.request.postData.text,'latin1'),GrpcTypes[method+'Request'],false);
  if(!e.response.content.text){exceptions.push({index,method,grpcStatus:e.response.headers.find(h=>h.name.toLowerCase()==='grpc-status')?.value,accepted:false});continue;}
  const res=frame(Buffer.from(e.response.content.text,'base64'),GrpcTypes[method+'Response'],true);
  if(method==='SimulateTransaction'&&req.transaction?.bcs?.value&&res.transaction?.effects?.status?.success){
   a.equal(req.checks,GrpcTypes.SimulateTransactionRequest_TransactionChecks.ENABLED);
   simulations.push(Buffer.from(req.transaction.bcs.value).toString('base64'));
  }
  if(method==='GetTransaction'&&req.digest===intent.digest){
   a.equal(res.transaction.digest,intent.digest);a(res.transaction.effects.status.success);a(res.transaction.checkpoint!==undefined);
   confirmed.push({at:e.startedDateTime,transaction:res.transaction});
  }
  if(method==='ExecuteTransaction'){
   a(!execution);a.equal(url.port,'43150');bytes=Buffer.from(req.transaction.bcs.value);const tx=Transaction.from(bytes);decoded=tx.getData();
   a.equal(await tx.getDigest(),intent.digest);a.equal(decoded.sender,intent.sender);a.equal(decoded.gasData.owner,intent.sender);
   a.equal(decoded.gasData.budget,intent.gasBudgetAtomic);a.equal(decoded.expiration.Validity.chain,intent.expectedH0);
   a.equal(decoded.expiration.Validity.minEpoch,String(intent.epochMin));a.equal(decoded.expiration.Validity.maxEpoch,String(intent.epochMax));
   a.equal(req.signatures.length,1);const signature=Buffer.from(req.signatures[0].bcs.value).toString('base64');
   a.equal((await verifyTransactionSignature(bytes,signature,{address:intent.sender})).toRtdAddress(),intent.sender);
   a.equal(res.transaction.digest,intent.digest);a(res.transaction.effects.status.success);
   a(Buffer.from(res.transaction.transaction.bcs.value).equals(bytes));
   a.equal(decoded.commands.length,2);a.equal(decoded.inputs.length,2);
   const split=decoded.commands[0].SplitCoins;a(split.coin.GasCoin);a.equal(split.amounts.length,1);a.equal(split.amounts[0].Input,0);
   a.equal(Buffer.from(decoded.inputs[0].Pure.bytes,'base64').readBigUInt64LE().toString(),intent.amountAtomic);
   const transfer=decoded.commands[1].TransferObjects;a.equal(transfer.objects.length,1);a.equal(transfer.objects[0].Result,0);a.equal(transfer.address.Input,1);
   a.equal('0x'+Buffer.from(decoded.inputs[1].Pure.bytes,'base64').toString('hex'),intent.recipient);
   const gas=res.transaction.effects.gasUsed,net=gas.computationCost+gas.storageCost-gas.storageRebate;
   const delta=res.transaction.balanceChanges.find(x=>x.address===intent.sender&&x.coinType.endsWith('::rtd::RTD'));
   a(delta);a.equal(BigInt(delta.amount),-BigInt(intent.amountAtomic)-net);
   a.equal(res.transaction.balanceChanges.find(x=>x.address===intent.recipient&&x.coinType.endsWith('::rtd::RTD')).amount,intent.amountAtomic);
   execution={at:e.startedDateTime,durationMs:e.time,digest:intent.digest,gasAtomic:String(net),balanceDeltaAtomic:delta.amount,signatureSha256:sha(signature),effects:res.transaction.effects,success:true};
  }
 }
 a.equal(counts.ExecuteTransaction,1);a(execution&&confirmed.length);a(simulations.includes(bytes.toString('base64')));
 for(const row of confirmed){a(Buffer.from(row.transaction.transaction.bcs.value).equals(bytes));a.equal(row.transaction.effects.transactionDigest,intent.digest);}
 const stakeObjects=execution.effects.changedObjects.filter(x=>x.objectType?.endsWith('::staking_pool::StakedRtd'));
 if(kind==='stake'){a.equal(stakeObjects.length,1);a.equal(stakeObjects[0].outputOwner.address,intent.sender);}
 const result={passed:true,observedAt:new Date().toISOString(),kind,intent,execution,decoded,bytesBase64:bytes.toString('base64'),confirmed,stakeObjects,counts,exceptions,requests:entries.length,
  onlyExpectedLoopbackEndpoints:true,noJsonRpc:true,scope:'One ordinary Chrome local dev name transfer: exact UI intent, successful simulation bytes, original signature, H0/epoch/gas/recipient/amount, one execution and original-digest confirmation. Other reads counted, not all independently semantically replayed.',
  inputsSha256:Object.fromEntries([__filename,intentFile,harFile].map(f=>[f,sha(fs.readFileSync(f))]))};
 fs.writeFileSync(output,JSON.stringify(result,(_k,v)=>typeof v==='bigint'?String(v):v instanceof Uint8Array?Buffer.from(v).toString('base64'):v,2)+'\n',{flag:'wx',mode:0o600});
 console.log(JSON.stringify({passed:true,kind,digest:intent.digest,checkpoint:String(confirmed[0].transaction.checkpoint),stakeIds:stakeObjects.map(o=>o.objectId),requests:entries.length,exceptions:exceptions.length}));
})().catch(e=>{console.error(e);process.exitCode=1});
