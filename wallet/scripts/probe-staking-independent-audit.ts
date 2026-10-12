import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync,writeFileSync} from 'node:fs';
import {toBase64} from 'rtd-typescript/utils';
import {validateNetworkProfile} from '../src/shared/rpc/profile';
import {WalletReadSession} from '../src/shared/rpc/session';
import {WalletStakingSnapshotReader} from '../src/shared/rpc/staking-snapshot-reader';
import {WalletArchiveObjectReader} from '../src/shared/rpc/archive-object-reader';
import {STAKED_RTD_BCS,stakingBcs} from '../src/shared/rpc/staking-bcs';
async function main(){
  const [profileFile,priorFile,output]=process.argv.slice(2);
  const prior=JSON.parse(readFileSync(priorFile,'utf8')), profile=validateNetworkProfile(JSON.parse(readFileSync(profileFile,'utf8')));
  assert.equal(prior.endpoint,profile.endpoints.graphqlUrl);assert.equal(prior.proof.checkpoint,'586007');
  assert.equal(prior.proof.digest,'JBocmLJQDLEnQSfLjawiuy6tzHFGfJSVNzfWH3jXbnuB');
  // This independent dev witness is intentionally restricted to the observed single pool.
  assert.equal(prior.histories.length,1);assert.equal(prior.value.validators.length,1);
  assert(prior.value.positions.every((p:any)=>p.poolId===prior.value.validators[0].poolId));
  const session=new WalletReadSession(profile), requests:{role:string;path:string}[]=[];
  const fetchFn:typeof fetch=(input,init)=>{
    const url=String(input);let role:string;
    if(url===profile.endpoints.graphqlUrl)role='graphql';
    else {assert(url.startsWith(profile.endpoints.archiveGrpcWeb!+'/'));assert(['/GetServiceInfo','/BatchGetObjects'].some(x=>url.endsWith(x)));role='archive';}
    requests.push({role,path:new URL(url).pathname});return fetch(input,init);
  };
  try{
    const reader=await WalletStakingSnapshotReader.open(session,{fetch:fetchFn,window:{lower:586007,upper:586007}});
    assert.equal(reader.proof.digest,prior.proof.digest);
    const objects=(await reader.objects(prior.value.positions.map((p:any)=>p.objectId))).value;
    const archive=new WalletArchiveObjectReader(session,{fetch:fetchFn});const rows:any[]=[];
    for(let i=0;i<objects.length;i++){
      const object=objects[i];assert(!(object instanceof Error));
      const position=prior.value.positions[i];assert.equal(object.objectId,position.objectId);assert.equal(object.version,position.version);assert.equal(object.digest,position.digest);
      assert.equal(object.owner.$kind,'AddressOwner');assert.equal((object.owner as any).AddressOwner,prior.owner);
      const raw=stakingBcs(STAKED_RTD_BCS,object.content);
      assert.equal(raw.id,position.objectId);assert.equal(raw.principal.value,position.principal);assert.equal(raw.pool_id,position.poolId);assert.equal(raw.stake_activation_epoch,position.activationEpoch);
      const historical=(await archive.object({objectId:object.objectId,version:object.version})).value;
      assert(!(historical instanceof Error));assert.equal(historical.digest,object.digest);assert.equal(toBase64(historical.content),toBase64(object.content));
      const table=prior.histories.find((h:any)=>h.rows.some((r:any)=>r.epoch===position.activationEpoch));assert(table);
      const rates=table.rows.map((r:any)=>({epoch:BigInt(r.epoch),rtd:BigInt(r.rtd_amount),tokens:BigInt(r.pool_token_amount)})).sort((a:any,b:any)=>a.epoch>b.epoch?-1:1);
      const start=rates.find((r:any)=>r.epoch<=BigInt(position.activationEpoch)),end=rates[0];assert(start);assert(end.tokens>0n);
      const s=start.rtd===0n?{n:1n,d:1n}:{n:start.tokens,d:start.rtd};const e=end.rtd===0n?{n:1n,d:1n}:{n:end.tokens,d:end.rtd};
      const n=s.n*e.d-e.n*s.d,d=s.d*e.n,p=BigInt(position.principal);const expected=n<=0n?0n:(2n*n*p+d)/(2n*d);
      assert.equal(position.status,'active');assert.equal(position.reward.state,'estimated');assert.equal(position.reward.amount,String(expected));
      rows.push({objectId:object.objectId,version:object.version,digest:object.digest,principal:raw.principal.value,poolId:raw.pool_id,activationEpoch:raw.stake_activation_epoch,
        exactArchivedBytesMatched:true,contentSha256:createHash('sha256').update(object.content).digest('hex'),reward:String(expected),currentRateEpoch:String(end.epoch),activationRateEpoch:String(start.epoch)});
    }
    await reader.snapshot.revalidate();
    writeFileSync(output,JSON.stringify({passed:true,observedAt:new Date().toISOString(),h0:profile.expectedGenesisDigest,sourceProofSha256:createHash('sha256').update(readFileSync(priorFile)).digest('hex'),
      scriptSha256:createHash('sha256').update(readFileSync('scripts/probe-staking-independent-audit.ts')).digest('hex'),snapshot:reader.proof,rows,requests,
      simulations:0,signatures:0,executions:0,scope:'Actual fixed-S stake identity/BCS/owner and independent archive exact historical bytes; independent integer reward calculation. Estimated zero at activation epoch is not reward payout or positive-yield acceptance.'},null,2)+'\n',{flag:'wx'});
    console.log(JSON.stringify({passed:true,rows:rows.length,rewards:rows.map(r=>r.reward),requests:requests.length}));
  }finally{session.close();}
}
main().catch(error=>{console.error(error);process.exitCode=1;});
