// Copyright (c) LinkU Labs, Inc.
// SPDX-License-Identifier: Apache-2.0
// Persisted preparation and offline positive-branch module resolution only.
const fs = require('node:fs'), path = require('node:path'), crypto = require('node:crypto'), assert = require('node:assert/strict');
const wallet = path.resolve(__dirname, '..'), logs = path.join(wallet, 'migrationToGRpcOrGraphQLDoc/workLog');
const read = file => JSON.parse(fs.readFileSync(file)), sha = file => crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
const [output] = process.argv.slice(2); assert(output && !fs.existsSync(output));
const testsFile = path.join(logs, '20261007-C53-post-write-contract-tests-02.json');
const preflightFile = path.join(logs, '20261007-C53-post-write-preflight-02.json');
const readinessFile = path.join(logs, '20261007-C55-nft-post-write-readiness-01.json');
const executionFile = path.join(logs, '20261007-C48-nft-execution-browser-independent-02.json');
const probeFile = path.join(__dirname, 'probe-C53-post-write-indexed.cjs');
const contractFile = path.join(__dirname, 'lib/C53-post-write-contract.cjs');
const tests = read(testsFile), preflight = read(preflightFile), readiness = read(readinessFile), execution = read(executionFile);
for (const proof of [tests, preflight, readiness, execution]) {
  assert(proof.passed);
  for (const [file, hash] of Object.entries(proof.inputsSha256)) assert.equal(sha(file), hash);
}
assert.equal(tests.checksPassed, 51);
assert(tests.checks.includes('pristine eight-source inventory rejected'));
assert.equal(preflight.mode, 'uncovered-preflight-denied');
assert.equal(preflight.sessionsCreated, 0); assert.equal(preflight.requests, 0);
assert.deepEqual(preflight.frames, []);
assert.equal(preflight.postWriteIndexAccepted, false);
assert.equal(preflight.completeAccountHistoryAccepted, false);
assert.equal(preflight.completeSupportedAccountWindowAccepted, false);
assert(tests.checks.includes('separate complete supported six five one windows preserve actual false global flags'));
assert(tests.checks.includes('upgraded whole-account claim rejects'));
assert(tests.checks.includes('incomplete discovered Token window rejects'));
assert(tests.checks.includes('incomplete discovered capability window rejects'));
const primaryFile = path.join(wallet, 'migrationToGRpcOrGraphQLDoc/04-SDK契约与功能迁移矩阵.md');
const actualCoverageFile = path.resolve(wallet, '../../rtd-archive-service/modules/account-activity/history_coverage.py');
const actualHistoryFile = path.resolve(wallet, '../../rtd-archive-service/modules/account-activity/indexed_history.py');
assert(fs.readFileSync(primaryFile, 'utf8').includes('不能升级 allAccountActivityCertified'));
assert(fs.readFileSync(actualCoverageFile, 'utf8').includes("'allAccountActivityCertified': False"));
assert(fs.readFileSync(actualHistoryFile, 'utf8').includes("merged['allAccountActivityCertified'] = False"));
assert(fs.readFileSync(contractFile, 'utf8').includes('assert.equal(history.coverage.allAccountActivityCertified, false)'));
assert.equal(readiness.targetCheckpoint, 524022);
assert.equal(readiness.publishedHi, 486334);
assert.deepEqual(preflight.missingGates, Object.entries(readiness.coverageGates).filter(([, value]) => value !== true).map(([key]) => key));
const ts = require('typescript'), tree = ts.createSourceFile(probeFile, fs.readFileSync(probeFile, 'utf8'), ts.ScriptTarget.Latest, true, ts.ScriptKind.JS);
assert.equal(tree.parseDiagnostics.length, 0);
const forbidden = new Set(['executeTransaction', 'simulateTransaction', 'signTransaction', 'signAndExecuteTransaction',
  'signAndExecuteTransactionBlock', 'launchPersistentContext', 'requestSuiFromFaucetV1', 'requestSuiFromFaucetV2']);
