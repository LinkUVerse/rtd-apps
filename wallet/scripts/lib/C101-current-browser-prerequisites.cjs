const fs = require('node:fs'), crypto = require('node:crypto'), assert = require('node:assert/strict');
const sha = f => crypto.createHash('sha256').update(fs.readFileSync(f)).digest('hex');
function validate(api, independent, apiFile) {
  assert(api.passed && api.mode === 'covered-post-write-read' && api.postWriteIndexAccepted);
  assert(independent.passed && independent.postWriteIndexAccepted);
  assert.equal(independent.inputsSha256[apiFile], sha(apiFile));
  assert.equal(api.targetCheckpoint, 524022);
  assert.equal(api.freshNativeAndArchivedObjects.length, 13); assert.equal(api.caps.length, 5);
  assert.equal(api.originalDigestDetails.length, 6); assert.equal(independent.nativeObjects, 13);
  assert.equal(independent.fiveCaps, 5); assert.equal(independent.originalTransferredNFTs, 6);
  assert(api.completeSupportedAccountWindowAccepted && !api.completeAccountHistoryAccepted);
  assert(!api.chromeAccepted && !api.parentCompletion);
  assert(!independent.chromeAccepted && !independent.parentCompletion);
  assert.equal(new Set(api.freshNativeAndArchivedObjects.map(o => o.objectId)).size, 13);
  for (const role of ['source','existingTarget','newTarget']) {
    const history = api.histories[role], decoded = independent.actualHistories[role];
    assert(history.totalTransactions === history.transactions.length);
    assert.equal(decoded.allRowsCanonical, history.totalTransactions);
    assert.equal(decoded.originalDispatchesVerified, role === 'source' ? 6 : role === 'existingTarget' ? 5 : 1);
    assert(history.checkpointHi >= 524022 && !history.coverage.allAccountActivityCertified);
    assert(!history.coverage.registrationComplete);
  }
  for (const proof of [api, independent]) for (const [f,h] of Object.entries(proof.inputsSha256)) assert.equal(sha(f), h);
  return true;
}
module.exports = { validate };
