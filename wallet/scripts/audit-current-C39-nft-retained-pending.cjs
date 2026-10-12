// Independent bounded evidence audit; no profile, signing, network or journal writes.
const fs = require('node:fs'), path = require('node:path'), crypto = require('node:crypto'), assert = require('node:assert/strict');
const sha = file => crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
const read = file => JSON.parse(fs.readFileSync(file));
const [proofFile, output] = process.argv.slice(2);
try {
  assert(output && !fs.existsSync(output));
  const p = read(proofFile), base = path.resolve(__dirname, '../migrationToGRpcOrGraphQLDoc/workLog');
  const firstFile = path.join(base, '20261007-C39-closed-owner-pending-chrome-01.json');
  const buildFile = path.join(base, '20261006-default-generation-positive-C39-build-01.json');
  const journalAuditFile = path.join(base, '20261007-C39-closed-owner-pending-independent-audit-01.json');
  const first = read(firstFile), build = read(buildFile), journalAudit = read(journalAuditFile);
  assert(p.passed && build.passed && journalAudit.passed && !first.passed);
  assert.equal(p.originalFailedProofSha256, sha(firstFile));
  for (const [file, hash] of Object.entries(p.inputsSha256)) assert.equal(sha(file), hash);
  assert.deepEqual(p.source, build.sourceAfter);
  for (const stage of p.stages) {
    assert(stage.worker.matchesDisk && stage.ui.matchesDisk);
    assert.equal(stage.worker.workerSha256, build.artifacts['background.js']);
    for (const row of stage.ui.loadedBundles) assert.equal(row.loadedSha256, build.artifacts[row.file]);
  }
  assert.equal(p.executeAttempts, 0); assert.equal(p.forwardedExecuteRequests, 0);
  assert.equal(p.signatureCount, 0); assert.equal(p.simulations.length, 0); assert.equal(p.intercepts.length, 0);
  assert.equal(p.journalSeeded, false); assert.equal(p.routes.length, 3);
  const expected = new Map([
    ['direct', ['0x85c1ca0104290fc9e67874667b61959c033fb8c4fae17f36187680e9ad742cce', 168886]],
    ['personal-kiosk', ['0x8960aae66d169320b93a5b2d5e9845c9139aae645385e963a297e13f7679bf09', 177615]],
    ['originbyte-kiosk', ['0xe1ad9cb908b7edc852be40ffe9e5df91aa209d481bc1f1717f36e886f3a0a7e6', 176999]],
  ]);
  const record = first.pendingJournal['journal-v2'][0];
  assert.equal(record.state, 'dispatch-pending'); assert.equal(journalAudit.digest, record.digest);
  for (const snapshot of [p.initialJournal, p.pendingJournal, p.finalJournal]) assert.deepEqual(snapshot, first.pendingJournal);
  for (const row of p.routes) {
    assert.deepEqual([row.objectId, row.executionCheckpoint], expected.get(row.branch)); expected.delete(row.branch);
    assert(row.text.includes(record.digest)); assert.deepEqual(row.journal, first.pendingJournal);
    assert(row.contexts.length > 0 && row.checkpoints.length === row.contexts.length);
    for (const [index, context] of row.contexts.entries()) {
      const key = JSON.parse(context.assetSnapshotKey);
      assert.equal(key[0], context.readSessionKey);
      assert.equal(Number(key[2]), row.checkpoints[index]);
      assert(Number.isSafeInteger(row.checkpoints[index]) && row.checkpoints[index] >= 75097 && row.checkpoints[index] < row.executionCheckpoint);
      assert(p.checks.some(c => c.name === row.branch + ' actual pending rejects new approval and preserves all stores' && c.passed));
    }
  }
  assert.equal(expected.size, 0); assert.equal(p.encryptedBefore, first.encryptedBefore);
  assert(p.lookups.length > 0 && p.lookups.every(row => row.digest === record.digest));
  assert.equal(p.captureErrors.length, 0); assert.equal(p.blocked.length, 0);
  for (const label of ['retained encrypted fields', 'normal actual UI unlock', 'native execution lock actually free', 'three NFT routes complete journal unchanged', 'encrypted account still unchanged', 'relocked'])
    assert(p.checks.some(row => row.name === label && row.passed));
  const report = { passed: true, observedAt: new Date().toISOString(), source: build.sourceAfter,
    originalPendingDigest: record.digest, branches: p.routes.map(r => ({ branch: r.branch, objectId: r.objectId, admittedCheckpoints: r.checkpoints, transferCheckpoint: r.executionCheckpoint })),
    completedSubtasks: ['N1', 'N2', 'N3'], strictThreeStoresRetained: true, encryptedAccountsRetained: true,
    simulations: 0, signatures: 0, executeAttempts: 0, auditFetches: 0, parentTX04Complete: false,
    inputsSha256: Object.fromEntries([__filename, proofFile, firstFile, buildFile, journalAuditFile].map(file => [path.resolve(file), sha(file)])),
    scope: 'Three actual C39 NFT pending routes at admitted snapshots before their real transfers, confirmed exact snapshot session/checkpoint, only original digest recovery, no new approval or signing. No present Fullnode ownership claim, framework nonempty branch or complete live-lock/cancellation matrix.' };
  fs.writeFileSync(output, JSON.stringify(report, null, 2) + '\n', { flag: 'wx', mode: 0o600 });
  console.log(JSON.stringify({ passed: true, branches: 3, executeAttempts: 0 }));
} catch (error) { console.error(JSON.stringify({ passed: false, errorType: error.name })); process.exitCode = 1; }
