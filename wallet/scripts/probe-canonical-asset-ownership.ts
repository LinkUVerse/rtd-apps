// Copyright (c) LinkU Labs, Inc.
// SPDX-License-Identifier: Apache-2.0
// Reconcile final wallet asset inventories after the explicitly supplied writes.
import assert from 'node:assert/strict';
import {readFileSync, writeFileSync, existsSync} from 'node:fs';
import {join} from 'node:path';
import {validateNetworkProfile} from '../src/shared/rpc/profile';
import {WalletReadSession} from '../src/shared/rpc/session';
import {WalletAssetReader} from '../src/shared/rpc/asset-reader';
import {WalletFullnodeReader} from '../src/shared/rpc/fullnode-reader';

async function main() {
  const [runtime, casesFile, output] = process.argv.slice(2); assert(!existsSync(output));
  const read = (file: string) => JSON.parse(readFileSync(file, 'utf8'));
  const profile = validateNetworkProfile(read(join(runtime, 'certified-release/profile.json')));
  const cases = read(casesFile) as {h0: string; minimumCheckpoint: string; owners: string[]; expected: {id: string; owner: string}[]};
  assert.equal(cases.h0, profile.expectedGenesisDigest);
  const session = new WalletReadSession(profile);
  try {
    const reader = await WalletAssetReader.open(session, {minimumCheckpoint: cases.minimumCheckpoint, timeoutMs: 60000});
    const native = new WalletFullnodeReader(session);
    const inventories = [];
    for (const owner of cases.owners) {
      const direct = await reader.ownedObjects(owner);
      const kiosks = await reader.kiosks(owner);
      const objects = [...direct.value, ...kiosks.value.flatMap(k => k.items)];
      const ids = objects.map(o => o.objectId); assert.equal(new Set(ids).size, ids.length);
      inventories.push({owner, ids, kiosks: kiosks.value.map(k => ({id: k.kioskId, kind: k.kind, items: k.items.map(i => i.objectId)}))});
      for (const expected of cases.expected) {
        const found = objects.find(o => o.objectId === expected.id);
        assert.equal(!!found, owner === expected.owner, 'Unexpected final owner: ' + expected.id);
        if (found) {
          const actual = await native.object(expected.id); assert(actual);
          assert.equal(found.version, actual.version); assert.equal(found.digest, actual.digest);
          assert.deepEqual(found.owner, actual.owner); assert.deepEqual(found.content, actual.content);
        }
      }
    }
    assert(cases.expected.every(item => cases.owners.includes(item.owner)));
    await reader.snapshot.revalidate();
    writeFileSync(output, JSON.stringify({passed: true, h0: profile.expectedGenesisDigest, checkpoint: reader.proof.checkpoint, inventories, checkedObjects: cases.expected.length, signatures: 0, dispatches: 0}, null, 2) + '\n', {flag: 'wx', mode: 0o600});
    console.log(JSON.stringify({passed: true, checkpoint: reader.proof.checkpoint, owners: inventories.length, checkedObjects: cases.expected.length}));
  } finally {session.close();}
}
main().catch(error => {console.error(error); process.exitCode = 1;});
