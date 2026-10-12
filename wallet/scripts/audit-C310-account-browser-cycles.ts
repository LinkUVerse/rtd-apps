// Copyright (c) LinkU Labs, Inc.
// SPDX-License-Identifier: Apache-2.0
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,existsSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {parse,print} from 'graphql';
import {GrpcTypes} from 'rtd-typescript/grpc';
import {WalletAccountHistoryReader} from '../src/shared/rpc/account-history-reader';
import {validateNetworkProfile} from '../src/shared/rpc/profile';
import {WalletReadSession} from '../src/shared/rpc/session';

async function main(){
 const [capture,output]=process.argv.slice(2);assert(capture&&output&&!existsSync(output));
 const profileFile='/Users/changzechuan/.local/state/rtd-wallet-migration/dev-20261011-04/C274-profile.json';
 const profile=validateNetworkProfile(JSON.parse(readFileSync(profileFile,'utf8')));
 const entries=JSON.parse(readFileSync(capture,'utf8')).log.entries;
 const gql=entries.filter((e:any)=>e.request.url.endsWith('/graphql'));
 const expected=['WalletHistoryCoverage','WalletSnapshotAdmissionAndPin','WalletAccountHistory','WalletHistoryCoverage','WalletSnapshotRevalidate'];
 const reports:any[]=[];
 for(let offset=0;offset<gql.length;offset+=5){
  const cycle=gql.slice(offset,offset+5);
  const names=cycle.map((e:any)=>JSON.parse(e.request.postData.text).query.match(/query\s+(\w+)/)?.[1]);
  assert.deepEqual(names,expected.slice(0,cycle.length));
  const exceptions=cycle.flatMap((e:any,i:number)=>e.response._error||e.response.status!==200?[{index:offset+i,error:e.response._error,status:e.response.status}]:[]);
  for(const e of cycle){
   assert.equal(new URL(e.request.url).hostname,'127.0.0.1');
   if(e.response.content.text){const r=JSON.parse(e.response.content.text);assert(!r.errors);assert(r.data);}
  }
  if(cycle.length<5){reports.push({offset,partialCycle:true,exceptions,accepted:false});continue;}
  const page=JSON.parse(cycle[2].request.postData.text).variables;
  const session=new WalletReadSession(profile);let used=0;
  const fetch:typeof globalThis.fetch=async(input,init)=>{
   const e=cycle[used++];assert(e);
   assert.equal(String(input),e.request.url);assert.equal(init?.method,'POST');
   const actual=JSON.parse(String(init?.body)),expected=JSON.parse(e.request.postData.text);
   assert.equal(print(parse(actual.query)),print(parse(expected.query)));assert.deepEqual(actual.variables??{},expected.variables??{});
   if(e.response._error){assert.equal(e.response._error,'net::ERR_ABORTED');throw new DOMException('Captured Chrome cancellation','AbortError');}
   assert.equal(e.response.status,200);
   return new Response(e.response.content.text,{status:200,headers:{'content-type':'application/json'}});
  };
  let result;
  try{
   const read=new WalletAccountHistoryReader(session,{fetch}).read(page.address);
   if(exceptions.length)await assert.rejects(read,(e:any)=>e.name==='AbortError');
   else result=await read;
  }finally{session.close();}
  if(result){
   assert.equal(used,5);assert.equal(result.checkpointLo,0);assert.equal(result.checkpointHi,page.hi);assert(page.hi>=24478);
   assert.equal(result.coverage.allAccountActivityCertified,false);assert.equal(result.totalTransactions,3);
   assert.deepEqual(result.transactions.map(t=>t.digest),['AQ2Jo739WgnovgmUHk2rPquJ8wJkBuk7aiNXXyzr1Rzu','BcNZtuXwwK4XBkpBtA1iri5ZLVbVCR2AjYmodcrWPjjE','FoYSNUrWCqtJmEWePiVLYWzu7g8KbJKqRFU8pQ4Un93b']);
  }
  const ms=Date.parse(cycle[4].startedDateTime)+cycle[4].time-Date.parse(cycle[0].startedDateTime);
  reports.push({offset,partialCycle:false,accepted:!!result,capturedCancellationRejected:!!exceptions.length,
   exceptions,milliseconds:ms,checkpointHi:page.hi,perQueryMilliseconds:cycle.map((e:any)=>e.time)});
 }
 const native=entries.filter((e:any)=>e.request.url.endsWith('/GetServiceInfo'));assert.equal(native.length,1);
 const e=native[0];assert.equal(e.response.status,200);assert(!e.response._error);
 const b=Buffer.from(e.response.content.text,'base64');assert.equal(b[0],0);const end=5+b.readUInt32BE(1);assert.equal(b[end],128);assert.equal(end+5+b.readUInt32BE(end+1),b.length);
 assert.match(b.subarray(end+5).toString(),/(?:^|\r\n)grpc-status:\s*0\r\n/);
 assert.equal(GrpcTypes.GetServiceInfoResponse.fromBinary(b.subarray(5,end)).chainId,profile.expectedGenesisDigest);
 assert.equal(entries.length,gql.length+native.length);
 const files=[process.argv[1],capture,profileFile,...['account-history-reader.ts','account-history-protocol.ts','history-facts.ts','graphql-snapshot.ts','session.ts'].map(n=>'src/shared/rpc/'+n)];
 const report={passed:true,at:new Date().toISOString(),requests:entries.length,reports,
  acceptedCycles:reports.filter(r=>r.accepted).length,cancelledCycles:reports.filter(r=>r.capturedCancellationRejected).length,
  actualWireReplayedThroughProductionReader:true,originalAsyncSchedulingReproduced:false,liveNetworkRequests:0,
  completeWindowSemanticsOnly:true,allAccountActivityCertified:false,parentCompletion:false,
  inputsSha256:Object.fromEntries(files.map(p=>[p,createHash('sha256').update(readFileSync(p)).digest('hex')]))};
 writeFileSync(output,JSON.stringify(report,null,2)+'\n',{flag:'wx',mode:0o600});
 console.log(JSON.stringify({passed:true,acceptedCycles:report.acceptedCycles,cancelledCycles:report.cancelledCycles,reports}));
}
main().catch(e=>{console.error(e);process.exitCode=1;});
