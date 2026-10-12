// Actual public TLS domain admission; complete assets and uncovered Display still refuse.
import assert from 'node:assert/strict';
import {readFileSync, writeFileSync} from 'node:fs';
import {validateNetworkProfile} from '../src/shared/rpc/profile';
import {WalletReadSession} from '../src/shared/rpc/session';
import {WalletStakingSnapshotReader} from '../src/shared/rpc/staking-snapshot-reader';
import {WalletAssetReader} from '../src/shared/rpc/asset-reader';
import {SnapshotReadError} from '../src/shared/rpc/graphql-snapshot';
import {displayHistoryCapability, DISPLAY_HISTORY_SELECTION} from '../src/shared/rpc/display-history';

async function main() {
 const [profileFile, owner, output] = process.argv.slice(2);
 const profile=validateNetworkProfile(JSON.parse(readFileSync(profileFile,'utf8')));
 assert.equal(profile.endpoints.graphqlUrl,'https://127.0.0.1:39600/graphql');
 const native=globalThis.fetch;
 const requests:{status:number;queryKind:string;errorPaths:unknown[]}[]=[];
 globalThis.fetch=async(input, init)=>{
  const url=new URL(input instanceof Request?input.url:String(input));
  assert.equal(url.hostname,'127.0.0.1');
  assert.equal(url.href,profile.endpoints.graphqlUrl);
  assert.equal(url.protocol,'https:');
  const response=await native(input,init);
  const request=JSON.parse(String(init?.body));
  const payload=await response.clone().json();
  requests.push({status:response.status,queryKind:request.query.match(/query\s+(\w+)/)?.[1]??'unknown',errorPaths:(payload.errors??[]).map((e:any)=>({path:e.path,code:e.extensions?.code}))});
  return response;
 };
 const session=new WalletReadSession(profile);
 const start=performance.now();
 try {
  const staking=await WalletStakingSnapshotReader.read(session,owner);
  assert.equal(staking.snapshot.dependencies.length,6);assert.equal(staking.snapshot.displayHistory,undefined);
  assert(staking.value.validators.length>0);assert(staking.value.positions!==null);
  const stakingRequests=requests.length;
  const capabilityQuery=async(checkpoint:number)=>{
   const response=await fetch(profile.endpoints.graphqlUrl!,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({query:`query OptionalPipelineDisplayCheck { walletGenesis: checkpoint(sequenceNumber: 0) {digest} checkpoint(sequenceNumber: ${checkpoint}) {sequenceNumber digest query {${DISPLAY_HISTORY_SELECTION}}} }`}),signal:AbortSignal.timeout(20_000),redirect:'error',credentials:'omit'});
   assert.equal(response.status,200);return response.json();
  };
  const covered=await capabilityQuery(100);
  assert.equal(covered.errors?.length??0,0);assert.equal(covered.data.walletGenesis.digest,profile.expectedGenesisDigest);
  const row=covered.data.checkpoint;assert.equal(row.sequenceNumber,100);
  const capability=displayHistoryCapability(row.query.walletDisplayService,profile.expectedGenesisDigest,100,row.digest);
  const uncoveredCheckpoint=Number(capability.coverage.lastCheckpoint)+10_000;
  assert(uncoveredCheckpoint<Number(staking.snapshot.checkpoint),'Uncovered Display probe must be below admitted domain S');
  const uncovered=await capabilityQuery(uncoveredCheckpoint);
  assert.equal(uncovered.data.walletGenesis.digest,profile.expectedGenesisDigest);
  assert((uncovered.errors?.length??0)>0);
  assert.equal(uncovered.data.checkpoint?.query??null,null);
  let assetFailure:SnapshotReadError|undefined;
  try {await WalletAssetReader.open(session,{timeoutMs:20_000});}
  catch(error){if(error instanceof SnapshotReadError) assetFailure=error;else throw error;}
  assert(assetFailure,'Full assets must still fail without Display coverage');
  assert(requests.every(r=>r.status===200),'No HTTP outage is being misreported as a coverage rejection');
  const evidence={passed:true,observedAt:new Date().toISOString(),profileRevision:profile.revision,endpoint:profile.endpoints.graphqlUrl,
   staking:{proof:staking.snapshot,value:staking.value,requests:stakingRequests},
   display:{coveredCheckpoint:100,capability,uncoveredCheckpoint,uncoveredRefused:true,uncoveredErrors:requests.filter(r=>r.queryKind==='OptionalPipelineDisplayCheck').at(-1)?.errorPaths},
   fullAsset:{rejected:true,reason:assetFailure.reason},requests,elapsedMs:performance.now()-start,
   simulations:0,signatures:0,dispatches:0,
   scope:'Actual public TLS production staking-only reader, covered S100 capability and uncovered Display/full-asset refusal; no fallback, nonempty original stake, UI, large-history or trial acceptance.'};
  writeFileSync(output,JSON.stringify(evidence,null,2)+'\n',{flag:'wx',mode:0o600});
  console.log(JSON.stringify({passed:true,checkpoint:staking.snapshot.checkpoint,epoch:staking.value.epoch,positions:staking.value.positions.length,stakingRequests,
   displayCoveredThrough:capability.coverage.lastCheckpoint,uncoveredCheckpoint,fullAssetRejected:true,fullAssetReason:assetFailure.reason,
   requests:requests.length,elapsedMs:evidence.elapsedMs,dispatches:0}));
 } finally {session.close();globalThis.fetch=native;}
}
main().catch(error=>{console.error(JSON.stringify({passed:false,name:error.name,message:error.message}));process.exitCode=1});
