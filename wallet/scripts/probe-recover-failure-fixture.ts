// Read-only verification of the execution-gate publication, ABI, and current objects.
import assert from 'node:assert/strict';
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { bcs } from 'rtd-typescript/bcs';
import { RtdGrpcClient } from 'rtd-typescript/grpc';
import { normalizeRtdAddress, toBase64 } from 'rtd-typescript/utils';
import { validateNetworkProfile } from '../src/shared/rpc/profile';
import { WalletReadSession } from '../src/shared/rpc/session';
import { WalletExecutionReader } from '../src/shared/rpc/execution-reader';
import { WalletFullnodeReader } from '../src/shared/rpc/fullnode-reader';
async function main() {
  const [profileFile, publication, output] = process.argv.slice(2);
  const json=(file:string)=>JSON.parse(readFileSync(file,'utf8'));
  const profile=validateNetworkProfile(json(profileFile));
  const pending=json(join(publication,'pending.json'));
  assert.equal(pending.h0,profile.expectedGenesisDigest);
  const session=new WalletReadSession(profile),original=globalThis.fetch,paths:string[]=[];
  globalThis.fetch=(input,init)=>{
    const url=new URL(input instanceof Request?input.url:String(input));
    assert.equal(url.hostname,'127.0.0.1');
    assert(['/GetServiceInfo','/GetTransaction','/GetObject','/GetPackage'].some(method=>url.pathname.endsWith(method)));
    paths.push(url.pathname);return original(input,init);
  };
  try {
    const execution=new WalletExecutionReader(session),objects=new WalletFullnodeReader(session);
    const recovered=await execution.lookup(pending.digest);
    assert(recovered?.success);assert.equal(recovered.digest,pending.digest);
    const receipt=json(join(publication,'receipt.json')).Transaction;
    assert.equal(receipt.digest,recovered.digest);assert.equal(receipt.status.success,true);
    const packages=receipt.effects.changedObjects.filter((value:{outputState:string})=>value.outputState==='PackageWrite');
    assert.equal(packages.length,1);const packageId=packages[0].objectId;
    const idFor=(name:string)=>{
      const found=Object.entries(receipt.objectTypes).filter(([,type])=>type===`${packageId}::execution_gate::${name}`);
      assert.equal(found.length,1);return found[0][0];
    };
    const gateId=idFor('Gate'),capId=idFor('AdminCap');
    const gate=await objects.object(gateId),cap=await objects.object(capId);
    assert(gate&&cap);assert.equal(gate.owner.$kind,'Shared');
    assert.equal(cap.owner.$kind,'AddressOwner');assert.equal(cap.owner.AddressOwner,pending.sender);
    const Gate=bcs.struct('Gate',{id:bcs.Address,closed:bcs.bool(),visits:bcs.u64()});
    const Cap=bcs.struct('AdminCap',{id:bcs.Address,gate:bcs.Address});
    const state=Gate.parse(gate.content),admin=Cap.parse(cap.content);
    assert.equal(toBase64(Gate.serialize(state).toBytes()),toBase64(gate.content));
    assert.equal(toBase64(Cap.serialize(admin).toBytes()),toBase64(cap.content));
    assert.deepEqual(state,{id:gateId,closed:false,visits:'0'});assert.deepEqual(admin,{id:capId,gate:gateId});
    const client=new RtdGrpcClient({network:'localnet',baseUrl:profile.endpoints.fullnodeGrpcWeb,format:'binary',mvr:{url:''}});
    assert.equal((await client.ledgerService.getServiceInfo({})).response.chainId,pending.h0);
    const pkg=(await client.movePackageService.getPackage({packageId})).response.package;
    assert.equal(pkg?.storageId,packageId);assert.equal(pkg.modules.length,1);
    const module=pkg.modules[0];assert.equal(module.name,'execution_gate');
    assert.deepEqual(module.datatypes.find(type=>type.name==='Gate')?.fields.map(field=>field.name),['id','closed','visits']);
    assert.deepEqual(module.datatypes.find(type=>type.name==='AdminCap')?.fields.map(field=>field.name),['id','gate']);
    assert(module.functions.some(fn=>fn.name==='visit'));assert(module.functions.some(fn=>fn.name==='close'));
    assert.equal(gate.type,`${packageId}::execution_gate::Gate`);assert.equal(cap.type,`${packageId}::execution_gate::AdminCap`);
    writeFileSync(output,JSON.stringify({observedAt:new Date().toISOString(),h0:pending.h0,sender:normalizeRtdAddress(pending.sender),
      digest:pending.digest,packageId,gateId,capId,gateOwner:gate.owner,state,admin,recovered,paths,dispatches:0,
      scope:'Actual publication recovery and ABI/BCS reads; Gate still open. Not wallet failed execution acceptance.'},null,2)+'\n',{flag:'wx'});
    console.log(JSON.stringify({packageId,gateId,capId,state,dispatches:0}));
  } finally {session.close();globalThis.fetch=original;}
}
main().catch(error=>{console.error(error);process.exitCode=1;});
