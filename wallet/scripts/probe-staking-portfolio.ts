import assert from 'node:assert/strict';
import {readFileSync,writeFileSync} from 'node:fs';
import {validateNetworkProfile} from '../src/shared/rpc/profile';
import {WalletReadSession} from '../src/shared/rpc/session';
import {WalletAssetReader} from '../src/shared/rpc/asset-reader';
async function main(){
 const [file,owner,output]=process.argv.slice(2);
 const profile=validateNetworkProfile(JSON.parse(readFileSync(file,'utf8')));
 const native=globalThis.fetch;let requests=0;
 globalThis.fetch=(input,init)=>{const url=new URL(input instanceof Request?input.url:String(input));assert.equal(url.hostname,'127.0.0.1');assert(url.pathname==='/graphql'||url.pathname.endsWith('/GetServiceInfo'));requests++;return native(input,init);};
 const session=new WalletReadSession(profile);
 try{const reader=await WalletAssetReader.open(session,{timeoutMs:30000});const result=await reader.staking(owner);const evidence={at:new Date().toISOString(),proof:reader.proof,owner,value:result.value,requests,dispatches:0};writeFileSync(output,JSON.stringify(evidence,null,2)+'\n',{flag:'wx'});console.log(JSON.stringify({passed:true,checkpoint:reader.proof.checkpoint,positions:result.value.positions?.length,validators:result.value.validators.length,requests}));}
 finally{session.close();globalThis.fetch=native;}
}
main().catch(error=>{console.error(error);process.exitCode=1;});
