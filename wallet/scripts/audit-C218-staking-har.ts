// Decode actual native DevTools responses using the production reader, without network access.
import { readFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import assert from 'node:assert/strict';
import { parse, print } from 'graphql';
import { validateNetworkProfile } from '../src/shared/rpc/profile';
import { WalletReadSession } from '../src/shared/rpc/session';
import { WalletStakingSnapshotReader } from '../src/shared/rpc/staking-snapshot-reader';

async function main() {
 const [input,output]=process.argv.slice(2);
 const raw=readFileSync(input),har=JSON.parse(raw.toString()).log;
 const owner='0x9d7652713f02b13b73744ba47e4f21ca0a0a2966cc02df86adcde2041454e5bc';
 const profile=validateNetworkProfile(JSON.parse(readFileSync('/Users/changzechuan/.local/state/rtd-wallet-migration/dev-20261006-03/publication-foundation/C46-isolated-browser-gateway-20261007-01/profile.json','utf8')));
 const graphql=har.entries.filter((e:any)=>e.request.url===profile.endpoints.graphqlUrl);
 const grpc=har.entries.filter((e:any)=>e.request.url!==profile.endpoints.graphqlUrl);
 assert.equal(graphql.length,11);assert.equal(grpc.length,1);
 assert.equal(grpc[0].request.url,profile.endpoints.fullnodeGrpcWeb+'/rtd.rpc.v2.LedgerService/GetServiceInfo');
 assert.equal(grpc[0].response.status,200);
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
   const starts=graphql.map((e:any)=>Date.parse(e.startedDateTime));
   const elapsed=Math.max(...graphql.map((e:any,i:number)=>starts[i]+e.time))-Math.min(...starts);
   const report={passed:true,scope:'C216 ordinary Chrome staking HAR, exact GraphQL requests replayed through production BCS/identity/coverage/pagination/pin/revalidation decoder; no live calls',harSha256:createHash('sha256').update(raw).digest('hex'),graphqlRequests:used,grpcRequests:grpc.length,grpcBusinessProofAccepted:false,milliseconds:elapsed,snapshot:view.snapshot,validators:view.value.validators.length,positions:view.value.positions.length,liveNetworkRequests:0,signatures:0,executeRequests:0,parentCompletion:false};
   writeFileSync(output,JSON.stringify(report,null,2)+'\n',{flag:'wx',mode:0o600});console.log(JSON.stringify(report));
 } finally {session.close();}
}
main().catch(e=>{console.error(e);process.exitCode=1;});