let sessionConstructions = 0, forbiddenCalls = 0;
function visit(node) {
  if (ts.isCallExpression(node) && ts.isPropertyAccessExpression(node.expression) && forbidden.has(node.expression.name.text)) forbiddenCalls++;
  if (ts.isNewExpression(node) && ts.isIdentifier(node.expression) && node.expression.text === 'WalletReadSession') {
    sessionConstructions++;
    let cursor = node, positiveBranch = false;
    while (cursor.parent) {
      if (ts.isIfStatement(cursor.parent) && cursor === cursor.parent.elseStatement
          && cursor.parent.expression.getText(tree) === '!readiness.infrastructureReadyForProductionProbe') positiveBranch = true;
      cursor = cursor.parent;
    }
    assert(positiveBranch, 'Session construction must stay within the covered positive branch');
  }
  ts.forEachChild(node, visit);
}
visit(tree); assert.equal(sessionConstructions, 1); assert.equal(forbiddenCalls, 0);
let blockedFetchCalls = 0;
const oldFetch = globalThis.fetch;
globalThis.fetch = () => { blockedFetchCalls++; throw Error('Offline preparation audit refuses network'); };
const moduleFiles = [], resolvedClasses = [];
try {
  const loader = require('tsx/cjs/api');
  for (const [name, symbol, method, isStatic] of [
    ['session', 'WalletReadSession', 'close', false], ['asset-reader', 'WalletAssetReader', 'open', true],
    ['fullnode-reader', 'WalletFullnodeReader', 'object', false],
    ['execution-reader', 'WalletExecutionReader', 'details', false],
    ['account-history-reader', 'WalletAccountHistoryReader', 'read', false]]) {
    const file = path.join(wallet, 'src/shared/rpc', name + '.ts');
    const value = loader.require(file, __filename)[symbol];
    assert.equal(typeof value, 'function');
    assert.equal(typeof (isStatic ? value : value.prototype)[method], 'function');
    moduleFiles.push(file); resolvedClasses.push(symbol + '.' + method);
  }
  assert.equal(blockedFetchCalls, 0);
} finally { globalThis.fetch = oldFetch; }
assert.deepEqual(require('./build-reviewed-generation-production-extension.cjs').productSource(), execution.source);
const files = [__filename, testsFile, preflightFile, readinessFile, executionFile, probeFile, contractFile,
  primaryFile, actualCoverageFile, actualHistoryFile, ...moduleFiles];
const result = { passed: true, observedAt: new Date().toISOString(), syntheticChecksAccepted: 51,
  originalFalseGlobalFlagsAlignedToPrimaryAndActualService: true,
  recordedZeroIoPreflightAccepted: true, positiveBranchClassesResolvedOffline: resolvedClasses,
  forbiddenMutationCalls: 0, blockedFetchCalls: 0, networkRequests: 0, sessionsCreatedByAudit: 0,
  postWriteIndexAccepted: false, completeAccountHistoryAccepted: false,
  completeSupportedAccountWindowAccepted: false, chromeAccepted: false,
  profilesOpened: 0, signatures: 0, executeRequests: 0,
  inputsSha256: Object.fromEntries(files.map(file => [file, sha(file)])),
  scope: 'Independent retained51 synthetic contracts, primary04 and actual service source false global flags, fresh-zero-IO prerequisite refusal, source pins, AST restriction of session to covered branch, absence of mutation/browser/faucet calls and actual offline resolution of five production reader classes with fetch blocked. Complete supported windows are distinct from full-account certification. Actual positive source/target inventory, archive, account and Chrome branches remain unexecuted.' };
fs.writeFileSync(output, JSON.stringify(result, null, 2) + '\n', { flag: 'wx', mode: 0o600 });
console.log(JSON.stringify({ passed: true, syntheticChecksAccepted: 51, resolvedClasses: resolvedClasses.length, postWriteIndexAccepted: false }));
