// Copyright (c) LinkU Labs, Inc.
// SPDX-License-Identifier: Apache-2.0
import assert from 'node:assert/strict';
import { existsSync, writeFileSync, readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { RtdGrpcClient } from 'rtd-typescript/grpc';

async function main() {
  const [output] = process.argv.slice(2);
  assert(output && !existsSync(output));
  const rows = [];
  for (const [port, h0] of [
    [39400, '3tEPxLxUysGx4gfr8UEycvH7xohMWuwKVbTX5np4TCYj'],
    [41750, 'BkuLHhdtnoK7yLxo2eQuvcjHtdyipE7MMyxgTJiyHGg4'],
  ] as const) {
    const client = new RtdGrpcClient({ network: 'localnet', baseUrl: `http://127.0.0.1:${port}`,
      format: 'binary', mvr: { url: '' } });
    const response = (await client.ledgerService.getServiceInfo({})).response;
    assert.equal(response.chainId, h0);
    assert(response.checkpointHeight !== undefined && response.checkpointHeight > 0n);
    rows.push({ port, h0, checkpoint: String(response.checkpointHeight) });
  }
  const proof = { passed: true, observedAt: new Date().toISOString(), rows,
    inputsSha256: { [process.argv[1]]: createHash('sha256').update(readFileSync(process.argv[1])).digest('hex') },
    signatures: 0, simulations: 0, executeRequests: 0,
    scope: 'Actual two retained local debug-chain GetServiceInfo responses. Readiness of processes is separate from indexed coverage and current-native names/Chrome acceptance.' };
  writeFileSync(output, JSON.stringify(proof, null, 2) + '\n', { flag: 'wx', mode: 0o600 });
  console.log(JSON.stringify({ passed: true, rows }));
}
main().catch(e => { console.error(JSON.stringify({ passed: false, error: String(e.message).slice(0, 300) })); process.exitCode = 1; });
