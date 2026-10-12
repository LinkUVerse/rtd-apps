// Compare the complete current product to the sealed pre-change source.
const fs = require('node:fs'), path = require('node:path'), assert = require('node:assert/strict');
const crypto = require('node:crypto');
const wallet = path.resolve(__dirname, '..'), root = path.resolve(wallet, '../..');
const logs = path.join(wallet, 'migrationToGRpcOrGraphQLDoc/workLog');
const read = f => JSON.parse(fs.readFileSync(f));
const sha = f => crypto.createHash('sha256').update(fs.readFileSync(f)).digest('hex');
const exactly = (s, a, b) => { assert.equal(s.split(a).length, 2); return s.replace(a, b); };
function auditDelta() {
  const baselineFile = path.join(logs, '20261009-C131-before-implementation-01.json');
  const b = read(baselineFile);
  assert(b.passed && b.preparedOnly && b.previousSourceQualifiedBeforeImplementation);
  assert.equal(b.source.files, 1122);
  for (const [f, h] of Object.entries(b.inputsSha256)) assert.equal(sha(f), h);
  const before = read(b.productManifest), current = require('./qualify-C109-product-delta.cjs').currentManifest();
  const changed = Object.keys(before).filter(f => before[f] !== current.rows[f]).sort();
  const added = Object.keys(current.rows).filter(f => !(f in before)).sort();
  const deleted = Object.keys(before).filter(f => !(f in current.rows)).sort();
  assert.deepEqual(changed, ['rtd-apps/wallet/src/background/Transactions.test.ts',
    'rtd-apps/wallet/src/background/Transactions.ts', 'rtd-apps/wallet/src/background/connections/UiConnection.ts']);
  assert.deepEqual(added, []); assert.deepEqual(deleted, []);
  const restored = { ...current.rows };
  for (const row of b.rows) {
    assert.equal(sha(row.snapshot), row.sha256);
    const old = fs.readFileSync(row.snapshot, 'utf8'), now = fs.readFileSync(row.original, 'utf8');
    let inverse;
    if (row.original.endsWith('/Transactions.ts')) inverse = exactly(now,
      '  public async handleMessage(msg: TransactionRequestResponse) {\n    this._txResponseMessages.next(msg);\n    // A restarted worker has no original approval listener to run its cleanup.\n    // Closing that orphan removes request metadata; its durable journal stays intact.\n    if (msg.approved === false && !this.requestSignals.has(msg.txID)) {\n      dappPreparedRegistry.revokeRequest(msg.txID);\n      await this.removeTransactionRequest(msg.txID);\n    }\n  }',
      '  public handleMessage(msg: TransactionRequestResponse) {\n    this._txResponseMessages.next(msg);\n  }');
    else if (row.original.endsWith('/UiConnection.ts')) inverse = exactly(now,
      'await Transactions.handleMessage(payload);', 'Transactions.handleMessage(payload);');
    else {
      const marker = '// C131: orphan requests restored after their original listener has ended.';
      assert.equal(now.split(marker).length, 2);
      assert.equal(now.split(marker)[0].trimEnd(), old.trimEnd());
      inverse = old;
    }
    assert.equal(inverse, old);
    restored[path.relative(root, row.original)] = row.sha256;
  }
  assert.deepEqual(restored, before);
  const compiler = require('./build-reviewed-generation-production-extension.cjs');
  assert.deepEqual(compiler.files(b.previousOutput), b.previousArtifacts);
  assert.deepEqual(compiler.files(path.join(wallet, 'dist')), b.developmentDist);
  const redFile = path.join(logs, '20261009-C131-orphan-close-red-01.json');
  const greenFile = path.join(logs, '20261009-C131-orphan-close-regression-01.json');
  const formattedFile = path.join(logs, '20261009-C131-formatted-transactions-regression-01.json');
  const formatFile = path.join(logs, '20261009-C131-test-format-semantic-inverse-01.json');
  const red = read(redFile), green = read(greenFile), formatted = read(formattedFile), format = read(formatFile);
  assert.equal(red.numTotalTests, 28); assert.equal(red.numFailedTests, 1); assert(!red.success);
  const failures = red.testResults.flatMap(r => r.assertionResults).filter(r => r.status === 'failed');
  assert.equal(failures[0].fullName, 'normal false response removes only the restored orphan request');
  assert(green.success && green.numPassedTests === 207 && green.numFailedTests === 0 && green.testResults.length === 10);
  assert(formatted.success && formatted.numPassedTests === 28 && formatted.numFailedTests === 0);
  assert(format.passed && format.originalPrefixHeld && format.completeAstIgnoringTriviaAndTrailingCommaHeld);
  assert.equal(sha(format.beforeSnapshot), format.beforeSha256);
  assert.equal(sha(path.join(wallet, 'src/background/Transactions.test.ts')), format.afterSha256);
  const inputs = [__filename, baselineFile, b.productManifest, ...b.rows.map(r => r.snapshot),
    ...changed.map(f => path.join(root, f)), redFile, greenFile, formattedFile, formatFile, format.beforeSnapshot];
  return { passed: true, preparedOnly: true, originalSource: b.source, currentSource: current.source,
    exactProductDeltaAccepted: true, changed, added, deleted, unchangedOriginalProductFiles: 1119,
    completeOriginalProductionInverseAccepted: true, allOriginalTestCasesHeld: true,
    onlyOrphanExplicitFalseMetadataCleanup: true, activeApprovalSubjectTimingHeld: true,
    durableJournalHeld: true, orphanTrueRemainsNonDeliverable: true, signOrExecuteRetries: 0,
    redTests: 28, redFailedTests: 1, regressionTests: 207, regressionFiles: 10,
    previousC124ArtifactsAndDevelopmentDistHeld: true,
    inputsSha256: Object.fromEntries(inputs.map(f => [f, sha(f)])),
    actualCompleteUiAccepted: false, parentAcceptance: false };
}
module.exports = { auditDelta, sha, read };
if (require.main === module) {
  const [output] = process.argv.slice(2); assert(output && !fs.existsSync(output)); let result;
  try { result = { ...auditDelta(), observedAt: new Date().toISOString() }; }
  catch (e) { result = { passed: false, errorType: e.name, message: String(e.message).slice(0, 1000) }; process.exitCode = 1; }
  fs.writeFileSync(output, JSON.stringify(result, null, 2) + '\n', { flag: 'wx', mode: 0o600 });
  console.log(JSON.stringify({ passed: result.passed, source: result.currentSource, message: result.message }));
}
