// Copyright (c) LinkU Labs, Inc.
// SPDX-License-Identifier: Apache-2.0
// Actual public TLS complete balance domain. No transaction or alternate endpoint fallback.
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync} from 'node:fs';
import {validateNetworkProfile} from '../src/shared/rpc/profile';
import {WalletReadSession} from '../src/shared/rpc/session';
import {WalletBalanceReader} from '../src/shared/rpc/balance-reader';
import {WalletAssetReader} from '../src/shared/rpc/asset-reader';
import {SnapshotReadError} from '../src/shared/rpc/graphql-snapshot';

async function main(){
 const [profileFile,output]=process.argv.slice(2);
 const profile=validateNetworkProfile(JSON.parse(readFileSync(profileFile,'utf8')));
 assert.equal(profile.endpoints.graphqlUrl,'https://127.0.0.1:39600/graphql');
 const owner='0xa0ccc8bcc83f6c628340134f8546a21e0618fd1aaa02432bba454c4a2c2233da';
 const fetchImpl=globalThis.fetch;
 const requests:{kind:string;status:number;display:boolean;balances:boolean;errors:number;checkpoint?:string;items?:number;hasNextPage?:boolean}[]=[];
 globalThis.fetch=async(input,init)=>{
  const url=new URL(input instanceof Request?input.url:String(input));assert.equal(url.href,profile.endpoints.graphqlUrl);
  const query=JSON.parse(String(init?.body)).query;
  const response=await fetchImpl(input,init);const body=await response.clone().json();
  const balances=body.data?.walletSnapshot?.query?.address?.balances;
  requests.push({kind:query.match(/query\s+(\w+)/)?.[1]??'unknown',status:response.status,display:query.includes('walletDisplayService'),balances:query.includes('balances(first:'),errors:body.errors?.length??0,
   checkpoint:query.match(/walletSnapshot: checkpoint\(sequenceNumber: (\d+)/)?.[1],items:balances?.nodes?.length,hasNextPage:balances?.pageInfo?.hasNextPage});return response;
 };
 const session=new WalletReadSession(profile),start=performance.now();
 try {
  const result=await WalletBalanceReader.read(session,owner);
  const balanceRequestCount=requests.length;
  assert.equal(result.snapshot.dependencies.length,2);assert.equal(result.snapshot.displayHistory,undefined);
  assert(requests.every(r=>!r.display&&r.errors===0));
  const pages=requests.filter(r=>r.balances);assert(pages.length>0);assert(pages.every(r=>r.checkpoint===result.snapshot.checkpoint));assert.equal(pages.at(-1)?.hasNextPage,false);
  assert.equal(requests.at(-1)?.kind,'WalletSnapshotRevalidate');
  assert.equal(pages.reduce((n,p)=>n+p.items!,0),result.value.length);
  for(const balance of result.value){assert.equal(BigInt(balance.balance),BigInt(balance.coinBalance)+BigInt(balance.addressBalance));}
  let reason:string|undefined;
  try{await WalletAssetReader.open(session)}catch(error){if(!(error instanceof SnapshotReadError))throw error;reason=error.reason;}
  assert(reason,'Full Display asset domain must still reject uncovered history');assert(requests.every(r=>r.status===200));
  const evidence={passed:true,observedAt:new Date().toISOString(),endpoint:profile.endpoints.graphqlUrl,owner,result,balanceRequestCount,pageCount:pages.length,
   fullAssetRefused:true,fullAssetReason:reason,requests,elapsedMs:performance.now()-start,simulations:0,signatures:0,dispatches:0,
   scope:'Actual complete balances at fixed S through current public TLS production reader with native locks and final revalidation. Display still refused. This historical balance is not fresh spending authority or nonnative/multi-page real chain acceptance.'};
  writeFileSync(output,JSON.stringify(evidence,null,2)+'\n',{flag:'wx',mode:0o600});
  console.log(JSON.stringify({passed:true,checkpoint:result.snapshot.checkpoint,items:result.value.length,balances:result.value,balanceRequestCount,pageCount:pages.length,fullAssetRefused:true,requests:requests.length,elapsedMs:evidence.elapsedMs,dispatches:0}));
 }finally{session.close();globalThis.fetch=fetchImpl;}
}
main().catch(error=>{console.error(JSON.stringify({passed:false,errorType:error.name}));process.exitCode=1});
