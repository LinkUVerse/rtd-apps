// Independent current C42 complete original NFT form under real live lock, full raw wire, canonical preview/native proof.
import assert from 'node:assert/strict';
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { homedir } from 'node:os';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { RtdGrpcClient, GrpcTypes } from 'rtd-typescript/grpc';
import { Transaction } from 'rtd-typescript/transactions';
import { bcs } from 'rtd-typescript/bcs';
import { toBase64, toBase58 } from 'rtd-typescript/utils';
import { blake2b } from '@noble/hashes/blake2.js';
import { decodeFreshObject, FRESH_OBJECT_MASK } from '../src/shared/rpc/fresh-object';
import { validateNetworkProfile, executionScopeKey } from '../src/shared/rpc/profile';

async function main() {
 const [proofFile, output] = process.argv.slice(2);assert(proofFile&&output&&!existsSync(output));
 const wallet=resolve(__dirname,'..'),root=resolve(wallet,'../..'),logs=join(wallet,'migrationToGRpcOrGraphQLDoc/workLog'),rt=join(homedir(),'.local/state/rtd-wallet-migration/dev-20261006-03');
 const read=(f:string)=>JSON.parse(readFileSync(f,'utf8')),sha=(f:string)=>createHash('sha256').update(readFileSync(f)).digest('hex'),hash=(b:Uint8Array)=>createHash('sha256').update(b).digest('hex');
 const buildFile=join(logs,'20261007-default-generation-positive-C42-build-01.json'),profileFile=join(rt,'certified-positive-transport-release-20261006-01/profile.json'),p=read(proofFile),build=read(buildFile),profile=validateNetworkProfile(read(profileFile));
 assert(p.passed&&build.passed&&p.currentC42FullNFTFormCompetitionAccepted&&!p.parentTX04Complete);assert(p.formBeforeOriginalSign.reviewReady&&p.formBeforeOriginalSign.recipient===p.nftApproval.prepared.input.to&&p.formBeforeOriginalSign.route.endsWith(p.nativeBefore.objectId));assert(p.checks.some((c:any)=>c.passed&&c.name==='actual current C42 full NFT form ready before original signing'));assert(p.checks.some((c:any)=>c.passed&&c.name==='actual full NFT Review displays explicit same-scope execution lock refusal'));assert(p.checks.some((c:any)=>c.passed&&c.name==='actual original NFT form and recipient retained with no send approval'));assert(p.allFourCriticalSimulationResponsesCaptured&&p.uncapturedOriginalReadResponsesRetained);assert.equal(p.allOriginalHttpResponseBodiesCaptured,p.captureErrors.length===0);for(const row of p.captureErrors){const u=new URL(row.url);assert.equal(u.hostname,'127.0.0.1');assert(u.pathname.endsWith('/GetObject')||u.pathname==='/graphql');assert(row.status===200||row.status===503||row.status===504);assert(row.requestBase64&&row.responseHeaders);}assert.deepEqual(p.source,build.sourceAfter);
 for(const[f,h]of Object.entries(p.inputsSha256))assert.equal(sha(f),h);
 for(const[f,h]of Object.entries(build.artifacts))assert.equal(sha(join(build.output,f)),h);
 assert.equal(p.workerSource.workerSha256,build.artifacts['background.js']);
 for(const ui of[p.uiSource,p.secondUiSource])for(const b of ui.loadedBundles)assert(b.matchesDisk&&b.loadedSha256===build.artifacts[b.file]);
 assert(p.signHoldSource.receiverVerified&&p.signHoldSource.module==='dapp-signing');
 assert.equal(p.signHoldSource.producerSha256,sha(join(wallet,'src/background/dapp-signing.ts')));
 assert.equal(p.signHoldSource.mapSha256,sha(join(build.output,'background.js.map')));
 assert(p.checks.every((c:any)=>c.passed));assert.equal(p.executeRequests,0);assert.equal(p.signatureCount,0);assert.equal(p.realSignDataCompleted,1);
 assert.deepEqual(p.records,[]);assert.deepEqual(p.blocked,[]);
 assert.deepEqual(p.initialJournal,p.heldJournal);assert.deepEqual(p.initialJournal,p.finalJournal);
 for(const rows of Object.values(p.initialJournal))assert.deepEqual(rows,[]);
 assert(p.releaseAt-p.heldAt>=31000);assert(p.originalResultError.includes('网络准入记录未通过精确合同'));
 const sender=p.nftApproval.prepared.sender;assert.equal(sender,p.nativeBefore.owner.AddressOwner);assert.equal(p.scopeKey,executionScopeKey(profile,sender));
 const state=p.heldNativeState;assert(state.invoked===1&&state.signaturePresent&&!state.released&&state.dispatches===0);
 assert.equal(state.intentBytesSha256,p.originalApprovedTransaction.bytesSha256);
 const approved=p.nftApproval.prepared,bytes=Buffer.from(approved.bytesBase64,'base64'),tx=Transaction.from(bytes),digest=await tx.getDigest();
 assert.equal(digest,approved.digest);assert.equal(approved.route,'direct');assert.equal(approved.input.objectId,p.nativeBefore.objectId);
 assert.equal(tx.getData().sender,sender);assert.equal(tx.getData().gasData.owner,sender);assert.equal(String(tx.getData().gasData.budget),String(approved.gasBudget));
 const expiration=tx.getData().expiration;assert(expiration?.Validity&&expiration.Validity.chain===profile.expectedGenesisDigest);assert(BigInt(expiration.Validity.maxEpoch)===BigInt(expiration.Validity.minEpoch)+1n);assert(expiration.Validity.allowedProposers?.epoch===expiration.Validity.minEpoch);
 assert.equal(p.heldSimulationsBefore,2);assert.equal(p.nftSimulationStart,2);assert(p.simulations.length>2);
 const frames=(encoded:string)=>{const raw=Buffer.from(encoded,'base64'),payload:Buffer[]=[],trailers:string[]=[];let at=0;while(at<raw.length){assert(at+5<=raw.length);const flag=raw[at],length=raw.readUInt32BE(at+1);assert(at+5+length<=raw.length);const body=raw.subarray(at+5,at+5+length);if(flag===0)payload.push(body);else{assert.equal(flag,128);trailers.push(body.toString())}at+=5+length}return{payload,trailers}};
 const typed=(name:string,raw:Uint8Array)=>toBase58(blake2b(Buffer.concat([Buffer.from(name+'::'),Buffer.from(raw)]),{dkLen:32}));
 const transient:any[]=[],allSnapshots=new Map<string,string>();let graphqlFrames=0,rpcFrames=0;
 assert(Array.isArray(p.rawFrames)&&p.rawFrames.length>0);
 for(const row of p.rawFrames){const u=new URL(row.url);assert.equal(u.hostname,'127.0.0.1');assert(['41750','41954','41955','41956'].includes(u.port));assert(!/\/(ExecuteTransaction|VerifySignature)$/.test(u.pathname));if([503,504].includes(row.status)){assert(u.port!=='41750');transient.push({url:row.url,status:row.status});continue}assert.equal(row.status,200);
  if(u.pathname==='/graphql'||u.pathname==='/account/graphql'){assert((u.port==='41954'&&u.pathname==='/graphql')||(u.port==='41956'&&u.pathname==='/account/graphql'));const request=JSON.parse(Buffer.from(row.requestBase64,'base64').toString()),response=JSON.parse(Buffer.from(row.responseBase64,'base64').toString());assert(!('jsonrpc'in request));if(!response.errors&&response.data?.walletSnapshot){assert.equal(response.data.walletGenesis.digest,profile.expectedGenesisDigest);const snap=response.data.walletSnapshot;assert(Number.isSafeInteger(snap.sequenceNumber));allSnapshots.set(String(snap.sequenceNumber),snap.digest)}graphqlFrames++}
  else{assert(u.port==='41750'||(u.port==='41955'&&/^\/archive\/rtd\.rpc\.v2\.LedgerService\/(GetServiceInfo|GetCheckpoint)$/.test(u.pathname)));const method=u.pathname.split('/').pop()!;assert((GrpcTypes as any)[method+'Request']&&(GrpcTypes as any)[method+'Response']);const a=frames(row.requestBase64),r=frames(row.responseBase64);assert(a.payload.length===1&&a.trailers.length===0);if(method==='GetObject'&&row.responseHeaders?.['grpc-status']==='5'&&r.payload.length===0){const request=GrpcTypes.GetObjectRequest.fromBinary(a.payload[0]);assert([p.nativeBefore.owner.AddressOwner,p.nftApproval.prepared.input.to].includes(request.objectId));rpcFrames++;continue}assert(r.payload.length===1&&r.trailers.length===1&&/grpc-status:\s*0(?:\r?\n|$)/i.test(r.trailers[0]));const req=(GrpcTypes as any)[method+'Request'].fromBinary(a.payload[0]),res=(GrpcTypes as any)[method+'Response'].fromBinary(r.payload[0]);if(method==='GetServiceInfo')assert.equal(res.chainId,profile.expectedGenesisDigest);if(method==='GetCheckpoint'){assert(res.checkpoint?.sequenceNumber!==undefined&&res.checkpoint.digest);if(res.checkpoint.summary?.bcs?.value)assert.equal(typed('CheckpointSummary',res.checkpoint.summary.bcs.value),res.checkpoint.digest);if(res.checkpoint.contents?.bcs?.value){assert.equal(typed('CheckpointContents',res.checkpoint.contents.bcs.value),res.checkpoint.contents.digest);if(res.checkpoint.summary?.contentDigest)assert.equal(res.checkpoint.summary.contentDigest,res.checkpoint.contents.digest)}}if(method==='GetObject'&&res.object?.bcs?.value){assert.equal(req.objectId,res.object.objectId);assert.equal(typed('Object',res.object.bcs.value),res.object.digest);const value=bcs.Object.parse(res.object.bcs.value);assert.equal(toBase64(bcs.Object.serialize(value).toBytes()),toBase64(res.object.bcs.value))}rpcFrames++}
 }
 const parsedSimulations:any[]=[];let fee:any,finalNative:any;
 for(const[i,sim]of p.simulations.entries()){
  assert.equal(sim.status,200);assert(sim.checksEnabled);assert(p.rawFrames.some((row:any)=>row.requestBase64===sim.requestBase64&&row.responseBase64===sim.responseBase64));const a=frames(sim.requestBase64),r=frames(sim.responseBase64);
  assert(a.payload.length===1&&a.trailers.length===0&&r.payload.length===1&&r.trailers.length===1&&/grpc-status:\s*0(?:\r?\n|$)/i.test(r.trailers[0]));
  const req=GrpcTypes.SimulateTransactionRequest.fromBinary(a.payload[0]),response=GrpcTypes.SimulateTransactionResponse.fromBinary(r.payload[0]);
  assert.equal(req.checks,GrpcTypes.SimulateTransactionRequest_TransactionChecks.ENABLED);
  if(i===2){
   assert.equal(req.doGasSelection,true);assert(!req.transaction?.bcs?.value);assert.equal(req.transaction?.sender,sender);assert.equal(req.transaction?.gasPayment?.owner,sender);assert.deepEqual(req.transaction?.gasPayment?.objects,[]);
   assert(req.transaction?.kind?.data.oneofKind==='programmableTransaction');
   const pt=req.transaction.kind.data.programmableTransaction;assert.equal(pt.inputs.length,2);assert.equal(pt.commands.length,1);
   assert.deepEqual({objectId:pt.inputs[0].objectId,version:String(pt.inputs[0].version),digest:pt.inputs[0].digest},{objectId:p.nativeBefore.objectId,version:p.nativeBefore.version,digest:p.nativeBefore.digest});
   assert.equal(toBase64(pt.inputs[1].pure!),bcs.Address.serialize(approved.input.to).toBase64());
   assert.deepEqual(pt.commands[0].command,{oneofKind:'transferObjects',transferObjects:{objects:[{kind:2,input:0}],address:{kind:2,input:1}}});
   assert(response.transaction?.effects?.status?.success);assert.deepEqual(response.transaction.transaction?.kind?.data,req.transaction.kind.data);
   fee=response.transaction.transaction;parsedSimulations.push({phase:'kind-fee-selection',checksEnabled:true,success:true,canonicalEffects:false,noFinalBytesInRequest:true});continue;
  }
  assert.equal(req.doGasSelection,false);const expected=i<2?p.originalApprovedTransaction.bytesBase64:approved.bytesBase64;
  assert.equal(toBase64(req.transaction!.bcs!.value),expected);assert.equal(toBase64(response.transaction!.transaction!.bcs!.value),expected);if(i===3)finalNative=response.transaction!.transaction!;
  const expectedDigest=await Transaction.from(Buffer.from(expected,'base64')).getDigest(),effects=bcs.TransactionEffects.parse(response.transaction!.effects!.bcs!.value);
  assert(response.transaction!.effects!.status!.success);assert.equal(response.transaction!.effects!.transactionDigest,expectedDigest);assert.equal(effects[effects.$kind].transactionDigest,expectedDigest);
  parsedSimulations.push({digest:expectedDigest,checksEnabled:true,success:true,canonicalEffects:true});
 }
 assert(fee&&finalNative);assert.deepEqual(fee.kind.data,finalNative.kind.data);assert.deepEqual(fee.gasPayment,finalNative.gasPayment);assert.deepEqual(fee.expiration,finalNative.expiration);
 assert.equal(fee.expiration.chain,expiration.Validity.chain);assert.equal(String(fee.expiration.epoch),expiration.Validity.maxEpoch);assert.equal(String(fee.expiration.minEpoch),expiration.Validity.minEpoch);assert.equal(fee.expiration.nonce,expiration.Validity.nonce);assert.deepEqual(fee.expiration.allowedProposers.proposers,expiration.Validity.allowedProposers.proposers);assert.equal(String(fee.expiration.allowedProposers.epoch),expiration.Validity.allowedProposers.epoch);
 assert.deepEqual(tx.getData().inputs,[{Object:{ImmOrOwnedObject:{objectId:p.nativeBefore.objectId,version:p.nativeBefore.version,digest:p.nativeBefore.digest},$kind:'ImmOrOwnedObject'},$kind:'Object'},{Pure:{bytes:bcs.Address.serialize(approved.input.to).toBase64()},$kind:'Pure'}]);
 assert.deepEqual(tx.getData().commands,[{TransferObjects:{objects:[{Input:0,$kind:'Input'}],address:{Input:1,$kind:'Input'}},$kind:'TransferObjects'}]);
 assert.deepEqual(tx.getData().gasData.payment,fee.gasPayment.objects.map((o:any)=>({objectId:o.objectId,version:String(o.version),digest:o.digest})));assert.equal(tx.getData().gasData.price,String(fee.gasPayment.price));assert.equal(tx.getData().gasData.budget,String(fee.gasPayment.budget));
 const raw=join(rt,'C42-direct-NFT-full-form-independent-native-20261007-03');assert(!existsSync(raw));mkdirSync(raw,{mode:0o700});const calls:any[]=[];
 const fetch:typeof globalThis.fetch=async(input,init)=>{const url=new URL(input instanceof Request?input.url:String(input));assert.equal(url.origin,new URL(profile.endpoints.fullnodeGrpcWeb).origin);assert(['/GetServiceInfo','/GetObject','/GetCheckpoint'].some(s=>url.pathname.endsWith(s)));const response=await globalThis.fetch(input,init),body=new Uint8Array(await response.clone().arrayBuffer()),file=join(raw,'native-'+calls.length+'.bin');writeFileSync(file,body,{flag:'wx',mode:0o600});calls.push({url:url.href,status:response.status,file,sha256:sha(file)});assert.equal(response.status,200);return response};
 const client=new RtdGrpcClient({network:profile.sdkNetwork,baseUrl:profile.endpoints.fullnodeGrpcWeb,format:'binary',fetch,mvr:{url:''}});
 const before=(await client.ledgerService.getServiceInfo({})).response;assert.equal(before.chainId,profile.expectedGenesisDigest);
 const object=(await client.ledgerService.getObject({objectId:p.nativeBefore.objectId,readMask:{paths:[...FRESH_OBJECT_MASK]}})).response.object;assert(object);
 const fresh=decodeFreshObject(object,p.nativeBefore.objectId);
 assert.deepEqual({objectId:fresh.objectId,type:fresh.type,version:fresh.version,digest:fresh.digest,owner:fresh.owner,contentBase64:toBase64(fresh.content),bcsBase64:toBase64(fresh.objectBcs)},p.nativeBefore);
 assert(fresh.owner.$kind==='AddressOwner'&&fresh.owner.AddressOwner===sender);
 const inputs=bcs.TransactionData.parse(bytes).V1.kind.ProgrammableTransaction!.inputs,objectInputs=inputs.filter(x=>x.$kind==='Object').map(x=>x.Object!);
 assert(objectInputs.some(x=>x.$kind==='ImmOrOwnedObject'&&x.ImmOrOwnedObject.objectId===fresh.objectId&&String(x.ImmOrOwnedObject.version)===fresh.version&&x.ImmOrOwnedObject.digest===fresh.digest));
 const points=new Map<string,string>();
 for(const c of [...p.heldNftContexts,...p.preparedNftContexts]){
  assert.equal(c.bindingKey,approved.bindingKey);const s=JSON.parse(c.assetSnapshotKey);assert.equal(s[0],c.readSessionKey);const S=String(s[2]),d=s[3];if(points.has(S))assert.equal(points.get(S),d);points.set(S,d);
 }
 for(const[S,d]of allSnapshots){if(points.has(S))assert.equal(points.get(S),d);points.set(S,d)}
 for(const[S,d]of points){assert(BigInt(S)>=198775n);const cp=(await client.ledgerService.getCheckpoint({checkpointId:{oneofKind:'sequenceNumber',sequenceNumber:BigInt(S)},readMask:{paths:['sequence_number','digest','summary','contents']}})).response.checkpoint;assert(cp&&String(cp.sequenceNumber)===S&&cp.digest===d);assert.equal(typed('CheckpointSummary',cp.summary!.bcs!.value),d);assert.equal(typed('CheckpointContents',cp.contents!.bcs!.value),cp.contents!.digest);assert.equal(cp.summary!.contentDigest,cp.contents!.digest)}
 const gasObjects:any[]=[];for(const ref of tx.getData().gasData.payment!){const object=(await client.ledgerService.getObject({objectId:ref.objectId,readMask:{paths:[...FRESH_OBJECT_MASK]}})).response.object;assert(object);const gas=decodeFreshObject(object,ref.objectId);assert.equal(gas.version,ref.version);assert.equal(gas.digest,ref.digest);assert(gas.owner.$kind==='AddressOwner'&&gas.owner.AddressOwner===sender);gasObjects.push({objectId:gas.objectId,version:gas.version,digest:gas.digest,owner:gas.owner,objectBcsBase64:toBase64(gas.objectBcs)})}
 assert(!execFileSync('ps',['-Ao','command=']).toString().split('\n').some(s=>s.includes('Google Chrome')&&s.includes('--user-data-dir='+p.profile)));
 const after=(await client.ledgerService.getServiceInfo({})).response;assert.equal(after.chainId,before.chainId);assert(after.checkpointHeight!>=before.checkpointHeight!);
 const foundation=join(homedir(),'.local/state/rtd-wallet-migration/dev-20261003-01/publication-foundation'),installedFile=join(foundation,'message-budget-debug-install-20261006-01/installed-provenance.json'),pinFile=join(foundation,'supported-publisher-capacity-20261006-03/plan.json'),installed=read(installedFile);
 assert.equal(execFileSync('git',['-C',join(root,'rtd'),'rev-parse','HEAD']).toString().trim(),installed.sourceHead);assert.equal(hash(execFileSync('git',['-C',join(root,'rtd'),'diff','--binary','HEAD'])),installed.sourceDiffSha256);for(const[n,h]of Object.entries(read(pinFile).eightDebug))assert.equal(sha(join(root,'rtd/target/debug',n)),h);
 const source=JSON.parse(execFileSync('python3',['-c','import importlib.util,json;from pathlib import Path;p=Path("scripts/build-reviewed-local-extension.py");s=importlib.util.spec_from_file_location("build",p);m=importlib.util.module_from_spec(s);s.loader.exec_module(m);h,n=m.source_hash(Path.cwd());print(json.dumps({"sha256":h,"files":n}))'],{cwd:wallet}).toString());assert.deepEqual(source,build.sourceAfter);
 const inputsSha256=Object.fromEntries([__filename,proofFile,buildFile,profileFile,installedFile,pinFile,join(wallet,'scripts/lib/current-worker-production-sign-hold-verified.cjs'),join(wallet,'scripts/lib/lifecycle-journal-snapshot.cjs')].map(f=>[resolve(f),sha(f)]));
 const report={passed:true,currentC42FullNFTFormCompetitionAccepted:true,originalFramesVerified:p.rawFrames.length,graphqlFrames,rpcFrames,retained503Or504:transient,retainedOriginalReadCaptureErrors:p.captureErrors,allOriginalHttpResponseBodiesCaptured:p.allOriginalHttpResponseBodiesCaptured,allFourCriticalSimulationResponsesCaptured:true,gasObjects,ownedChromeAbsent:true,observedAt:new Date().toISOString(),source,actualUiChecks:p.checks.length,h0:before.chainId,owner:sender,originalDigest:p.originalApprovedTransaction.digest,legacyHarnessSeedDigest:p.originalDigest,internalPreviewDigest:digest,originalSignDataCompletedPrivately:1,signaturesReturned:0,executeRequests:0,sameNativeScopeActuallyOccupied:true,directNftExplicitExecutionLockRefusal:true,actualNormalPostReleasePreview:true,formalSimulations:parsedSimulations,fullThreeStoreJournalUnchanged:true,freshOriginalNftCanonicalObjectVerified:true,snapshots:Array.from(points,([checkpoint,digest])=>({checkpoint,digest})),calls,currentEightDebugVerified:true,parentTX04Complete:false,inputsSha256,scope:'Independent current C42 complete original form selected before real lock, exact production source/maps/UI/worker and all captured original HTTP with absent original read bodies retained as unverified, original private signing hold native ifAvailable actual refusal, direct NFT no new work while held, post-release ordinary actual direct NFT form/Back with canonical preview/ref/sender/gas/Validity and all successful ENABLED raw frame pairs; one exact transaction-kind gas selection and three canonical final-byte effects; NFT chain-bound Validity unchanged from selection to reviewed bytes. Fresh unchanged native canonical NFT plus admitted checkpoint digests verified; zero returned signatures and zero Execute. Full other NFT branches/durable pending/HTTPS and parent remain open.'};
 writeFileSync(output,JSON.stringify(report,null,2)+'\n',{flag:'wx',mode:0o600});console.log(JSON.stringify({passed:true,actualUiChecks:p.checks.length,formalSimulations:p.simulations.length,executeRequests:0}));
}
main().catch(e=>{const output=process.argv[3];if(output&&!existsSync(output))writeFileSync(output,JSON.stringify({passed:false,observedAt:new Date().toISOString(),errorType:e.name,message:String(e.message).slice(0,700)})+'\n',{flag:'wx',mode:0o600});console.error(JSON.stringify({passed:false,errorType:e.name,message:String(e.message).slice(0,700),stack:String(e.stack).slice(0,1800)}));process.exitCode=1});

