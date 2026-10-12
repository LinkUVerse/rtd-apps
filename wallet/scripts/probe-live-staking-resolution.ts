// Exercise actual unresolved Move/object/gas resolution without signing or dispatch.
import assert from 'node:assert/strict';
import { readFileSync, writeFileSync } from 'node:fs';
import { Transaction } from 'rtd-typescript/transactions';
import { GrpcTypes } from 'rtd-typescript/grpc';
import { fromBase64, normalizeRtdAddress } from 'rtd-typescript/utils';
import { validateNetworkProfile } from '../src/shared/rpc/profile';
import { WalletReadSession } from '../src/shared/rpc/session';
import { WalletTransactionReader } from '../src/shared/rpc/transaction-reader';
async function main() {
 const [profileFile, owner, output] = process.argv.slice(2);
 const profile = validateNetworkProfile(JSON.parse(readFileSync(profileFile, 'utf8')));
 const validator = '0xbff484df028a08ddddeec25f086ee08b1c79dc9e411a378fe1a92620f3bbded4';
 const original = globalThis.fetch;
 const trace: {path:string; fixedBytes?:boolean; checks?:number; gasSelection?:boolean}[] = [];
 globalThis.fetch = async (input, init) => {
  const url = new URL(input instanceof Request ? input.url : String(input));
  assert.equal(url.origin, new URL(profile.endpoints.fullnodeGrpcWeb).origin);
  assert(url.pathname.endsWith('/GetServiceInfo') || url.pathname.endsWith('/SimulateTransaction'));
  const entry: typeof trace[number] = {path:url.pathname};
  if(url.pathname.endsWith('/SimulateTransaction')) {
   assert(init?.body instanceof Uint8Array);
   const request = GrpcTypes.SimulateTransactionRequest.fromBinary(init.body.subarray(5));
   entry.fixedBytes = !!request.transaction?.bcs; entry.checks = request.checks; entry.gasSelection = request.doGasSelection;
   assert.equal(request.checks, GrpcTypes.SimulateTransactionRequest_TransactionChecks.ENABLED);
  }
  trace.push(entry); return original(input,init);
 };
 const session = new WalletReadSession(profile);
 try {
  const transaction = new Transaction();
  const [coin] = transaction.splitCoins(transaction.gas,[1_000_000_000n]);
  transaction.moveCall({target:'0x3::rtd_system::request_add_stake',arguments:[transaction.object('0x5'),coin,transaction.pure.address(validator)]});
  assert(transaction.getData().inputs.some(input => input.$kind === 'UnresolvedObject'));
  const reader = new WalletTransactionReader(session);
  const prepared = await reader.prepare(transaction,owner);
  const final = await reader.simulate(prepared.bytesBase64,owner);
  assert.equal(final.$kind,'Transaction');
  const data = Transaction.from(fromBase64(prepared.bytesBase64)).getData();
  assert(data.inputs.some(input => input.$kind === 'Object' && input.Object.$kind === 'SharedObject' && input.Object.SharedObject.objectId === normalizeRtdAddress('0x5')));
  const simulations = trace.filter(entry => entry.path.endsWith('/SimulateTransaction'));
  assert.equal(simulations.length,3);
  assert.equal(simulations[0].fixedBytes,false); assert.equal(simulations[0].gasSelection,true);
  for(const entry of simulations.slice(1)) {assert.equal(entry.fixedBytes,true);assert.equal(entry.gasSelection,false);}
  const evidence = {observedAt:new Date().toISOString(),h0:profile.expectedGenesisDigest,sender:normalizeRtdAddress(owner),validator,trace,digest:prepared.digest,gasBudget:prepared.gasBudget,gasPrice:prepared.gasPrice,gasPaymentKind:prepared.gasPaymentKind,inputs:data.inputs,commands:data.commands,dispatches:0,scope:'Actual unresolved system Move call and shared object/gas resolution followed by fixed-byte simulations; no signature, execution or Chrome.'};
  writeFileSync(output,JSON.stringify(evidence,null,2)+'\n',{flag:'wx'});
  console.log(JSON.stringify({digest:prepared.digest,gasPrice:prepared.gasPrice,gasBudget:prepared.gasBudget,simulations,dispatches:0}));
 } finally {session.close();globalThis.fetch=original;}
}
main().catch(error=>{console.error(error);process.exitCode=1;});
