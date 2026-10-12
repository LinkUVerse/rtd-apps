// Decode actual native DevTools responses using the production reader, without network access.
import { readFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import assert from 'node:assert/strict';
import { parse, print } from 'graphql';
import { validateNetworkProfile } from '../src/shared/rpc/profile';
import { WalletReadSession } from '../src/shared/rpc/session';
import { WalletFullnodeReader } from '../src/shared/rpc/fullnode-reader';
import { WalletCoinMetadataReader } from '../src/shared/rpc/coin-metadata-reader';
import { RTD_TYPE_ARG } from 'rtd-typescript/utils';
import { WalletStakingSnapshotReader } from '../src/shared/rpc/staking-snapshot-reader';

async function main() {
 const [input,output]=process.argv.slice(2);
 const raw=readFileSync(input),har=JSON.parse(raw.toString()).log;
 const owner='0x9d7652713f02b13b73744ba47e4f21ca0a0a2966cc02df86adcde2041454e5bc';
 const profile=validateNetworkProfile(JSON.parse(readFileSync('/Users/changzechuan/.local/state/rtd-wallet-migration/dev-20261006-03/publication-foundation/C46-isolated-browser-gateway-20261007-01/profile.json','utf8')));
 const indexes=[0,5,6,8,10,12,13,14,15,20,22];
 const metadataIndexes=[2,7,9,11,17,21,23,24],grpcIndexes=[1,3,4,16,18,19];
 assert.equal(har.entries.length,25);
 assert.deepEqual([...indexes,...metadataIndexes,...grpcIndexes].sort((a,b)=>a-b),Array.from({length:25},(_,i)=>i));
 const graphql=indexes.map(i=>har.entries[i]),grpc=grpcIndexes.map(i=>har.entries[i]);
 const cancelled=har.entries[11];assert.equal(cancelled.response.status,0);
 assert(JSON.parse(cancelled.request.postData.text).query.includes('coinMetadata'));
 assert(har.entries.filter((_:any,i:number)=>i!==11).every((e:any)=>e.response.status===200&&!e._error));
 let used=0;
 globalThis.fetch=async(input,init)=>{
   assert.equal(String(input),profile.endpoints.graphqlUrl);
   const entry=graphql[used++];assert(entry,'Unexpected additional production reader request');
   assert.equal(entry.request.method,'POST');assert.equal(entry.response.status,200);assert(!entry._error);
   const expected=JSON.parse(entry.request.postData.text),actual=JSON.parse(String(init?.body));
   assert.equal(print(parse(actual.query)),print(parse(expected.query)));
   assert.deepEqual(actual.variables??{},expected.variables??{});
   const body=entry.response.content.text;assert(body);assert(!JSON.parse(body).errors?.length);
   return new Response(body,{status:200,headers:{'content-type':'application/json'}});
 };
 const session=new WalletReadSession(profile);
 try {
   const view=await WalletStakingSnapshotReader.read(session,owner);
   assert.equal(used,graphql.length);assert.equal(view.value.validators.length,1);
   let nativeUsed=0;
   const transport: typeof fetch=async(input,init)=>{
     const e=grpc[nativeUsed++];assert(e);assert.equal(String(input),e.request.url);
     assert.deepEqual(Buffer.from(init!.body as Uint8Array),Buffer.from(e.request.postData.text,'latin1'));
     assert.equal(e.response.content.encoding,'base64');
     return new Response(Buffer.from(e.response.content.text,'base64'),{status:200,headers:Object.fromEntries(e.response.headers.map((h:any)=>[h.name,h.value]))});
   };
   const balances=[];
   for(let n=0;n<2;n++){
     const nativeSession=new WalletReadSession(profile);
     try {const value=await new WalletFullnodeReader(nativeSession,{fetch:transport}).balance(owner,RTD_TYPE_ARG);assert.equal(value.balance,'0');balances.push(value);}
     finally {nativeSession.close();}
   }
   assert.equal(nativeUsed,6);
   const metadata=metadataIndexes.slice(4).map(i=>har.entries[i]);let metadataUsed=0;
   globalThis.fetch=async(input,init)=>{
     const e=metadata[metadataUsed++];assert(e);assert.equal(String(input),e.request.url);
     const actual=JSON.parse(String(init?.body)),expected=JSON.parse(e.request.postData.text);
     assert.equal(print(parse(actual.query)),print(parse(expected.query)));assert.deepEqual(actual.variables??{},expected.variables??{});
     return new Response(e.response.content.text,{status:200,headers:{'content-type':'application/json'}});
   };
   const coinSession=new WalletReadSession(profile);
   try {const coin=await WalletCoinMetadataReader.read(coinSession,RTD_TYPE_ARG);assert.equal(coin.value?.decimals,9);assert.equal(metadataUsed,4);}finally{coinSession.close();}
   const starts=graphql.map((e:any)=>Date.parse(e.startedDateTime));
   const elapsed=Math.max(...graphql.map((e:any,i:number)=>starts[i]+e.time))-Math.min(...starts);
   const report={passed:true,stakingRequestIndexes:indexes,stakingCancellationCount:0,metadataCancelledRequestIndex:11,metadataCompletedCycles:1,actualNativeBalanceReads:balances.length,nativeFramesValidated:nativeUsed,scope:'C235 navigation: complete uninterrupted staking cycle, two actual native balances, one complete metadata cycle replayed through exact production readers. One prior metadata cycle explicitly cancelled; no all-page completion claim',harSha256:createHash('sha256').update(raw).digest('hex'),graphqlRequests:used,grpcRequests:grpc.length,grpcBusinessProofAccepted:true,milliseconds:elapsed,snapshot:view.snapshot,validators:view.value.validators.length,positions:view.value.positions.length,liveNetworkRequests:0,signatures:0,executeRequests:0,parentCompletion:false};
   writeFileSync(output,JSON.stringify(report,null,2)+'\n',{flag:'wx',mode:0o600});console.log(JSON.stringify(report));
 } finally {session.close();}
}
main().catch(e=>{console.error(e);process.exitCode=1;});
