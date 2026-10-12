// Copyright (c) LinkU Labs, Inc.
// SPDX-License-Identifier: Apache-2.0
// Replay only captured frames through the production asset reader; no network.
import assert from 'node:assert/strict';
import { readFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { parse, print } from 'graphql';
import { GrpcTypes } from 'rtd-typescript/grpc';
import { validateNetworkProfile } from '../src/shared/rpc/profile';
import { WalletReadSession } from '../src/shared/rpc/session';
import { WalletAssetReader } from '../src/shared/rpc/asset-reader';
import { groupCollectibles } from '../src/shared/rpc/nft-assets';

const L = 'migrationToGRpcOrGraphQLDoc/workLog';
const inputs: string[] = [__filename];
const hash = (bytes: Buffer | string) => createHash('sha256').update(bytes).digest('hex');
function read(path: string) { inputs.push(path); return JSON.parse(readFileSync(path, 'utf8')); }
async function main() {
  const output = process.argv[2]; assert(output);
  const entries = read(`${L}/20261011-C266-network-switch-01.har`).log.entries;
  const fixture = read(`${L}/20261011-C262-existing-display-01.json`); assert(fixture.passed);
  const base = read('/Users/changzechuan/.local/state/rtd-wallet-migration/dev-20261006-03/publication-foundation/C46-isolated-browser-gateway-20261007-01/profile.json');
  const used = new Set<number>(), reports: any[] = [];
  const original = globalThis.fetch;
  let active: { indices: number[]; offset: number; url: string } | undefined;
  globalThis.fetch = async (input, init) => {
    assert(active);
    const index = active.indices[active.offset++]; assert(Number.isInteger(index));
    assert(!used.has(index)); used.add(index);
    const entry = entries[index];
    assert.equal(String(input), active.url); assert.equal(entry.request.url, active.url);
    assert.equal(entry.request.method, 'POST');
    const expected = JSON.parse(entry.request.postData.text), actual = JSON.parse(String(init?.body));
    assert.equal(print(parse(actual.query)), print(parse(expected.query)));
    assert.deepEqual(actual.variables ?? {}, expected.variables ?? {});
    if (entry.response.status === 0) {
      assert.equal(entry.response._error, 'net::ERR_ABORTED');
      throw new DOMException('Captured Chrome cancellation', 'AbortError');
    }
    assert.equal(entry.response.status, 200); assert(!entry.response._error);
    return new Response(entry.response.content.text, {status:200,headers:{'content-type':'application/json'}});
  };
  try {
    const cycles = [[1,2,3,4],[5,6,7,8],[9,10,11,12],[14,15,16,17],[18,19,20,21],
      [22,23,24,25],[26,27,28,29],[30,31,32,33],[34,36,37,38],[41,42,43,44],
      [45,46,47],[52,54,55,56],[58,59,60,61]];
    for (const indices of cycles) {
      const url = entries[indices[0]].request.url;
      const profile = validateNetworkProfile({...base,endpoints:{...base.endpoints,graphqlUrl:url}});
      const session = new WalletReadSession(profile);
      active = {indices, offset:0,url};
      try {
        const reader = await WalletAssetReader.open(session);
        if (indices.at(-1) === 47) {
          await assert.rejects(reader.ownedObjects(fixture.owner), (e:any)=>e.name==='AbortError');
          reports.push({indices,url,accepted:false,capturedCancellationRejected:true});
        } else {
          const result = await reader.ownedObjects(fixture.owner);
          assert.equal(result.snapshot.checkpoint, fixture.snapshot);
          assert.equal(result.value.length,4);
          const object = result.value.find(x=>x.objectId===fixture.objectId); assert(object);
          assert.equal(object.version,fixture.native.version); assert.equal(object.digest,fixture.native.digest);
          assert.deepEqual(object.owner,fixture.indexed.owner); assert.deepEqual(object.display,fixture.indexed.display);
          assert.equal(groupCollectibles(result.value,[],profile.packages).visual.length,2);
          reports.push({indices,url,accepted:true,snapshot:result.snapshot,objects:result.value.map(x=>({
            id:x.objectId,version:x.version,digest:x.digest,owner:x.owner,display:x.display,
            contentsSha256:hash(x.content)}))});
        }
        assert.equal(active.offset,indices.length);
      } finally {session.close();active=undefined;}
    }
  } finally {globalThis.fetch=original;}
  // Capture begins at a trailing read-end check; there is no invented earlier admission.
  const trailing = JSON.parse(entries[0].response.content.text);
  assert.equal(trailing.data.walletGenesis.digest,fixture.h0);
  assert.equal(entries[0].response.status,200); assert(!trailing.errors);
  assert.match(JSON.parse(entries[0].request.postData.text).query,/query WalletSnapshotRevalidate/);
  used.add(0);
  const identity = JSON.parse(entries[50].response.content.text);
  assert.deepEqual(identity,{data:{checkpoint:{digest:fixture.h0}}});
  assert.match(JSON.parse(entries[50].request.postData.text).query,/query WalletGenesisIdentity/);
  used.add(50);
  const native:any[]=[], media:any[]=[];
  for (let i=0;i<entries.length;i++) {
    const e=entries[i];
    if (e.request.url.endsWith('/GetServiceInfo')) {
      assert.equal(e.response.status,200); assert.equal(e.response.content.encoding,'base64');
      const b=Buffer.from(e.response.content.text,'base64'); assert.equal(b[0],0);
      const end=5+b.readUInt32BE(1); assert.equal(b[end],128);
      assert.equal(end+5+b.readUInt32BE(end+1),b.length);
      assert.match(b.subarray(end+5).toString(),/(?:^|\r\n)grpc-status:\s*0\r\n/);
      const value=GrpcTypes.GetServiceInfoResponse.fromBinary(b.subarray(5,end));
      assert.equal(value.chainId,fixture.h0);
      native.push({index:i,url:e.request.url,chainId:value.chainId,checkpoint:String(value.checkpointHeight),sha256:hash(b)});
      used.add(i);
    } else if (e.request.url.endsWith('/display-v2.png')) {
      assert.equal(e.response.status,200); assert.equal(e.response.content.encoding,'base64');
      const b=Buffer.from(e.response.content.text,'base64');assert.equal(b.subarray(0,8).toString('hex'),'89504e470d0a1a0a');
      media.push({index:i,sha256:hash(b)});used.add(i);
    }
  }
  assert.equal(entries.length,62);assert.equal(used.size,62);assert.equal(native.length,7);assert.equal(media.length,2);
  assert.deepEqual([...used].sort((a,b)=>a-b),entries.map((_:any,i:number)=>i));
  for(const name of ['asset-reader.ts','graphql-snapshot.ts','snapshot-pagination.ts','session.ts','nft-assets.ts']) inputs.push(`src/shared/rpc/${name}`);
  const proof={passed:true,observedAt:new Date().toISOString(),requests:62,graphql:53,
    fullProductionReadCycles:12,cancelledReadCycles:1,isolatedTrailingCheck:1,genesisIdentity:1,
    native,media,reports,liveNetworkRequests:0,originalAsyncSchedulingReproduced:false,parentCompletion:false,
    inputsSha256:Object.fromEntries(inputs.map(p=>[p,hash(readFileSync(p))]))};
  writeFileSync(output,JSON.stringify(proof,null,2)+'\n',{flag:'wx',mode:0o600});
  console.log(JSON.stringify({passed:true,requests:62,fullProductionReadCycles:12,cancelledReadCycles:1,native:7,media:2}));
}
main().catch(e=>{console.error(e);process.exitCode=1;});
