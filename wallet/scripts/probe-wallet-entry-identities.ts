// Copyright (c) LinkU Labs, Inc.
// SPDX-License-Identifier: Apache-2.0
import assert from 'node:assert/strict';
import { readFileSync, writeFileSync } from 'node:fs';
import { validateNetworkProfile } from '../src/shared/rpc/profile';
import { WalletReadSession } from '../src/shared/rpc/session';
import { probeNetworkIdentity } from '../src/shared/rpc/identity';

async function main() {
  const [profilePath, output] = process.argv.slice(2);
  const profile = validateNetworkProfile(JSON.parse(readFileSync(profilePath, 'utf8')), { requireComplete: true });
  const allowed = new Set([
    `${profile.endpoints.fullnodeGrpcWeb.replace(/\/$/, '')}/rtd.rpc.v2.LedgerService/GetServiceInfo`,
    `${profile.endpoints.archiveGrpcWeb!.replace(/\/$/, '')}/rtd.rpc.v2.LedgerService/GetServiceInfo`,
    profile.endpoints.graphqlUrl!,
  ]);
  assert.equal(allowed.size, 3);
  for (const endpoint of allowed) assert.equal(new URL(endpoint).hostname, '127.0.0.1');
  const original = globalThis.fetch.bind(globalThis), calls: { url: string; status: number }[] = [];
  const fetch: typeof globalThis.fetch = async (input, init) => {
    const url = input instanceof Request ? input.url : String(input);
    assert(allowed.has(url), 'Identity probe attempted another operation');
    assert.equal(init?.credentials, 'omit'); assert.equal(init?.redirect, 'error');
    if (url === profile.endpoints.graphqlUrl) {
      const body = JSON.parse(String(init?.body));
      assert.equal(body.query, 'query WalletGenesisIdentity { checkpoint(sequenceNumber: 0) { digest } }');
    }
    const response = await original(input, init); calls.push({ url, status: response.status }); return response;
  };
  const session = new WalletReadSession(profile);
  try {
    const observations = [];
    for (let i = 0; i < 2; i++) {
      const report = await probeNetworkIdentity(session, { fetch, timeoutMs: 30000 });
      assert.equal(report.state, 'identity-verified'); assert.equal(report.endpoints.length, 3);
      for (const endpoint of report.endpoints) {
        assert.equal(endpoint.state, 'verified');
        if (endpoint.state === 'verified') assert.equal(endpoint.genesisDigest, profile.expectedGenesisDigest);
      }
      observations.push(report);
      assert.equal(calls.length, (i + 1) * 3, 'Each invocation must perform three fresh reads');
    }
    writeFileSync(output, JSON.stringify({ verifiedAt: new Date().toISOString(), observations, calls, dispatches: 0,
      scope: 'Actual Node TLS three-entry raw identity probes twice; not asset snapshot, capability, native Chrome permission or full trial acceptance.' },
      (_, value) => typeof value === 'bigint' ? value.toString() : value, 2) + '\n', { flag: 'wx' });
    console.log(JSON.stringify({ passed: true, reads: calls.length, roles: observations[0].endpoints.map(e => e.role), dispatches: 0 }));
  } finally { session.close(); }
}
main().catch(error => { console.error(error); process.exitCode = 1; });
