// Read-only identity and progress proof for the retained G4 process reload.
import assert from 'node:assert/strict';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { RtdGrpcClient } from 'rtd-typescript/grpc';
async function main() {
 const [output, baseline] = process.argv.slice(2); assert(!existsSync(output));
 const h0 = 'BTrU3deMDbnWcUWLJ2ruDj9vbCC4gaYnVj8qV3K2nFah';
 const client = new RtdGrpcClient({network:'localnet',baseUrl:'http://127.0.0.1:43150',format:'binary'});
 const initial = await client.ledgerService.getServiceInfo({},{timeout:15000});
 assert.equal(initial.response.chainId,h0);
 assert(initial.response.checkpointHeight !== undefined);
 const checkpoint = await client.ledgerService.getCheckpoint({checkpointId:{oneofKind:'sequenceNumber',sequenceNumber:initial.response.checkpointHeight},readMask:{paths:['digest','sequence_number']}},{timeout:15000});
 assert.equal(checkpoint.response.checkpoint?.sequenceNumber,initial.response.checkpointHeight);
 assert(checkpoint.response.checkpoint?.digest);
 const samples:any[]=[];
 for(let i=0;i<4;i++) {
  if(i) await new Promise(r=>setTimeout(r,10000));
  const {response}=await client.ledgerService.getServiceInfo({},{timeout:15000}); assert.equal(response.chainId,h0);
  samples.push({at:new Date().toISOString(),height:String(response.checkpointHeight),epoch:String(response.epoch)});
 }
 assert(BigInt(samples.at(-1).height)>BigInt(samples[0].height));
 if(baseline) {const before=JSON.parse(readFileSync(baseline,'utf8'));assert(before.passed);assert(BigInt(samples[0].height)>=BigInt(before.samples.at(-1).height));}
 writeFileSync(output,JSON.stringify({passed:true,h0,samples,serviceGenesisIdentityVerified:true,currentRetainedCheckpointRead:true,checkpoint:{sequence:String(checkpoint.response.checkpoint?.sequenceNumber),digest:checkpoint.response.checkpoint?.digest},advancing:true,baseline:baseline??null,signatures:0,executions:0},null,2)+'\n',{flag:'wx',mode:0o600});
 console.log(JSON.stringify({passed:true,first:samples[0].height,last:samples.at(-1).height}));
}
main().catch(e=>{console.error(e);process.exitCode=1});
