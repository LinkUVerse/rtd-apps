// Exact complete-product delta, actual regression/typecheck/build and emitted closure.
const fs = require('node:fs'), path = require('node:path'), crypto = require('node:crypto');
const assert = require('node:assert/strict'), cp = require('node:child_process'), ts = require('typescript');
const wallet = path.resolve(__dirname, '..'), root = path.resolve(wallet, '../..');
const logs = path.join(wallet, 'migrationToGRpcOrGraphQLDoc/workLog');
const read = f => JSON.parse(fs.readFileSync(f, 'utf8'));
const sha = f => crypto.createHash('sha256').update(fs.readFileSync(f)).digest('hex');
const files = [__filename, path.join(__dirname, 'lib/C102-product-source-lineage.cjs')];
const [output] = process.argv.slice(2); assert(output && !fs.existsSync(output));
let result;
try {
  const load = name => { const f = path.join(logs, name); files.push(f); return read(f); };
  const archive = load('20261008-C102-before-implementation-archive-01.json'); assert(archive.passed);
  files.push(archive.originalProductManifest);
  assert.equal(sha(archive.originalProductManifest), archive.originalProductManifestSha256);
  const before = read(archive.originalProductManifest);
  assert.equal(Object.keys(before).length, 1120);
  for (const row of archive.snapshots) { files.push(row.snapshot); assert.equal(sha(row.snapshot), row.sha256); }
  const current = JSON.parse(cp.execFileSync('python3', ['-c',
    'import json,hashlib,sys;from pathlib import Path;w=Path(sys.argv[1]);r=w.parent.parent;rows={};\nfor d in (w/"src",w/"configs",w.parent/"core/src",r/"rtd-ts-sdk/packages/typescript/src"):\n for p in d.rglob("*"):\n  if p.is_file(): rows[str(p.relative_to(r))]=hashlib.sha256(p.read_bytes()).hexdigest()\nfor p in (w/"package.json",w/"webpack.config.ts",w.parent/"pnpm-lock.yaml"): rows[str(p.relative_to(r))]=hashlib.sha256(p.read_bytes()).hexdigest()\nprint(json.dumps({"rows":rows,"source":{"sha256":hashlib.sha256(json.dumps(rows,sort_keys=True).encode()).hexdigest(),"files":len(rows)}}))', wallet], { encoding: 'utf8', timeout: 60000 }));
  const changed = Object.keys(before).filter(f => current.rows[f] !== before[f]).sort();
  const added = Object.keys(current.rows).filter(f => !(f in before)).sort();
  const deleted = Object.keys(before).filter(f => !(f in current.rows)).sort();
  assert.deepEqual(changed, ['rtd-apps/wallet/src/shared/rpc/asset-reader.ts']);
  assert.deepEqual(added, ['rtd-apps/wallet/src/shared/rpc/kiosk-collection-parallel.test.ts']);
  assert.deepEqual(deleted, []);
  files.push(...[...changed, ...added].map(f => path.join(root, f)));
  const oldText = fs.readFileSync(archive.snapshots.find(r => r.path.endsWith('/asset-reader.ts')).snapshot, 'utf8');
  const newText = fs.readFileSync(path.join(root, changed[0]), 'utf8');
  const method = text => {
    const sf = ts.createSourceFile('asset-reader.ts', text, ts.ScriptTarget.Latest, true);
    const cls = sf.statements.find(n => ts.isClassDeclaration(n) && n.name.text === 'WalletAssetReader');
    const m = cls.members.find(n => ts.isMethodDeclaration(n) && n.name.getText(sf) === 'kiosks'); assert(m);
    return { body: m.getText(sf), prefix: text.slice(0, m.getStart(sf)), suffix: text.slice(m.end) };
  };
  const a = method(oldText), b = method(newText); assert.equal(a.prefix, b.prefix); assert.equal(a.suffix, b.suffix);
  assert(a.body.includes('? await this.nativeKiosks(owner, signal)'));
  for (const s of ['AbortSignal.timeout(KIOSK_COLLECTION_TIMEOUT_MS)', 'const [native, origin] = await Promise.all([',
    'packages.kiosk ? this.nativeKiosks(owner, signal) : null', 'packages.originByte ? readOriginByteKiosks(this, owner, signal) : null',
    'new Set(value.map((kiosk) => kiosk.kioskId)).size !== value.length', 'await this.snapshot.revalidate(signal);',
    'return this.result(Object.freeze(value));', 'finally {', 'operation.abort();']) assert(b.body.includes(s));
  const tests = load('20261008-C102-kiosk-regression-03.json');
  assert(tests.success && tests.numPassedTests === 126 && tests.numFailedTests === 0);
  assert.equal(tests.testResults.length, 8);
  const counterexample = load('20261008-C102-original-serial-counterexample-01.json');
  assert(!counterexample.success && counterexample.numFailedTests === 1 && counterexample.numPassedTests === 0);
  const typed = load('20261008-C102-production-typecheck-02.json'); assert(typed.passed && typed.processExitCode === 0);
  assert.equal(typed.testAfterSha256, sha(path.join(root, added[0])));
  const failedType = load('20261008-C102-production-typecheck-01.json'); assert(!failedType.passed && failedType.exitCode === 2);
  const failedBuild = load('20261008-default-generation-positive-C102-build-01.json'); assert(!failedBuild.passed && failedBuild.compilationErrors === 1);
  const buildFile = path.join(logs, '20261008-default-generation-positive-C102-build-02.json'); files.push(buildFile);
  const build = read(buildFile); assert(build.passed && build.sourceUnchanged && build.currentDevelopmentDistUnchanged);
  assert.deepEqual(current.source, build.sourceBefore); assert.deepEqual(current.source, build.sourceAfter);
  const oldBuild = load('20261007-default-generation-positive-C46-build-03.json');
  assert.deepEqual(oldBuild.sourceAfter, archive.originalProductSource);
  assert.equal(build.profileSha256, oldBuild.profileSha256);
  for (const compiled of [oldBuild, build]) for (const [f, h] of Object.entries(compiled.artifacts)) assert.equal(sha(path.join(compiled.output, f)), h);
  const closure = load('20261008-default-generation-positive-C102-closure-01.json'); assert(closure.passed);
  const lineage = require('./lib/C102-product-source-lineage.cjs');
  const proof = { passed: true, preparedOnly: true, exactProductDeltaAccepted: true,
    unchangedOriginalProductFiles: 1119, changed, added, deleted, originalSource: archive.originalProductSource,
    currentSource: current.source, buildFile, inputsSha256: Object.fromEntries([...new Set(files)].map(f => [f, sha(f)])) };
  assert.deepEqual(lineage.validateWithProof(proof, oldBuild.sourceAfter, buildFile), current.source);
  for (const mutate of [p => p.changed.push('another-file'), p => p.unchangedOriginalProductFiles--,
    p => p.currentSource.sha256 = '0'.repeat(64), p => p.originalSource.files--, p => p.passed = false]) {
    const bad = JSON.parse(JSON.stringify(proof)); mutate(bad); assert.throws(() => lineage.validateWithProof(bad, oldBuild.sourceAfter, buildFile));
  }
  assert.throws(() => lineage.validateWithProof(proof, oldBuild.sourceAfter, path.join(logs, 'another-build.json')));
  result = { ...proof, observedAt: new Date().toISOString(), originalFailureRecordsHeld: true,
    onlyKiosksMethodChanged: true, originalCounterexampleFailed: true, regressionTests: 126,
    fullProductionTypecheck: true, isolatedProductionBuild: true, emittedProductionClosure: true,
    sourceLineageRejectChecks: 6, profilesOpened: 0, signatures: 0, executeRequests: 0,
    actualApiAccepted: false, currentThreeOwnerBrowserAccepted: false, parentCompletion: false };
} catch (error) { result = { passed: false, errorType: error.name, message: String(error.message).slice(0, 1200), parentCompletion: false }; process.exitCode = 1; }
fs.writeFileSync(output, JSON.stringify(result, null, 2) + '\n', { flag: 'wx', mode: 0o600 });
console.log(JSON.stringify({ passed: result.passed, source: result.currentSource, errorType: result.errorType, message: result.message }));
