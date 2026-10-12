// Copyright (c) LinkU Labs, Inc.
// SPDX-License-Identifier: Apache-2.0
// Direct original Fullnode NotFound proof; readonly and no routing fallback.
import assert from 'node:assert/strict';
import { readFileSync, writeFileSync } from 'node:fs';
import { RtdGrpcClient, RpcError } from 'rtd-typescript/grpc';
import { validateNetworkProfile } from '../src/shared/rpc/profile';
async function main(){
 const [file,output]=process.argv.slice(2);const p=validateNetworkProfile(JSON.parse(readFileSync(file,'utf8')));
 assert.equal(p.endpoints.fullnodeGrpcWeb,'http://127.0.0.1:39400');
 const methods:string[]=[];
 const client=new RtdGrpcClient({network:p.sdkNetwork,baseUrl:p.endpoints.fullnodeGrpcWeb,format:'binary',mvr:{url:''},fetch:async(url,init)=>{
  assert(String(url).startsWith(p.endpoints.fullnodeGrpcWeb+'/rtd.rpc.v2.LedgerService/'));
  const method=String(url).split('/').pop()!;assert(['GetServiceInfo','GetTransaction','GetCheckpoint','GetObject'].includes(method));methods.push(method);return fetch(url,init);
 }});
 let stage='identity-before';const options={timeoutMs:20000}; const before=(await client.ledgerService.getServiceInfo({},options)).response;
 console.error(JSON.stringify({h0Matches:before.chainId===p.expectedGenesisDigest,lower:String(before.lowestAvailableCheckpoint),objectLower:String(before.lowestAvailableCheckpointObjects)}));assert.equal(before.chainId,p.expectedGenesisDigest);assert(BigInt(before.lowestAvailableCheckpoint!)>914n);assert(BigInt(before.lowestAvailableCheckpointObjects!)>0n);
 const cases=[['transaction',()=>client.ledgerService.getTransaction({digest:'4UBkHPNAax9mP1Q2PfDADpjSmTewNtvwQ2cxeomCh1u6',readMask:{paths:['digest','checkpoint']}},options)],
  ['checkpoint',()=>client.ledgerService.getCheckpoint({checkpointId:{oneofKind:'sequenceNumber',sequenceNumber:914n},readMask:{paths:['digest','sequence_number']}},options)],
  ['object-version',()=>client.ledgerService.getObject({objectId:'0x0000000000000000000000000000000000000000000000000000000000000005',version:1n,readMask:{paths:['object_id','version']}},options)]] as const;
 const missing=[];
 for(const [kind,read] of cases){stage=kind;let code;try{await read();}catch(e:any){console.error(JSON.stringify({witness:kind,errorType:e.name,code:e.code,instanceofRpcError:e instanceof RpcError}));assert(e instanceof RpcError);code=e.code;}assert.equal(code,'NOT_FOUND');missing.push({kind,code});}
 const after=(await client.ledgerService.getServiceInfo({},options)).response;assert.equal(after.chainId,p.expectedGenesisDigest);
 assert(after.lowestAvailableCheckpoint!>=before.lowestAvailableCheckpoint!);assert(after.lowestAvailableCheckpointObjects!>=before.lowestAvailableCheckpointObjects!);
 writeFileSync(output,JSON.stringify({passed:true,observedAt:new Date().toISOString(),h0:p.expectedGenesisDigest,lowerBefore:String(before.lowestAvailableCheckpoint),objectLowerBefore:String(before.lowestAvailableCheckpointObjects),lowerAfter:String(after.lowestAvailableCheckpoint),missing,methods,simulations:0,dispatches:0,scope:'Direct native Fullnode proof for the exact independently preserved archive transaction/checkpoint/object version; no archive fallback or Chrome acceptance'},null,2)+'\n',{flag:'wx'});
 console.log(JSON.stringify({passed:true,missing,requests:methods.length}));
}
main().catch(e=>{console.error(JSON.stringify({passed:false,errorType:e?.name,location:String(e?.stack).split('\n').find((s:string)=>s.includes('probe-pruned-fullnode-witness.ts:')),actual:typeof e?.actual==='string'?e.actual:undefined,expected:typeof e?.expected==='string'?e.expected:undefined}));process.exitCode=1;});
