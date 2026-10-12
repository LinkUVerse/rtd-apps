// Copyright (c) LinkU Labs, Inc.
// SPDX-License-Identifier: Apache-2.0
// Field isolation only. Partial diagnostic results are never delivered as a wallet portfolio.
import { readFileSync, writeFileSync } from 'node:fs';
import { validateNetworkProfile } from '../src/shared/rpc/profile';
import { WalletReadSession } from '../src/shared/rpc/session';
import { WalletAssetReader, walletAddress } from '../src/shared/rpc/asset-reader';
import { SnapshotReadError } from '../src/shared/rpc/graphql-snapshot';

async function main() {
  const [profilePath, owner, output] = process.argv.slice(2);
  const session = new WalletReadSession(validateNetworkProfile(JSON.parse(readFileSync(profilePath, 'utf8'))));
  const cases = [
    ['identity', 'address version digest'],
    ['bcs-and-owner', 'address contents { bcs type { repr } } owner { __typename }'],
    ['json-and-transfer', 'address hasPublicTransfer contents { json }'],
    ['display', 'address contents { display { output errors } }'],
    ['previous-transaction', 'address previousTransaction { digest }'],
  ];
  const results: unknown[] = [];
  const evidence: Record<string, unknown> = { observedAt: new Date().toISOString(), passed: false,
    owner: walletAddress(owner), results, simulations: 0, dispatches: 0,
    scope: 'Fixed admitted checkpoint, first owned-object page field isolation only; no complete portfolio or Kiosk acceptance' };
  let failed = false;
  try {
    const reader = await WalletAssetReader.open(session, { timeoutMs: 30_000, fetch: async (input, init) => {
      const response = await fetch(input, init);
      const request = typeof init?.body === 'string' ? JSON.parse(init.body) : undefined;
      if (request?.query?.includes('query WalletSnapshotAdmission')) {
        const result = await response.clone().json();
        evidence.admission = {
          head: result.data?.walletHead?.sequenceNumber,
          errors: result.errors?.map((error: { extensions?: { code?: string }; path?: unknown; message?: string }) => ({
            code: error.extensions?.code, path: error.path,
            classes: ['checkpoint', 'watermark', 'range', 'connect', 'not found', 'available', 'coverage']
              .filter(term => error.message?.toLowerCase().includes(term)),
          })),
          ranges: Object.entries(result.data?.serviceConfig ?? {}).map(([alias, value]) => {
            const range = value as { first?: { sequenceNumber?: number }; last?: { sequenceNumber?: number } } | null;
            return { alias, first: range?.first?.sequenceNumber, last: range?.last?.sequenceNumber };
          }),
        };
      }
      return response;
    } });
    evidence.proof = reader.proof;
    for (const [name, fields] of cases) {
      const start = performance.now();
      try {
        const result = await reader.snapshot.read({ selection: `address(address: $owner) {
          address objects(first: 50) { pageInfo { hasNextPage endCursor } nodes { ${fields} } } }`,
          variableDefinitions: '$owner: RtdAddress!', variables: { owner: walletAddress(owner) },
          signal: AbortSignal.timeout(10_000) });
        const address = result.address as { objects: { nodes: unknown[]; pageInfo: { hasNextPage: boolean } } };
        results.push({ name, passed: true, milliseconds: Math.round(performance.now() - start),
          objects: address.objects.nodes.length, hasNextPage: address.objects.pageInfo.hasNextPage });
      } catch (error) {
        results.push({ name, passed: false, milliseconds: Math.round(performance.now() - start),
          errorType: error instanceof Error ? error.name : 'unknown' });
        failed = true; break;
      }
    }
    if (!failed) { await reader.snapshot.revalidate(); evidence.passed = true; }
  } catch (error) {
    failed = true; evidence.errorType = error instanceof Error ? error.name : 'unknown';
    if (error instanceof SnapshotReadError) evidence.errorReason = error.reason;
  } finally {
    session.close(); writeFileSync(output, JSON.stringify(evidence, null, 2) + '\n', { flag: 'wx', mode: 0o600 });
  }
  console.log(JSON.stringify({ passed: evidence.passed, results, simulations: 0, dispatches: 0 }));
  if (failed) process.exitCode = 1;
}
main().catch(error => { console.error(JSON.stringify({ passed: false, errorType: error.name })); process.exitCode = 1; });
