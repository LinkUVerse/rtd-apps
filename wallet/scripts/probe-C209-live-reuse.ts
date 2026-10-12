// Read-only real-service verification; no browser, signing or execution.
import { readFileSync, writeFileSync } from 'node:fs';
import assert from 'node:assert/strict';
import { validateNetworkProfile } from '../src/shared/rpc/profile';
import { WalletReadSession } from '../src/shared/rpc/session';
import { WalletBalanceReader } from '../src/shared/rpc/balance-reader';
import { WalletCoinMetadataReader } from '../src/shared/rpc/coin-metadata-reader';
import { WalletStakingSnapshotReader } from '../src/shared/rpc/staking-snapshot-reader';
import { WalletFullnodeReader } from '../src/shared/rpc/fullnode-reader';

async function main() {
 const profile=validateNetworkProfile(JSON.parse(readFileSync('/Users/changzechuan/.local/state/rtd-wallet-migration/dev-20261006-03/publication-foundation/C46-isolated-browser-gateway-20261007-01/profile.json','utf8')));
 const owner='0x9d7652713f02b13b73744ba47e4f21ca0a0a2966cc02df86adcde2041454e5bc';
 const original=globalThis.fetch.bind(globalThis), calls:unknown[]=[], samples:unknown[]=[];
 globalThis.fetch=async(input,init)=>{
   const url=String(input);assert(url.startsWith(profile.endpoints.graphqlUrl!)||url.startsWith(profile.endpoints.fullnodeGrpcWeb));
   const start=performance.now(),response=await original(input,init);
   const row:Record<string,unknown>={url,milliseconds:Math.round(performance.now()-start),status:response.status};
   if(url===profile.endpoints.graphqlUrl) { row.request=JSON.parse(String(init?.body));row.response=await response.clone().json(); }
   calls.push(row);return response;
 };
 let passed=true;
 for(const scenario of ['home1','home2','home3','staking','concurrentFullnode'] as const) {
   const session=new WalletReadSession(profile),start=performance.now(),offset=calls.length;
   try {
     let result:unknown;
     if(scenario.startsWith('home')) {
       const [balances,metadata]=await Promise.all([WalletBalanceReader.read(session,owner),WalletCoinMetadataReader.read(session,'0x2::rtd::RTD')]);
       assert.deepEqual(balances.value,[]);assert.equal(metadata.value?.decimals,9);
       result={balanceSnapshot:balances.snapshot.checkpoint,metadataSnapshot:metadata.snapshot.checkpoint,completeEmptyBalances:true};
     } else if(scenario==='staking') {
       const staking=await WalletStakingSnapshotReader.read(session,owner);result={snapshot:staking.snapshot.checkpoint,validators:staking.value.validators.length,positions:staking.value.positions?.length};
     } else {
       const reader=new WalletFullnodeReader(session);
       const [a,b]=await Promise.all([reader.balance(owner,'0x2::rtd::RTD'),reader.balance(owner,'0x2::rtd::RTD')]);
       assert.equal(a.balance,'0');assert.deepEqual(a,b);result={balance:a.balance};
     }
     samples.push({scenario,passed:true,milliseconds:Math.round(performance.now()-start),requestCount:calls.length-offset,result});
   } catch(error) {passed=false;samples.push({scenario,passed:false,error:String(error),requestCount:calls.length-offset});}
   finally { session.close(); }
 }
 const report={passed,scope:'Actual source readers via C51 services, compiled profile; not browser acceptance.',samples,calls,signatures:0,executions:0};
 writeFileSync(process.argv[2],JSON.stringify(report,null,2)+'\n',{flag:'wx',mode:0o600});
 console.log(JSON.stringify({passed,samples}));if(!passed)process.exitCode=1;
}
main().catch(error=>{console.error(error);process.exitCode=1;});
