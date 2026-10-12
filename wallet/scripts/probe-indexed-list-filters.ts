import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync,writeFileSync} from 'node:fs';
import {WalletIndexedLists} from '../src/shared/rpc/indexed-lists';
import {WalletReadSession} from '../src/shared/rpc/session';
import {validateNetworkProfile} from '../src/shared/rpc/profile';
async function main(){
  const [profileFile,output]=process.argv.slice(2);
  const profile=validateNetworkProfile(JSON.parse(readFileSync(profileFile,'utf8')));
  const cases:any[]=[];
  const type='0x3::validator::StakingRequestEvent';
  for(const order of ['ascending','descending'] as const){
    for(const mode of ['typed-events','empty-transactions','empty-events'] as const){
      const session=new WalletReadSession(profile),wire:any[]=[];
      const reader=new WalletIndexedLists(session,async(input,init)=>{
        assert.equal(String(input),profile.endpoints.graphqlUrl);
        const request=JSON.parse(String(init?.body));request.query=request.query.replace(/(first|last): 50/g,'$1: 1');
        await new Promise(resolve=>setTimeout(resolve,150));init?.signal?.throwIfAborted();
        const response=await fetch(input,{...init,body:JSON.stringify(request)});
        const body=await response.clone().json();wire.push({request,status:response.status,body});return response;
      });
      try{
        const options={lower:0,upper:586007,order};
        const result=mode==='empty-transactions'?await reader.sentTransactions('0xdead',options):
          await reader.events(mode==='typed-events'?{type}:{module:'0xdead'},options);
        assert(wire.every(w=>w.status===200&&!w.body.errors?.length));
        assert.equal(wire.at(-1).request.query.includes('WalletSnapshotRevalidate'),true);
        assert.equal(result.snapshot.checkpoint,'586007');
        if(mode==='typed-events'){
          assert(result.value.length>1);
          assert(result.value.every((event:any)=>event.type.endsWith('::validator::StakingRequestEvent')));
        }else assert.equal(result.value.length,0);
        cases.push({mode,order,result,wire});
      }finally{session.close();}
    }
  }
  const first=cases.find(x=>x.mode==='typed-events'&&x.order==='ascending');
  const last=cases.find(x=>x.mode==='typed-events'&&x.order==='descending');
  const keys=(r:any)=>r.value.map((x:any)=>`${x.transactionDigest}:${x.sequenceNumber}`);
  assert.deepEqual(keys(last.result),keys(first.result).reverse());
  writeFileSync(output,JSON.stringify({observedAt:new Date().toISOString(),passed:true,cases,
    scriptSha256:createHash('sha256').update(readFileSync('scripts/probe-indexed-list-filters.ts')).digest('hex'),
    simulations:0,executions:0,scope:'Actual type-filtered nonempty events and actual empty terminal transaction/module filters in both directions at fixed S. Node public CA, no Chrome HTTPS claim.'},null,2)+'\n',{flag:'wx'});
  console.log(JSON.stringify({passed:true,cases:cases.length,typedEvents:first.result.value.length}));
}
main().catch(error=>{console.error(error);process.exitCode=1;});
