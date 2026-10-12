// Audit original first dispatches; only fresh readonly native requests are permitted.
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),assert=require('node:assert/strict');
const cp=require('node:child_process'),loader=require('tsx/cjs/api');
const {GrpcTypes,RtdGrpcClient}=require('rtd-typescript/grpc');
const {Transaction}=require('rtd-typescript/transactions'),{bcs}=require('rtd-typescript/bcs');
const {verifyTransactionSignature}=require('rtd-typescript/verify');
const {toBase64,toBase58,deriveDynamicFieldID}=require('rtd-typescript/utils');
const {blake2b}=require('@noble/hashes/blake2.js');
const wallet=path.resolve(__dirname,'..'),read=f=>JSON.parse(fs.readFileSync(f));
const sha=f=>crypto.createHash('sha256').update(fs.readFileSync(f)).digest('hex');
const typed=(type,v)=>toBase58(blake2b(Buffer.concat([Buffer.from(type+'::'),Buffer.from(v)]),{dkLen:32}));
function frame(value,codec,response){const raw=Buffer.from(value,'base64');assert.equal(raw[0],0);const end=5+raw.readUInt32BE(1);assert(end<=raw.length);
 if(response){assert.equal(raw[end],128);assert.equal(end+5+raw.readUInt32BE(end+1),raw.length);assert.match(raw.subarray(end+5).toString(),/(^|\r\n)grpc-status:[ \t]*0(\r\n|$)/);}else assert.equal(raw.length,end);
 return codec.fromBinary(raw.subarray(5,end));}
