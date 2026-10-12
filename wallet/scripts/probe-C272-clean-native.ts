// Copyright (c) LinkU Labs, Inc.
// SPDX-License-Identifier: Apache-2.0
import assert from 'node:assert/strict';
import { writeFileSync } from 'node:fs';
import { RtdGrpcClient } from 'rtd-typescript/grpc';

async function main() {
    const [endpoint, expectedH0, output] = process.argv.slice(2);
    assert.equal(endpoint, 'http://127.0.0.1:43150');
    const client = new RtdGrpcClient({ network: 'localnet', baseUrl: endpoint, format: 'binary' });
    const samples = [];
    for (let i = 0; i < 3; i++) {
        const { response } = await client.ledgerService.getServiceInfo({}, { timeout: 10000 });
        assert.equal(response.chainId, expectedH0);
        samples.push({ at: new Date().toISOString(), height: String(response.checkpointHeight) });
        if (i < 2) await new Promise(resolve => setTimeout(resolve, 15000));
    }
    const advanced = BigInt(samples[2].height) > BigInt(samples[0].height);
    const { response } = await client.ledgerService.getCheckpoint({
        checkpointId: { oneofKind: 'sequenceNumber', sequenceNumber: 0n },
        readMask: { paths: ['digest', 'sequence_number'] },
    }, { timeout: 10000 });
    assert.equal(response.checkpoint?.digest, expectedH0);
    const result = { passed: advanced, endpoint, expectedH0, samples, genesisVerified: true,
        scope: 'Native gRPC-Web identity and 30-second advancement only; no archive or browser acceptance',
        simulations: 0, signatures: 0, executeRequests: 0 };
    writeFileSync(output, JSON.stringify(result, null, 2) + '\n', { flag: 'wx', mode: 0o600 });
    console.log(JSON.stringify(result));
    assert(advanced, 'new chain must advance');
}
main().catch(error => { console.error(error); process.exitCode = 1; });
