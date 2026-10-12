// Copyright (c) LinkU Labs, Inc.
// SPDX-License-Identifier: Apache-2.0
// Compare one public read with its owned native backend; never constitutes wallet admission.
const fs = require('node:fs');
async function main() {
  const [profileFile, proofFile, output, surface = 'both'] = process.argv.slice(2);
  if (!['both', 'native', 'public'].includes(surface)) throw new Error('Unknown diagnostic surface');
  const profile = JSON.parse(fs.readFileSync(profileFile, 'utf8'));
  const { proof, owner } = JSON.parse(fs.readFileSync(proofFile, 'utf8'));
  const query = `query DisplayLatency($owner: RtdAddress!) {
    walletGenesis: checkpoint(sequenceNumber: 0) { digest }
    walletSnapshot: checkpoint(sequenceNumber: ${BigInt(proof.checkpoint)}) { sequenceNumber digest query {
      address(address: $owner) { objects(first: 50) { nodes { address contents { display { output errors } } } } }
    } }
  }`;
  const results = [];
  for (const [name, url] of [['native', 'http://127.0.0.1:39540/graphql'], ['public', profile.endpoints.graphqlUrl]]) {
    if (surface !== 'both' && surface !== name) continue;
    const start = performance.now();
    try {
      const response = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query, variables: { owner } }), signal: AbortSignal.timeout(10_000) });
      const body = await response.json();
      const matches = body.data?.walletGenesis?.digest === profile.expectedGenesisDigest &&
        body.data?.walletSnapshot?.digest === proof.digest && String(body.data?.walletSnapshot?.sequenceNumber) === proof.checkpoint;
      results.push({ name, status: response.status, milliseconds: Math.round(performance.now() - start),
        passed: response.ok && !body.errors?.length && matches, identityMatches: matches,
        objects: body.data?.walletSnapshot?.query?.address?.objects?.nodes?.length,
        errors: body.errors?.map(value => ({ code: value.extensions?.code, path: value.path })) });
    } catch (error) { results.push({ name, passed: false, milliseconds: Math.round(performance.now() - start), errorType: error.name }); }
  }
  const evidence = { observedAt: new Date().toISOString(), checkpoint: proof.checkpoint, results,
    passed: results.every(row => row.passed), simulations: 0, dispatches: 0,
    scope: 'One fixed-checkpoint display query endpoint isolation only; native direct read bypasses public admission and cannot be wallet acceptance' };
  fs.writeFileSync(output, JSON.stringify(evidence, null, 2) + '\n', { flag: 'wx', mode: 0o600 });
  console.log(JSON.stringify(evidence));
  if (!evidence.passed) process.exitCode = 1;
}
main().catch(error => { console.error(JSON.stringify({ passed: false, errorType: error.name })); process.exitCode = 1; });
