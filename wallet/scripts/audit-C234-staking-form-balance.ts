// Copyright (c) LinkU Labs, Inc.
// SPDX-License-Identifier: Apache-2.0
// Offline production replay of the three actual native balance frames only.
import assert from 'node:assert/strict';
import { readFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { RTD_TYPE_ARG } from 'rtd-typescript/utils';
import { validateNetworkProfile } from '../src/shared/rpc/profile';
import { WalletReadSession } from '../src/shared/rpc/session';
import { WalletFullnodeReader } from '../src/shared/rpc/fullnode-reader';

async function main() {
  const [input, output] = process.argv.slice(2);
  const raw = readFileSync(input);
  const entries = JSON.parse(raw.toString()).log.entries;
  const profileFile = '/Users/changzechuan/.local/state/rtd-wallet-migration/dev-20261006-03/publication-foundation/C46-isolated-browser-gateway-20261007-01/profile.json';
  const profile = validateNetworkProfile(JSON.parse(readFileSync(profileFile, 'utf8')));
  const allowed = new Set([profile.endpoints.graphqlUrl,
    profile.endpoints.fullnodeGrpcWeb + '/rtd.rpc.v2.LedgerService/GetServiceInfo',
    profile.endpoints.fullnodeGrpcWeb + '/rtd.rpc.v2.StateService/GetBalance']);
  assert(entries.every((e: any) => allowed.has(e.request.url) && e.request.method === 'POST'));
  const frames = entries.filter((e: any) => e.request.url !== profile.endpoints.graphqlUrl);
  assert.equal(frames.length, 3);
  assert.deepEqual(frames.map((e: any) => e.request.url.split('/').at(-1)),
    ['GetServiceInfo', 'GetBalance', 'GetServiceInfo']);
  let used = 0;
  const transport: typeof fetch = async (input, init) => {
    const entry = frames[used++];
    assert(entry, 'Unexpected production RPC');
    assert.equal(String(input), entry.request.url);
    assert.equal(entry.response.status, 200);
    assert(!entry._error);
    assert.deepEqual(Buffer.from(init!.body as Uint8Array), Buffer.from(entry.request.postData.text, 'latin1'));
    const c = entry.response.content;
    assert.equal(c.encoding, 'base64');
    return new Response(Buffer.from(c.text, 'base64'), {
      status: 200, headers: Object.fromEntries(entry.response.headers.map((h: any) => [h.name, h.value])),
    });
  };
  const session = new WalletReadSession(profile);
  try {
    const result = await new WalletFullnodeReader(session, { fetch: transport }).balance(
      '0x9d7652713f02b13b73744ba47e4f21ca0a0a2966cc02df86adcde2041454e5bc', RTD_TYPE_ARG);
    assert.equal(used, 3);
    assert.equal(result.balance, '0');
    assert.equal(result.coinBalance, '0');
    assert.equal(result.addressBalance, '0');
    const sha = (p: string) => createHash('sha256').update(readFileSync(p)).digest('hex');
    const report = { passed: true, observedAt: new Date().toISOString(),
      scope: 'Only three actual ordinary Chrome native balance frames replayed through production reader; GraphQL cycles and all staking transactions not accepted by this audit',
      totalCapturedRequests: entries.length, grpcRequests: used,
      graphqlRequests: entries.length - frames.length,
      otherIncompleteEntries: entries.filter((e: any) => e.response.status !== 200 || e._error)
        .map((e: any) => ({ url: e.request.url, status: e.response.status, error: e._error ?? null })),
      result, liveNetworkRequests: 0, signatures: 0, executions: 0, parentCompletion: false,
      inputsSha256: Object.fromEntries([input, profileFile, process.argv[1],
        'src/shared/rpc/fullnode-reader.ts', 'src/shared/rpc/session.ts'].map(p => [p, sha(p)])) };
    writeFileSync(output, JSON.stringify(report, null, 2) + '\n', { flag: 'wx', mode: 0o600 });
    console.log(JSON.stringify({ passed: true, grpcRequests: used, incompleteOtherRequests: report.otherIncompleteEntries.length }));
  } finally { session.close(); }
}
main().catch(error => { console.error(error); process.exitCode = 1; });
