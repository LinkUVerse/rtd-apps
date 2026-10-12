// Copyright (c) LinkU Labs, Inc.
// SPDX-License-Identifier: Apache-2.0
// Offline semantic validation of every captured C270 frame. Never sends traffic.
import assert from 'node:assert/strict';
import { readFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { parse, print } from 'graphql';
import { GrpcTypes } from 'rtd-typescript/grpc';
import { validateNetworkProfile } from '../src/shared/rpc/profile';
import { WalletReadSession } from '../src/shared/rpc/session';
import { WalletAssetReader } from '../src/shared/rpc/asset-reader';

const L = 'migrationToGRpcOrGraphQLDoc/workLog';
const inputs = [__filename];
const hash = (b: Buffer | string) => createHash('sha256').update(b).digest('hex');
function read(p: string) { inputs.push(p); return JSON.parse(readFileSync(p, 'utf8')); }
async function main() {
  const entries = read(`${L}/20261011-C270-generation-isolation-01.har`).log.entries;
  const fixture = read(`${L}/20261011-C262-existing-display-01.json`); assert(fixture.passed);
  const base = read('/Users/changzechuan/.local/state/rtd-wallet-migration/dev-20261006-03/publication-foundation/C46-isolated-browser-gateway-20261007-01/profile.json');
  const used = new Set<number>(), reports: any[] = [], native: any[] = [], structural: any[] = [];
  const graph = entries.map((e: any, index: number) => ({e, index}))
    .filter(({e}: any) => e.request.url.endsWith('/graphql'))
    .map(({e, index}: any) => ({e, index, q: JSON.parse(e.request.postData.text)}));
  const assets = graph.filter((x: any) => x.index <= 162 && !x.q.query.includes('WalletGenesisIdentity'));
  let cursor = 0;
  const original = globalThis.fetch;
  globalThis.fetch = async (input, init) => {
    const {e, index, q} = assets[cursor++]; assert(!used.has(index)); used.add(index);
    assert.equal(String(input), e.request.url);
    const actual = JSON.parse(String(init?.body));
    assert.equal(print(parse(actual.query)), print(parse(q.query)));
    assert.deepEqual(actual.variables ?? {}, q.variables ?? {});
    if (e.response.status === 0) {
      assert.equal(e.response._error, 'net::ERR_ABORTED');
      throw new DOMException('Actual captured Chrome cancellation', 'AbortError');
    }
    assert.equal(e.response.status, 200);
    return new Response(e.response.content.text, {status: 200, headers: {'content-type': 'application/json'}});
  };
  let session: WalletReadSession | undefined, reader: WalletAssetReader | undefined;
  try {
    while (cursor < assets.length) {
      const start = cursor, next = assets[cursor];
      if (next.q.query.includes('WalletSnapshotAdmission')) {
        session?.close();
        const generation = next.index >= 125 && next.index < 144 ? 'c270-generation-mismatch' : base.generation;
        session = new WalletReadSession(validateNetworkProfile({...base, generation}));
        reader = await WalletAssetReader.open(session);
      }
      assert(reader);
      const item = assets[cursor]; assert(item.q.query.includes('WalletSnapshotRead'));
      const kind = item.q.variables.owner ? 'owned' : 'objects';
      const promise = kind === 'owned' ? reader.ownedObjects(fixture.owner) : reader.objects([fixture.objectId]);
      if (item.index === 147) {
        await assert.rejects(promise, (e: any) => e.name === 'AbortError');
        reports.push({indices: assets.slice(start, cursor).map((x: any) => x.index), kind, accepted: false, actualCancellationRejected: true});
      } else {
        const result = await promise;
        assert.equal(result.snapshot.checkpoint, fixture.snapshot);
        const object: any = result.value.find((x: any) => x.objectId === fixture.objectId); assert(object);
        assert.equal(object.version, fixture.native.version); assert.equal(object.digest, fixture.native.digest);
        assert.deepEqual(object.owner, fixture.indexed.owner); assert.deepEqual(object.display, fixture.indexed.display);
        reports.push({indices: assets.slice(start, cursor).map((x: any) => x.index), kind, accepted: true,
          profileGeneration: session!.profile.generation, snapshot: result.snapshot,
          objects: result.value.map((x: any) => ({id: x.objectId, version: x.version, digest: x.digest, contentSha256: hash(x.content)}))});
      }
    }
  } finally { session?.close(); globalThis.fetch = original; }
  for (const {e, index, q} of graph) {
    if (used.has(index)) continue;
    assert.equal(e.response.status, 200);
    assert(!/\bmutation\b|\bsubscription\b/.test(q.query)); parse(q.query);
    const body = JSON.parse(e.response.content.text); assert(!body.errors);
    if (q.query.includes('WalletGenesisIdentity')) assert.equal(body.data.checkpoint.digest, fixture.h0);
    else {
      assert.equal(body.data.walletGenesis.digest, fixture.h0);
      const snapshot = body.data.walletSnapshot ?? body.data.walletHead;
      assert.equal(String(snapshot.sequenceNumber), String(fixture.snapshot));
      if (q.variables?.type) assert.equal(body.data.walletSnapshot.query.coinMetadata.symbol, 'RTD');
    }
    structural.push({index, operation: /query\s+(\w+)/.exec(q.query)![1], bodySha256: hash(e.response.content.text), productionReaderReplay: false});
    used.add(index);
  }
  for (let index = 0; index < entries.length; index++) {
    const e = entries[index];
    assert(!/ExecuteTransaction|SimulateTransaction|json-rpc/.test(e.request.url));
    if (used.has(index)) continue;
    assert.equal(e.response.status, 200); assert.equal(e.response.content.encoding, 'base64');
    const bytes = Buffer.from(e.response.content.text, 'base64');
    if (e.request.url.endsWith('/display-v2.png')) {
      assert.equal(bytes.subarray(0,8).toString('hex'), '89504e470d0a1a0a');
      structural.push({index, media: true, bodySha256: hash(bytes)});
    } else {
      assert.equal(bytes[0], 0); const end = 5 + bytes.readUInt32BE(1);
      assert.equal(bytes[end], 128); assert.equal(end + 5 + bytes.readUInt32BE(end+1), bytes.length);
      assert.match(bytes.subarray(end+5).toString(), /(?:^|\r\n)grpc-status:\s*0\r\n/);
      if (e.request.url.endsWith('/GetServiceInfo')) {
        const value = GrpcTypes.GetServiceInfoResponse.fromBinary(bytes.subarray(5,end));
        assert.equal(value.chainId, fixture.h0);
        native.push({index, method: 'GetServiceInfo', h0: value.chainId, checkpoint: String(value.checkpointHeight), bodySha256: hash(bytes)});
      } else {
        assert(e.request.url.endsWith('/ListBalances'));
        const value = GrpcTypes.ListBalancesResponse.fromBinary(bytes.subarray(5,end));
        native.push({index, method: 'ListBalances', decoded: JSON.parse(JSON.stringify(value,
          (_key, field) => typeof field === 'bigint' ? String(field) : field)), bodySha256: hash(bytes)});
      }
    }
    used.add(index);
  }
  assert.equal(entries.length, 190); assert.equal(used.size, entries.length);
  const proof = {passed: true, observedAt: new Date().toISOString(), requests: entries.length,
    graphql: graph.length, reports, native, structural, everyCapturedFrameClassified: true,
    actualCanceledFrames: 1, liveNetworkRequests: 0, originalAsyncSchedulingReproduced: false,
    structuralFramesAreNotProductionReaderAcceptance: true, parentCompletion: false,
    inputsSha256: Object.fromEntries(inputs.map(p => [p, hash(readFileSync(p))]))};
  writeFileSync(process.argv[2], JSON.stringify(proof,null,2)+'\n', {flag: 'wx', mode: 0o600});
  console.log(JSON.stringify({passed:true, requests:entries.length, graphql:graph.length, assetReads:reports.length, native:native.length, structural:structural.length}));
}
main().catch(e => { console.error(e); process.exitCode=1; });
