// Copyright (c) LinkU Labs, Inc.
// SPDX-License-Identifier: Apache-2.0
// Independently verify explicitly supplied UI digests on the selected dev chain.
// This script never signs or submits transactions.
import assert from 'node:assert/strict';
import {readFileSync, writeFileSync, existsSync} from 'node:fs';
import {join} from 'node:path';
import {RtdGrpcClient} from 'rtd-typescript/grpc';

async function main() {
  const [runtime, casesFile, output] = process.argv.slice(2);
  assert(!existsSync(output), 'Keep earlier evidence');
  const read = (file: string) => JSON.parse(readFileSync(file, 'utf8'));
  const meta = read(join(runtime, 'runtime.json'));
  const cases: {name: string; digest: string; objects?: {id: string; owner: string; kind?: 'AddressOwner' | 'ObjectOwner'}[]}[] = read(casesFile);
  const url = new URL(meta.rpcUrl);
  assert.equal(url.hostname, '127.0.0.1');
  const client = new RtdGrpcClient({network: 'localnet', baseUrl: url.href, format: 'binary', mvr: {url: ''}});
  assert.equal((await client.ledgerService.getServiceInfo({})).response.chainId, meta.expectedGenesisDigest);
  const results = [];
  for (const item of cases) {
    const tx = await client.core.getTransaction({digest: item.digest, include: {effects: true, objectTypes: true, balanceChanges: true}});
    assert.equal(tx.$kind, 'Transaction');
    if (tx.$kind !== 'Transaction') throw new Error('Transaction unavailable');
    assert.equal(tx.Transaction.digest, item.digest);
    assert.equal(tx.Transaction.status.success, true);
    assert(tx.Transaction.checkpoint != null);
    const objects = [];
    for (const expected of item.objects ?? []) {
      const object = (await client.core.getObjects({objectIds: [expected.id], include: {content: true}})).objects[0];
      assert(!(object instanceof Error));
      const kind = expected.kind ?? 'AddressOwner';
      assert.equal(object.owner.$kind, kind);
      assert.equal(object.owner[kind], expected.owner);
      objects.push(object);
    }
    results.push({name: item.name, digest: item.digest, checkpoint: tx.Transaction.checkpoint, tx, objects});
  }
  assert.equal((await client.ledgerService.getServiceInfo({})).response.chainId, meta.expectedGenesisDigest);
  writeFileSync(output, JSON.stringify({passed: true, h0: meta.expectedGenesisDigest, observedAt: new Date().toISOString(), results, signatures: 0, dispatches: 0}, (_, value) => typeof value === 'bigint' ? String(value) : value, 2) + '\n', {flag: 'wx', mode: 0o600});
  console.log(JSON.stringify({passed: true, transactions: results.map(({name,digest,checkpoint}) => ({name,digest,checkpoint}))}));
}
main().catch(error => {console.error(error); process.exitCode = 1;});
