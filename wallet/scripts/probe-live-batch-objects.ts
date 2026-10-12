// Real wallet batch reader: one snapshot, multiple chunks, duplicates and a deleted object.
import assert from 'node:assert/strict';
import { writeFileSync } from 'node:fs';
import { ObjectError } from 'rtd-typescript/client';
import { normalizeRtdAddress } from 'rtd-typescript/utils';
import { validateNetworkProfile } from '../src/shared/rpc/profile';
import { WalletReadSession } from '../src/shared/rpc/session';
import { WalletAssetReader } from '../src/shared/rpc/asset-reader';
async function main() {
 const [rpc,graphql,h0,deleted,output]=process.argv.slice(2);
 for(const endpoint of [rpc,graphql])assert.equal(new URL(endpoint).hostname,'127.0.0.1');
 const session=new WalletReadSession(validateNetworkProfile({schemaVersion:2,id:'isolated-wallet-dev',displayName:'独立钱包开发链',sdkNetwork:'localnet',walletStandardChain:'rtd:localnet',generation:'dev-20261003-01',revision:1,expectedGenesisDigest:h0,endpoints:{fullnodeGrpcWeb:rpc,graphqlUrl:graphql},packages:{}}));
 try {
  const reader=await WalletAssetReader.open(session,{timeoutMs:30000,fetch:async(input,init)=>{const response=await fetch(input,init);if(String(input).includes('/graphql')){const body=await response.clone().json();if(body.errors)console.error(JSON.stringify({errors:body.errors}));}return response;}});
  const ids=Array.from({length:43},(_,i)=>i===1||i===40?deleted:'0x5');
  const result=await reader.objects(ids);
  assert.equal(result.value.length,ids.length);
  result.value.forEach((item,i)=>{
   if(i===1||i===40){assert(item instanceof ObjectError);assert.equal(item.reason,'notFound');assert.equal(item.objectId,normalizeRtdAddress(deleted));}
   else {assert(!(item instanceof Error));assert.equal(item.objectId,normalizeRtdAddress(ids[i]));assert(item.content.length>0);}
  });
  writeFileSync(output,JSON.stringify({proof:result.snapshot,input:ids,output:result.value.map(item=>item instanceof ObjectError?{objectId:item.objectId,reason:item.reason}:{objectId:item.objectId,version:item.version,digest:item.digest}),scope:'Actual GraphQL WalletAssetReader.objects across 40-item boundary. Exact duplicate and deleted-object slots; not historical-version or browser acceptance.'},null,2)+'\n');
  console.log(JSON.stringify({checkpoint:result.snapshot.checkpoint,items:43,notFoundSlots:[1,40],passed:true}));
 } finally {session.close();}
}
main().catch(error=>{console.error(error);process.exitCode=1;});
