// Audit retained real product pending and separate read-only continuation; never opens a profile or sends.
const fs = require('node:fs'), path = require('node:path'), crypto = require('node:crypto'), assert = require('node:assert/strict');
const { GrpcTypes } = require('rtd-typescript/grpc');
const { Transaction } = require('rtd-typescript/transactions');
const { bcs } = require('rtd-typescript/bcs');
const { verifyTransactionSignature } = require('rtd-typescript/verify');
const sha = file => crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
const read = file => JSON.parse(fs.readFileSync(file));
function frame(encoded, trailers) {
  const raw = Buffer.from(encoded, 'base64'), rows = [];
  for (let offset = 0; offset < raw.length;) {
    assert(offset + 5 <= raw.length);
    const flag = raw[offset], length = raw.readUInt32BE(offset + 1);
    assert((flag === 0 || flag === 128) && offset + 5 + length <= raw.length);
    rows.push({ flag, bytes: raw.subarray(offset + 5, offset + 5 + length) });
    offset += 5 + length;
  }
  assert.equal(rows.length, trailers ? 2 : 1);
  assert.equal(rows[0].flag, 0);
  if (trailers) {
    assert.equal(rows[1].flag, 128);
    assert.match(rows[1].bytes.toString(), /(^|\r\n)grpc-status:[ \t]*0(\r\n|$)/);
  }
  return rows[0].bytes;
}
(async () => {
  const [firstFile, continuationFile, buildFile, output] = process.argv.slice(2);
  assert(output && !fs.existsSync(output));
  const first = read(firstFile), next = read(continuationFile), build = read(buildFile);
  assert(!first.passed && first.stage === 'new actual dapp pending guard' && next.passed && build.passed);
  assert.equal(first.executeAttempts, 1); assert.equal(first.forwardedExecuteRequests, 0);
  assert.equal(first.intercepts.length, 1); assert.equal(first.simulations.length, 2);
  assert.equal(next.executeAttempts, 0); assert.equal(next.signatureCount, 0);
  assert.equal(next.simulations.length, 0); assert.equal(next.intercepts.length, 0);
  assert.equal(next.forwardedExecuteRequests, 0); assert.equal(next.originalFailedProofSha256, sha(firstFile));
  assert.equal(next.journalSeeded, false);
  const stores = ['journal-v2', 'metadata-v2', 'pending-scopes-v2'];
  assert.deepEqual(Object.keys(first.initialJournal).sort(), stores);
  assert(Object.values(first.initialJournal).every(rows => rows.length === 0));
  const retained = first.pendingJournal;
  for (const snapshot of [next.initialJournal, next.pendingJournal, next.finalJournal]) assert.deepEqual(snapshot, retained);
  assert.equal(retained['journal-v2'].length, 1); assert.equal(retained['pending-scopes-v2'].length, 1);
  assert.equal(retained['metadata-v2'].length, 0);
  const record = retained['journal-v2'][0];
  assert.equal(record.state, 'dispatch-pending');
  assert.deepEqual(JSON.parse(record.scope), [2, 'BkuLHhdtnoK7yLxo2eQuvcjHtdyipE7MMyxgTJiyHGg4', 'dev-20261006-03', record.accountAddress]);
  assert.deepEqual(JSON.parse(record.id), [record.scope, record.requestId]);
  assert.equal(retained['pending-scopes-v2'][0].recordId, record.id);
  const request = GrpcTypes.ExecuteTransactionRequest.fromBinary(frame(first.intercepts[0].requestBase64, false));
  const bytes = Buffer.from(request.transaction.bcs.value), tx = Transaction.from(bytes), data = tx.getData();
  assert.equal(await tx.getDigest(), record.digest);
  assert.equal(bytes.toString('base64'), next.variant.bytesBase64);
  assert.equal(data.sender, record.accountAddress); assert.equal(data.gasData.owner, record.accountAddress);
  assert.equal(data.gasData.budget, '100000000'); assert.deepEqual(data.expiration, { $kind: 'None', None: true });
  assert.equal(request.signatures.length, 1);
  const signature = Buffer.from(request.signatures[0].bcs.value).toString('base64');
  assert.equal(signature, first.intercepts[0].signature);
  assert.equal((await verifyTransactionSignature(bytes, signature)).toRtdAddress(), record.accountAddress);
  for (const row of first.simulations) {
    const input = GrpcTypes.SimulateTransactionRequest.fromBinary(frame(row.requestBase64, false));
    const result = GrpcTypes.SimulateTransactionResponse.fromBinary(frame(row.responseBase64, true));
    assert.equal(row.status, 200); assert.equal(input.checks, GrpcTypes.SimulateTransactionRequest_TransactionChecks.ENABLED);
    assert.deepEqual(Buffer.from(input.transaction.bcs.value), bytes);
    assert.deepEqual(Buffer.from(result.transaction.transaction.bcs.value), bytes);
    assert.equal(result.transaction.effects.status.success, true);
    const parsed = bcs.TransactionEffects.parse(result.transaction.effects.bcs.value);
    assert.equal((parsed.$kind === 'V2' ? parsed.V2 : parsed.V1).transactionDigest, record.digest);
  }
  for (const row of [...first.stages, ...next.stages]) {
    assert(row.worker.matchesDisk && row.ui.matchesDisk);
    assert.equal(row.worker.workerSha256, build.artifacts['background.js']);
    for (const bundle of row.ui.loadedBundles) assert.equal(bundle.loadedSha256, build.artifacts[bundle.file]);
  }
  for (const label of ['product pending without journal fixture', 'old worker closed', 'restart account locked', 'restart encrypted fields retained', 'actual native execution lock free after owner close', 'coin shows original pending recovery'])
    assert(first.checks.some(row => row.name === label && row.passed));
  for (const label of ['normal actual UI unlock', 'native execution lock actually free', 'original coin route unmounted before independent dapp guard', 'actual trusted preparation refuses durable pending', 'all pending journal stores unchanged', 'no competing simulations or dispatch', 'relocked'])
    assert(next.checks.some(row => row.name === label && row.passed));
  assert.equal(next.refusal.message, '当前链账户有待确认交易，请先恢复原交易');
  assert.equal(next.encryptedBefore, first.encryptedBefore);
  assert(next.lookups.length > 0 && next.lookups.every(row => row.digest === record.digest));
  assert.equal(next.blocked.length, 0); assert.equal(next.captureErrors.length, 0);
  for (const [file, hash] of Object.entries(next.inputsSha256)) assert.equal(sha(file), hash);
  const report = { passed: true, observedAt: new Date().toISOString(), digest: record.digest,
    source: build.sourceAfter, completedSubtasks: ['TX04-M2-coin-dapp'], originalExecuteAttempts: 1,
    originalExecuteForwarded: 0, originalSignatureVerified: true, formalFramesVerified: 2,
    strictThreeStoresRetained: true, encryptedAccountsRetained: true, oldOwnerClosed: true,
    actualFreeLockCannotBypassDurablePending: true, originalFailedProofRemainsFailed: true,
    continuationSimulations: 0, continuationSignatures: 0, continuationExecuteAttempts: 0,
    parentTX04Complete: false, auditFetches: 0, auditSignatures: 0, auditExecuteRequests: 0,
    inputsSha256: Object.fromEntries([__filename, firstFile, continuationFile, buildFile].map(file => [path.resolve(file), sha(file)])),
    scope: 'Current C39 real product once-approved pending, intercepted before broadcast, owner closed and retained cold profile. Coin pending UI and separate dApp preparation after the coin observer ends refuse new bytes with complete journal and encrypted accounts retained. No chain submission or NFT/staking/live-lock matrix acceptance.' };
  fs.writeFileSync(output, JSON.stringify(report, null, 2) + '\n', { flag: 'wx', mode: 0o600 });
  console.log(JSON.stringify({ passed: true, originalExecuteForwarded: 0, formalFramesVerified: 2 }));
})().catch(error => { console.error(JSON.stringify({ passed: false, errorType: error.name })); process.exitCode = 1; });
