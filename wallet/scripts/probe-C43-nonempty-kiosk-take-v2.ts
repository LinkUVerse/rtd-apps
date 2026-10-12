// Copyright (c) LinkU Labs, Inc.
// SPDX-License-Identifier: Apache-2.0
// Actual enabled simulations only, using exclusively the fresh fixture's gas.
import assert from 'node:assert/strict';
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { join, resolve } from 'node:path';
import { RtdGrpcClient, GrpcTypes } from 'rtd-typescript/grpc';
import { Transaction } from 'rtd-typescript/transactions';
import { bcs } from 'rtd-typescript/bcs';
async function main(){
 const[op,nativeFile,output]=process.argv.slice(2);assert(!existsSync(output));
 const read=(f:string)=>JSON.parse(readFileSync(f,'utf8')),sha=(f:string)=>createHash('sha256').update(readFileSync(f)).digest('hex');
 const n=read(nativeFile),binding=read(join(op,'seed/route-binding.json'));assert(n.passed&&n.operation===op&&n.simulations===0&&n.executeRequests===0);
 const client=new RtdGrpcClient({network:'localnet',baseUrl:'http://127.0.0.1:41750',format:'binary',mvr:{url:''}});
 const originalFetch=globalThis.fetch,frames:any[]=[],paths:string[]=[],rows:any[]=[],publicBefore:any={};let stage='initial';
 globalThis.fetch=async(input,init)=>{const u=new URL(input instanceof Request?input.url:String(input));assert(u.origin==='http://127.0.0.1:41750'&&!/ExecuteTransaction|VerifySignature/.test(u.pathname));paths.push(u.href);
  const response=await originalFetch(input,init);if(u.pathname.endsWith('/SimulateTransaction'))frames.push({stage,url:u.href,status:response.status,requestBase64:Buffer.from(init!.body as Uint8Array).toString('base64'),responseBase64:Buffer.from(await response.clone().arrayBuffer()).toString('base64')});return response;};
 let report:any={passed:false};
 try{
  assert.equal((await client.ledgerService.getServiceInfo({})).response.chainId,n.h0);
  const gas=(await client.core.listCoins({owner:n.addresses.source})).objects;assert(gas.length===1&&gas[0].owner.AddressOwner===n.addresses.source);
  const price=(await client.core.getReferenceGasPrice()).referenceGasPrice;
  const protectedIds=[...n.nfts.map((v:any)=>v.objectId),...n.kiosks.map((v:any)=>v.objectId),n.frameworkCap.objectId,n.personalCap.objectId,n.ordinaryListing.objectId,n.lock.objectId,n.exclusiveListing.objectId,gas[0].objectId];
  const before=(await client.core.getObjects({objectIds:protectedIds,include:{content:true}})).objects;assert(before.every(o=>!(o instanceof Error)));publicBefore=before;
  const framework=n.kiosks.find((k:any)=>k.kind==='framework');
  for(const serial of ['1','2','3','4']){
   stage='serial'+serial;const nft=n.nfts.find((v:any)=>v.value.serial===serial),tx=new Transaction();tx.setSender(n.addresses.source);tx.setGasOwner(n.addresses.source);tx.setGasPayment([{objectId:gas[0].objectId,version:gas[0].version,digest:gas[0].digest}]);tx.setGasPrice(price);tx.setGasBudget(100000000);
   const item=tx.moveCall({target:'0x2::kiosk::take',typeArguments:[binding.nftType],arguments:[tx.sharedObjectRef({objectId:framework.objectId,initialSharedVersion:framework.owner.Shared.initialSharedVersion,mutable:true}),tx.objectRef({objectId:n.frameworkCap.objectId,version:before.find(o=>!(o instanceof Error)&&o.objectId===n.frameworkCap.objectId)!.version,digest:before.find(o=>!(o instanceof Error)&&o.objectId===n.frameworkCap.objectId)!.digest}),tx.pure.id(nft.objectId)]});
   tx.transferObjects([item],n.addresses.existingTarget);
   const bytes=await tx.build({client}),digest=await tx.getDigest(),result=await client.core.simulateTransaction({transaction:bytes,checksEnabled:true,doGasSelection:false,include:{effects:true,objectTypes:true,bcs:true}});
   const transaction=result.$kind==='Transaction'?result.Transaction:result.FailedTransaction;
   assert(transaction&&transaction.effects);const effects=bcs.TransactionEffects.parse(transaction.effects.bcs);assert.equal(effects.V2!.transactionDigest,digest);
   const success=serial==='1'||serial==='2';assert.equal(transaction.status.success,success);assert.equal(effects.V2!.status.$kind,success?'Success':'Failure');
   if(!success){const e=effects.V2!.status.Failure.error;assert.equal(e.$kind,'MoveAbort');assert.equal(String(e.MoveAbort[1]),serial==='3'?'8':'4');}
   rows.push({serial,nftId:nft.objectId,digest,bytesBase64:Buffer.from(bytes).toString('base64'),expectedSuccess:success,result:JSON.parse(JSON.stringify(result,(_,v)=>v instanceof Uint8Array?Buffer.from(v).toString('base64'):typeof v==='bigint'?v.toString():v))});
  }
  const after=(await client.core.getObjects({objectIds:protectedIds,include:{content:true}})).objects;assert.deepEqual(after,before);
  assert.equal(frames.length,4);for(const f of frames){const wire=Buffer.from(f.requestBase64,'base64');assert.equal(wire[0],0);assert.equal(wire.readUInt32BE(1),wire.length-5);const req=GrpcTypes.SimulateTransactionRequest.fromBinary(wire.subarray(5));assert.equal(req.checks,GrpcTypes.SimulateTransactionRequest_TransactionChecks.ENABLED);assert.equal(req.doGasSelection,false);const row=rows.find(r=>'serial'+r.serial===f.stage);assert.equal(Buffer.from(req.transaction!.bcs!.value).toString('base64'),row.bytesBase64);assert.equal(f.status,200);}
  assert.equal((await client.ledgerService.getServiceInfo({})).response.chainId,n.h0);
  report={passed:true,observedAt:new Date().toISOString(),h0:n.h0,operation:op,rows,frames,paths,protectedObjectRefsAndContentHeld:true,protectedObjects:protectedIds,source:n.addresses.source,simulations:4,signatures:0,executeRequests:0,indexedAccepted:false,chromeAccepted:false,inputsSha256:Object.fromEntries([resolve(process.argv[1]),nativeFile,join(op,'seed/route-binding.json')].map(f=>[f,sha(f)])),scope:'Actual full unsigned ENABLED/no-gas-selection gRPC frames for framework regular and ordinary listing success, locked MoveAbort8/exclusive MoveAbort4; exact digest/effects. Only fresh-source gas, all original NFT/cap/kiosk/Listing/Lock/gas refs+BCS unchanged afterward. No signed/execute, indexed or wallet Chrome transfer.'};
 }catch(e:any){report={passed:false,stage,errorType:e.name,message:String(e.message).slice(0,1000),frames,rows,paths,source:n.addresses.source,signatures:0,executeRequests:0};process.exitCode=1;}
 finally{globalThis.fetch=originalFetch;writeFileSync(output,JSON.stringify(report,null,2)+'\n',{flag:'wx',mode:0o600});console.log(JSON.stringify({passed:report.passed,stage:report.stage,simulations:frames.length,executeRequests:0}));}
}
main().catch(e=>{console.error(JSON.stringify({passed:false,errorType:e.name,message:String(e.message).slice(0,500)}));process.exitCode=1;});
