// Admit only the reviewed complete Kiosk parallel repair and its isolated build.
const fs = require('node:fs'), path = require('node:path'), crypto = require('node:crypto');
const assert = require('node:assert/strict');
const sha = f => crypto.createHash('sha256').update(fs.readFileSync(f)).digest('hex');
const qualificationFile = path.resolve(__dirname, '../../migrationToGRpcOrGraphQLDoc/workLog/20261008-C102-production-source-independent-01.json');
function validateWithProof(proof, originalSource, buildFile) {
  assert(proof.passed && proof.preparedOnly && proof.exactProductDeltaAccepted);
  assert.equal(proof.unchangedOriginalProductFiles, 1119);
  assert.deepEqual(proof.changed, ['rtd-apps/wallet/src/shared/rpc/asset-reader.ts']);
  assert.deepEqual(proof.added, ['rtd-apps/wallet/src/shared/rpc/kiosk-collection-parallel.test.ts']);
  assert.deepEqual(proof.deleted, []);
  assert.deepEqual(originalSource, proof.originalSource);
  for (const [f, h] of Object.entries(proof.inputsSha256)) assert.equal(sha(f), h);
  const build = JSON.parse(fs.readFileSync(proof.buildFile, 'utf8'));
  assert(build.passed && build.sourceUnchanged && build.currentDevelopmentDistUnchanged);
  assert.deepEqual(build.sourceBefore, proof.currentSource);
  assert.deepEqual(build.sourceAfter, proof.currentSource);
  if (buildFile) assert.equal(path.resolve(buildFile), proof.buildFile);
  assert.deepEqual(require('../build-reviewed-generation-production-extension.cjs').productSource(), proof.currentSource);
  for (const [f, h] of Object.entries(build.artifacts)) assert.equal(sha(path.join(build.output, f)), h);
  return proof.currentSource;
}
function validate(originalSource, buildFile) {
  return validateWithProof(JSON.parse(fs.readFileSync(qualificationFile, 'utf8')), originalSource, buildFile);
}
module.exports = { validate, validateWithProof, qualificationFile };
