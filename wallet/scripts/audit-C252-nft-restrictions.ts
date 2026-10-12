// Replay selected complete native Chrome cycles, with cancellations explicitly excluded.
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {parse,print} from 'graphql';
import {validateNetworkProfile} from '../src/shared/rpc/profile';
import {WalletReadSession} from '../src/shared/rpc/session';
import {WalletAssetReader} from '../src/shared/rpc/asset-reader';
async function main(){
 const L='migrationToGRpcOrGraphQLDoc/workLog';
 const input=L+'/20261011-C252-nft-restrictions-01.har', uiFile=L+'/20261011-C252-nft-restrictions-native-ui-01.json';
 const entries=JSON.parse(readFileSync(input,'utf8')).log.entries,ui=JSON.parse(readFileSync(uiFile,'utf8'));
 const profileFile='/Users/changzechuan/.local/state/rtd-wallet-migration/dev-20261006-03/publication-foundation/C46-isolated-browser-gateway-20261007-01/profile.json';
 const profile=validateNetworkProfile(JSON.parse(readFileSync(profileFile,'utf8'))),owner='0xd50b47e5956effdff99b840cc1a34eb7e23a6a1997ec2e324ff4960b7f27077c';
 assert.equal(entries.length,145);
 const cancelled:number[]=[];
 for(const [i,e] of entries.entries()){
  assert.equal(e.request.url,profile.endpoints.graphqlUrl);assert.equal(e.request.method,'POST');
  if(e.response.status===0){cancelled.push(i);continue;}
  assert.equal(e.response.status,200);assert(!e._error);const r=JSON.parse(e.response.content.text);assert(!r.errors?.length);
  assert.equal(r.data.walletGenesis.digest,profile.expectedGenesisDigest);
  if(r.data.walletSnapshot){assert.equal(r.data.walletSnapshot.sequenceNumber,1006768);assert.equal(r.data.walletSnapshot.digest,'vDk2miAzvCTPXH7St4GZn794RXRNmDmS37mJgvCc9kN');}
 }
 assert.deepEqual(cancelled,[48,49,92]);
 const cases=[{kind:'locked',id:'0x2ac824803bee71042d621ba2502b844b878461fd8834b8f226315b62224d1221',indices:[71,72,...Array.from({length:23},(_,i)=>93+i)]},
 {kind:'exclusive',id:'0x529e3f9369b1e96d2d2304d012c99e404bc369ae5a64dc64414fa71ec82a81c0',indices:Array.from({length:25},(_,i)=>118+i)}];
 const reports=[];
 for(const test of cases){
  const rows=test.indices.map(i=>entries[i]),used=new Set<number>();
  globalThis.fetch=async(input,init)=>{
   assert.equal(String(input),profile.endpoints.graphqlUrl);const actual=JSON.parse(String(init?.body));
   const index=rows.findIndex((e:any,i:number)=>{if(used.has(i))return false;const expected=JSON.parse(e.request.postData.text);return print(parse(expected.query))===print(parse(actual.query))&&JSON.stringify(expected.variables??{})===JSON.stringify(actual.variables??{});});
   assert(index>=0,'Unmatched production request');used.add(index);const e=rows[index];assert.equal(e.response.status,200);return new Response(e.response.content.text,{status:200,headers:{'content-type':'application/json'}});
  };
  const session=new WalletReadSession(profile);
  try{
   const reader=await WalletAssetReader.open(session),detail=await reader.objects([test.id]),kiosks=await reader.kiosks(owner);
   assert.equal(used.size,25);assert.equal(detail.value.length,1);
   const item=kiosks.value.flatMap(k=>k.items).find(i=>i.objectId===test.id)!;assert(item);
   const state=ui.states.find((s:any)=>s.phase===test.kind+'-detail-ready');assert(state);
   if(test.kind==='locked'){assert(item.isLocked);assert(!state.ax.includes('发送 NFT'));assert(state.ax.includes('serial 3'));}
   else{assert(item.listing?.isExclusive);assert(state.ax.includes('按钮 (disabled) 发送 NFT'));assert(state.ax.includes('serial 4'));}
   reports.push({...test,snapshot:reader.proof.checkpoint,item,uiAt:state.at,productionRequestsReplayed:25});
  }finally{session.close();}
 }
 const sha=(p:string)=>createHash('sha256').update(readFileSync(p)).digest('hex');
 writeFileSync(L+'/20261011-C252-nft-restrictions-audit-01.json',JSON.stringify({passed:true,observedAt:new Date().toISOString(),scope:'Two complete same-S NFT restriction reads plus native UI; other completed frames structurally checked only. No positive NFT transfer.',reports,requests:145,completed200:142,cancelledIndices:cancelled,completeReaderFrames:50,otherCompleteFrames:92,liveRequests:0,signatures:0,executeRequests:0,parentCompletion:false,inputsSha256:Object.fromEntries([__filename,input,uiFile,profileFile,'src/shared/rpc/asset-reader.ts'].map(p=>[p,sha(p)]))},null,2)+'\n',{flag:'wx',mode:0o600});
 console.log(JSON.stringify({passed:true,completeCycles:2,cancelled:3,positiveTransferAccepted:false}));
}
main().catch(e=>{console.error(e);process.exitCode=1});
