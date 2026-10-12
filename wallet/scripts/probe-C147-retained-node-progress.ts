// Copyright (c) LinkU Labs, Inc.
// SPDX-License-Identifier: Apache-2.0
import assert from 'node:assert/strict';
import { existsSync, writeFileSync } from 'node:fs';
import { RtdGrpcClient } from 'rtd-typescript/grpc';
async function main() {
  const [output] = process.argv.slice(2);
  assert(output && !existsSync(output));
  const rows: Array<{ observedAt: string; port: number; h0: string; checkpoint: string }> = [];
  let passed = false;
  let error: string | undefined;
  try {
    for (let observation = 0; observation < 3; observation++) {
      for (const [port, h0, stalled] of [
        [39400, '3tEPxLxUysGx4gfr8UEycvH7xohMWuwKVbTX5np4TCYj', 2232248n],
        [41750, 'BkuLHhdtnoK7yLxo2eQuvcjHtdyipE7MMyxgTJiyHGg4', 1204852n],
      ] as const) {
        const client = new RtdGrpcClient({ network: 'localnet', baseUrl: `http://127.0.0.1:${port}`, format: 'binary', mvr: { url: '' } });
        const response = (await client.ledgerService.getServiceInfo({})).response;
        assert.equal(response.chainId, h0);
        assert(response.checkpointHeight !== undefined && response.checkpointHeight > stalled);
        rows.push({ observedAt: new Date().toISOString(), port, h0, checkpoint: String(response.checkpointHeight) });
      }
      if (observation < 2) await new Promise(resolve => setTimeout(resolve, 10000));
    }
    for (const port of [39400, 41750]) {
      const heights = rows.filter(row => row.port === port).map(row => BigInt(row.checkpoint));
      assert.equal(heights.length, 3);
      assert(heights[0] < heights[1] && heights[1] < heights[2]);
    }
    passed = true;
  } catch (failure) { error = String((failure as Error).message).slice(0, 500); }
  writeFileSync(output, JSON.stringify({ passed, rows, error, signatures: 0, simulations: 0, executeRequests: 0, parentCompletion: false, scope: 'Three real read-only gRPC observations per retained chain; independent birth/source qualification is required.' }, null, 2) + '\n', { flag: 'wx', mode: 0o600 });
  console.log(JSON.stringify({ passed, rows, error }));
  if (!passed) process.exitCode = 1;
}
main().catch(error => { console.error(String(error)); process.exitCode = 1; });
