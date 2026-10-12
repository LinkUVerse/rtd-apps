// Readonly original-digest audit. Never opens a profile, signs, simulates, or dispatches.
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync,writeFileSync} from 'node:fs';
import {resolve,join} from 'node:path';
import {Transaction} from 'rtd-typescript/transactions';
import {verifyTransactionSignature} from 'rtd-typescript/verify';
import {validateNetworkProfile} from '../src/shared/rpc/profile';
import {WalletReadSession} from '../src/shared/rpc/session';
import {WalletExecutionReader} from '../src/shared/rpc/execution-reader';

async function main(){
  const [profileFile,proofFile,output]=process.argv.slice(2);
  const sha=(bytes:Uint8Array|string)=>createHash('sha256').update(bytes).digest('hex');
  const json=(file:string)=>JSON.parse(readFileSync(file,'utf8'));
  const proof=json(proofFile),build=json('migrationToGRpcOrGraphQLDoc/workLog/20261006-sponsored-execute-production-build-01.json');
  assert(proof.passed&&proof.checkCount===proof.checks.length&&proof.checkCount===106);
  assert(proof.actualWalletExecutionAccepted&&proof.actualWalletTransactionSigningAccepted);
  assert(proof.executeRequests===2&&proof.executions===2&&proof.signatures===8&&proof.simulations===12);
  assert(proof.certificateChanges===0&&proof.originalProfilesOpened===0);
  assert(proof.personalMessages.length===2&&new Set(proof.personalMessages.map((r:any)=>r.type)).size===2);
  for(const[file,digest]of Object.entries(proof.inputsSha256))assert.equal(sha(readFileSync(file)),digest);
  assert.equal(sha(readFileSync(profileFile)),build.profileSha256);
  for(const stage of proof.stages){
    assert(stage.observationsSettledBeforeExit&&stage.workerSource.matchesDisk&&stage.uiSource.matchesDisk);
    assert.equal(stage.workerSource.workerSha256,build.artifacts['background.js']);
    for(const row of stage.uiSource.loadedBundles)assert.equal(row.loadedSha256,build.artifacts[row.file]);
  }
  const profile=validateNetworkProfile(json(profileFile)),session=new WalletReadSession(profile),original=globalThis.fetch;
  const requests:unknown[]=[],receipts:unknown[]=[];
  globalThis.fetch=async(input,init)=>{
    const url=new URL(input instanceof Request?input.url:String(input));
    assert.equal(url.origin,'http://127.0.0.1:39400');
    assert(['/GetServiceInfo','/GetTransaction'].some(method=>url.pathname.endsWith(method)));
    const response=await original(input,init);requests.push({path:url.pathname,status:response.status});return response;
  };
  try{
    const reader=new WalletExecutionReader(session);
    for(const[index,message]of proof.personalMessages.entries()){
      const execution=message.execution,dir=join(proof.fixture,'execution-'+index);
      assert(execution.previewDigestMatches&&execution.signatureVerified&&execution.effectsSuccess);
      const attempt=json(join(dir,'attempt.json')),confirmed=json(join(dir,'confirmed.json'));
      assert.equal(attempt.digest,execution.digest);assert.equal(attempt.account,message.address);
      assert.deepEqual(confirmed,execution);
      assert.equal(execution.journal.state,'confirmed-success');
      assert.equal(execution.journal.requestId,attempt.requestId);
      const receipt=await reader.lookup(execution.digest),details=await reader.details(execution.digest);
      assert(receipt?.success&&receipt.checkpoint!==null&&details);
      assert.equal(receipt.digest,execution.digest);
      assert.equal(receipt.effectsBase64,execution.journal.receipt.effectsBase64);
      const bytes=details.transaction.bcs;
      assert.equal(sha(bytes),execution.bytesSha256);
      assert.equal(await Transaction.from(bytes).getDigest(),attempt.digest);
      assert.equal(details.transaction.transaction.sender,message.address);
      assert.equal(details.transaction.signatures.length,1);
      const key=await verifyTransactionSignature(bytes,details.transaction.signatures[0]);
      assert.equal(key.toRtdAddress(),message.address);
      receipts.push({type:message.type,address:message.address,digest:attempt.digest,receipt,
        bytesSha256:sha(bytes),signatureVerified:true,source:details.source});
    }
    assert(proof.simulationWire.every((r:any)=>r.checksEnabled));
    const report={passed:true,observedAt:new Date().toISOString(),expectedGenesisDigest:profile.expectedGenesisDigest,
      generation:profile.generation,profileRevision:profile.revision,source:build.sourceAfter,candidate:build.output,
      actualChromeChecks:106,actualSignatures:8,originalDigestLookups:2,receipts,requests,
      actualBrowserExecuteRequests:2,auditExecuteRequests:0,auditSimulations:0,certificateChanges:0,profilesOpened:0,
      proofSha256:sha(readFileSync(proofFile)),profileSha256:sha(readFileSync(profileFile)),
      inputsSha256:{[resolve(process.argv[1])]:sha(readFileSync(process.argv[1]))},
      scope:'C20 real ordinary/imported wallet approvals and one dispatch each, original terminal journal preserved after normal restart; independent readonly same-digest Fullnode BCS/effects/signature lookup. Not chain failure, abrupt shutdown, sponsor/full authorization, all assets, normal Chrome HTTPS or full trial.'};
    writeFileSync(output,JSON.stringify(report,null,2)+'\n',{flag:'wx',mode:0o600});
    console.log(JSON.stringify({passed:true,actualChromeChecks:106,originalDigestLookups:2,auditExecuteRequests:0}));
  }finally{session.close();globalThis.fetch=original;}
}
main().catch(error=>{console.error(JSON.stringify({passed:false,errorType:error.name,message:String(error.message).slice(0,400)}));process.exitCode=1;});
