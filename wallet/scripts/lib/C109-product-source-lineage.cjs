// Current C109 staking build only; C102's immutable current-source guard remains unchanged.
const fs = require('node:fs'), path = require('node:path'), crypto = require('node:crypto');
const assert = require('node:assert/strict');
const sha = f => crypto.createHash('sha256').update(fs.readFileSync(f)).digest('hex');
const qualificationFile = path.resolve(__dirname, '../../migrationToGRpcOrGraphQLDoc/workLog/20261008-C109-production-source-independent-01.json');
function validateWithProof(proof, originalSource, buildFile) {
  assert(proof.passed && proof.preparedOnly && proof.exactProductDeltaAccepted);
  assert(proof.originalBodyInverseAccepted && proof.originalOutsideInverseAccepted);
  assert.equal(proof.unchangedOriginalProductFiles, 1120);
  assert.deepEqual(proof.changed, ['rtd-apps/wallet/src/shared/rpc/staking-reader.ts']);
  assert.deepEqual(proof.added, ['rtd-apps/wallet/src/shared/rpc/staking-collection-parallel.test.ts']);
  assert.deepEqual(proof.deleted, []);
  assert.deepEqual(originalSource, proof.originalSource);
  for (const [f, h] of Object.entries(proof.inputsSha256)) assert.equal(sha(f), h);
  const delta = require('../qualify-C109-product-delta.cjs').auditDelta();
  for (const key of ['changed', 'added', 'deleted', 'currentSource', 'originalSource']) assert.deepEqual(delta[key], proof[key]);
  const build = JSON.parse(fs.readFileSync(proof.buildFile, 'utf8'));
  assert(build.passed && build.sourceUnchanged && build.currentDevelopmentDistUnchanged);
  assert.deepEqual(build.sourceBefore, proof.currentSource);
  assert.deepEqual(build.sourceAfter, proof.currentSource);
  if (buildFile) assert.equal(path.resolve(buildFile), proof.buildFile);
  const compiler = require('../build-reviewed-generation-production-extension.cjs');
  assert.deepEqual(compiler.productSource(), proof.currentSource);
  assert.deepEqual(compiler.files(path.resolve(__dirname, '../../dist')), build.developmentDist);
  for (const [f, h] of Object.entries(build.artifacts)) assert.equal(sha(path.join(build.output, f)), h);
  const previous = JSON.parse(fs.readFileSync(proof.previousQualificationFile, 'utf8'));
  assert(previous.passed && previous.exactProductDeltaAccepted);
  assert.deepEqual(previous.currentSource, proof.originalSource);
  assert.deepEqual(previous.originalSource, proof.referenceDemoSource);
  return proof.currentSource;
}
function validate(originalSource, buildFile) {
  return validateWithProof(JSON.parse(fs.readFileSync(qualificationFile, 'utf8')), originalSource, buildFile);
}
module.exports = { validate, validateWithProof, qualificationFile };
