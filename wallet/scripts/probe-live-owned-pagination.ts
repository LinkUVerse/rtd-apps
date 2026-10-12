// Read-only real pages using the actual production reader and a fixed snapshot.
import assert from 'node:assert/strict';
import { readFileSync, writeFileSync } from 'node:fs';
import { validateNetworkProfile } from '../src/shared/rpc/profile';
import { WalletReadSession } from '../src/shared/rpc/session';
import { WalletAssetReader } from '../src/shared/rpc/asset-reader';
import { directlyOwnedAsset } from '../src/shared/rpc/nft-assets';
async function main() {
 const [profileFile,owner,output]=process.argv.slice(2);
 const profile=validateNetworkProfile(JSON.parse(readFileSync(profileFile,'utf8')));
 const nativeFetch=globalThis.fetch;
 const pages:{size:number;cursor:string|null;count:number;hasNextPage:boolean;endCursor:string|null}[]=[];
 globalThis.fetch=async(input,init)=>{
  const url=new URL(input instanceof Request?input.url:String(input));
  assert.equal(url.hostname,'127.0.0.1');
  assert(url.pathname==='/graphql'||url.pathname.endsWith('/GetServiceInfo'));
  const request=typeof init?.body==='string'?JSON.parse(init.body):null;
  const response=await nativeFetch(input,init);
  if(request?.query.includes('objects(first:')){
   const body=await response.clone().json();assert(!body.errors);
   const connection=body.data?.walletSnapshot?.query?.address?.objects;assert(connection&&Array.isArray(connection.nodes));
   pages.push({size:request.variables.pageSize,cursor:request.variables.cursor,count:connection.nodes.length,...connection.pageInfo});
  }
  return response;
 };
 const session=new WalletReadSession(profile);
 try{
  const reader=await WalletAssetReader.open(session,{timeoutMs:30000});
  const ordinary=await reader.ownedObjects(owner);
  const small=await reader.ownedObjects(owner,{pageSize:3});
  assert(ordinary.value.length>3);
  assert.deepEqual(small,ordinary,'full same-snapshot objects including order, BCS and display');
  assert(small.value.every(object=>directlyOwnedAsset(object,owner)));
  assert.equal(new Set(small.value.map(object=>object.objectId)).size,small.value.length);
  const actual=pages.filter(page=>page.size===3);assert(actual.length>1);
  assert.equal(actual[0].cursor,null);
  for(let i=1;i<actual.length;i++){assert.equal(actual[i-1].hasNextPage,true);assert.equal(actual[i].cursor,actual[i-1].endCursor);}
  assert.equal(actual.at(-1)!.hasNextPage,false);
  const displays=small.value.filter(object=>object.display?.output).map(object=>({id:object.objectId,type:object.type,display:object.display}));
  writeFileSync(output,JSON.stringify({passed:true,observedAt:new Date().toISOString(),h0:profile.expectedGenesisDigest,checkpoint:reader.proof.checkpoint,owner,count:small.value.length,pages,displays,dispatches:0,scope:'Real admitted ownedObjects default50 versus pageSize3, full equality in same snapshot. Display recorded, not proof of direct NFT or Chrome rendering.'},null,2)+'\n',{flag:'wx'});
  console.log(JSON.stringify({passed:true,checkpoint:reader.proof.checkpoint,count:small.value.length,pages:actual.length,displays:displays.length,dispatches:0}));
 }finally{session.close();globalThis.fetch=nativeFetch;}
}
main().catch(error=>{console.error(error);process.exitCode=1;});
