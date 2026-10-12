// Copyright (c) LinkU Labs, Inc.
// SPDX-License-Identifier: Apache-2.0
// Validate saved Chrome traffic with the production reader, without network access.
import assert from 'node:assert/strict';
import {readFileSync, writeFileSync, existsSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {parse, print} from 'graphql';
import {GrpcTypes} from 'rtd-typescript/grpc';
import {WalletAccountHistoryReader} from '../src/shared/rpc/account-history-reader';
import {validateNetworkProfile} from '../src/shared/rpc/profile';
import {WalletReadSession} from '../src/shared/rpc/session';

async function main() {
  const [capture, output]=process.argv.slice(2); assert(capture && output && !existsSync(output));
  const profileFile='/Users/changzechuan/.local/state/rtd-wallet-migration/dev-20261011-04/C274-profile.json';
  const profile=validateNetworkProfile(JSON.parse(readFileSync(profileFile,'utf8')));
  const entries=JSON.parse(readFileSync(capture,'utf8')).log.entries;
  const graphql=entries.filter((e:any)=>e.request.url.endsWith('/graphql'));
  const names=graphql.map((e:any)=>JSON.parse(e.request.postData.text).query.match(/query\s+(\w+)/)?.[1]);
  assert.deepEqual(names.slice(0,5),['WalletHistoryCoverage','WalletSnapshotAdmissionAndPin','WalletAccountHistory','WalletHistoryCoverage','WalletSnapshotRevalidate']);
  const page=JSON.parse(graphql[2].request.postData.text).variables;
  const session=new WalletReadSession(profile);let used=0;
  const fetch:typeof globalThis.fetch=async(input,init)=>{
    const e=graphql[used++];assert(e && used<=5);
    assert.equal(String(input),e.request.url);assert.equal(init?.method,'POST');
    const actual=JSON.parse(String(init?.body)),expected=JSON.parse(e.request.postData.text);
    assert.equal(print(parse(actual.query)),print(parse(expected.query)));
    assert.deepEqual(actual.variables??{},expected.variables??{});
    assert.equal(e.response.status,200);assert(!e.response._error);
    return new Response(e.response.content.text,{status:200,headers:{'content-type':'application/json'}});
  };
  let result;
  try {result=await new WalletAccountHistoryReader(session,{fetch}).read(page.address);}
  finally {session.close();}
  assert.equal(used,5);assert.equal(result.checkpointLo,0);assert.equal(result.checkpointHi,page.hi);assert(page.hi>=24478);
  assert.equal(result.totalTransactions,3);assert.equal(result.transactions.length,3);
  assert.equal(result.coverage.allAccountActivityCertified,false);
  assert.deepEqual(result.transactions.map(t=>t.digest),[
    'AQ2Jo739WgnovgmUHk2rPquJ8wJkBuk7aiNXXyzr1Rzu','BcNZtuXwwK4XBkpBtA1iri5ZLVbVCR2AjYmodcrWPjjE','FoYSNUrWCqtJmEWePiVLYWzu7g8KbJKqRFU8pQ4Un93b']);
  const native=entries.filter((e:any)=>e.request.url.endsWith('/GetServiceInfo'));
  assert.equal(native.length,1);
  const frame=Buffer.from(native[0].response.content.text,'base64');assert.equal(frame[0],0);
  const end=5+frame.readUInt32BE(1);assert.equal(frame[end],128);assert.equal(end+5+frame.readUInt32BE(end+1),frame.length);
  assert.match(frame.subarray(end+5).toString(),/(?:^|\r\n)grpc-status:\s*0\r\n/);
  assert.equal(GrpcTypes.GetServiceInfoResponse.fromBinary(frame.subarray(5,end)).chainId,profile.expectedGenesisDigest);
  for(const e of entries){assert.equal(new URL(e.request.url).hostname,'127.0.0.1');assert(!/Execute|Simulate|VerifySignature/.test(e.request.url));}
  const trailing=graphql.slice(5).map((e:any)=>{
    assert.equal(e.response.status,200);const r=JSON.parse(e.response.content.text);assert(!r.errors);
    assert.equal(r.data.accountHistoryCoverage.chainId,profile.expectedGenesisDigest);
    return {status:e.response.status,milliseconds:e.time,partialNextCycle:true};
  });
  assert.equal(entries.length,6+trailing.length);
  const start=Date.parse(graphql[0].startedDateTime),endTime=Date.parse(graphql[4].startedDateTime)+graphql[4].time;
  const inputs=[process.argv[1],capture,profileFile,...['account-history-reader.ts','account-history-protocol.ts','history-facts.ts','graphql-snapshot.ts','session.ts'].map(n=>'src/shared/rpc/'+n)];
  const report={passed:true,at:new Date().toISOString(),capturedRequests:entries.length,completeCycleGraphql:5,
    completeCycleMilliseconds:endTime-start,perQueryMilliseconds:graphql.slice(0,5).map((e:any)=>e.time),
    actualWireReplayedThroughProductionReader:true,actualAsyncSchedulingReproduced:false,liveNetworkRequests:0,
    originalDigestOrder:result.transactions.map(t=>t.digest),checkpointHi:result.checkpointHi,
    partialFollowingCycle:trailing,allAccountActivityCertified:false,parentCompletion:false,
    inputsSha256:Object.fromEntries(inputs.map(p=>[p,createHash('sha256').update(readFileSync(p)).digest('hex')]))};
  writeFileSync(output,JSON.stringify(report,null,2)+'\n',{flag:'wx',mode:0o600});
  console.log(JSON.stringify({passed:true,completeCycleMilliseconds:report.completeCycleMilliseconds,requests:entries.length}));
}
main().catch(e=>{console.error(e);process.exitCode=1;});
