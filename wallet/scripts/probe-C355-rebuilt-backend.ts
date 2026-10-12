// Copyright (c) LinkU Labs, Inc.
// SPDX-License-Identifier: Apache-2.0
// Actual production readers against the independently rebuilt C355 stores; read methods only.
import assert from 'node:assert/strict';
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { RtdGrpcClient } from 'rtd-typescript/grpc';
import { WalletReadSession } from '../src/shared/rpc/session';
import { validateNetworkProfile } from '../src/shared/rpc/profile';
import { probeNetworkIdentity } from '../src/shared/rpc/identity';
import { WalletAssetReader } from '../src/shared/rpc/asset-reader';
import { WalletFullnodeReader } from '../src/shared/rpc/fullnode-reader';
import { WalletAccountHistoryReader } from '../src/shared/rpc/account-history-reader';

const serialize=(v:any)=>JSON.stringify(v,(_k,x)=>typeof x==='bigint'?String(x):x instanceof Uint8Array?Buffer.from(x).toString('base64'):x,2);
async function main(){
 const [profileFile,oracleFile,output]=process.argv.slice(2);assert(!existsSync(output));
 const profile=validateNetworkProfile(JSON.parse(readFileSync(profileFile,'utf8')));
 const oracle=JSON.parse(readFileSync(oracleFile,'utf8'));assert(oracle.passed);
 assert.equal(profile.expectedGenesisDigest,oracle.h0);
 const session=new WalletReadSession(profile),original=globalThis.fetch,frames:any[]=[],data:any={accounts:{}};
 const allowed=new Set(Object.values(profile.endpoints).map(u=>new URL(u!).origin));
 globalThis.fetch=async(input,init)=>{
  const url=new URL(input instanceof Request?input.url:String(input));assert(allowed.has(url.origin));
  assert(!/Execute|Simulate|VerifySignature/.test(url.pathname));
  const frame:any={url:String(url),at:new Date().toISOString(),requestBase64:Buffer.from(init?.body as any??'').toString('base64')};frames.push(frame);
  try{const res=await original(input,init);frame.status=res.status;frame.responseBase64=Buffer.from(await res.clone().arrayBuffer()).toString('base64');return res;}
  catch(e:any){frame.errorType=e.name;throw e;}
 };
 let result:any;
 try{
  data.identity=await probeNetworkIdentity(session,{timeoutMs:30000});assert.equal(data.identity.state,'identity-verified');
  for(const [role,expected]of Object.entries<any>(oracle.owners)){
   const row:any={};data.accounts[role]=row;
   row.balances=await new WalletFullnodeReader(session).balances(expected.address);
   const assets=await WalletAssetReader.open(session);
   row.assets=await assets.ownedObjects(expected.address);
   row.kiosks=await assets.kiosks(expected.address);
   row.history=await new WalletAccountHistoryReader(session).read(expected.address);
   assert.deepEqual(row.history.transactions.map((x:any)=>x.digest).sort(),expected.pages.flatMap((p:any)=>p.transactions.map((x:any)=>x.digest)).sort());
  }
  const digest=(Object.values<any>(oracle.owners)[0]).pages[0].transactions[0].digest;
  const client=new RtdGrpcClient({network:profile.sdkNetwork,baseUrl:profile.endpoints.archiveGrpcWeb!,format:'binary',mvr:{url:''},fetch:globalThis.fetch});
  const read=await client.ledgerService.getTransaction({digest,readMask:{paths:['digest','checkpoint','transaction.bcs','effects.bcs']}},{timeout:30000});
  assert.equal(read.response.transaction?.digest,digest);assert(read.response.transaction?.transaction?.bcs?.value?.length);
  assert(read.response.transaction!.checkpoint!<=709569n);data.archiveTransaction=read.response;
  result={passed:true,actualFourSurfaces:true,threeAccountDigestsIdentical:true,archiveTransactionRead:true};
 }catch(e:any){result={passed:false,error:{name:e.name,message:e.message,reason:e.reason}};}
 finally{session.close();globalThis.fetch=original;}
 writeFileSync(output,serialize({...result,at:new Date().toISOString(),profile,data,frames,signatures:0,executions:0,
  browserAcceptance:false,parentCompletion:false,inputsSha256:Object.fromEntries([process.argv[1],profileFile,oracleFile].map(p=>[p,createHash('sha256').update(readFileSync(p)).digest('hex')]))})+'\n',{flag:'wx',mode:0o600});
 console.log(JSON.stringify({...result,requests:frames.length}));if(!result.passed)process.exitCode=1;
}
main().catch(e=>{console.error(e);process.exitCode=1});
