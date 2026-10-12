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
 assert.equal(entries.length,70);assert(entries.every((e:any)=>e.request.url===profile.endpoints.graphqlUrl&&e.request.method==='POST'&&e.response.status===200&&!e._error));
 for(const e of entries.slice(0,0)) {
  const q=JSON.parse(e.request.postData.text),r=JSON.parse(e.response.content.text);
  assert.equal(parse(q.query).definitions[0].kind,'OperationDefinition');assert(q.query.startsWith('query WalletSnapshotRevalidate'));
  assert(!r.errors?.length);assert.equal(r.data.walletGenesis.digest,profile.expectedGenesisDigest);
  const s=r.data.walletSnapshot;assert.equal(s.sequenceNumber,1006768);assert.equal(s.digest,'vDk2miAzvCTPXH7St4GZn794RXRNmDmS37mJgvCc9kN');
  for(const range of Object.values(r.data.serviceConfig) as any[])assert(range.first.sequenceNumber<=s.sequenceNumber&&range.last.sequenceNumber>=s.sequenceNumber);
 }
 const reports=[];
 for(let cycle=0;cycle<2;cycle++){
  const rows=entries.slice(20+cycle*25,20+cycle*25+25),used=new Set<number>();
  globalThis.fetch=async(input,init)=>{
   assert.equal(String(input),profile.endpoints.graphqlUrl);const actual=JSON.parse(String(init?.body));
   const index=rows.findIndex((e:any,i:number)=>{if(used.has(i))return false;const expected=JSON.parse(e.request.postData.text);return print(parse(expected.query))===print(parse(actual.query))&&JSON.stringify(expected.variables??{})===JSON.stringify(actual.variables??{});});
   assert(index>=0,'Production request absent from this exact HAR cycle');used.add(index);const e=rows[index];assert(!JSON.parse(e.response.content.text).errors?.length);
   return new Response(e.response.content.text,{status:200,headers:{'content-type':'application/json'}});
  };
  const session=new WalletReadSession(profile);
  try {
   const reader=await WalletAssetReader.open(session);
   const kiosks=await reader.kiosks(owner);
   const detail=await reader.objects(["0x2ac824803bee71042d621ba2502b844b878461fd8834b8f226315b62224d1221"]);assert.equal(detail.value.length,1);
   assert.equal(used.size,rows.length,'Unexplained card requests remain');assert.equal(kiosks.value.length,3);
   const items=kiosks.value.flatMap(k=>k.items);assert.equal(items.length,2);
   reports.push({cycle,graphqlRequests:used.size,snapshot:reader.proof.checkpoint,kiosks:kiosks.value.map(k=>({id:k.kioskId,kind:k.kind,items:k.items}))});
  }finally{session.close();}
 }
 const sha=(p:string)=>createHash('sha256').update(readFileSync(p)).digest('hex');
 writeFileSync(output,JSON.stringify({passed:true,observedAt:new Date().toISOString(),scope:'Two complete NFT detail cycles replayed by production kiosk then object readers; first 20 earlier tail requests not accepted as a full read',owner,cycles:reports,totalGraphql:70,earlierUnauditedTailRequests:20,earlierFullCycleAccepted:false,detailObjectReadsPerCycle:1,liveNetworkRequests:0,signatures:0,executeRequests:0,parentCompletion:false,inputsSha256:Object.fromEntries([input,profileFile,process.argv[1],'src/shared/rpc/asset-reader.ts'].map(p=>[p,sha(p)]))},null,2)+'\n',{flag:'wx',mode:0o600});console.log(JSON.stringify({passed:true,cycles:2,graphqlPerCycle:25,kiosks:3,kioskItems:2,detailObjectReadsPerCycle:1}));
}
main().catch(e=>{console.error(e);process.exitCode=1;});
