// Read-only audit of the original one-time UI withdrawal, not a second execution.
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,existsSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {join,resolve} from 'node:path';
import {GrpcTypes} from 'rtd-typescript/grpc';
import {Transaction} from 'rtd-typescript/transactions';
import {verifyTransactionSignature} from 'rtd-typescript/verify';
import {toBase64,normalizeStructTag,RTD_TYPE_ARG} from 'rtd-typescript/utils';
import {receiptStakeEvents} from 'rtd-apps-core/src/rpc/transaction-view';
import {validateNetworkProfile} from '../src/shared/rpc/profile';
import {WalletReadSession} from '../src/shared/rpc/session';
import {WalletExecutionReader} from '../src/shared/rpc/execution-reader';
import {WalletFullnodeReader} from '../src/shared/rpc/fullnode-reader';
async function main(){
 const[profileFile,proofFile,output]=process.argv.slice(2);assert(!existsSync(output));
 const read=(f:string)=>JSON.parse(readFileSync(f,'utf8')),sha=(f:string)=>createHash('sha256').update(readFileSync(f)).digest('hex');
 const p=read(proofFile),buildFile='migrationToGRpcOrGraphQLDoc/workLog/20261006-personal-production-build-03.json',build=read(buildFile);
 assert.equal(p.executeRequests,1);assert.equal(p.signatures,1);assert(p.originalExecuteResponseCaptured);assert.equal(p.errors.length,0);assert.equal(p.forbidden.length,0);
 assert.equal(sha(profileFile),build.profileSha256);assert.equal(p.workerSource.workerSha256,build.artifacts['background.js']);for(const row of p.uiSource.loadedBundles)assert.equal(row.loadedSha256,build.artifacts[row.file]);
 const attemptFile=join(p.fixture,'attempt.json'),wireFile=join(p.fixture,'execute-wire.json'),responseFile=join(p.fixture,'execute-response.json'),attempt=read(attemptFile),wire=read(wireFile),response=read(responseFile);
 assert.equal(attempt.accountAddress,p.owner);assert.equal(attempt.stakeId,p.stakeId);assert.equal(attempt.approvalClicks,1);assert.deepEqual(attempt.source,build.sourceAfter);
 const decode=(b64:string,type:any,responseFrame:boolean)=>{const b=Buffer.from(b64,'base64');assert.equal(b[0],0);const n=b.readUInt32BE(1);assert(n>0&&5+n<=b.length);if(responseFrame){const trailer=b.subarray(5+n);assert.equal(trailer[0],128);assert.equal(trailer.length,5+trailer.readUInt32BE(1));assert.equal(trailer.subarray(5).toString(),'grpc-status:0\r\n')}else assert.equal(b.length,5+n);return type.fromBinary(b.subarray(5,5+n))};
 const request=decode(wire.requestBase64,GrpcTypes.ExecuteTransactionRequest,false),result=decode(response.responseBase64,GrpcTypes.ExecuteTransactionResponse,true);
 assert.deepEqual(GrpcTypes.ExecuteTransactionRequest.toJson(request),wire.request);assert.deepEqual(GrpcTypes.ExecuteTransactionResponse.toJson(result),response.response);assert.equal(response.status,200);assert.equal(result.transaction.digest,attempt.digest);assert.equal(toBase64(request.transaction.bcs.value),attempt.bytesBase64);
 const profile=validateNetworkProfile(read(profileFile)),session=new WalletReadSession(profile),execution=new WalletExecutionReader(session),fullnode=new WalletFullnodeReader(session),original=globalThis.fetch,paths:string[]=[];
 globalThis.fetch=(input,init)=>{const u=new URL(input instanceof Request?input.url:String(input));assert.equal(u.origin,'http://127.0.0.1:39400');assert(['/GetServiceInfo','/GetTransaction','/GetObject','/GetBalance'].some(s=>u.pathname.endsWith(s)));paths.push(u.href);return original(input,init)};
 try{
  const receipt=await execution.lookup(attempt.digest),details=await execution.details(attempt.digest);assert(receipt?.success&&receipt.checkpoint!==null&&details);
  assert.equal(receipt.effectsBase64,response.response.transaction.effects.bcs.value);assert.equal(toBase64(details.transaction.bcs),attempt.bytesBase64);assert.equal(await Transaction.from(details.transaction.bcs).getDigest(),attempt.digest);
  assert.equal(details.transaction.signatures.length,1);assert.equal(request.signatures.length,1);assert.equal(toBase64(request.signatures[0].bcs.value),details.transaction.signatures[0]);assert.equal((await verifyTransactionSignature(details.transaction.bcs,details.transaction.signatures[0])).toRtdAddress(),p.owner);
  const data=Transaction.from(details.transaction.bcs).getData();assert.equal(data.sender,p.owner);assert.equal(data.gasData.owner,p.owner);assert.equal(data.commands.length,1);const command=data.commands[0].MoveCall!;assert.equal(command.package,'0x0000000000000000000000000000000000000000000000000000000000000003');assert.equal(command.module,'rtd_system');assert.equal(command.function,'request_withdraw_stake');assert.deepEqual(command.typeArguments,[]);
  const events=receiptStakeEvents(details.transaction,p.owner);assert.equal(events.length,1);const event=events[0];assert.equal(event.kind,'unstake');if(event.kind!=='unstake')throw Error('Expected withdrawal');assert.equal(event.principalAmount,attempt.principal);assert.equal(event.stakeActivationEpoch,'3');assert(BigInt(event.unstakingEpoch)>=3n);
  assert.equal(await fullnode.object(p.stakeId),null);const change=details.transaction.effects.changedObjects.find(c=>c.objectId===p.stakeId);assert(change);assert.equal(change.outputState,'DoesNotExist');
  const gas=details.transaction.effects.gasUsed,cost=BigInt(gas.computationCost)+BigInt(gas.storageCost)-BigInt(gas.storageRebate),gross=BigInt(event.principalAmount)+BigInt(event.rewardAmount);
  const net=details.transaction.balanceChanges.filter(c=>c.address===p.owner&&normalizeStructTag(c.coinType)===normalizeStructTag(RTD_TYPE_ARG)).reduce((sum,c)=>sum+BigInt(c.amount),0n);assert.equal(net,gross-cost);
  const after=await fullnode.balance(p.owner,RTD_TYPE_ARG);assert.equal(BigInt(after.balance)-BigInt(attempt.balanceBefore.balance),net);
  const report={passed:true,observedAt:new Date().toISOString(),source:build.sourceAfter,owner:p.owner,stakeId:p.stakeId,digest:attempt.digest,receipt,event,principalReturned:event.principalAmount,actualReward:event.rewardAmount,grossReturned:gross.toString(),netBalanceChange:net.toString(),netGasCost:cost.toString(),balanceBefore:attempt.balanceBefore,balanceAfter:after,stakeDeleted:true,signatureVerified:true,originalApprovedBcsUnchanged:true,nativeEffectsMatch:true,originalExecuteGrpcStatusVerified:true,initialWholeRunPassed:p.passed,initialReceiptNavigationVerified:!!p.execution?.actualReceiptRoute,strictJournalVerified:!!p.execution?.terminal,actualBrowserExecuteRequests:1,auditExecuteRequests:0,auditSimulations:0,auditSignatures:0,paths,inputsSha256:Object.fromEntries([profileFile,proofFile,buildFile,resolve(process.argv[1]),attemptFile,wireFile,responseFile].map(f=>[resolve(f),sha(f)])),scope:'Original C23 one-time active withdrawal: exact approved BCS/digest/native signature/effects, full original wire grpc-status0, exact BCS event and gas-adjusted real balance, deleted stake. Read-only audit; no index catch-up or complete governance matrix claim.'};
  writeFileSync(output,JSON.stringify(report,null,2)+'\n',{flag:'wx',mode:0o600});console.log(JSON.stringify({passed:true,digest:attempt.digest,checkpoint:receipt.checkpoint,principal:event.principalAmount,reward:event.rewardAmount,net:net.toString()}));
 }finally{globalThis.fetch=original;session.close()}
}
main().catch(e=>{console.error(JSON.stringify({passed:false,errorType:e.name,message:String(e.message).slice(0,700)}));process.exitCode=1});
