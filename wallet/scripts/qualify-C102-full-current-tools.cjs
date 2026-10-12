// Full predecessor contracts remain byte-identical outside the explicit source/build binding.
const fs = require('node:fs'), path = require('node:path'), crypto = require('node:crypto');
const assert = require('node:assert/strict'), cp = require('node:child_process');
const logs = path.resolve(__dirname, '../migrationToGRpcOrGraphQLDoc/workLog');
const read = f => JSON.parse(fs.readFileSync(f, 'utf8'));
const sha = f => crypto.createHash('sha256').update(fs.readFileSync(f)).digest('hex');
const [output] = process.argv.slice(2); assert(output && !fs.existsSync(output));
const files = [__filename]; let result;
try {
  const load = name => { const f = path.join(logs, name); files.push(f); const p = read(f); assert(p.passed);
    for (const [f, h] of Object.entries(p.inputsSha256 ?? {})) assert.equal(sha(f), h); return p; };
  const full = load('20261008-C100-full-post-write-preparation-independent-01.json');
  const browser = load('20261008-C101-nonblocking-observer-qualification-01.json');
  assert(browser.originalAdmissionAndV2RelockHeld && browser.originalPromiseAndResponseDeliveryHeld);
  const source = load('20261008-C102-production-source-independent-01.json');
  const lineage = require('./lib/C102-product-source-lineage.cjs');
  assert.deepEqual(lineage.validate(source.originalSource, source.buildFile), source.currentSource);
  const pairs = [
    ['probe-C102-full-post-write-indexed.cjs', 4],
    ['audit-C102-full-post-write-indexed.cjs', 3],
    ['test-C102-current-three-owner-browser.cjs', 5],
    ['audit-C102-current-three-owner-browser.cjs', 4],
  ];
  for (const [name, count] of pairs) {
    const deltaFile = path.join(logs, '20261008-C102-' + name.replace('.cjs', '') + '-source-delta-01.json');
    files.push(deltaFile); const delta = read(deltaFile); assert.equal(delta.changes.length, count);
    files.push(delta.originalSource, delta.candidateSource);
    assert.equal(path.basename(delta.candidateSource), name);
    let inverse = fs.readFileSync(delta.candidateSource, 'utf8');
    for (const { before, after, count } of delta.changes.slice().reverse()) {
      assert.equal(inverse.split(after).length - 1, count); inverse = inverse.replace(after, before);
    }
    assert.equal(inverse, fs.readFileSync(delta.originalSource, 'utf8'));
    const held = [full, browser].find(p => p.inputsSha256[delta.originalSource]); assert(held);
    assert.equal(held.inputsSha256[delta.originalSource], sha(delta.originalSource));
  }
  const apiFile = path.join(logs, '20261008-C100-full-post-write-positive-01.json');
  const independentFile = path.join(logs, '20261008-C100-full-post-write-independent-01.json');
  files.push(apiFile, independentFile, path.join(__dirname, 'lib/C101-current-browser-prerequisites.cjs'));
  assert(require('./lib/C101-current-browser-prerequisites.cjs').validate(read(apiFile), read(independentFile), apiFile));
  const names = pairs.map(p => p[0]).concat(['lib/C102-product-source-lineage.cjs', 'qualify-C102-production-source.cjs', 'qualify-C102-full-current-tools.cjs']);
  for (const name of names) { const f = path.join(__dirname, name); files.push(f); cp.execFileSync(process.execPath, ['--check', f], { timeout: 30000 }); }
  result = { passed: true, preparedOnly: true, observedAt: new Date().toISOString(), exactSourceDeltas: [4, 3, 5, 4],
    originalFullApiQualificationHeld: true, originalNonblockingObserverAndWholeBrowserQualificationHeld: true,
    actualOriginalCompleteApiBaselineHeld: true, exactProductSourceLineageHeld: true, syntaxFiles: names.length,
    networkRequests: 0, profilesOpened: 0, simulations: 0, signatures: 0, executeRequests: 0,
    currentThreeOwnerBrowserAccepted: false, parentCompletion: false,
    inputsSha256: Object.fromEntries([...new Set(files)].map(f => [f, sha(f)])) };
} catch (error) { result = { passed: false, errorType: error.name, message: String(error.message).slice(0, 1000), parentCompletion: false }; process.exitCode = 1; }
fs.writeFileSync(output, JSON.stringify(result, null, 2) + '\n', { flag: 'wx', mode: 0o600 });
console.log(JSON.stringify({ passed: result.passed, errorType: result.errorType, message: result.message }));
