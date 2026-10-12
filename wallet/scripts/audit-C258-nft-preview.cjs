// Saved ordinary Chrome pre-submit frames only; no browser connection or network.
const fs=require('node:fs'), assert=require('node:assert/strict'), crypto=require('node:crypto');
const {GrpcTypes}=require('rtd-typescript/grpc'),{Transaction}=require('rtd-typescript/transactions');
const L='migrationToGRpcOrGraphQLDoc/workLog';
const files=[__filename,`${L}/20261011-C258-nft-intent-01.json`,`${L}/20261011-C258-native-ui-01.json`,`${L}/20261011-C258-nft-preview-01.har`];
const sha=b=>crypto.createHash('sha256').update(b).digest('hex');
function frame(bytes,type,response){assert(bytes.length>=5&&bytes[0]===0);const end=5+bytes.readUInt32BE(1);assert(end<=bytes.length);if(response){assert.equal(bytes[end],128);assert.equal(end+5+bytes.readUInt32BE(end+1),bytes.length);assert.match(bytes.subarray(end+5).toString(),/(?:^|\r\n)grpc-status:\s*0\r\n/);}else assert.equal(end,bytes.length);return type.fromBinary(bytes.subarray(5,end));}
(async()=>{
 const intent=JSON.parse(fs.readFileSync(files[1])),ui=JSON.parse(fs.readFileSync(files[2])),es=JSON.parse(fs.readFileSync(files[3])).log.entries;
 const simulations=[],heads=[];
 for(const e of es){
  const method=e.request.url.split('/').pop();assert(!e.request.url.includes('ExecuteTransaction'));
  if(!['GetServiceInfo','SimulateTransaction'].includes(method))continue;
  assert(e.request.url.startsWith('http://127.0.0.1:41750/rtd.rpc.v2.'));assert.equal(e.response.status,200);
  const req=frame(Buffer.from(e.request.postData.text,'latin1'),GrpcTypes[method+'Request'],false);
  const res=frame(Buffer.from(e.response.content.text,'base64'),GrpcTypes[method+'Response'],true);
  if(method==='GetServiceInfo'){assert.equal(res.chainId,intent.expectedH0);heads.push(String(res.checkpointHeight));}
  else {assert.equal(req.checks,GrpcTypes.SimulateTransactionRequest_TransactionChecks.ENABLED);assert(res.transaction.effects.status.success);simulations.push({req,res});}
 }
 assert(heads.length>0);const formal=simulations.filter(s=>s.req.doGasSelection===false).at(-1);assert(formal);
 const bytes=Buffer.from(formal.req.transaction.bcs.value),tx=Transaction.from(bytes),data=tx.getData(),digest=await tx.getDigest();
 assert(Buffer.from(formal.res.transaction.transaction.bcs.value).equals(bytes));assert.equal(formal.res.transaction.effects.transactionDigest,digest);
 assert.equal(data.sender,intent.sender);assert.equal(data.gasData.owner,intent.sender);assert(BigInt(data.gasData.budget)<=BigInt(intent.maximumApprovedGasAtomic));
 assert.equal(data.inputs.length,3);assert.equal(data.commands.length,1);
 assert.deepEqual(data.inputs[0].Object.SharedObject,{objectId:intent.kioskId,initialSharedVersion:'269848',mutable:true});
 assert.equal('0x'+Buffer.from(data.inputs[1].Pure.bytes,'base64').toString('hex'),intent.recipient);
 assert.equal('0x'+Buffer.from(data.inputs[2].Pure.bytes,'base64').toString('hex'),intent.objectId);
 const call=data.commands[0].MoveCall;assert.equal(call.package,'0xf7b994f253b602c397f2f291f81ffe31ad91b9792086f93270551c61041bfd78');assert.equal(call.module,'ob_kiosk');assert.equal(call.function,'p2p_transfer_and_create_target_kiosk');
 assert.deepEqual(call.typeArguments,['0xf1ebcefd5398aae04b2ad6aea847f62152a7ffb12a9290326b51edd0bee3da56::migration_nft::MigrationNFT']);
 assert.deepEqual(call.arguments.map(a=>a.Input),[0,1,2]);
 assert.match(ui.review.ax,new RegExp(digest));assert.match(ui.review.ax,new RegExp(intent.objectId));assert.match(ui.review.ax,new RegExp(intent.recipient));assert.match(ui.review.ax,new RegExp(data.gasData.budget));assert.equal(data.expiration.Validity.chain,intent.expectedH0);

 const out={passed:true,preparedOnly:true,observedAt:new Date().toISOString(),intentId:intent.intentId,digest,sender:data.sender,recipient:intent.recipient,objectId:intent.objectId,kioskId:intent.kioskId,route:"originbyte-kiosk",gasBudget:data.gasData.budget,expiration:data.expiration,bytesBase64:bytes.toString('base64'),bytesSha256:sha(bytes),heads,simulations:simulations.length,executions:0,parentCompletion:false,scope:'Final pre-submit BCS matches native simulation and actual ordinary Chrome review; no executed transaction accepted',inputsSha256:Object.fromEntries(files.map(f=>[f,sha(fs.readFileSync(f))]))};
 fs.writeFileSync(`${L}/20261011-C258-nft-preview-audit-01.json`,JSON.stringify(out,(_k,v)=>typeof v==='bigint'?v.toString():v,2)+'\n',{flag:'wx',mode:0o600});console.log(JSON.stringify({passed:true,preparedOnly:true,digest,gasBudget:data.gasData.budget,executions:0}));
})().catch(e=>{console.error(e);process.exitCode=1;});
