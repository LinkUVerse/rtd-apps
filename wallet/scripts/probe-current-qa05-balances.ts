// Current production readers on the explicit loopback dev endpoint; no write or fallback.
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,existsSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {resolve} from 'node:path';
import {validateNetworkProfile} from '../src/shared/rpc/profile';
import {WalletReadSession} from '../src/shared/rpc/session';
import {WalletBalanceReader} from '../src/shared/rpc/balance-reader';
import {WalletCoinMetadataReader} from '../src/shared/rpc/coin-metadata-reader';
import {normalizeStructTag} from 'rtd-typescript/utils';
async function main(){
 const[profileFile,output]=process.argv.slice(2);assert(!existsSync(output));const read=(f:string)=>JSON.parse(readFileSync(f,'utf8')),sha=(f:string)=>createHash('sha256').update(readFileSync(f)).digest('hex');
 const profile=validateNetworkProfile(read(profileFile)),buildFile='migrationToGRpcOrGraphQLDoc/workLog/20261006-personal-production-build-04.json',build=read(buildFile),tokenFile='migrationToGRpcOrGraphQLDoc/workLog/20261006-RPC-04-loopback-token-read-01.json',token=read(tokenFile);
 assert(build.passed);assert.equal(build.profileSha256,sha(profileFile));assert.equal(profile.endpoints.graphqlUrl,'http://127.0.0.1:39610/graphql');
 const owner='0x11e90d26087af15981c5e7d0739ce58886755f1ac83ebaeb1f7c643b87e5f614',requests:any[]=[],original=globalThis.fetch;
 globalThis.fetch=async(input,init)=>{const u=new URL(input instanceof Request?input.url:String(input));assert.equal(u.href,profile.endpoints.graphqlUrl);const query=JSON.parse(String(init?.body)).query;assert(!query.includes('mutation'));const r=await original(input,init),body=await r.clone().json();requests.push({kind:query.match(/query\s+(\w+)/)?.[1],status:r.status,errors:body.errors?.length??0,checkpoint:query.match(/walletSnapshot: checkpoint\(sequenceNumber: (\d+)/)?.[1],items:body.data?.walletSnapshot?.query?.address?.balances?.nodes?.length,hasNextPage:body.data?.walletSnapshot?.query?.address?.balances?.pageInfo?.hasNextPage});return r};
 const session=new WalletReadSession(profile);
 try{
  const balances=await WalletBalanceReader.read(session,owner),balanceRequests=requests.length;assert(balances.value.length>=2);assert(balances.value.some(c=>normalizeStructTag(c.coinType)===normalizeStructTag(token.coinType)));
  for(const c of balances.value)assert.equal(BigInt(c.balance),BigInt(c.coinBalance)+BigInt(c.addressBalance));
  const native=await WalletCoinMetadataReader.read(session,'0x2::rtd::RTD');assert.equal(native.value?.decimals,9);assert.equal(native.value?.symbol,'RTD');
  const nonnative=await WalletCoinMetadataReader.read(session,token.coinType);assert.equal(nonnative.value?.decimals,6);assert.equal(nonnative.value?.symbol,'WMIG');
  const missingType='0x9::wallet_missing_probe::ABSENT',missing=await WalletCoinMetadataReader.read(session,missingType);assert.equal(missing.value,null);
  assert(requests.every(r=>r.status===200&&r.errors===0));assert.equal(requests[balanceRequests-1].kind,'WalletSnapshotRevalidate');
  const report={passed:true,observedAt:new Date().toISOString(),source:build.sourceAfter,endpoint:profile.endpoints.graphqlUrl,owner,balances,native,nonnative,absence:{coinType:missingType,result:missing},balanceRequests,requests,signatures:0,simulations:0,executeRequests:0,certificateChanges:0,inputsSha256:Object.fromEntries([profileFile,buildFile,tokenFile,resolve(process.argv[1])].map(f=>[resolve(f),sha(f)])),scope:'Current C24 production balance and metadata readers via explicit HTTP loopback: complete actual multi-coin collection, fixedS/final validation, exact coin+address totals, RTD9/WMIG6 and explicit null metadata. Not fresh spend authority, real multi-page or current UI execution; those categories independently tested and historic UI lineage verified.'};
  writeFileSync(output,JSON.stringify(report,null,2)+'\n',{flag:'wx',mode:0o600});console.log(JSON.stringify({passed:true,checkpoint:balances.snapshot.checkpoint,coins:balances.value.length,requests:requests.length}));
 }finally{session.close();globalThis.fetch=original}
}
main().catch(e=>{console.error(JSON.stringify({passed:false,errorType:e.name,message:String(e.message).slice(0,400)}));process.exitCode=1});
