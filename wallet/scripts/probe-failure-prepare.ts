// Unsigned preparation diagnostic; execution is forbidden.
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync} from 'node:fs';
import {Transaction} from 'rtd-typescript/transactions';
import {GrpcTypes} from 'rtd-typescript/grpc';
import {validateNetworkProfile} from '../src/shared/rpc/profile';
import {WalletReadSession} from '../src/shared/rpc/session';
import {encodePreparedTransaction,decodePreparedTransaction} from '../src/shared/rpc/prepared-wire';
import {WalletTransactionReader} from '../src/shared/rpc/transaction-reader';
async function main(){
 const [profileFile,fixtureFile,sender,output]=process.argv.slice(2);
 const profile=validateNetworkProfile(JSON.parse(readFileSync(profileFile,'utf8')));
 const fixture=JSON.parse(readFileSync(fixtureFile,'utf8'));
 const session=new WalletReadSession(profile),original=globalThis.fetch,simulations:unknown[]=[];
 globalThis.fetch=async(input,init)=>{
  const url=new URL(input instanceof Request?input.url:String(input));assert.equal(url.hostname,'127.0.0.1');assert(!url.pathname.endsWith('/ExecuteTransaction'));
  const response=await original(input,init);
  if(url.pathname.endsWith('/SimulateTransaction')){
   const bytes=new Uint8Array(await response.clone().arrayBuffer());
   const size=new DataView(bytes.buffer).getUint32(1);assert.equal(bytes[0],0);
   simulations.push(GrpcTypes.SimulateTransactionResponse.fromBinary(bytes.slice(5,5+size)));
  }
  return response;
 };
 let result:unknown;
 try{
  const tx=new Transaction();tx.moveCall({target:`${fixture.packageId}::execution_gate::visit`,arguments:[tx.object(fixture.gateId)]});
  result=await new WalletTransactionReader(session).prepare(tx,sender);
  decodePreparedTransaction(encodePreparedTransaction(result as any));
  console.log(JSON.stringify({passed:true,simulations:simulations.length,dispatches:0}));
 }catch(error){result={error:String(error),stack:(error as Error).stack,...error as object};console.error(result);process.exitCode=1;}
 finally{session.close();globalThis.fetch=original;writeFileSync(output,JSON.stringify({result,simulations},(_,v)=>typeof v==='bigint'?v.toString():v instanceof Uint8Array?Buffer.from(v).toString('base64'):v,2)+'\n',{flag:'wx'});}
}
main().catch(error=>{console.error(error);process.exitCode=1;});
