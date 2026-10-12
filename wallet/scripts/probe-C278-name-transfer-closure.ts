// Current read-only production readers after the one ordinary Chrome name transfer.
import assert from 'node:assert/strict';
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { validateNetworkProfile } from '../src/shared/rpc/profile';
import { WalletReadSession } from '../src/shared/rpc/session';
import { WalletFullnodeReader } from '../src/shared/rpc/fullnode-reader';
import { WalletLedgerReader } from '../src/shared/rpc/ledger-reader';
import { WalletAccountHistoryReader } from '../src/shared/rpc/account-history-reader';

async function main() {
 const [profileFile,auditFile,output]=process.argv.slice(2); assert(!existsSync(output));
 const profile=validateNetworkProfile(JSON.parse(readFileSync(profileFile,'utf8'))),audit=JSON.parse(readFileSync(auditFile,'utf8'));
 assert(audit.passed && profile.expectedGenesisDigest===audit.intent.expectedH0);
 const original=globalThis.fetch,frames:any[]=[],session=new WalletReadSession(profile),steps:any={};
 const origins=new Set(Object.values(profile.endpoints).map(v=>new URL(v!).origin));
 globalThis.fetch=async(input,init)=>{
  const url=new URL(input instanceof Request?input.url:String(input));assert(origins.has(url.origin));assert.equal(url.hostname,'127.0.0.1');assert(!/Execute|Simulate|VerifySignature/.test(url.pathname));
  const response=await original(input,init);frames.push({url:url.href,status:response.status,requestBase64:Buffer.from(init?.body as any??'').toString('base64'),responseBase64:Buffer.from(await response.clone().arrayBuffer()).toString('base64')});return response;
 };
 let result:any;
 try {
  const details=await new WalletLedgerReader(session).details(audit.intent.digest); assert(details?.transaction.status.success);
  assert.equal(Buffer.from(details.transaction.bcs!).toString('base64'),audit.bytesBase64);steps.details=details;
  const balances=await new WalletFullnodeReader(session).balances(audit.intent.sender);
  const expected=BigInt(audit.intent.senderBalanceBefore)+BigInt(audit.execution.balanceDeltaAtomic);
  assert.equal(balances.find(b=>b.coinType.endsWith('::rtd::RTD'))?.balance,expected.toString());steps.balances=balances;
  const history=await new WalletAccountHistoryReader(session,{minimumCheckpoint:String(details.transaction.checkpoint)}).read(audit.intent.sender);
  const row=history.transactions.find(t=>t.digest===audit.intent.digest);assert(row && row.status==='SUCCESS');
  assert.equal(Buffer.from(row.transaction!.bcs!).toString('base64'),audit.bytesBase64);steps.history=history;
  result={passed:true,expectedSenderBalance:expected.toString()};
 } catch(e:any) {result={passed:false,error:{name:e.name,message:e.message,reason:e.reason}};}
 finally{session.close();globalThis.fetch=original;}
 const proof={...result,observedAt:new Date().toISOString(),steps,frames,executions:0,simulations:0,signatures:0,scope:'Original name-transfer digest/bytes, current exact sender balance and supported account history window. All-account certification not implied.',inputsSha256:Object.fromEntries([process.argv[1],profileFile,auditFile].map(f=>[f,createHash('sha256').update(readFileSync(f)).digest('hex')]))};
 writeFileSync(output,JSON.stringify(proof,(_k,v)=>typeof v==='bigint'?String(v):v instanceof Uint8Array?Buffer.from(v).toString('base64'):v,2)+'\n',{flag:'wx',mode:0o600});
 console.log(JSON.stringify({...result,completed:Object.keys(steps),history:steps.history?.checkpointHi}));if(!result.passed)process.exitCode=1;
}
main().catch(e=>{console.error(e);process.exitCode=1});
