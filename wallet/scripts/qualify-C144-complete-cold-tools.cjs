// Prepared tools only: full source inverses, syntax, and rejection of old gaps.
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const Module = require('node:module');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const logs = path.resolve(__dirname, '../migrationToGRpcOrGraphQLDoc/workLog');
const read = file => JSON.parse(fs.readFileSync(file));
const sha = file => crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');

async function main(output) {
  assert(output && !fs.existsSync(output));
  const inputs = { [__filename]: sha(__filename) };
  const names = ['20261009-C144-cold-integration-source-inverse-01.json', '20261009-C144-cold-integration-v2-source-inverse-01.json',
    '20261009-C144-runtime-source-closure-v3-prepared-01.json', '20261009-C144-cold-browser-network-v4-source-inverse-01.json',
    '20261009-C144-cold-teardown-v5-source-inverse-01.json', '20261009-C144-cold-v6-route-source-inverse-01.json',
    '20261009-C144-complete-cold-business-correlation-prepared-01.json'];
  let inverses = 0;
  for (const name of names) {
    const file = path.join(logs, name), proof = read(file);
    assert(proof.passed && proof.preparedOnly);
    inputs[file] = sha(file);
    Object.assign(inputs, proof.inputsSha256);
    for (const row of proof.completeSourceInverses ?? []) {
      let inverse = fs.readFileSync(row.new, 'utf8');
      for (const delta of [...row.deltas].reverse()) {
        assert.equal(inverse.split(delta.toText).length - 1, delta.count);
        inverse = inverse.replaceAll(delta.toText, delta.fromText);
      }
      assert.equal(inverse, fs.readFileSync(row.old, 'utf8'));
      inverses++;
    }
    if (proof.completeSourceSliceInverse) {
      const row = proof.completeSourceSliceInverse;
      let inverse = fs.readFileSync(row.new, 'utf8');
      assert(inverse.endsWith(row.newSuffix));
      inverse = inverse.slice(0, -row.newSuffix.length);
      for (const delta of [...row.deltas].reverse()) {
        assert.equal(inverse.split(delta.toText).length - 1, delta.count);
        inverse = inverse.replaceAll(delta.toText, delta.fromText);
      }
      assert.equal(inverse, fs.readFileSync(row.old, 'utf8').slice(0, row.oldSourceSliceEnd));
      inverses++;
    }
  }
  const sources = ['test-C144-current-non-nft-pending-cold-v6.cjs', 'audit-C144-current-non-nft-complete-cold.cjs',
    'lib/C144-cold-business-correlation.cjs', 'lib/C144-current-core-gateway-ownership-v3.cjs'];
  for (const name of sources) {
    const file = path.join(__dirname, name);
    new vm.Script(Module.wrap(fs.readFileSync(file, 'utf8')), { filename: file });
    inputs[file] = sha(file);
  }
  const { audit } = require('./audit-C144-current-non-nft-complete-cold.cjs');
  const creatorFile = path.join(logs, '20261009-C138-current-non-nft-pending-creator-01.json');
  const qualifiedFile = path.join(logs, '20261009-C138-current-non-nft-pending-creator-independent-01.json');
  const oldColdFile = path.join(logs, '20261009-C138-current-non-nft-pending-cold-03.json');
  const buildFile = path.join(logs, '20261009-default-generation-positive-C136-build-01.json');
  const creator = read(creatorFile), qualified = read(qualifiedFile), cold = read(oldColdFile), build = read(buildFile);
  assert.equal(cold.passed, false);
  let refusals = 0;
  await assert.rejects(() => audit(cold, creator, qualified, build, [], {})); refusals++;
  const relabelled = structuredClone(cold);
  Object.assign(relabelled, { passed: true, actualCurrentNonNftColdDurableAccepted: true, allRequiredColdAcceptanceObserved: true,
    captureScopeIncludesTeardown: true, normalOwnBrowserAndDemoClosed: true, allOriginalHttpBodiesCaptured: true, captureErrors: [],
    unknownPositiveBodyGaps: 0, cleanupFailures: [], directPrivateSignDataObserved: true, newSignatures: 0 });
  // Positive labels cannot supply missing actual source bytes, counters, or bodies.
  await assert.rejects(() => audit(relabelled, creator, qualified, build, [], {})); refusals++;
  relabelled.newSignatures = null;
  await assert.rejects(() => audit(relabelled, creator, qualified, build, [], {})); refusals++;
  for (const file of [creatorFile, qualifiedFile, oldColdFile, buildFile]) inputs[file] = sha(file);
  for (const [file, value] of Object.entries(inputs)) assert.equal(sha(file), value);
  const result = { passed: true, observedAt: new Date().toISOString(), preparedOnly: true,
    completeSourceInversesChecked: inverses, currentToolSyntaxAccepted: sources.length,
    oldFailedAndMissingObservationRelabellingRefused: refusals, oldFailedColdEvidenceUnchanged: true,
    actualColdProfileRun: false, profilesOpened: 0, runtimeCreated: false, serviceSignals: 0,
    signatures: 0, executeRequests: 0, nftBusinessRequests: 0, actualColdAccepted: false,
    fullNonNftM5Accepted: false, parentCompletion: false, inputsSha256: inputs };
  fs.writeFileSync(output, JSON.stringify(result, null, 2) + '\n', { flag: 'wx', mode: 0o600 });
  console.log(JSON.stringify({ passed: true, preparedOnly: true, inverses, syntax: sources.length, oldGapRefusals: refusals }));
}

if (require.main === module) main(path.resolve(process.argv[2] ?? '')).catch(error => {
  console.error(JSON.stringify({ passed: false, preflight: true, errorType: error.name, message: String(error.message).slice(0, 700) }));
  process.exitCode = 1;
});
