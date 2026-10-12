// Native HAR only; exact production asset readers, no live requests.
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {parse,print} from 'graphql';
import {validateNetworkProfile} from '../src/shared/rpc/profile';
import {WalletReadSession} from '../src/shared/rpc/session';
import {WalletAssetReader} from '../src/shared/rpc/asset-reader';
async function main(){
 const [input,output]=process.argv.slice(2),raw=readFileSync(input),entries=JSON.parse(raw.toString()).log.entries;
 const profileFile='/Users/changzechuan/.local/state/rtd-wallet-migration/dev-20261006-03/publication-foundation/C46-isolated-browser-gateway-20261007-01/profile.json';
 const profile=validateNetworkProfile(JSON.parse(readFileSync(profileFile,'utf8'))),owner='0xd50b47e5956effdff99b840cc1a34eb7e23a6a1997ec2e324ff4960b7f27077c';
 assert.equal(entries.length,50);assert(entries.every((e:any)=>e.request.url===profile.endpoints.graphqlUrl&&e.request.method==='POST'&&e.response.status===200&&!e._error));
 const reports=[];
 for(let cycle=0;cycle<2;cycle++){
  const rows=entries.slice(cycle*25,cycle*25+25),used=new Set<number>();
  globalThis.fetch=async(input,init)=>{
   assert.equal(String(input),profile.endpoints.graphqlUrl);const actual=JSON.parse(String(init?.body));
   const index=rows.findIndex((e:any,i:number)=>{if(used.has(i))return false;const expected=JSON.parse(e.request.postData.text);return print(parse(expected.query))===print(parse(actual.query))&&JSON.stringify(expected.variables??{})===JSON.stringify(actual.variables??{});});
   assert(index>=0,'Production request absent from this exact HAR cycle');used.add(index);const e=rows[index];assert(!JSON.parse(e.response.content.text).errors?.length);
   return new Response(e.response.content.text,{status:200,headers:{'content-type':'application/json'}});
  };
  const session=new WalletReadSession(profile);
  try {
   const reader=await WalletAssetReader.open(session);
   const [objects,kiosks]=await Promise.all([reader.ownedObjects(owner),reader.kiosks(owner)]);
   assert.equal(used.size,rows.length,'Unexplained card requests remain');assert.equal(objects.value.length,8);assert.equal(kiosks.value.length,3);
   const items=kiosks.value.flatMap(k=>k.items);assert.equal(items.length,2);
   reports.push({cycle,graphqlRequests:used.size,snapshot:reader.proof.checkpoint,objects:objects.value.map(o=>({id:o.objectId,version:o.version,type:o.type})),kiosks:kiosks.value.map(k=>({id:k.kioskId,kind:k.kind,items:k.items.map(i=>({id:i.objectId,version:i.version}))}))});
  }finally{session.close();}
 }
 const sha=(p:string)=>createHash('sha256').update(readFileSync(p)).digest('hex');
 writeFileSync(output,JSON.stringify({passed:true,observedAt:new Date().toISOString(),scope:'Two actual ordinary Chrome asset-list cycles exactly accounted for by production ownedObjects and kiosks readers; concurrent equivalent requests matched once each, no wire-order claim',owner,cycles:reports,totalGraphql:50,extraCardObjectRequests:0,liveNetworkRequests:0,signatures:0,executeRequests:0,parentCompletion:false,inputsSha256:Object.fromEntries([input,profileFile,process.argv[1],'src/shared/rpc/asset-reader.ts'].map(p=>[p,sha(p)]))},null,2)+'\n',{flag:'wx',mode:0o600});console.log(JSON.stringify({passed:true,cycles:2,graphqlPerCycle:25,objects:8,kiosks:3,kioskItems:2,extraCardObjectRequests:0}));
}
main().catch(e=>{console.error(e);process.exitCode=1;});
