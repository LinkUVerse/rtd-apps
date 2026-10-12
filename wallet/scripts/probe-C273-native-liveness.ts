// Copyright (c) LinkU Labs, Inc.
// SPDX-License-Identifier: Apache-2.0
import assert from 'node:assert/strict';
import { writeFileSync } from 'node:fs';
import { RtdGrpcClient } from 'rtd-typescript/grpc';

async function main() {
    const [expectedH0, output, seconds = '180'] = process.argv.slice(2);
    const duration = Number(seconds);
    assert(Number.isInteger(duration) && duration >= 30 && duration <= 600);
    const endpoint = 'http://127.0.0.1:43150';
    const client = new RtdGrpcClient({ network: 'localnet', baseUrl: endpoint, format: 'binary' });
    const { response: genesis } = await client.ledgerService.getCheckpoint({
        checkpointId: { oneofKind: 'sequenceNumber', sequenceNumber: 0n },
        readMask: { paths: ['digest', 'sequence_number'] },
    }, { timeout: 10000 });
    assert.equal(genesis.checkpoint?.digest, expectedH0);
    const { response } = await client.ledgerService.getEpoch({
        readMask: { paths: ['epoch', 'protocol_config'] },
    }, { timeout: 10000 });
    const config = response.epoch?.protocolConfig;
    assert.equal(config?.protocolVersion, 139n);
    assert.equal(config?.featureFlags.periodic_checkpoint_commit_drains, true);
    const samples: { at: string; height: string; epoch: string }[] = [];
    const started = Date.now();
    do {
        const { response: info } = await client.ledgerService.getServiceInfo({}, { timeout: 10000 });
        assert.equal(info.chainId, expectedH0);
        samples.push({ at: new Date().toISOString(), height: String(info.checkpointHeight), epoch: String(info.epoch) });
        writeFileSync(output + '.progress.json', JSON.stringify({ passed: false, samples }, null, 2) + '\n', { mode: 0o600 });
        if (Date.now() - started >= duration * 1000) break;
        await new Promise(resolve => setTimeout(resolve, 10000));
    } while (true);
    const advances = samples.slice(1).filter((s, i) => BigInt(s.height) > BigInt(samples[i].height)).length;
    const passed = advances >= Math.floor((samples.length - 1) / 2)
        && BigInt(samples.at(-1)!.height) > 20n;
    const result = { passed, endpoint, expectedH0, protocolVersion: '139', periodicCommitDrains: true,
        observedMs: Date.now() - started, advances, samples, genesisVerified: true,
        scope: 'Native gRPC liveness only; certificate continuity and persisted restart are separate proofs',
        simulations: 0, signatures: 0, executeRequests: 0 };
    writeFileSync(output, JSON.stringify(result, null, 2) + '\n', { flag: 'wx', mode: 0o600 });
    console.log(JSON.stringify(result));
    assert(passed, 'periodic checkpoint progress must continue beyond the old stall');
}
main().catch(error => { console.error(error); process.exitCode = 1; });