function canonical(codec,value){const v=codec.parse(value);assert.deepEqual(Buffer.from(codec.serialize(v).toBytes()),Buffer.from(value));return v;}
(async()=>{const [proofFile,inventoryAuditFile,output]=process.argv.slice(2);assert(output&&!fs.existsSync(output));const p=read(proofFile),inv=read(inventoryAuditFile),extra=[],oldFetch=globalThis.fetch;
 let report={},session,stage='original six first dispatches';
 try{
  assert(p.passed&&p.chromeClosed&&p.accountsNormallyRelocked&&inv.passed);assert.equal(p.executeRequests,6);assert.equal(p.signatures,6);
  assert.equal(p.faucetRequests+p.seedRequests+p.contractsDeployed+p.originalProfilesOpened+p.certificateChanges,0);
  assert.equal(p.previews.length,6);assert.equal(p.executions.length,6);assert(!p.blocked.length&&!p.pageErrors.length&&!p.captureErrors.length);
  const inputs={...p.inputsSha256,...inv.inputsSha256};for(const [f,h]of Object.entries(inputs))assert.equal(sha(f),h);
  const logs=path.join(wallet,'migrationToGRpcOrGraphQLDoc/workLog');const gatewayAuditFile=path.join(logs,'20261007-C48-nft-execution-gateway-independent-01.json');
  const gateway=read(gatewayAuditFile);assert(gateway.passed&&gateway.actualRequests===21);for(const [f,h]of Object.entries(gateway.inputsSha256))assert.equal(sha(f),h);
  const oracleFile=Object.keys(inputs).find(f=>f.endsWith('/20261007-C43-nonempty-kiosk-native-independent-01.json'));
  const profileFile=Object.keys(inputs).find(f=>f.endsWith('/C48-isolated-nft-execution-gateway-20261007-01/profile.json'));
  const buildFile=Object.keys(inputs).find(f=>f.endsWith('/20261007-default-generation-positive-C46-build-03.json'));assert(oracleFile&&profileFile&&buildFile);
  const oracle=read(oracleFile),profile=read(profileFile),build=read(buildFile);assert.equal(p.h0,profile.expectedGenesisDigest);assert.equal(p.generation,profile.generation);
  assert.deepEqual(require('./build-reviewed-generation-production-extension.cjs').productSource(),p.source);assert.deepEqual(build.sourceAfter,p.source);
  for(const [f,h]of Object.entries(build.artifacts))assert.equal(sha(path.join(build.output,f)),h);
  const inventoryFile=Object.keys(inv.inputsSha256).find(f=>f.endsWith('/20261007-C48-nft-execution-inventory-01.json'));assert(inventoryFile);
  const protectedPins=read(path.join(read(inventoryFile).fixture,'intent.json')).protectedOriginalsSha256;
  assert.equal(Object.keys(protectedPins).length,1015);for(const [f,h]of Object.entries(protectedPins))assert.equal(sha(f),h);
  assert(p.workerSource.matchesDisk&&p.uiSource.matchesDisk);assert.equal(p.workerSource.workerSha256,build.artifacts['background.js']);
  assert.deepEqual(p.cipherBefore,p.cipherAfter);assert.equal(p.finalJournal['pending-scopes-v2'].length,0);assert.equal(p.finalJournal['journal-v2'].length,6);
  assert(p.finalJournal['journal-v2'].every(r=>r.state==='confirmed-success'&&r.accountAddress===p.owner&&r.chainId===p.h0&&r.generation===p.generation));
  assert(!cp.execFileSync('ps',['-Ao','command=']).toString().split('\n').some(s=>s.includes('Google Chrome')&&s.includes('--user-data-dir='+path.join(p.fixture,'profile'))));
  for(const r of p.failedRequests){assert.equal(r.errorText,'net::ERR_ABORTED');assert.equal(r.method,'POST');assert(['/graphql','/account/graphql'].includes(new URL(r.url).pathname)||/\/(GetObject|GetServiceInfo|GetCheckpoint|GetAvailableRange)$/.test(new URL(r.url).pathname));}
  for(const r of p.abortedResponses)assert(p.failedRequests.some(f=>f.requestId===r.requestId&&f.url===r.url&&f.method===r.method&&f.requestBase64===r.requestBase64&&f.errorText===r.failureText&&r.failureText==='net::ERR_ABORTED'));
  const writes=p.frames.filter(r=>r.url.endsWith('/ExecuteTransaction')),verifies=p.frames.filter(r=>r.url.endsWith('/VerifySignature'));assert.equal(writes.length,6);assert.equal(verifies.length,6);
  const nft=n=>oracle.nfts.find(v=>v.value.serial===n).objectId;
  const expected=[['direct',nft('6'),oracle.addresses.existingTarget,[]],['framework-ordinary',nft('1'),oracle.addresses.existingTarget,['take']],['framework-listed',nft('2'),oracle.addresses.existingTarget,['take']],['personal',nft('5'),oracle.addresses.existingTarget,['borrow_val','take','return_val']],['originbyte-existing-target',oracle.obNfts[0].objectId,oracle.addresses.existingTarget,['p2p_transfer']],['originbyte-new-target',oracle.obNfts[1].objectId,oracle.addresses.newTarget,['p2p_transfer_and_create_target_kiosk']]];
  const audited=[];
  for(let i=0;i<6;i++){
   const [label,id,to,calls]=expected[i],preview=p.previews[i],approval=preview.approval.prepared,e=p.executions[i];assert.deepEqual([e.label,e.id,e.to],[label,id,to]);
   const tx=Transaction.from(approval.bytesBase64),data=tx.getData(),bytes=Buffer.from(approval.bytesBase64,'base64');canonical(bcs.TransactionData,bytes);
   assert.equal(await tx.getDigest(),approval.digest);assert.equal(data.sender,p.owner);assert.equal(data.gasData.owner,p.owner);assert.equal(String(data.gasData.budget),approval.gasBudget);
   assert.deepEqual(data.commands.filter(c=>c.$kind==='MoveCall').map(c=>c.MoveCall.function),calls);
   for(const c of data.commands.filter(c=>c.$kind==='MoveCall')){const v=c.MoveCall;assert.equal(v.package,['borrow_val','return_val'].includes(v.function)?profile.packages.personalKiosk:v.function==='take'?profile.packages.kiosk:profile.packages.originByte.executionPackage);}
   const wire=writes[i];assert.equal(wire.status,200);assert.equal(wire.url,'http://127.0.0.1:41750/rtd.rpc.v2.TransactionExecutionService/ExecuteTransaction');
   const req=frame(wire.requestBase64,GrpcTypes.ExecuteTransactionRequest,false),res=frame(wire.responseBase64,GrpcTypes.ExecuteTransactionResponse,true);
   assert.equal(toBase64(req.transaction.bcs.value),approval.bytesBase64);assert.equal(req.signatures.length,1);assert.equal((await verifyTransactionSignature(bytes,toBase64(req.signatures[0].bcs.value))).toRtdAddress(),p.owner);
   assert.equal(toBase64(res.transaction.transaction.bcs.value),approval.bytesBase64);assert.equal(res.transaction.digest,approval.digest);assert(res.transaction.effects.status.success);
   assert.deepEqual(res.transaction.signatures.map(s=>toBase64(s.bcs.value)),req.signatures.map(s=>toBase64(s.bcs.value)));
   const effects=canonical(bcs.TransactionEffects,res.transaction.effects.bcs.value);assert.equal(effects[effects.$kind].transactionDigest,approval.digest);assert.equal(typed('TransactionEffects',res.transaction.effects.bcs.value),res.transaction.effects.digest);
   assert.equal(e.receipt.effectsBase64,toBase64(res.transaction.effects.bcs.value));assert.equal(e.digest,approval.digest);assert.equal(e.receipt.digest,approval.digest);
   const v=verifies[i];assert.equal(v.status,200);const vreq=frame(v.requestBase64,GrpcTypes.VerifySignatureRequest,false),vresp=frame(v.responseBase64,GrpcTypes.VerifySignatureResponse,true);
   assert.equal(vreq.address,p.owner);assert.equal(vreq.message.name,'TransactionData');assert.equal(toBase64(vreq.message.value),approval.bytesBase64);assert.equal(toBase64(vreq.signature.bcs.value),toBase64(req.signatures[0].bcs.value));assert(vresp.isValid&&!vresp.reason);
   const sims=p.simulations.map(s=>({wire:s,req:frame(s.requestBase64,GrpcTypes.SimulateTransactionRequest,false),res:frame(s.responseBase64,GrpcTypes.SimulateTransactionResponse,true)}));
   const exact=sims.filter(s=>s.req.transaction?.bcs?.value&&toBase64(s.req.transaction.bcs.value)===approval.bytesBase64);assert(exact.length>=3,'final preview, UI revalidation and background simulation required');
   for(const s of exact){assert.equal(s.wire.status,200);assert.equal(s.req.checks,GrpcTypes.SimulateTransactionRequest_TransactionChecks.ENABLED);assert(!s.req.doGasSelection&&s.res.transaction.effects.status.success);assert.equal(toBase64(s.res.transaction.transaction.bcs.value),approval.bytesBase64);const fx=canonical(bcs.TransactionEffects,s.res.transaction.effects.bcs.value);assert.equal(fx[fx.$kind].transactionDigest,approval.digest);}
   const name='dispatch-'+String(i+1).padStart(2,'0'),intent=read(path.join(p.fixture,name+'-intent.json')),attempt=read(path.join(p.fixture,name+'-attempt.json')),terminal=read(path.join(p.fixture,name+'-terminal.json'));
   assert.equal(intent.approval.prepared.bytesBase64,approval.bytesBase64);assert.equal(intent.maximumExecuteRequests,1);assert.equal(intent.retryAllowed,false);assert.equal(attempt.requestBase64,wire.requestBase64);assert.deepEqual(terminal,e);
   const row=p.finalJournal['journal-v2'].find(r=>r.digest===e.digest);assert(row&&row.requestId===e.requestId&&row.state==='confirmed-success');assert.deepEqual(row.receipt,e.receipt);
   audited.push({label,objectId:id,recipient:to,digest:e.digest,gasData:data.gasData,expiration:data.expiration,exactFinalSimulations:exact.length,signatureVerified:true,oneActualExecute:true});
  }
  stage='fresh native receipts and transferred NFT ownership';
  globalThis.fetch=async(input,init)=>{const u=new URL(input instanceof Request?input.url:String(input));assert.equal(u.origin,'http://127.0.0.1:41750');assert(/\/(GetObject|GetTransaction|GetServiceInfo)$/.test(u.pathname));const r=await oldFetch(input,init);extra.push({url:u.href,status:r.status,requestBase64:Buffer.from(init?.body??[]).toString('base64'),responseBase64:Buffer.from(await r.clone().arrayBuffer()).toString('base64')});return r;};
  const load=n=>loader.require(path.join(wallet,'src/shared/rpc',n+'.ts'),__filename),{WalletReadSession}=load('session'),{validateNetworkProfile}=load('profile'),{WalletFullnodeReader}=load('fullnode-reader'),{KIOSK_BCS,KIOSK_ITEM_BCS,nativeKioskCap}=load('kiosk-reader');
  session=new WalletReadSession(validateNetworkProfile(profile));const native=new WalletFullnodeReader(session),client=new RtdGrpcClient({network:'localnet',baseUrl:'http://127.0.0.1:41750',format:'binary',fetch:globalThis.fetch,mvr:{url:''}});
  assert.equal((await client.ledgerService.getServiceInfo({})).response.chainId,p.h0);const current=[],receipts=[];
  for(let i=0;i<6;i++){
   const e=p.executions[i],raw=(await client.ledgerService.getTransaction({digest:e.digest,readMask:{paths:['digest','transaction','effects','signatures','checkpoint']}},{timeout:20000})).response.transaction;
   assert(raw&&raw.checkpoint!==undefined&&raw.effects.status.success);assert.equal(toBase64(raw.transaction.bcs.value),p.previews[i].approval.prepared.bytesBase64);assert.equal(toBase64(raw.effects.bcs.value),e.receipt.effectsBase64);assert.equal(raw.digest,e.digest);
   receipts.push({digest:e.digest,checkpoint:String(raw.checkpoint),nativeSuccessVerified:true});
   const object=await native.object(e.id);assert(object&&object.objectBcs);canonical(bcs.Object,object.objectBcs);assert.equal(typed('Object',object.objectBcs),object.digest);assert.equal(object.previousTransaction,e.digest);
   const before=inv.canonicalEightNFTs.find(n=>n.objectId===e.id);assert(BigInt(object.version)>BigInt(before.version));
   let targetKiosk=null;
   if(i<4)assert(object.owner.AddressOwner===e.to||object.owner.ConsensusAddressOwner?.owner===e.to);
   else{assert.equal(object.owner.$kind,'ObjectOwner');const field=await native.object(object.owner.ObjectOwner);assert(field&&field.owner.$kind==='ObjectOwner');targetKiosk=field.owner.ObjectOwner;
    assert.equal(deriveDynamicFieldID(targetKiosk,'0x2::dynamic_object_field::Wrapper<0x2::kiosk::Item>',KIOSK_ITEM_BCS.serialize({id:e.id}).toBytes()),object.owner.ObjectOwner);
    const k=await native.object(targetKiosk);assert(k&&k.owner.$kind==='Shared');const content=canonical(KIOSK_BCS,k.content);assert.equal(content.owner,e.to);assert(content.allow_extensions);
    if(i===4)assert.equal(targetKiosk,oracle.originByte.find(o=>o.owner===e.to).kioskId);else assert(!oracle.originByte.some(o=>o.kioskId===targetKiosk));
   }
   current.push({objectId:object.objectId,version:object.version,digest:object.digest,owner:object.owner,targetKiosk,previousTransaction:object.previousTransaction,objectBcsBase64:toBase64(object.objectBcs)});
  }
  for(const cap of [oracle.frameworkCap,oracle.personalCap]){const o=await native.object(cap.objectId);assert(o&&(o.owner.AddressOwner===p.owner||o.owner.ConsensusAddressOwner?.owner===p.owner));const decoded=nativeKioskCap(o,validateNetworkProfile(profile).packages);assert(decoded);}
  for(const n of oracle.nfts.filter(v=>['3','4'].includes(v.value.serial))){const o=await native.object(n.objectId),before=inv.canonicalEightNFTs.find(v=>v.objectId===n.objectId);assert.equal(o.version,before.version);assert.equal(o.digest,before.digest);}
  assert.equal((await client.ledgerService.getServiceInfo({})).response.chainId,p.h0);
  for(const r of extra){assert.equal(r.status,200);const m=new URL(r.url).pathname.split('/').pop();frame(r.requestBase64,GrpcTypes[m+'Request'],false);frame(r.responseBase64,GrpcTypes[m+'Response'],true);}
  for(const [f,h]of Object.entries({...inputs,...protectedPins}))assert.equal(sha(f),h);
  report={passed:true,observedAt:new Date().toISOString(),source:p.source,h0:p.h0,generation:p.generation,sixFirstDispatches:audited,nativeReceipts:receipts,currentTransferredNFTs:current,maximumExecutionCheckpoint:String(receipts.reduce((a,r)=>BigInt(r.checkpoint)>a?BigInt(r.checkpoint):a,0n)),originalExecutions:6,originalSignatures:6,originalSimulationFrames:p.simulations.length,auditSimulations:0,auditSignatures:0,auditExecutions:0,sourceCapsHeld:true,lockedExclusiveNFTsUnchanged:true,normalRelockChromeAbsent:true,journalsRetained:true,protectedPrivateFilesHeld:1015,postWriteIndexAccepted:false,wholeParentAccepted:false,supplementalFrames:extra,inputsSha256:Object.fromEntries([__filename,path.resolve(proofFile),path.resolve(inventoryAuditFile),gatewayAuditFile,oracleFile,profileFile,buildFile].map(f=>[f,sha(f)])),scope:'Independent original six actual UI first sends, fsync intents/attempts/terminal records, complete canonical BCS/final simulations/GasData/expiration and cryptographic signatures/native Verify/Execute/effects, six durable terminal journals and fresh native transaction checkpoints/recipient ownership plus OB existing/new target kiosks. Zero replay or additional simulation/signature/Execute. Indexed post-write coverage requires a separate later proof.'};
 }catch(e){report={passed:false,observedAt:new Date().toISOString(),stage,errorType:e.name,message:String(e.message).slice(0,1300),supplementalFrames:extra};process.exitCode=1;}
 finally{session?.close();globalThis.fetch=oldFetch;fs.writeFileSync(output,JSON.stringify(report,(_k,v)=>typeof v==='bigint'?v.toString():v,2)+'\n',{flag:'wx',mode:0o600});console.log(JSON.stringify({passed:report.passed,stage:report.stage,message:report.message,executions:report.originalExecutions,checkpoint:report.maximumExecutionCheckpoint}));}
})().catch(e=>{console.error(JSON.stringify({passed:false,errorType:e.name,sourceFrames:String(e.stack).split('\n').slice(1,4).map(s=>s.trim())}));process.exitCode=1;});
