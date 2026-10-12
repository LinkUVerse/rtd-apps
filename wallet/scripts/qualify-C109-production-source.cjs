// Actual regression/TS/build/closure and complete original-product inverse qualification.
const fs = require('node:fs'), path = require('node:path'), crypto = require('node:crypto');
const assert = require('node:assert/strict');
const wallet = path.resolve(__dirname, '..'), logs = path.join(wallet, 'migrationToGRpcOrGraphQLDoc/workLog');
const read = f => JSON.parse(fs.readFileSync(f, 'utf8'));
const sha = f => crypto.createHash('sha256').update(fs.readFileSync(f)).digest('hex');
const [output] = process.argv.slice(2); assert(output && !fs.existsSync(output));
let result;
try {
  const input = [__filename, path.join(__dirname, 'lib/C109-product-source-lineage.cjs')];
  const load = name => { const f = path.join(logs, name); input.push(f); return read(f); };
  const delta = load('20261008-C109-product-delta-prepared-03.json');
  assert(delta.passed && delta.originalBodyInverseAccepted && delta.unchangedOriginalProductFiles === 1120);
  const typed = load('20261008-C109-complete-typecheck-regression-01.json');
  assert(typed.passed && typed.regressionTests === 184 && typed.regressionFiles === 13);
  assert.equal(typed.checks.length, 2); assert(typed.checks.every(c => c.processExitCode === 0 && c.diagnostics.length === 0));
  const regression = load('20261008-C109-staking-regression-01.json');
  assert(regression.success && regression.numPassedTests === 184 && regression.numFailedTests === 0);
  const reproduction = load('20261008-C109-controlled-reproduction-evidence-01.json');
  assert(reproduction.passed && reproduction.originalFailedTests === 3 && reproduction.candidatePassedTests === 56);
  const buildFile = path.join(logs, '20261008-default-generation-positive-C109-build-01.json'); input.push(buildFile);
  const build = read(buildFile); assert(build.passed && build.sourceUnchanged && build.currentDevelopmentDistUnchanged);
  assert.deepEqual(build.sourceAfter, delta.currentSource); assert.deepEqual(build.sourceBefore, delta.currentSource);
  const closure = load('20261008-default-generation-positive-C109-closure-01.json'); assert(closure.passed);
  assert.deepEqual(closure.source, delta.currentSource);
  const prepared = load('20261008-C109-core-gateway-prepared-01.json');
  assert(prepared.passed && prepared.preparedOnly && prepared.containersCreated === 0 && prepared.profileOnlyThreeEndpointPortsChanged);
  assert.equal(sha(prepared.profile), build.profileSha256);
  const previousQualificationFile = path.join(logs, '20261008-C102-production-source-independent-02.json'); input.push(previousQualificationFile);
  const previous = read(previousQualificationFile); assert(previous.passed && previous.exactProductDeltaAccepted);
  assert.deepEqual(previous.currentSource, delta.originalSource);
  for (const p of [delta, typed, reproduction, closure, prepared, previous]) {
    for (const [f, h] of Object.entries(p.inputsSha256 ?? {})) { assert.equal(sha(f), h); input.push(f); }
  }
  // Both old production artifacts and the loaded development extension stay exact.
  for (const name of ['20261007-default-generation-positive-C46-build-03.json', '20261008-default-generation-positive-C102-build-03.json']) {
    const p = load(name); assert(p.passed);
    for (const [f, h] of Object.entries(p.artifacts)) assert.equal(sha(path.join(p.output, f)), h);
  }
  const proof = { ...delta, buildFile, previousQualificationFile, referenceDemoSource: previous.originalSource,
    inputsSha256: Object.fromEntries([...new Set(input)].map(f => [f, sha(f)])),
    fullProductionTypecheck: true, regressionTests: 184, isolatedProductionBuild: true, emittedProductionClosure: true,
    originalC46C102BuildsHeld: true, oldC102CurrentGuardProperlyRejectsNewSource: false };
  const lineage = require('./lib/C109-product-source-lineage.cjs');
  assert.deepEqual(lineage.validateWithProof(proof, delta.originalSource, buildFile), delta.currentSource);
  let negatives = 0;
  for (const mutate of [p => p.passed = false, p => p.changed.push('another-file'),
    p => p.added.length = 0, p => p.deleted.push('another-file'), p => p.unchangedOriginalProductFiles--,
    p => p.currentSource.sha256 = '0'.repeat(64), p => p.originalBodyInverseAccepted = false,
    p => p.referenceDemoSource.sha256 = '0'.repeat(64)]) {
    const bad = JSON.parse(JSON.stringify(proof)); mutate(bad);
    assert.throws(() => lineage.validateWithProof(bad, delta.originalSource, buildFile)); negatives++;
  }
  assert.throws(() => lineage.validateWithProof(proof, delta.originalSource, path.join(logs, 'another-build.json'))); negatives++;
  assert.throws(() => require('./lib/C102-product-source-lineage-v2.cjs').validate(previous.originalSource, path.join(logs, '20261008-default-generation-positive-C102-build-03.json')));
  proof.oldC102CurrentGuardProperlyRejectsNewSource = true;
  result = { ...proof, observedAt: new Date().toISOString(), sourceLineageRejectChecks: negatives,
    originalFailureRecordsHeld: true, profilesOpened: 0, signatures: 0, executeRequests: 0,
    actualApiAccepted: false, currentCoreBrowserAccepted: false, actualBrowserTimeoutFixed: false, parentAcceptance: false };
} catch (error) { result = { passed: false, errorType: error.name, message: String(error.message).slice(0, 1600), parentAcceptance: false }; process.exitCode = 1; }
fs.writeFileSync(output, JSON.stringify(result, null, 2) + '\n', { flag: 'wx', mode: 0o600 });
console.log(JSON.stringify({ passed: result.passed, source: result.currentSource, errorType: result.errorType, message: result.message }));
