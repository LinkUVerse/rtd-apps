// Decode real ordinary Chrome gRPC frames; no signing or live network traffic.
const fs=require('node:fs'),a=require('node:assert/strict'),crypto=require('node:crypto');
const {GrpcTypes}=require('rtd-typescript/grpc'),{Transaction}=require('rtd-typescript/transactions'),{bcs}=require('rtd-typescript/bcs');
const L='migrationToGRpcOrGraphQLDoc/workLog',owner='0xd50b47e5956effdff99b840cc1a34eb7e23a6a1997ec2e324ff4960b7f27077c',h0='BkuLHhdtnoK7yLxo2eQuvcjHtdyipE7MMyxgTJiyHGg4';
const sha=p=>crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex');
function frame(bytes,type,response){a(bytes.length>=5&&bytes[0]===0);const end=5+bytes.readUInt32BE(1);a(end<=bytes.length);if(response){a.equal(bytes[end],128);a.equal(end+5+bytes.readUInt32BE(end+1),bytes.length);a(/(?:^|\r\n)grpc-status:\s*0\r\n/.test(bytes.subarray(end+5).toString()));}else a.equal(end,bytes.length);return type.fromBinary(bytes.subarray(5,end));}
const reports=[],files=[__filename];
for(const kind of ['send','staking']){
 const input=`${L}/20261011-C237-${kind}-preview-01.har`;files.push(input);const entries=JSON.parse(fs.readFileSync(input)).log.entries,counts={},sims=[],balances=[],heads=[];
 for(const e of entries){a.equal(e.response.status,200);a(!e._error);a.equal(e.request.method,'POST');const method=e.request.url.split('/').pop();counts[method]=(counts[method]??0)+1;
  if(method==='graphql'){const r=JSON.parse(e.response.content.text);a(!r.errors?.length);continue;}
  a(e.request.url.startsWith('http://127.0.0.1:41750/rtd.rpc.v2.'));a(['GetServiceInfo','GetBalance','ListOwnedObjects','GetObject','SimulateTransaction'].includes(method));
  const req=frame(Buffer.from(e.request.postData.text,'latin1'),GrpcTypes[method+'Request'],false);a.equal(e.response.content.encoding,'base64');const res=frame(Buffer.from(e.response.content.text,'base64'),GrpcTypes[method+'Response'],true);
  if(method==='GetServiceInfo'){a.equal(res.chainId,h0);heads.push(String(res.checkpointHeight));}
  if(method==='GetBalance'){a.equal(req.owner,owner);balances.push(res);}
  if(method==='SimulateTransaction'){a.equal(req.checks,GrpcTypes.SimulateTransactionRequest_TransactionChecks.ENABLED);a(res.transaction.effects.status.success);sims.push({req,res});}
 }
 a.equal(sims.length,2);a.equal(sims[0].req.doGasSelection,true);a.equal(sims[1].req.doGasSelection,false);
 const bytes=Buffer.from(sims[1].req.transaction.bcs.value),data=Transaction.from(bytes).getData();a.equal(data.sender,owner);a.deepEqual(Buffer.from(sims[1].res.transaction.transaction.bcs.value),bytes);
 const effects=bcs.TransactionEffects.parse(sims[1].res.transaction.effects.bcs.value);const digest=effects[effects.$kind].transactionDigest;a.equal(sims[1].res.transaction.effects.transactionDigest,digest);
 a.equal(digest,kind==='send'?'7ze5xXKDA8ueuZU1sQ6mKoEYW335aU9E9cuk9pCQki2D':'Fb8FM9bVUyUVdAdGw7Dexy6kanhrf115zsPZK7gQG7qx');a.equal(data.gasData.budget,kind==='send'?'2988000':'3419224');
 reports.push({kind,requests:entries.length,counts,simulations:sims.length,checksEnabled:true,simulationSucceeded:true,digest,sender:data.sender,gasBudget:data.gasData.budget,expiration:data.expiration,heads,balances});
}
fs.writeFileSync(`${L}/20261011-C237-previews-audit-01.json`,JSON.stringify({passed:true,observedAt:new Date().toISOString(),scope:'Native request/response protobuf frames and final simulated BCS/digest match visible ordinary Chrome previews; GraphQL in these two mixed captures only structurally checked, not all replayed',reports,executeRequests:0,signatures:0,parentCompletion:false,inputsSha256:Object.fromEntries(files.map(p=>[p,sha(p)]))},(_k,v)=>typeof v==='bigint'?v.toString():v,2)+'\n',{flag:'wx',mode:0o600});console.log(JSON.stringify({passed:true,previews:reports.map(r=>({kind:r.kind,digest:r.digest,gasBudget:r.gasBudget}))}));
