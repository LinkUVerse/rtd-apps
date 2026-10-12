// Copyright (c) LinkU Labs, Inc.
// SPDX-License-Identifier: Apache-2.0
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import { GrpcTypes } from 'rtd-typescript/grpc';
import { validateNetworkProfile } from '../src/shared/rpc/profile';
import { WalletReadSession } from '../src/shared/rpc/session';
import { probeNativeServiceCapabilities } from '../src/shared/rpc/native-service-capabilities';
import { probeMovePackageCapabilities } from '../src/shared/rpc/move-package-capabilities';
import { probeDeploymentCapabilities } from '../src/shared/rpc/deployment-capabilities';

async function main() {
  const [profileFile, declarationFile, output] = process.argv.slice(2);
  const profile = validateNetworkProfile(JSON.parse(readFileSync(profileFile, 'utf8')));
  const declarationJson = readFileSync(declarationFile, 'utf8');
  const declaration = { json: declarationJson, trustedSha256: createHash('sha256').update(declarationJson).digest('hex') };
  assert.equal(declaration.trustedSha256, '323488a85754bac1c6ae57e915aa88cb0c662ee62036da9e1a10939fe103ab2f');
  const session = new WalletReadSession(profile);
  const requests: unknown[] = [], results: unknown[] = [];
  let stage: string;
  const observedFetch: typeof fetch = async (input, init) => {
    const url = new URL(String(input)), method = url.pathname.split('/').pop();
    assert(url.hostname === '127.0.0.1' && ['39400', '39603'].includes(url.port));
    assert(['GetServiceInfo', 'GetCheckpoint', 'GetObject', 'GetPackage', 'GetDatatype', 'GetFunction', 'GetCoinInfo'].includes(method!));
    const response = await fetch(input, init);
    const row: Record<string, unknown> = { stage, port: url.port, method, status: response.status };
    if (method === 'GetServiceInfo') {
      const bytes = new Uint8Array(await response.clone().arrayBuffer());
      if (bytes[0] === 0 && bytes.length >= 5) {
        const size = new DataView(bytes.buffer, bytes.byteOffset).getUint32(1);
        const info = GrpcTypes.GetServiceInfoResponse.fromBinary(bytes.subarray(5, 5 + size));
        for (const field of ['chainId', 'checkpointHeight', 'lowestAvailableCheckpoint', 'lowestAvailableCheckpointObjects'] as const)
          row[field] = typeof info[field] === 'bigint' ? info[field]!.toString() : info[field] ?? null;
      }
    }
    requests.push(row); return response;
  };
  try {
    for (const [name, probe] of [
      ['native', () => probeNativeServiceCapabilities(session, { fetch: observedFetch })],
      ['move', () => probeMovePackageCapabilities(session, { fetch: observedFetch })],
      ['deployment', () => probeDeploymentCapabilities(session, { fetch: observedFetch, declaration })],
    ] as const) {
      stage = name;
      try { results.push({ stage, completed: true, report: await probe() }); }
      catch (error) { results.push({ stage, completed: false, errorType: (error as Error).name,
        reason: (error as { reason?: string }).reason, role: (error as { role?: string }).role }); }
    }
    writeFileSync(output, JSON.stringify({ observedAt: new Date().toISOString(), results, requests,
      simulations: 0, signatures: 0, executions: 0, certificateChanges: 0,
      scope: 'Actual readonly native assessments with public scalar identity bookends. Private Node CA; not Chrome acceptance, persisted admission mutation or reconstruction of the earlier failed signature time.' }, null, 2) + '\n', { flag: 'wx', mode: 0o600 });
    console.log(JSON.stringify(results.map(row => { const r = row as { stage: string; completed: boolean; reason?: string }; return { stage: r.stage, completed: r.completed, reason: r.reason }; })));
  } finally { session.close(); }
}
main().catch(error => { console.error(JSON.stringify({ errorType: error.name })); process.exitCode = 1; });
