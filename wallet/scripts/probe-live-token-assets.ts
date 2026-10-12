// Exact common-snapshot coin metadata/balances against the existing local profile. Read only.
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync} from 'node:fs';
import {validateNetworkProfile} from '../src/shared/rpc/profile';
import {WalletReadSession} from '../src/shared/rpc/session';
import {WalletAssetReader} from '../src/shared/rpc/asset-reader';
async function main(){
 const [profileFile,fixtureFile,output]=process.argv.slice(2);
 const profile=validateNetworkProfile(JSON.parse(readFileSync(profileFile,'utf8'))),fixture=JSON.parse(readFileSync(fixtureFile,'utf8'));
 assert.equal(profile.expectedGenesisDigest,fixture.h0);
 const session=new WalletReadSession(profile),original=globalThis.fetch,paths:string[]=[];
 globalThis.fetch=(input,init)=>{const url=new URL(input instanceof Request?input.url:String(input));assert.equal(url.hostname,'127.0.0.1');assert(!url.pathname.endsWith('/ExecuteTransaction'));assert(!url.pathname.endsWith('/SimulateTransaction'));paths.push(url.href);return original(input,init);};
 try{
  const reader=await WalletAssetReader.open(session,{timeoutMs:30000});
  const metadata=await reader.coinMetadata(fixture.coinType),balances=await reader.balances(fixture.target);
  const result={observedAt:new Date().toISOString(),proof:reader.proof,coinType:fixture.coinType,metadata:metadata.value,balances:balances.value,dispatches:0,simulations:0,paths,scope:'actual admitted common snapshot metadata and balance read; absence at older snapshot is not current Fullnode absence'};
  writeFileSync(output,JSON.stringify(result,null,2)+'\n',{flag:'wx'});console.log(JSON.stringify(result));
 }finally{globalThis.fetch=original;session.close();}
}
main().catch(e=>{console.error(e);process.exitCode=1});
