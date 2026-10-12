// Audit actual native-Chrome capture, not a replacement or live network probe.
const fs=require('node:fs'),a=require('node:assert/strict'),crypto=require('node:crypto');
const {GrpcTypes}=require('rtd-typescript/grpc'),{Transaction}=require('rtd-typescript/transactions'),{bcs}=require('rtd-typescript/bcs');
const L='migrationToGRpcOrGraphQLDoc/workLog',input=L+'/20261011-C241-name-and-normal-recipient-01.har',nameUi=L+'/20261011-C241-name-lag-native-01.txt',reviewUi=L+'/20261011-C241-normal-address-review-native-01.txt';
const owner='0xd50b47e5956effdff99b840cc1a34eb7e23a6a1997ec2e324ff4960b7f27077c',target='0x9d7652713f02b13b73744ba47e4f21ca0a0a2966cc02df86adcde2041454e5bc',h0='BkuLHhdtnoK7yLxo2eQuvcjHtdyipE7MMyxgTJiyHGg4';
const sha=p=>crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex');
function frame(bytes,type,response){a(bytes.length>=5&&bytes[0]===0);const end=5+bytes.readUInt32BE(1);a(end<=bytes.length);if(response){a.equal(bytes[end],128);a.equal(end+5+bytes.readUInt32BE(end+1),bytes.length);a(/(?:^|\r\n)grpc-status:\s*0\r\n/.test(bytes.subarray(end+5).toString()));}else a.equal(end,bytes.length);return type.fromBinary(bytes.subarray(5,end));}
const entries=JSON.parse(fs.readFileSync(input)).log.entries,counts={},cancelled=[],sims=[],heads=[],nameAdmissions=[];
for(const [index,e]of entries.entries()){
 const u=new URL(e.request.url),method=u.pathname.split('/').pop(); a.equal(u.hostname,'127.0.0.1');a([41750,41957,41958,41959].includes(Number(u.port)));a.equal(e.request.method,'POST');a(!String(e.request.postData?.text).includes('"jsonrpc"'));a(!/ExecuteTransaction|SignTransaction/.test(method));counts[method]=(counts[method]??0)+1;
 if(e.response.status===0){a(!e.response.content.text);cancelled.push({index,url:u.href,error:e.response._error??e._error});continue;}
 a.equal(e.response.status,200);
 if(method==='graphql'){
  const r=JSON.parse(e.response.content.text);a(!r.errors?.length);const q=JSON.parse(e.request.postData.text).query;
  for(const [key,val]of Object.entries(r.data??{}))if(key.endsWith('walletGenesis'))a.equal(val.digest,h0);
  if(q.includes('query WalletSnapshotAdmission')&&q.includes('field: "dynamicField"')){
   a.equal(Object.keys(r.data.serviceConfig).length,4);for(const value of Object.values(r.data.serviceConfig)){a.equal(value.first.sequenceNumber,0);a.equal(value.last.sequenceNumber,1006768);}
   a.equal(r.data.walletHead.sequenceNumber,1006768);nameAdmissions.push({index,head:1006768,ranges:r.data.serviceConfig});
  }
  continue;
 }
 a.equal(Number(u.port),41750);a(['GetServiceInfo','GetBalance','ListOwnedObjects','GetObject','SimulateTransaction'].includes(method));
 const req=frame(Buffer.from(e.request.postData.text,'latin1'),GrpcTypes[method+'Request'],false);
 if(method==='GetObject'&&e.response.content.text===''){const h=Object.fromEntries(e.response.headers.map(v=>[v.name.toLowerCase(),v.value]));a.equal(h['grpc-status'],'5');a.equal(h['x-rtd-chain-id'],h0);a.equal(req.objectId,target);continue;}
 a.equal(e.response.content.encoding,'base64');const res=frame(Buffer.from(e.response.content.text,'base64'),GrpcTypes[method+'Response'],true);
 if(method==='GetServiceInfo'){a.equal(res.chainId,h0);heads.push(String(res.checkpointHeight));}
 if(method==='SimulateTransaction'){a.equal(req.checks,GrpcTypes.SimulateTransactionRequest_TransactionChecks.ENABLED);a(res.transaction.effects.status.success);sims.push({req,res});}
}
a(nameAdmissions.length>0);a(heads.length>0&&heads.every(h=>BigInt(h)>1006768n));a.equal(sims.length,2);a(sims[0].req.doGasSelection&&!sims[1].req.doGasSelection);
const bytes=Buffer.from(sims[1].req.transaction.bcs.value),data=Transaction.from(bytes).getData();a.equal(data.sender,owner);a.equal(data.gasData.budget,'2988000');a.deepEqual(Buffer.from(sims[1].res.transaction.transaction.bcs.value),bytes);
const effects=bcs.TransactionEffects.parse(sims[1].res.transaction.effects.bcs.value),digest=effects[effects.$kind].transactionDigest;a.equal(digest,'EzeuJXXwP28deHFvgZFjUHnbvip6ivAhpr7SRfcrarMK');a.equal(sims[1].res.transaction.effects.transactionDigest,digest);
const addresses=data.inputs.filter(i=>i.Pure).map(i=>Buffer.from(i.Pure.bytes,'base64')).filter(b=>b.length===32).map(b=>'0x'+b.toString('hex'));a(addresses.includes(target));
const nameText=fs.readFileSync(nameUi,'utf8'),reviewText=fs.readFileSync(reviewUi,'utf8');a(nameText.includes('名称暂时无法解析，请等待索引同步或检查网络后重试'));a(nameText.includes('按钮 (disabled) 检查'));a(nameText.includes('wallet-migration.rtd'));a(!nameText.includes('地址无效，请检查后重试'));a(reviewText.includes(target)&&reviewText.includes(digest));
const files=[__filename,input,nameUi,reviewUi,L+'/20261011-C241-ordinary-bytecode-01.json',L+'/20261011-C241-source-and-checks-01.json'];for(const f of files.slice(-2))a(JSON.parse(fs.readFileSync(f)).passed);
const proof={passed:true,observedAt:new Date().toISOString(),requests:entries.length,counts,cancelled,nameAdmissions,heads,normalRecipient:target,digest,gasBudget:data.gasData.budget,simulations:2,signatures:0,executeRequests:0,ordinaryNameLagFeedbackAccepted:true,ordinaryAddressAfterNameFailureAccepted:true,finalOrdinaryRecipientAndBytesAccepted:true,positiveNameAccepted:false,allBusinessTrafficAccepted:false,parentCompletion:false,scope:'Actual C241 native UI and captured complete gRPC successful frames; cancelled GraphQL/account requests retained and not accepted as successful. Name coverage admissions fail freshness, no resolved name accepted. Final normal-address BCS and effects match visible preview. No signature or execution.',inputsSha256:Object.fromEntries(files.map(p=>[p,sha(p)]))};
fs.writeFileSync(L+'/20261011-C241-name-native-audit-01.json',JSON.stringify(proof,null,2)+'\n',{flag:'wx'});console.log(JSON.stringify({passed:true,requests:entries.length,cancelled:cancelled.length,nameAdmissions:nameAdmissions.length,simulations:2,executeRequests:0}));
