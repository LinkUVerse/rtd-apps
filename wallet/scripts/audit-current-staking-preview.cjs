// Independent complete original simulation-frame and final withdrawal BCS audit. No network.
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),assert=require('node:assert/strict');
const{GrpcTypes}=require('rtd-typescript/grpc'),{Transaction}=require('rtd-typescript/transactions');
const read=f=>JSON.parse(fs.readFileSync(f)),sha=f=>crypto.createHash('sha256').update(fs.readFileSync(f)).digest('hex');
function decode(base64,type){
 const raw=Buffer.from(base64,'base64');assert.equal(raw[0],0);const length=raw.readUInt32BE(1);assert(length>0&&length+5<=raw.length);
 return {value:type.fromBinary(raw.subarray(5,length+5)),raw,dataEnd:length+5};
}
(async()=>{
 const[uiFile,domainFile,output]=process.argv.slice(2);assert(!fs.existsSync(output));
 const ui=read(uiFile),domain=read(domainFile),position=domain.value.positions[0];
 assert(ui.passed&&domain.passed&&ui.stakeId===position.objectId&&ui.owner===domain.owner);
 assert.equal(ui.signatures,0);assert.equal(ui.executeRequests,0);assert.equal(ui.simulations.length,2);
 const rows=ui.simulations.map(row=>{
  assert.equal(row.status,200);const req=decode(row.requestBase64,GrpcTypes.SimulateTransactionRequest),res=decode(row.responseBase64,GrpcTypes.SimulateTransactionResponse);
  assert.equal(req.dataEnd,req.raw.length);assert.deepEqual(GrpcTypes.SimulateTransactionRequest.toJson(req.value),row.request);
  assert.deepEqual(GrpcTypes.SimulateTransactionResponse.toJson(res.value),row.response);
  assert.equal(res.raw[res.dataEnd],128);const length=res.raw.readUInt32BE(res.dataEnd+1);assert.equal(res.dataEnd+5+length,res.raw.length);
  assert(/(?:^|\r\n)grpc-status:\s*0\r\n/i.test(res.raw.subarray(res.dataEnd+5).toString('ascii')));
  assert.equal(row.request.checks,'ENABLED');return row;
 });
 const digest=ui.approvalText.match(/(?:交易摘要|Transaction digest):\s*([A-Za-z0-9]+)/)[1];
 const matches=[];for(const row of rows){const bytes=row.request.transaction?.bcs?.value;if(bytes&&await Transaction.from(bytes).getDigest()===digest)matches.push(row);}
 assert(matches.length>0);const row=matches[0],bytes=row.request.transaction.bcs.value,data=Transaction.from(bytes).getData();
 assert.equal(data.sender,domain.owner);assert.equal(data.gasData.owner,domain.owner);assert.equal(data.gasData.budget,'3000000');
 assert(data.expiration.Validity);assert(BigInt(data.expiration.Validity.minEpoch)>=BigInt(domain.value.epoch));
 assert(ui.approvalText.includes(String(data.expiration.Validity.maxEpoch)));
 assert.equal(data.commands.length,1);const command=data.commands[0].MoveCall;assert(command);
 assert.equal(command.package,'0x0000000000000000000000000000000000000000000000000000000000000003');
 assert.equal(command.module,'rtd_system');assert.equal(command.function,'request_withdraw_stake');assert.deepEqual(command.typeArguments,[]);
 const stake=data.inputs.find(input=>input.Object?.ImmOrOwnedObject?.objectId===position.objectId);assert(stake);
 assert.equal(stake.Object.ImmOrOwnedObject.version,position.version);assert.equal(stake.Object.ImmOrOwnedObject.digest,position.digest);
 const system=data.inputs.find(input=>input.Object?.SharedObject?.objectId==='0x0000000000000000000000000000000000000000000000000000000000000005');assert(system?.Object.SharedObject.mutable);
 assert.equal(system.Object.SharedObject.initialSharedVersion,'1');
 assert(row.response.transaction.effects.status.success);
 const result={passed:true,observedAt:new Date().toISOString(),source:ui.source,owner:domain.owner,stakeId:position.objectId,
  principal:position.principal,digest,bytesBase64:bytes,commands:data.commands,gas:data.gasData,expiration:data.expiration,
  actualUiChecks:ui.checks.length,binarySimulationFramesVerified:rows.length,actualSimulationRequests:ui.actualSimulationRequests,
  auditNetworkRequests:0,auditSignatures:0,auditSimulations:0,auditExecuteRequests:0,
  inputsSha256:Object.fromEntries([uiFile,domainFile,__filename].map(f=>[path.resolve(f),sha(f)])),
  scope:'Actual C23 active stake withdrawal preview: complete original request/response frames/status0, UI final digest/BCS and owner, shared system and exact old untouched stake reference, enabled simulation/gas/validity. GraphQL epoch3 and fresh Fullnode validity epoch4 kept distinct. No approval/signature/execution/payout or full parent claim.'};
 fs.writeFileSync(output,JSON.stringify(result,null,2)+'\n',{flag:'wx',mode:0o600});console.log(JSON.stringify({passed:true,digest,frames:rows.length}));
})().catch(error=>{console.error(error);process.exitCode=1});
