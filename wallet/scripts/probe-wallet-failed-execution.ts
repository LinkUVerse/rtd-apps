// Read-only follow-up to a retained wallet failure attempt; never signs or executes.
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync} from 'node:fs';
import {bcs} from 'rtd-typescript/bcs';
import {Transaction} from 'rtd-typescript/transactions';
import {validateNetworkProfile} from '../src/shared/rpc/profile';
import {WalletReadSession} from '../src/shared/rpc/session';
import {WalletExecutionReader} from '../src/shared/rpc/execution-reader';
import {recoveredDappResult} from '../src/shared/rpc/dapp-recovered-result';
import {WalletFullnodeReader} from '../src/shared/rpc/fullnode-reader';
async function main(){
 const [profileFile,attemptFile,fixtureFile,output]=process.argv.slice(2);
 const json=(file:string)=>JSON.parse(readFileSync(file,'utf8'));
 const profile=validateNetworkProfile(json(profileFile)),attempt=json(attemptFile),fixture=json(fixtureFile);
 assert.equal(attempt.h0,profile.expectedGenesisDigest);assert.equal(fixture.h0,attempt.h0);
 assert.equal(await Transaction.from(attempt.bytesBase64).getDigest(),attempt.digest);
 const session=new WalletReadSession(profile),original=globalThis.fetch,paths:string[]=[];
 globalThis.fetch=(input,init)=>{
  const url=new URL(input instanceof Request?input.url:String(input));
  assert.equal(url.hostname,'127.0.0.1');assert(['/GetServiceInfo','/GetTransaction','/GetObject'].some(method=>url.pathname.endsWith(method)));
  paths.push(url.pathname);return original(input,init);
 };
 try{
  const reader=new WalletExecutionReader(session);
  const failure=await reader.lookup(attempt.digest);assert(failure);assert.equal(failure.success,false);
  const effects=bcs.TransactionEffects.parse(Buffer.from(failure.effectsBase64,'base64'));
  assert.equal(effects.V2?.transactionDigest,attempt.digest);assert.equal(effects.V2.status.$kind,'Failure');
  const error=effects.V2.status.Failure.error;assert.equal(error.$kind,'MoveAbort');
  assert.equal(error.MoveAbort[0].module.address,fixture.packageId);assert.equal(error.MoveAbort[0].module.name,'execution_gate');assert.equal(error.MoveAbort[1],'1');
  const details=await reader.details(attempt.digest);assert(details);
  const standard=await recoveredDappResult(details,failure,session.bindingKey,attempt.accountAddress,attempt.bytesBase64);
  assert.deepEqual(standard,{digest:attempt.digest,bytes:attempt.bytesBase64,signature:attempt.dappResult.FailedTransaction.signatures[0],effects:failure.effectsBase64});
  const admin=await reader.lookup(attempt.adminCloseDigest);assert(admin?.success);
  const gate=await new WalletFullnodeReader(session).object(fixture.gateId);assert(gate);assert.equal(gate.owner.$kind,'Shared');
  const state=bcs.struct('Gate',{id:bcs.Address,closed:bcs.bool(),visits:bcs.u64()}).parse(gate.content);
  assert.deepEqual(state,{id:fixture.gateId,closed:true,visits:'0'});
  writeFileSync(output,JSON.stringify({observedAt:new Date().toISOString(),h0:attempt.h0,digest:attempt.digest,failure,error,standard,admin,state,paths,dispatches:0,simulations:0,passed:true},null,2)+'\n',{flag:'wx'});
  console.log(JSON.stringify({passed:true,digest:attempt.digest,checkpoint:failure.checkpoint,state,dispatches:0,simulations:0}));
 }finally{session.close();globalThis.fetch=original;}
}
main().catch(error=>{console.error(error);process.exitCode=1;});
