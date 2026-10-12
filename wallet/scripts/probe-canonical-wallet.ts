// Copyright (c) LinkU Labs, Inc.
// SPDX-License-Identifier: Apache-2.0
// Real production readers against the explicitly bound local stack; no signing.
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,existsSync} from 'node:fs';
import {join} from 'node:path';
import {validateNetworkProfile} from '../src/shared/rpc/profile';
import {WalletReadSession} from '../src/shared/rpc/session';
import {WalletFullnodeReader} from '../src/shared/rpc/fullnode-reader';
import {WalletBalanceReader} from '../src/shared/rpc/balance-reader';
import {WalletAssetReader} from '../src/shared/rpc/asset-reader';
import {WalletNameReader} from '../src/shared/rpc/name-reader';
import {WalletStakingSnapshotReader} from '../src/shared/rpc/staking-snapshot-reader';
import {WalletAccountHistoryReader} from '../src/shared/rpc/account-history-reader';
import {WalletLedgerReader} from '../src/shared/rpc/ledger-reader';

async function main() {
  const [rt,output]=process.argv.slice(2);assert(!existsSync(output));
  const read=(file:string)=>JSON.parse(readFileSync(file,'utf8'));
  const profile=validateNetworkProfile(read(join(rt,'certified-release/profile.json')),{requireComplete:true});
  const fixture=read(join(rt,'fixtures/fund-bad0/result.json'));
  assert.equal(profile.expectedGenesisDigest,fixture.h0);
  const owner=fixture.recipient,displayOwner=read(join(rt,'fixtures/display/result.json')).recipient;
  const allowed=new Set(Object.values(profile.endpoints).map(value=>new URL(value!).origin));
  const nativeFetch=globalThis.fetch,requests:any[]=[],results:any[]=[];let current='';
  globalThis.fetch=async(input,init)=>{
    const url=new URL(input instanceof Request?input.url:String(input));assert(allowed.has(url.origin));
    assert(!/ExecuteTransaction|SimulateTransaction/.test(url.pathname));
    const start=performance.now(),row:any={test:current,url:url.href};
    if(url.pathname.endsWith('graphql'))row.operation=JSON.parse(String(init?.body)).query.match(/(?:query|mutation)\s+(\w+)/)?.[1];
    requests.push(row);
    try {const response=await nativeFetch(input,init);row.status=response.status;
      if(url.pathname.endsWith('graphql')){
        // Observability must not replace the production reader's HTTP/retry behavior.
        try { const body=await response.clone().json();row.errors=body.errors?.map((e:any)=>({message:e.message,code:e.extensions?.code})); }
        catch { row.nonJsonResponse=true; }
      }
      row.ms=performance.now()-start;return response;
    }catch(error){row.ms=performance.now()-start;row.error=error instanceof Error?error.name:String(error);throw error;}
  };
  const session=new WalletReadSession(profile);
  async function run(name:string,operation:()=>Promise<unknown>){current=name;const start=performance.now();try{const value=await operation();results.push({name,passed:true,ms:performance.now()-start,value});}catch(error:any){results.push({name,passed:false,ms:performance.now()-start,error:{name:error.name,reason:error.reason,code:error.code,message:error.message}});}console.log(JSON.stringify(results.at(-1)));}
  try {
    const native=new WalletFullnodeReader(session);
    await run('native-balance',async()=>{const value=await native.balance(owner,'0x2::rtd::RTD');return value;});
    for(let round=1;round<=3;round++)await run('balance-'+round,async()=>{const value=await WalletBalanceReader.read(session,owner);assert(value.value.some(c=>BigInt(c.balance)>0n));return{checkpoint:value.snapshot.checkpoint,balances:value.value};});
    const names=new WalletNameReader(session);
    await run('name-forward',async()=>{const value=await names.resolve('wallet-migration.rtd');assert.equal(value?.address,owner);return value;});
    await run('name-reverse',async()=>{const value=await names.defaultName(owner);assert.equal(value?.name,'wallet-migration.rtd');return value;});
    await run('name-expired',async()=>{const value=await names.resolve('expired-migration.rtd');assert.equal(value,null);return value;});
    await run('display-assets',async()=>{const reader=await WalletAssetReader.open(session);const value=await reader.ownedObjects(displayOwner);assert(value.value.some(object=>object.type.endsWith('::display_v2_nft::DisplayNFT')));return{checkpoint:value.snapshot.checkpoint,objects:value.value};});
    await run('staking',async()=>{const value=await WalletStakingSnapshotReader.read(session,fixture.sender);assert.equal(value.value.positions.length,1);assert(value.value.validators.length>0);return{checkpoint:value.snapshot.checkpoint,epoch:value.value.epoch,positions:value.value.positions};});
    await run('history',async()=>{const value=await new WalletAccountHistoryReader(session).read(owner);assert(value.transactions.some(tx=>tx.digest===fixture.digest));return{checkpoint:value.checkpointHi,total:value.totalTransactions,transactions:value.transactions};});
    await run('archive-receipt',async()=>{const reader=new WalletLedgerReader(session);const value=await reader.lookup(fixture.digest);assert(value?.success);return value;});
  } finally {session.close();globalThis.fetch=nativeFetch;}
  const passed=results.every(r=>r.passed);writeFileSync(output,JSON.stringify({passed,observedAt:new Date().toISOString(),h0:profile.expectedGenesisDigest,results,requests,signatures:0,dispatches:0,browserAccepted:false},null,2)+'\n',{flag:'wx',mode:0o600});
  console.log(JSON.stringify({passed,tests:results.length,failed:results.filter(r=>!r.passed).map(r=>r.name),requests:requests.length}));
  if(!passed)process.exitCode=1;
}
main().catch(error=>{console.error(error);process.exitCode=1;});
