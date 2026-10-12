// Copyright (c) LinkU Labs, Inc.
// SPDX-License-Identifier: Apache-2.0
// Current public endpoints and clearly marked leaf-response faults; never simulate, sign or execute.
import assert from 'node:assert/strict';
import { readFileSync, writeFileSync } from 'node:fs';
import { GrpcTypes } from 'rtd-typescript/grpc';
import { toBase58 } from 'rtd-typescript/utils';
import { validateNetworkProfile } from '../src/shared/rpc/profile';
import { WalletReadSession } from '../src/shared/rpc/session';
import { assertTransactionNetworkIdentity } from '../src/shared/rpc/transaction-network-identity';
// Node has no native IndexedDB; this explicitly injected model proves transport/decision only.
import { MemoryNetworkObservations } from '../tests/unit/rpc/network-observation-fixture';
const observations = new MemoryNetworkObservations();
let failureOutput: string | undefined, phase = 'profile';
const calls: { role: string; status?: number; fault?: string }[] = [], cases: unknown[] = [];

async function main() {
  const [profileFile, output] = process.argv.slice(2);
  failureOutput = output;
  const profile = validateNetworkProfile(JSON.parse(readFileSync(profileFile, 'utf8')), { requireComplete: true });
  const urls = new Map([
    [profile.endpoints.fullnodeGrpcWeb.replace(/\/$/, '') + '/rtd.rpc.v2.LedgerService/GetServiceInfo', 'fullnode'],
    [profile.endpoints.archiveGrpcWeb!.replace(/\/$/, '') + '/rtd.rpc.v2.LedgerService/GetServiceInfo', 'archive'],
    [profile.endpoints.graphqlUrl!, 'graphql'],
  ] as const);
  assert.equal(urls.size, 3);
  for (const url of urls.keys()) assert.equal(new URL(url).hostname, '127.0.0.1');
  const original = globalThis.fetch.bind(globalThis);
  const wrong = toBase58(new Uint8Array(32).fill(9));
  let fault: { role: string; kind: 'mismatch' | 'unavailable' | 'regression' } | undefined;
  const fetch: typeof globalThis.fetch = async (input, init) => {
    const url = input instanceof Request ? input.url : String(input), role = urls.get(url);
    assert(role, 'Unexpected operation');
    assert.equal(init?.credentials, 'omit'); assert.equal(init?.redirect, 'error');
    if (role === 'graphql') assert.equal(JSON.parse(String(init?.body)).query, 'query WalletGenesisIdentity { checkpoint(sequenceNumber: 0) { digest } }');
    const active = fault?.role === role ? fault.kind : undefined;
    const row = { role, fault: active } as (typeof calls)[number]; calls.push(row);
    if (active === 'unavailable') throw new TypeError('Controlled unavailable leaf');
    const response = await original(input, init); row.status = response.status;
    assert.equal(response.status, 200);
    if (!active) return response;
    if (role === 'graphql') {
      const body = await response.json();
      assert.equal(body.data.checkpoint.digest, profile.expectedGenesisDigest);
      body.data.checkpoint.digest = wrong;
      return new Response(JSON.stringify(body), { status: 200, headers: response.headers });
    }
    const framed = Buffer.from(await response.arrayBuffer());
    assert.equal(framed[0], 0); const length = framed.readUInt32BE(1);
    assert(framed.length >= length + 5);
    const message = GrpcTypes.GetServiceInfoResponse.fromBinary(framed.subarray(5, length + 5));
    assert.equal(message.chainId, profile.expectedGenesisDigest);
    if (active === 'mismatch') message.chainId = wrong;
    else { message.checkpointHeight = 0n; message.lowestAvailableCheckpoint = 0n; message.lowestAvailableCheckpointObjects = 0n; }
    const value = GrpcTypes.GetServiceInfoResponse.toBinary(message), header = Buffer.alloc(5); header.writeUInt32BE(value.length, 1);
    return new Response(Buffer.concat([header, value, framed.subarray(5 + length)]), { status: 200, headers: response.headers });
  };
  const withSession = async (operation: (session: WalletReadSession) => Promise<void>) => {
    const session = new WalletReadSession(profile);
    try { await operation(session); } finally { session.close(); fault = undefined; }
  };
  await withSession(async session => {
    phase = 'actual-baseline';
    const reports = [];
    for (let i = 0; i < 2; i++) {
      const result = await assertTransactionNetworkIdentity(session, { fetch, observations });
      assert.equal(result.state, 'identity-verified');
      assert(result.report.endpoints.every(e => e.state === 'verified'));
      reports.push(result);
    }
    assert.equal(calls.length, 6);
    cases.push({ name: 'two-fresh-actual-three-entry-identities', reports, faultInjected: false });
  });
  for (const role of ['fullnode', 'graphql', 'archive']) await withSession(async session => {
    phase = role + '-mismatch';
    fault = { role, kind: 'mismatch' };
    await assert.rejects(assertTransactionNetworkIdentity(session, { fetch, observations }), { name: 'NetworkIdentityError', role, reason: 'chain-mismatch' });
    fault = undefined; const count = calls.length;
    await assert.rejects(assertTransactionNetworkIdentity(session, { fetch, observations }), { name: 'NetworkIdentityError', role, reason: 'chain-mismatch' });
    assert.equal(calls.length, count);
    cases.push({ name: role + '-wrong-chain-sticky', faultInjected: true, zeroReadsAfterIsolation: true });
  });
  await withSession(async session => {
    phase = 'optional-unavailable';
    fault = { role: 'archive', kind: 'unavailable' };
    assert.equal((await assertTransactionNetworkIdentity(session, { fetch, observations })).state, 'identity-degraded');
    fault = undefined;
    assert.equal((await assertTransactionNetworkIdentity(session, { fetch, observations })).state, 'identity-verified');
    cases.push({ name: 'optional-transient-failure-reprobed', faultInjected: true });
  });
  await withSession(async session => {
    phase = 'fullnode-unavailable';
    fault = { role: 'fullnode', kind: 'unavailable' };
    await assert.rejects(assertTransactionNetworkIdentity(session, { fetch, observations }), { code: 'UNAVAILABLE' });
    cases.push({ name: 'fullnode-unavailable-no-substitution', faultInjected: true });
  });
  await withSession(async session => {
    phase = 'archive-regression';
    await assertTransactionNetworkIdentity(session, { fetch, observations });
    fault = { role: 'archive', kind: 'regression' };
    await assert.rejects(assertTransactionNetworkIdentity(session, { fetch, observations }), { name: 'TransactionNetworkResetError', role: 'archive' });
    cases.push({ name: 'observed-archive-height-regression', faultInjected: true });
  });
  const evidence = { passed: true, observedAt: new Date().toISOString(), cases, calls, simulations: 0, signatures: 0, dispatches: 0,
    scope: 'Current production transaction identity guard with an explicitly injected unit-only memory observation model over actual public Node TLS endpoints twice, followed by explicitly controlled leaf-response/availability faults. Native IndexedDB durability/restart is separately verified in Chromium and is not proved by this Node run. No capability/SDL/package, global UI reset, normal Chrome CA, or complete trial acceptance.' };
  writeFileSync(output, JSON.stringify(evidence, (_, value) => typeof value === 'bigint' ? value.toString() : value, 2) + '\n', { flag: 'wx', mode: 0o600 });
  console.log(JSON.stringify({ passed: true, cases: cases.length, requests: calls.length, actualBaselineReads: 6, dispatches: 0 }));
}
main().catch(error => {
  const failure = { passed: false, observedAt: new Date().toISOString(), phase, errorType: error.name, code: error.code, reason: error.reason, role: error.role, assertionActual: error.actual && { name: error.actual.name, reason: error.actual.reason, code: error.actual.code, role: error.actual.role }, cases, calls, simulations: 0, signatures: 0, dispatches: 0 };
  if (failureOutput) writeFileSync(failureOutput, JSON.stringify(failure, (_, value) => typeof value === 'bigint' ? value.toString() : value, 2) + '\n', { flag: 'wx', mode: 0o600 });
  console.error(JSON.stringify({ passed: false, phase, errorType: error.name, code: error.code, requests: calls.length })); process.exitCode = 1;
});
