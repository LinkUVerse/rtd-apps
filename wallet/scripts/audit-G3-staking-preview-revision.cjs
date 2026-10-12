// Full original simulation/approval revisions plus fresh native gas references. No signing or dispatch.
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),assert=require('node:assert/strict'),os=require('node:os'),cp=require('node:child_process');
const {GrpcTypes}=require('rtd-typescript/grpc'),{Transaction}=require('rtd-typescript/transactions'),{bcs}=require('rtd-typescript/bcs');
const {toBase64}=require('rtd-typescript/utils'),loader=require('tsx/cjs/api');
const wallet=path.resolve(__dirname,'..'),load=n=>loader.require(path.join(wallet,'src/shared/rpc',n+'.ts'),__filename);
const read=f=>JSON.parse(fs.readFileSync(f)),sha=f=>crypto.createHash('sha256').update(fs.readFileSync(f)).digest('hex');
function frame(encoded,T,trailer){
 const raw=Buffer.from(encoded,'base64');assert(raw.length>=5&&raw[0]===0);const n=raw.readUInt32BE(1);assert(n+5<=raw.length);
 if(trailer){const tail=raw.subarray(5+n);assert(tail.length>=5&&tail[0]===128&&tail.length===5+tail.readUInt32BE(1));assert.match(tail.subarray(5).toString('ascii'),/(?:^|\r\n)grpc-status:\s*0\r\n/)}else assert.equal(raw.length,n+5);
 return T.fromBinary(raw.subarray(5,5+n));
}
(async()=>{
 const [proofFile,output]=process.argv.slice(2);assert(output&&!fs.existsSync(output));const p=read(proofFile);
 assert(p.passed&&p.signatures===0&&p.executeRequests===0&&p.actualSimulationRequests===4);
 assert.deepEqual(p.errors,[]);assert.deepEqual(p.forbidden,[]);assert.equal(p.previews.length,2);assert.equal(p.simulations.length,4);
 assert.deepEqual(p.previews.map(v=>v.amount),['1','2']);assert.deepEqual(p.beforeJournal,p.afterJournal);assert(Object.values(p.beforeJournal).every(v=>v.length===0));
 for(const[f,h]of Object.entries(p.inputsSha256))assert.equal(sha(f),h);
 const logs=path.join(wallet,'migrationToGRpcOrGraphQLDoc/workLog'),buildFile=path.join(logs,'20261007-default-generation-positive-C41-build-01.json'),build=read(buildFile);
 assert(build.passed);for(const[f,h]of Object.entries(build.artifacts))assert.equal(sha(path.join(build.output,f)),h);
 assert.equal(p.workerSource.workerSha256,build.artifacts['background.js']);for(const r of p.uiSource.loadedBundles)assert.equal(r.loadedSha256,build.artifacts[r.file]);
 const profileFile=path.join(os.homedir(),'.local/state/rtd-wallet-migration/dev-20261006-03/certified-positive-transport-release-20261006-01/profile.json');
 const {validateNetworkProfile}=load('profile'),{WalletReadSession}=load('session'),{WalletFullnodeReader}=load('fullnode-reader');
 const profile=validateNetworkProfile(read(profileFile));assert.equal(profile.expectedGenesisDigest,p.admission.actualH0);
 const rows=[],refs=new Map();
 for(let i=0;i<2;i++){
  const v=p.previews[i],a=v.approval,prepared=a.prepared;assert.equal(v.simulations.length,2);
  assert.deepEqual(v.simulations,p.simulations.slice(i*2,i*2+2));
  const parsed=v.simulations.map(row=>{assert.equal(row.status,200);const req=frame(row.requestBase64,GrpcTypes.SimulateTransactionRequest,false),res=frame(row.responseBase64,GrpcTypes.SimulateTransactionResponse,true);assert.deepEqual(GrpcTypes.SimulateTransactionRequest.toJson(req),row.request);assert.deepEqual(GrpcTypes.SimulateTransactionResponse.toJson(res),row.response);assert.equal(row.request.checks,'ENABLED');assert.equal(row.response.transaction.effects.status.success,true);return row;});
  const [fee,final]=parsed;assert(fee.request.doGasSelection&&!fee.request.transaction.bcs?.value);assert(!final.request.doGasSelection);
  assert.equal(final.request.transaction.bcs.value,prepared.bytesBase64);
  const tx=Transaction.from(prepared.bytesBase64),data=tx.getData();assert.equal(await tx.getDigest(),prepared.digest);
  const canonical=bcs.TransactionData.parse(Buffer.from(prepared.bytesBase64,'base64'));assert.equal(toBase64(bcs.TransactionData.serialize(canonical).toBytes()),prepared.bytesBase64);
  assert.equal(data.sender,p.owner);assert.equal(data.gasData.owner,p.owner);assert.equal(prepared.gasOwner,p.owner);
  assert.equal(data.gasData.price,prepared.gasPrice);assert.equal(data.gasData.budget,prepared.gasBudget);assert.equal(prepared.gasPaymentKind,'coins');
  const selected=fee.response.transaction.transaction.gasPayment;assert.deepEqual(data.gasData.payment,selected.objects);assert.equal(data.gasData.owner,selected.owner);assert.equal(data.gasData.price,selected.price);assert.equal(data.gasData.budget,selected.budget);
  assert.deepEqual(data.commands.map(c=>c.$kind),['SplitCoins','MoveCall']);const split=data.commands[0].SplitCoins,call=data.commands[1].MoveCall;
  assert.equal(split.coin.$kind,'GasCoin');assert.equal(split.amounts.length,1);assert.equal(split.amounts[0].$kind,'Input');
  const amount=bcs.u64().parse(Buffer.from(data.inputs[split.amounts[0].Input].Pure.bytes,'base64'));assert.equal(amount,(BigInt(v.amount)*1000000000n).toString());assert.equal(amount,prepared.input.amount);
  assert.equal(call.package,'0x'+'0'.repeat(63)+'3');assert.equal(call.module,'rtd_system');assert.equal(call.function,'request_add_stake');assert.deepEqual(call.typeArguments,[]);assert.equal(call.arguments.length,3);
  assert.equal(call.arguments[0].$kind,'Input');const system=data.inputs[call.arguments[0].Input].Object.SharedObject;assert.deepEqual(system,{objectId:'0x'+'0'.repeat(63)+'5',initialSharedVersion:'1',mutable:true});
  assert.deepEqual(call.arguments[1].NestedResult,[0,0]);const validator=bcs.Address.parse(Buffer.from(data.inputs[call.arguments[2].Input].Pure.bytes,'base64'));assert.equal(validator,prepared.input.validator);
  assert(data.expiration.Validity&&data.expiration.Validity.chain===profile.expectedGenesisDigest);
  assert.equal(data.expiration.Validity.minEpoch,'0');assert.equal(data.expiration.Validity.maxEpoch,'1');assert.deepEqual(data.expiration.Validity.allowedProposers,{epoch:'0',proposers:[0]});
  assert(v.text.includes(prepared.digest)&&v.text.includes(amount)&&v.text.includes(validator)&&v.text.includes(p.owner));
  for(const r of data.gasData.payment){const old=refs.get(r.objectId);if(old)assert.deepEqual(old,r);refs.set(r.objectId,r);}
  rows.push({amount,requestId:a.requestId,digest:prepared.digest,bytesBase64:prepared.bytesBase64,gas:data.gasData,expiration:data.expiration,bindingKey:prepared.bindingKey,readSessionKey:prepared.readSessionKey,validator,canonicalAndFullSimulationsVerified:true});
 }
 assert.notEqual(rows[0].requestId,rows[1].requestId);assert.notEqual(rows[0].digest,rows[1].digest);assert.notEqual(rows[0].bytesBase64,rows[1].bytesBase64);assert.equal(rows[0].bindingKey,rows[1].bindingKey);assert.equal(rows[0].readSessionKey,rows[1].readSessionKey);
 assert(!p.traffic.some(r=>/\/(VerifySignature|ExecuteTransaction)$/.test(new URL(r.url).pathname)));
 assert(p.checks.some(r=>r.label==='controlled fresh preview account normally relocked'&&r.passed));
 for(const amount of ['1','2'])assert(p.checks.some(r=>r.label==='actual Back removes '+amount+' RTD approval and retains empty journal'&&r.passed));
 const session=new WalletReadSession(profile),originalFetch=globalThis.fetch,frames=[];let report,stage='fresh native selected gas references';
 globalThis.fetch=async(input,init)=>{const url=new URL(input instanceof Request?input.url:String(input));assert.equal(url.origin,'http://127.0.0.1:41750');assert(/\/(GetServiceInfo|GetObject)$/.test(url.pathname));const response=await originalFetch(input,init),bytes=Buffer.from(await response.clone().arrayBuffer());assert.equal(response.status,200);frames.push({url:url.href,status:response.status,requestBase64:Buffer.from(init?.body??[]).toString('base64'),responseBase64:bytes.toString('base64')});return response;};
 try{
  const native=new WalletFullnodeReader(session),gasObjects=[];
  for(const ref of refs.values()){
   const obj=await native.object(ref.objectId);assert(obj);assert.equal(obj.version,ref.version);assert.equal(obj.digest,ref.digest);assert(obj.owner.$kind==='AddressOwner'&&obj.owner.AddressOwner===p.owner);
   gasObjects.push({objectId:obj.objectId,version:obj.version,digest:obj.digest,owner:obj.owner,objectBcsBase64:toBase64(obj.objectBcs)});
  }
  assert(!cp.execFileSync('ps',['-Ao','command='],{encoding:'utf8'}).split('\n').some(s=>s.includes('Google Chrome')&&s.includes('--user-data-dir='+path.join(p.fixture,'profile'))));
  const gasBudgetChanged=rows[0].gas.budget!==rows[1].gas.budget;
  report={passed:true,observedAt:new Date().toISOString(),owner:p.owner,h0:profile.expectedGenesisDigest,retainedSource:build.sourceAfter,currentProductSource:p.currentProductSource,
   rows,gasBudgetChanged,gasBudgetChangeAcceptance:gasBudgetChanged,amountReapprovalPreviewAccepted:true,oldVisibleApprovalRetiredByActualBack:true,gasObjects,frames,
   sameBindingAndReadSession:true,requestIdsDigestsAndBytesChanged:true,fullOriginalSimulationFramesVerified:4,emptyWholeJournalUnchanged:true,normalRelockAndOwnedChromeAbsent:true,
   auditSignatures:0,auditSimulations:0,auditExecuteRequests:0,actualPreviewSimulations:4,actualApprovalClicks:0,currentC42BrowserAccepted:false,withdrawalAccepted:false,
   inputsSha256:Object.fromEntries([__filename,proofFile,buildFile,profileFile].map(f=>[path.resolve(f),sha(f)])),
   scope:'Original actual retained C41 unchanged staking UI two amount previews and normal Back, four complete enabled kind/final simulation pairs, exact canonical sender/gas/Validity/shared system/amount/validator/new request and digest. Fresh current native chosen gas object version/digest/owner/whole BCS, complete empty journal and normal relock. Gas budgets observed separately; equal budgets do not accept a gas-change test. No approve/sign/Execute, current C42 browser, indexed stake/withdraw, full internal entry or TX01 parent acceptance.'};
 }catch(error){report={passed:false,observedAt:new Date().toISOString(),stage,errorType:error.name,message:String(error.message).slice(0,500),frames,auditSignatures:0,auditSimulations:0,auditExecuteRequests:0};process.exitCode=1}
 finally{session.close();globalThis.fetch=originalFetch;fs.writeFileSync(output,JSON.stringify(report,null,2)+'\n',{flag:'wx',mode:0o600});console.log(JSON.stringify({passed:report.passed,stage:report.stage,frames:frames.length,gasBudgetChanged:report.gasBudgetChanged,actualApprovalClicks:0}))}
})().catch(error=>{console.error(JSON.stringify({passed:false,errorType:error.name,message:String(error.message).slice(0,500)}));process.exitCode=1});
