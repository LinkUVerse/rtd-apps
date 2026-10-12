// Strict offline replay of actual ordinary Chrome HAR using the production readers.
import {readFileSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
import {parse,print} from 'graphql';
import {validateNetworkProfile} from '../src/shared/rpc/profile';
import {WalletReadSession} from '../src/shared/rpc/session';
import {WalletLedgerReader} from '../src/shared/rpc/ledger-reader';
import {WalletArchiveObjectReader} from '../src/shared/rpc/archive-object-reader';
import {WalletCoinMetadataReader} from '../src/shared/rpc/coin-metadata-reader';
import {WalletAssetReader} from '../src/shared/rpc/asset-reader';
import {readHistoricalEffect} from '../src/shared/rpc/historical-effect';
import {receiptObjectEffects} from 'rtd-apps-core/src/rpc/transaction-view';

async function main(){
 const [input,output]=process.argv.slice(2),raw=readFileSync(input);
 const allEntries=JSON.parse(raw.toString()).log.entries;
 const entries=allEntries.filter((e:any)=>/^https?:\/\/127\.0\.0\.1:(41750|41903|41957)\//.test(e.request.url));
 const profileFile='/Users/changzechuan/.local/state/rtd-wallet-migration/dev-20261006-03/publication-foundation/C46-isolated-browser-gateway-20261007-01/profile.json';
 const base=JSON.parse(readFileSync(profileFile,'utf8'));
 // Browser uses its already trusted TLS archive endpoint, as recorded in this HAR.
 const profile=validateNetworkProfile({...base,endpoints:{...base.endpoints,archiveGrpcWeb:'https://127.0.0.1:41903/archive'}});
 const session=new WalletReadSession(profile);let used=0;
 const grpc=entries.filter((e:any)=>e.request.url.includes('/rtd.rpc.'));
 assert.equal(grpc.length,10);assert.equal(grpc[0].request.url,profile.endpoints.fullnodeGrpcWeb+'/rtd.rpc.v2.LedgerService/GetServiceInfo');
 const receiptFrames=grpc.slice(1);
 const transport:typeof fetch=async(input,init)=>{
  const entry=receiptFrames[used++];assert(entry,'Unexpected production request');
  assert.equal(String(input),entry.request.url);assert.equal(entry.request.method,'POST');
  const sent=Buffer.from(init!.body as Uint8Array),captured=Buffer.from(entry.request.postData.text,'latin1');
  assert.deepEqual(sent,captured);assert.equal(entry.response.status,200);assert(!entry._error);
  const content=entry.response.content;
  const body=Buffer.from(content.text??'',content.encoding==='base64'?'base64':'utf8');
  return new Response(body,{status:200,headers:entry.response.headers.map((h:any)=>[h.name,h.value])});
 };
 try{
  const digest='7bJ6y8hH9y94XzBAy7z58EUgo8UnTLW9pjoS9Pyp8mM2';
  const details=await new WalletLedgerReader(session,{fetch:transport}).details(digest);assert(details);
  assert.equal(details.transaction.checkpoint,'522405');assert.equal(details.source,'archive');
  const effect=receiptObjectEffects(details.transaction).find(e=>e.objectId==='0x440154d1e1bcc7466fce0466b0120180318f15d82b5802fd2f94cfe86e08a30a');assert(effect);
  const archive=new WalletArchiveObjectReader(session,{fetch:transport});
  const object=await readHistoricalEffect({bindingKey:session.bindingKey,readHistoricalObjects:(selectors:any,signal:any)=>archive.objects(selectors,signal)} as any,effect,new AbortController().signal);
  assert.equal(used,9);assert.equal(object.version,'269849');assert.equal(object.digest,'2qRStZdjjpAEue7QCpddShXq4JszR6SSZcTxq1141nJm');
  const postReload=entries,graphql=postReload.filter((e:any)=>e.request.url===profile.endpoints.graphqlUrl);
  const durationMs=Math.max(...entries.map((e:any)=>Date.parse(e.startedDateTime)+e.time))-Math.min(...entries.map((e:any)=>Date.parse(e.startedDateTime)));
  assert(durationMs>=65_000, 'Require multiple actual automatic refresh intervals');
  const full=graphql.filter((e:any)=>JSON.parse(e.request.postData.text).query.includes('walletDisplayService'));
  const metadata=graphql.filter((e:any)=>!JSON.parse(e.request.postData.text).query.includes('walletDisplayService'));
  assert.equal(full.length,2,'Completed receipt must not keep full-asset polling');assert.equal(metadata.length%4,0);assert(metadata.length>=16,'Initial plus at least three complete metadata cycles');
  let queue:any[]=[],cursor=0;
  globalThis.fetch=async(input,init)=>{
   const e=queue[cursor++];assert(e);assert.equal(String(input),profile.endpoints.graphqlUrl);
   assert.equal(e.request.method,'POST');assert.equal(e.response.status,200);assert(!e._error);
   const actual=JSON.parse(String(init?.body)),expected=JSON.parse(e.request.postData.text);
   assert.equal(print(parse(actual.query)),print(parse(expected.query)));assert.deepEqual(actual.variables??{},expected.variables??{});
   assert(!JSON.parse(e.response.content.text).errors?.length);
   return new Response(e.response.content.text,{status:200,headers:{'content-type':'application/json'}});
  };
  const snapshots:any[]=[];
  for(let i=0;i<full.length;i+=2){queue=full.slice(i,i+2);cursor=0;const reader=await WalletAssetReader.open(session);assert.equal(cursor,2);snapshots.push({domain:'full-assets-admission',proof:reader.proof,requests:2});}
  for(let i=0;i<metadata.length;i+=4){queue=metadata.slice(i,i+4);cursor=0;const type=JSON.parse(queue[2].request.postData.text).variables.type;const result=await WalletCoinMetadataReader.read(session,type);assert.equal(cursor,4);assert.equal(result.value?.decimals,9);snapshots.push({domain:'metadata',proof:result.snapshot,requests:4});}
  const sha=(file:string)=>createHash('sha256').update(readFileSync(file)).digest('hex');
  const proof={passed:true,observedAt:new Date().toISOString(),scope:'Ordinary Chrome nonempty receipt and one explicit historical NFT object, exact request bytes and production response validation, plus all complete post-reload GraphQL cycles. Offline audit only.',digest,checkpoint:details.transaction.checkpoint,receiptSource:details.source,historicalObject:{id:object.objectId,version:object.version,digest:object.digest},rawHarEntries:allEntries.length,preReloadEntriesRetained:0,durationMs,allNetworkRequestsComplete:entries.every((e:any)=>e.response.status===200&&!e._error),fullAssetBackgroundPollingStopped:true,postReloadRequests:postReload.length,grpcRequests:grpc.length,receiptAndHistoricalGrpcRequests:used,providerInitialGrpcIdentityRequests:1,graphqlRequests:graphql.length,fullAssetAdmissionCycles:full.length/2,coinMetadataCycles:metadata.length/4,snapshots,liveNetworkRequests:0,executions:0,parentCompletion:false,inputsSha256:Object.fromEntries([input,profileFile,process.argv[1]].map(f=>[f,sha(f)]))};
  writeFileSync(output,JSON.stringify(proof,null,2)+'\n',{flag:'wx',mode:0o600});console.log(JSON.stringify({...proof,snapshots:undefined,inputsSha256:undefined}));
 }finally{session.close();}
}
main().catch(e=>{console.error(e);process.exitCode=1;});
