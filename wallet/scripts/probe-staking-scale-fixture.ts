import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync,writeFileSync} from 'node:fs';
import {bcs} from 'rtd-typescript/bcs';
import {deriveDynamicFieldID,normalizeRtdAddress,toBase64} from 'rtd-typescript/utils';
import {stakingFixture} from '../tests/unit/rpc/staking-fixture';
import {STAKING_RATE_BCS} from '../src/shared/rpc/staking-bcs';
import {WalletStakingSnapshotReader} from '../src/shared/rpc/staking-snapshot-reader';
async function main(){
  const [output]=process.argv.slice(2);const cases:any[]=[];
  for(const mode of ['exact-10000','aggregate-10001','duplicate-last','single-table-10001'] as const){
    const f=stakingFixture(), parent=normalizeRtdAddress('0xd');
    const size=mode==='aggregate-10001'?9999:mode==='single-table-10001'?10001:9998;
    f.system.epoch='9999';f.validator.staking_pool.exchange_rates.size=String(size);
    f.stakes[2].stake_activation_epoch='10000';
    const nodes=Array.from({length:size},(_,epoch)=>{
      const name=bcs.u64().serialize(String(epoch)).toBytes();
      return {address:deriveDynamicFieldID(parent,'u64',name),name:{type:{repr:'u64'},bcs:toBase64(name)},
        value:{__typename:'MoveValue',type:{repr:'0x3::staking_pool::PoolTokenExchangeRate'},
          bcs:toBase64(STAKING_RATE_BCS.serialize({rtd_amount:String(100000+epoch),pool_token_amount:'100000'}).toBytes())}};
    });
    let ratePages=0,published=false;
    f.override((result,request)=>{
      if(request.query.includes('dynamicFields(first:')&&request.variables.parent===parent){
        ratePages++;const offset=request.variables.cursor===null?0:Number(request.variables.cursor);
        assert(Number.isSafeInteger(offset)&&offset>=0&&offset<size);
        const page=nodes.slice(offset,offset+50), next=offset+page.length<size;
        if(mode==='duplicate-last'&&!next)page[page.length-1]=nodes[0];
        (result as any).address.dynamicFields={nodes:page,pageInfo:{hasNextPage:next,endCursor:next?String(offset+50):null}};
      }return result;
    });
    const start=performance.now(), native=globalThis.fetch;globalThis.fetch=f.fetch;
    try{
      const call=WalletStakingSnapshotReader.read(f.session,f.owner).then(value=>{published=true;return value;});
      if(mode==='exact-10000'){
        const result=await call;assert.equal(ratePages,200);assert.equal(result.value.positions?.length,3);
        const position=result.value.positions![0];assert.equal(position.reward.state,'estimated');
        const principal=BigInt(position.principal),delta=9997n-1n,denominator=100001n;
        const independentlyRounded=(2n*principal*delta+denominator)/(2n*denominator);
        assert.equal(position.reward.amount,independentlyRounded.toString());
        assert.equal(result.value.positions![1].poolState,'inactive');assert.equal(result.value.positions![2].status,'pending');
        cases.push({mode,passed:true,fixture:true,ratePages,totalRates:10000,elapsedMs:performance.now()-start,positions:result.value.positions,independentlyRounded:String(independentlyRounded)});
      }else{
        let name:string|undefined,reason:any;
        await assert.rejects(call,(error:any)=>{name=error.name;reason=error.reason;return true;});
        assert.equal(published,false);
        if(mode==='duplicate-last'){assert.equal(name,'SnapshotPaginationError');assert.equal(reason,'duplicate');assert.equal(ratePages,200);}
        else{assert.equal(name,'SnapshotReadError');assert.equal(reason,'incompatible');assert.equal(ratePages,mode==='single-table-10001'?0:200);}
        cases.push({mode,passed:true,fixture:true,ratePages,elapsedMs:performance.now()-start,error:{name,reason},partialPublished:false});
      }
    }finally{f.session.close();globalThis.fetch=native;}
  }
  const sources=['scripts/probe-staking-scale-fixture.ts','tests/unit/rpc/staking-fixture.ts','tests/unit/rpc/fixtures.ts','src/shared/rpc/staking-snapshot-reader.ts','src/shared/rpc/staking-reader.ts','src/shared/rpc/staking-rates.ts',
    '../../rtd/crates/rtd-indexer-alt-graphql/schema.graphql','../../rtd-ts-sdk/packages/typescript/src/graphql/generated/schema.graphql',
    'migrationToGRpcOrGraphQLDoc/evidence/official/sui-snapshot-schema.graphql.txt'];
  writeFileSync(output,JSON.stringify({passed:true,observedAt:new Date().toISOString(),cases,
    inputsSha256:Object.fromEntries(sources.map(p=>[p,createHash('sha256').update(readFileSync(p)).digest('hex')])),
    realChainRequests:0,simulations:0,signatures:0,executions:0,
    scope:'Explicit synthetic BCS/GraphQL stakingFixture through production static reader, native Node read budget and real 20-second deadline. 10000 rates across 200 active pages plus inactive rows; no production chain scale or Chrome acceptance.'},null,2)+'\n',{flag:'wx'});
  console.log(JSON.stringify({passed:true,cases:cases.length,ratePages:cases.map(x=>x.ratePages)}));
}
main().catch(error=>{console.error(error);process.exitCode=1;});
