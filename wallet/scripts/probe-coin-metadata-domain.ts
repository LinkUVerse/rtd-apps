// Actual public TLS metadata domain; no Fullnode fallback or transaction.
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync} from 'node:fs';
import {validateNetworkProfile} from '../src/shared/rpc/profile';
import {WalletReadSession} from '../src/shared/rpc/session';
import {WalletCoinMetadataReader} from '../src/shared/rpc/coin-metadata-reader';
import {WalletAssetReader} from '../src/shared/rpc/asset-reader';
import {SnapshotReadError} from '../src/shared/rpc/graphql-snapshot';

async function main(){
 const [profileFile,output]=process.argv.slice(2);
 const profile=validateNetworkProfile(JSON.parse(readFileSync(profileFile,'utf8')));
 assert.equal(profile.endpoints.graphqlUrl,'https://127.0.0.1:39600/graphql');
 const fetchImpl=globalThis.fetch;const requests:{kind:string;status:number;display:boolean;errors:number}[]=[];
 globalThis.fetch=async(input,init)=>{
  const url=new URL(input instanceof Request?input.url:String(input));assert.equal(url.href,profile.endpoints.graphqlUrl);
  const query=JSON.parse(String(init?.body)).query;
  const response=await fetchImpl(input,init);const body=await response.clone().json();
  requests.push({kind:query.match(/query\s+(\w+)/)?.[1]??'unknown',status:response.status,display:query.includes('walletDisplayService'),errors:body.errors?.length??0});return response;
 };
 const session=new WalletReadSession(profile),start=performance.now();
 try {
  const native=await WalletCoinMetadataReader.read(session,'0x2::rtd::RTD');
  assert(native.value);assert.equal(native.value.decimals,9);assert.equal(native.value.symbol,'RTD');assert.equal(native.snapshot.dependencies.length,2);assert.equal(native.snapshot.displayHistory,undefined);
  const metadataRequests=requests.length;assert.equal(metadataRequests,4);assert(requests.every(r=>!r.display&&r.errors===0));
  const missingType='0x9::wallet_missing_probe::ABSENT';const absent=await WalletCoinMetadataReader.read(session,missingType);assert.equal(absent.value,null);assert.equal(requests.length,8);
  let reason:string|undefined;
  try{await WalletAssetReader.open(session)}catch(error){if(!(error instanceof SnapshotReadError))throw error;reason=error.reason;}
  assert(reason,'Full Display asset domain must still reject uncovered history');assert(requests.every(r=>r.status===200));
  const evidence={passed:true,observedAt:new Date().toISOString(),endpoint:profile.endpoints.graphqlUrl,metadata:native,metadataRequests,
   absence:{type:missingType,result:absent},fullAssetRefused:true,fullAssetReason:reason,requests,elapsedMs:performance.now()-start,
   simulations:0,signatures:0,dispatches:0,scope:'Actual public TLS metadata-only native coin and explicit missing type, current production reader and native locks; separate proofs, no claim of complete assets, nonnative currency conversion, UI approval or trial.'};
  writeFileSync(output,JSON.stringify(evidence,null,2)+'\n',{flag:'wx',mode:0o600});
  console.log(JSON.stringify({passed:true,checkpoint:native.snapshot.checkpoint,decimals:native.value.decimals,metadataRequests,absence:true,fullAssetRefused:true,requests:requests.length,elapsedMs:evidence.elapsedMs,dispatches:0}));
 }finally{session.close();globalThis.fetch=fetchImpl;}
}
main().catch(error=>{console.error(JSON.stringify({passed:false,errorType:error.name}));process.exitCode=1});
