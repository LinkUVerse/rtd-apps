// Copyright (c) LinkU Labs, Inc.
// SPDX-License-Identifier: Apache-2.0
// Offline native HAR replay. The fetch stub can only return a captured frame.
import assert from 'node:assert/strict';
import { readFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { parse, print } from 'graphql';
import { GrpcTypes } from 'rtd-typescript/grpc';
import { validateNetworkProfile } from '../src/shared/rpc/profile';
import { WalletReadSession } from '../src/shared/rpc/session';
import { WalletAssetReader } from '../src/shared/rpc/asset-reader';
import { WalletCoinMetadataReader, COIN_METADATA_COVERAGE } from '../src/shared/rpc/coin-metadata-reader';
import { GraphQLSnapshot, SnapshotReadError } from '../src/shared/rpc/graphql-snapshot';
import { NAME_COVERAGE } from '../src/shared/rpc/name-reader';
import { groupCollectibles } from '../src/shared/rpc/nft-assets';

const L = 'migrationToGRpcOrGraphQLDoc/workLog';
const files = [__filename];
function read(path: string) { files.push(path); return JSON.parse(readFileSync(path, 'utf8')); }
const sha = (path: string) => createHash('sha256').update(readFileSync(path)).digest('hex');

async function main() {
  const [output] = process.argv.slice(2); assert(output);
  const entries = read(`${L}/20261011-C262-hidden-assets-01.har`).log.entries;
  const old = read(`${L}/20261011-C262-hidden-audit-01.json`);
  const fixture = read(`${L}/20261011-C262-existing-display-01.json`);
  const installed = read(`${L}/20261011-C257-ordinary-bytecode-01.json`);
  assert(old.passed && fixture.passed && installed.completeInstalledBytecodeAccepted);
  const profile = validateNetworkProfile(read('/Users/changzechuan/.local/state/rtd-wallet-migration/dev-20261006-03/publication-foundation/C46-isolated-browser-gateway-20261007-01/profile.json'));
  assert.equal(profile.expectedGenesisDigest, fixture.h0);
  const used = new Set<number>(), reports: any[] = [];
  let active: { indices: number[]; offset: number } | undefined;
  const original = globalThis.fetch;
  globalThis.fetch = async (input, init) => {
    assert(active, 'Unscheduled request');
    const index = active.indices[active.offset++];
    assert(Number.isInteger(index), 'Production reader requested a missing captured frame');
    assert(!used.has(index), `Frame reused: ${index}`); used.add(index);
    const e = entries[index], actual = JSON.parse(String(init?.body));
    assert.equal(String(input), profile.endpoints.graphqlUrl);
    assert.equal(e.request.url, String(input)); assert.equal(e.request.method, 'POST');
    const expected = JSON.parse(e.request.postData.text);
    assert.equal(print(parse(actual.query)), print(parse(expected.query)), `Query at ${index}`);
    assert.deepEqual(actual.variables ?? {}, expected.variables ?? {}, `Variables at ${index}`);
    if (e.response.status === 0) {
      assert.equal(e.response._error, 'net::ERR_ABORTED');
      throw new DOMException('Captured Chrome cancellation', 'AbortError');
    }
    assert.equal(e.response.status, 200); assert(!e._error && !e.response._error);
    return new Response(e.response.content.text, { status: 200, headers: { 'content-type': 'application/json' } });
  };
  async function group(kind: string, indices: number[], run: (session: WalletReadSession) => Promise<any>) {
    active = { indices, offset: 0 };
    const session = new WalletReadSession(profile);
    try {
      const result = await run(session);
      assert.equal(active.offset, indices.length, 'Unconsumed frame');
      reports.push({ kind, indices, ...result });
    } finally { session.close(); active = undefined; }
  }
  async function cancelled(operation: Promise<unknown>) {
    await assert.rejects(operation, (error: any) => error.name === 'AbortError');
  }
  function checkObjects(result: any) {
    assert.equal(result.snapshot.checkpoint, fixture.snapshot);
    const object = result.value.find((item: any) => item.objectId === fixture.objectId);
    assert(object); assert.equal(object.version, fixture.native.version);
    assert.equal(object.digest, fixture.native.digest);
    assert.deepEqual(object.owner, fixture.indexed.owner);
    assert.deepEqual(object.display, fixture.indexed.display);
    assert.equal(object.display.output.name, 'Migration Display V2');
    return result.value.map((item: any) => ({ objectId: item.objectId, version: item.version, digest: item.digest,
      owner: item.owner, display: item.display, contentsSha256: createHash('sha256').update(item.content).digest('hex') }));
  }
  try {
    const metadataCycles = [[0,1,2,3], [9,10,11,12], [18,19,20,21], [27,28,32,33],
      [39,40,41,42], [48,49,50,53], [97,101,102,103], [116,124,125,131]];
    for (const indices of metadataCycles) await group('coin-metadata', indices, async session => {
      const type = JSON.parse(entries[indices[2]].request.postData.text).variables.type;
      if (indices.at(-1) === 131) {
        await cancelled(WalletCoinMetadataReader.read(session, type));
        return { accepted: false, capturedCancellationRejected: true };
      }
      const result = await WalletCoinMetadataReader.read(session, type);
      assert.equal(result.value?.symbol, 'RTD'); assert.equal(result.value?.decimals, 9);
      assert.equal(result.snapshot.checkpoint, fixture.snapshot);
      return { accepted: true, value: result.value, snapshot: result.snapshot };
    });
    await group('owned-cancel-then-read', [57,59,58,60,61,62], async session => {
      const reader = await WalletAssetReader.open(session);
      await cancelled(reader.ownedObjects(fixture.owner));
      return { accepted: true, cancelledReadRejected: true, objects: checkObjects(await reader.ownedObjects(fixture.owner)) };
    });
    for (const indices of [[64,65,66,67],[68,69,70,71],[72,73,74,75],[76,77,78,79],
                           [80,81,82,83,84,85],[141,143,144,145]]) {
      await group('owned-objects', indices, async session => {
        const reader = await WalletAssetReader.open(session);
        const owned = await reader.ownedObjects(fixture.owner);
        const objects = checkObjects(owned);
        assert.equal(objects.length, 4);
        assert.equal(groupCollectibles(owned.value, [], profile.packages).visual.length, 2);
        const detail = indices.length === 6 ? checkObjects(await reader.objects([fixture.objectId])) : undefined;
        return { accepted: true, objects, ...(detail ? { detail } : {}) };
      });
    }
    await group('hidden-object', [89,91,92,93], async session => {
      const reader = await WalletAssetReader.open(session);
      return { accepted: true, objects: checkObjects(await reader.objects([fixture.objectId])) };
    });
    await group('hidden-cancel-then-read', [132,134,133,135,136,137], async session => {
      const reader = await WalletAssetReader.open(session);
      await cancelled(reader.objects([fixture.objectId]));
      return { accepted: true, cancelledReadRejected: true, objects: checkObjects(await reader.objects([fixture.objectId])) };
    });
    for (const indices of [[87,88], [112,113], [139,140], [147,148]]) {
      await group('snapshot-only', indices, async session => {
        const reader = await WalletAssetReader.open(session);
        assert.equal(reader.proof.checkpoint, fixture.snapshot);
        return { acceptedSnapshotOnly: true, businessReadAccepted: false, snapshot: reader.proof };
      });
    }
    // Each remaining name admission has an actual nearby Fullnode height above S.
    // This verifies the production minimum-checkpoint rejection, not a successful name lookup.
    for (const index of [8,17,26,35,44,52,98,105,117,122,123]) {
      let nativeIndex = index - 1;
      while (nativeIndex >= 0 && !entries[nativeIndex].request.url.endsWith('/GetServiceInfo')) nativeIndex--;
      assert(nativeIndex >= 0);
      const e = entries[nativeIndex]; assert.equal(e.response.status, 200);
      const bytes = Buffer.from(e.response.content.text, 'base64');
      assert.equal(bytes[0], 0); const end = 5 + bytes.readUInt32BE(1);
      assert.equal(bytes[end], 128); assert.equal(end + 5 + bytes.readUInt32BE(end+1), bytes.length);
      assert.match(bytes.subarray(end+5).toString(), /(?:^|\r\n)grpc-status:\s*0\r\n/);
      const native = GrpcTypes.GetServiceInfoResponse.fromBinary(bytes.subarray(5,end));
      assert.equal(native.chainId, fixture.h0); assert(native.checkpointHeight! > BigInt(fixture.snapshot));
      const delta = Date.parse(entries[index].startedDateTime) - Date.parse(e.startedDateTime);
      assert(delta >= 0 && delta < 5000);
      await group('name-stale-admission', [index], async session => {
        await assert.rejects(GraphQLSnapshot.open(session, NAME_COVERAGE, {
          minimumCheckpoint: String(native.checkpointHeight),
        }), (error: any) => error instanceof SnapshotReadError && error.reason === 'coverage');
        return { accepted: false, staleAdmissionRejected: true, nativeIndex,
          minimumCheckpoint: String(native.checkpointHeight), snapshot: fixture.snapshot, nativeToAdmissionMs: delta };
      });
    }
    for (const index of [108,111,128]) await group('cancelled-admission', [index], async session => {
      await cancelled(GraphQLSnapshot.open(session, index === 111 ? COIN_METADATA_COVERAGE : NAME_COVERAGE));
      return { accepted: false, capturedCancellationRejected: true };
    });
    const graphqlIndices = entries.map((e: any, i: number) => e.request.url.endsWith('/graphql') ? i : -1).filter((i: number) => i >= 0);
    assert.deepEqual([...used].sort((a,b)=>a-b), graphqlIndices);
    assert.equal(used.size, 96);
    const sourceFiles = ['asset-reader.ts','coin-metadata-reader.ts','graphql-snapshot.ts','snapshot-pagination.ts',
      'display-history.ts','name-reader.ts','session.ts','snapshot-read-retry.ts','snapshot-query-queue.ts','nft-assets.ts'];
    files.push(...sourceFiles.map(name => `src/shared/rpc/${name}`));
    const proof = { passed: true, observedAt: new Date().toISOString(),
      scope: 'All 96 GraphQL requests from C262 native HAR matched once to production readers. Exact request/response bytes, semantic decoding and cancellation rejection; offline replay does not prove original asynchronous call-stack ordering or current live index freshness.',
      graphqlRequests: used.size, successfulResponses: 90, capturedCancellations: 6,
      businessReadsAccepted: 17, cancelledBusinessReadsRejected: 3, snapshotOnlyGroups: 4,
      nameStaleAdmissionsRejected: 11, cancelledAdmissionsRejected: 3,
      reports, originalWireOrderingReproduced: false, graphqlFramesFullyAccounted: true,
      previousNativeAndMediaAudit: `${L}/20261011-C262-hidden-audit-01.json`,
      liveNetworkRequests: 0, signatures: 0, executions: 0, postTransferIndexAccepted: false,
      namePositiveAccepted: false, parentCompletion: false,
      inputsSha256: Object.fromEntries(files.map(path => [path, sha(path)])) };
    writeFileSync(output, JSON.stringify(proof, null, 2)+'\n', { flag:'wx', mode:0o600 });
    console.log(JSON.stringify({ passed:true, graphqlRequests:used.size, businessReadsAccepted:17,
      capturedCancellations:6, nameStaleAdmissionsRejected:11, parentCompletion:false }));
  } finally { globalThis.fetch = original; }
}
main().catch(error => { console.error(error); process.exitCode=1; });
