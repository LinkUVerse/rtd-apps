// Read-only follow-up to an existing one-shot staking attempt. Never imports signing keys.
import assert from 'node:assert/strict';
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { bcs } from 'rtd-typescript/bcs';
import { fromBase64, normalizeStructTag } from 'rtd-typescript/utils';
import { validateNetworkProfile } from '../src/shared/rpc/profile';
import { WalletReadSession } from '../src/shared/rpc/session';
import { WalletFullnodeReader } from '../src/shared/rpc/fullnode-reader';
import { WalletExecutionReader } from '../src/shared/rpc/execution-reader';
import { STAKED_RTD_BCS, stakingBcs } from '../src/shared/rpc/staking-bcs';
async function main() {
 const [profileFile,directory,output]=process.argv.slice(2);
 const json=(file:string)=>JSON.parse(readFileSync(file,'utf8'));
 const profile=validateNetworkProfile(json(profileFile)), pending=json(join(directory,'pending.json')),receipt=json(join(directory,'receipt.json'));
 assert.equal(receipt.success,true);assert.equal(receipt.digest,pending.digest);
 const session=new WalletReadSession(profile),paths:string[]=[];
 const request:typeof fetch=(input,init)=>{
  const url=new URL(input instanceof Request?input.url:String(input));
  assert.equal(url.hostname,'127.0.0.1');
  assert(['/GetServiceInfo','/GetObject','/GetTransaction'].some(method=>url.pathname.endsWith(method)));
  paths.push(url.href);return fetch(input,init);
 };
 try {
  const fullnode=new WalletFullnodeReader(session,{fetch:request}), execution=new WalletExecutionReader(session,{fetch:request});
  const effects=bcs.TransactionEffects.parse(fromBase64(receipt.effectsBase64)); assert(effects.V2);
  const positions=[];
  for(const [id] of effects.V2.changedObjects){
   const object=await fullnode.object(id);
   if(object?.type===normalizeStructTag('0x3::staking_pool::StakedRtd')){
    const value=stakingBcs(STAKED_RTD_BCS,object.content);
    assert(object.owner.$kind==='AddressOwner'&&object.owner.AddressOwner===pending.sender);
    assert.equal(value.principal.value,'1000000000');
    positions.push({objectId:object.objectId,version:object.version,...value});
   }
  }
  let recovered=null,error=null;
  try{recovered=await execution.lookup(pending.digest);}catch(e){error=e instanceof Error?e.message:String(e);}
  const result={observedAt:new Date().toISOString(),h0:profile.expectedGenesisDigest,sender:pending.sender,digest:pending.digest,
   receipt,positions,recovered,recoveryError:error,paths,dispatches:0,
   scope:'Read-only current StakedRtd object and original digest lookup after saved successful execution; no GraphQL or Chrome acceptance.'};
  writeFileSync(output,JSON.stringify(result,null,2)+'\n',{flag:'wx'});
  assert.equal(positions.length,1);
  console.log(JSON.stringify({digest:pending.digest,positions,recovered:!!recovered,recoveryError:error,dispatches:0}));
 }finally{session.close();}
}
main().catch(e=>{console.error(e instanceof Error?e.message:e);process.exitCode=1;});
