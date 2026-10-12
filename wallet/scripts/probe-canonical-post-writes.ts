// Copyright (c) LinkU Labs, Inc.
// SPDX-License-Identifier: Apache-2.0
// Verify exact browser transaction effects against the actual archive objects.
import assert from 'node:assert/strict';
import {readFileSync, writeFileSync, existsSync} from 'node:fs';
import {join} from 'node:path';
import {validateNetworkProfile} from '../src/shared/rpc/profile';
import {WalletReadSession} from '../src/shared/rpc/session';
import {WalletLedgerReader} from '../src/shared/rpc/ledger-reader';
import {WalletArchiveObjectReader} from '../src/shared/rpc/archive-object-reader';

async function main() {
  const [runtime, nativeProofFile, output] = process.argv.slice(2);
  assert(!existsSync(output));
  const read = (file: string) => JSON.parse(readFileSync(file, 'utf8'));
  const profile = validateNetworkProfile(read(join(runtime, 'certified-release/profile.json')));
  const proof = read(nativeProofFile); assert(proof.passed); assert.equal(proof.h0, profile.expectedGenesisDigest);
  const session = new WalletReadSession(profile), original = globalThis.fetch;
  const allowed = new Set(Object.values(profile.endpoints).map(value => new URL(value!).origin));
  const requests: {url: string; status: number}[] = [], results = [];
  globalThis.fetch = async (input, init) => {
    const url = new URL(input instanceof Request ? input.url : String(input));
    assert(allowed.has(url.origin)); assert(!/ExecuteTransaction|SimulateTransaction/.test(url.pathname));
    const response = await original(input, init); requests.push({url: url.href, status: response.status}); return response;
  };
  try {
    const ledger = new WalletLedgerReader(session, {timeoutMs: 60000});
    const archive = new WalletArchiveObjectReader(session);
    for (const row of proof.results) {
      const receipt = await ledger.lookup(row.digest);
      assert(receipt?.success); assert.equal(receipt.checkpoint, row.checkpoint);
      const details = await ledger.details(row.digest); assert(details);
      assert.equal(details.transaction.digest, row.digest);
      const effects = row.tx.Transaction.effects.changedObjects.filter((o: any) => o.outputState === 'ObjectWrite');
      const historical = await archive.objects(effects.map((o: any) => ({objectId: o.objectId, version: o.outputVersion})));
      assert.equal(historical.values.length, effects.length);
      historical.values.forEach((object, index) => {
        assert(!(object instanceof Error), JSON.stringify({
          objectId: effects[index].objectId, version: effects[index].outputVersion,
          transactionCheckpoint: row.checkpoint, coverage: historical.coverage,
          error: object instanceof Error ? {name: object.name, message: object.message} : undefined,
        })); assert(object);
        assert.equal(object.objectId, effects[index].objectId);
        assert.equal(object.version, effects[index].outputVersion);
        assert.equal(object.digest, effects[index].outputDigest);
      });
      results.push({name: row.name, digest: row.digest, checkpoint: receipt.checkpoint,
        historicalObjects: historical.values.length, archiveCoverage: historical.coverage});
    }
    writeFileSync(output, JSON.stringify({passed: true, h0: profile.expectedGenesisDigest, observedAt: new Date().toISOString(), results, requests, signatures: 0, dispatches: 0}, null, 2) + '\n', {flag: 'wx', mode: 0o600});
    console.log(JSON.stringify({passed: true, results}));
  } finally {session.close(); globalThis.fetch = original;}
}
main().catch(error => {console.error(error); process.exitCode = 1;});
