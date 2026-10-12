// Read-only original-digest audit; no browser profile, signing, simulation or dispatch.
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync,writeFileSync,existsSync} from 'node:fs';
import {resolve,join} from 'node:path';
import {Transaction} from 'rtd-typescript/transactions';
import {verifyTransactionSignature} from 'rtd-typescript/verify';
import {validateNetworkProfile} from '../src/shared/rpc/profile';
import {WalletReadSession} from '../src/shared/rpc/session';
import {WalletExecutionReader} from '../src/shared/rpc/execution-reader';
async function main(){
 const [profileFile,proofFile,output]=process.argv.slice(2);assert(!existsSync(output));
 const sha=(b:Uint8Array|string)=>createHash('sha256').update(b).digest('hex');
 const read=(f:string)=>JSON.parse(readFileSync(f,'utf8'));
 const proof=read(proofFile),build=read('migrationToGRpcOrGraphQLDoc/workLog/20261006-sponsored-execute-production-build-01.json');
 assert(proof.passed&&proof.checkCount===proof.checks.length&&proof.executeRequests===4&&proof.executions===4);
 assert(proof.signatures===16&&proof.simulations===24&&proof.faucetRequests===2);
 assert(proof.certificateChanges===0&&proof.originalProfilesOpened===0);
 assert.deepEqual(proof.personalMessages.map((m:any)=>m.event),['network','account','lock','cancel']);
 for(const[f,h]of Object.entries(proof.inputsSha256))assert.equal(sha(readFileSync(f)),h);
 for(const stage of proof.stages){assert(stage.observationsSettledBeforeExit&&stage.workerSource.matchesDisk&&stage.uiSource.matchesDisk);assert.equal(stage.workerSource.workerSha256,build.artifacts['background.js']);for(const row of stage.uiSource.loadedBundles)assert.equal(row.loadedSha256,build.artifacts[row.file]);}
 const capture=read(join(proof.fixture,'archive-info-capture.json'));assert.equal(sha(Buffer.from(capture.base64,'base64')),capture.sha256);assert(capture.nodePrivateCa&&!capture.normalChromeHttpsAccepted);
 const profile=validateNetworkProfile(read(profileFile)),session=new WalletReadSession(profile),original=globalThis.fetch,requests:any[]=[],receipts:any[]=[];
 assert.equal(sha(readFileSync(profileFile)),build.profileSha256);
 globalThis.fetch=async(input,init)=>{const u=new URL(input instanceof Request?input.url:String(input));assert.equal(u.origin,'http://127.0.0.1:39400');assert(['/GetServiceInfo','/GetTransaction'].some(p=>u.pathname.endsWith(p)));const response=await original(input,init);requests.push({path:u.pathname,status:response.status});return response;};
 try{
  const reader=new WalletExecutionReader(session);
  for(const[i,message]of proof.personalMessages.entries()){
   const dir=join(proof.fixture,'lifecycle-'+i),execution=message.execution,attempt=read(join(dir,'attempt.json')),confirmed=read(join(dir,'confirmed.json')),nf=read(join(dir,'controlled-not-found.json')),blocked=read(join(dir,'new-preparation-blocked.json'));
   assert.deepEqual(confirmed,execution);assert(execution.passed&&execution.controlledFault&&execution.automaticRecovery&&execution.signatureVerified&&execution.nativeEffectsMatch&&execution.actualDispatches===1&&execution.actualSimulations===3);
   assert.equal(attempt.accountAddress,message.address);assert.equal(attempt.digest,execution.digest);assert.equal(attempt.requestId,execution.requestId);
   assert(nf.passed&&nf.controlledFault&&!nf.normalChromeHttpsAccepted&&nf.fault.dispatches===1&&nf.fault.abortObserved);assert.equal(nf.archiveIdentitySha256,capture.sha256);assert.deepEqual(new Set(nf.roles),new Set(['fullnode','archive']));assert(nf.fault.notFoundLookups.every((r:any)=>r.digest===attempt.digest));
   const pending=nf.journal['journal-v2'].find((r:any)=>r.requestId===attempt.requestId);assert.equal(pending.state,'dispatch-pending');assert.equal(pending.digest,attempt.digest);assert.equal(nf.journal['pending-scopes-v2'][0].recordId,pending.id);
   assert(blocked.passed&&blocked.approveDisabled&&blocked.noNewSimulation&&blocked.noNewDispatch&&blocked.originalPendingPreserved);
   assert.equal(execution.terminal.state,'confirmed-success');assert.equal(execution.terminal.digest,attempt.digest);
   const receipt=await reader.lookup(attempt.digest),details=await reader.details(attempt.digest);assert(receipt?.success&&details&&receipt.checkpoint!==null);assert.equal(receipt.effectsBase64,execution.terminal.receipt.effectsBase64);
   const tx=details.transaction;assert.equal(sha(tx.bcs),execution.wire.bytesSha256);assert.equal(await Transaction.from(tx.bcs).getDigest(),attempt.digest);assert.equal(tx.transaction.sender,message.address);assert.equal(tx.signatures.length,1);assert.equal(sha(Buffer.from(tx.signatures[0],'base64')),execution.wire.signatureSha256);
   assert.equal((await verifyTransactionSignature(tx.bcs,tx.signatures[0])).toRtdAddress(),message.address);
   receipts.push({event:message.event,digest:attempt.digest,receipt,bytesSha256:sha(tx.bcs),signatureVerified:true,source:details.source});
  }
  const report={passed:true,observedAt:new Date().toISOString(),proofFile:resolve(proofFile),proofSha256:sha(readFileSync(proofFile)),source:build.sourceAfter,actualChromeChecks:proof.checkCount,actualSignatures:16,actualSimulations:24,actualBrowserExecuteRequests:4,originalDigestLookups:4,receipts,requests,controlledNotFoundCases:4,lockedNotFoundWakeupVerified:true,currentLockedPendingRestartAccepted:false,auditExecuteRequests:0,auditSimulations:0,auditSignatures:0,certificateChanges:0,profilesOpened:0,normalChromeHttpsAccepted:false,inputsSha256:{[resolve(process.argv[1])]:sha(readFileSync(process.argv[1]))},scope:'C21 four actual one-shot successes, delivery held then lifecycle invalidation, controlled status5 both original-digest roles, original pending and same-scope new preparation blocked, automatic terminal wakeup, normal success-journal restart. Controlled archive identity is not Chrome TLS acceptance. Locked pending restart and complete TX-07/TX-10 remain separate.'};
  writeFileSync(output,JSON.stringify(report,null,2)+'\n',{flag:'wx',mode:0o600});console.log(JSON.stringify({passed:true,originalDigestLookups:4,auditExecuteRequests:0}));
 }finally{session.close();globalThis.fetch=original;}
}
main().catch(e=>{console.error(JSON.stringify({passed:false,errorType:e.name,message:String(e.message).slice(0,500)}));process.exitCode=1;});
