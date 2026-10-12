// New source admission; all earlier source guards remain unchanged.
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {auditDelta,sha,read}=require('../qualify-C131-product-delta.cjs');
const wallet=path.resolve(__dirname,'../..'),logs=path.join(wallet,'migrationToGRpcOrGraphQLDoc/workLog');
const qualificationFile=path.join(logs,'20261009-C131-production-source-independent-01.json');
function validateWithProof(proof,originalSource,buildFile){
  assert(proof.passed&&proof.exactProductDeltaAccepted&&proof.completeOriginalProductionInverseAccepted);
  assert(proof.allOriginalTestCasesHeld&&proof.onlyOrphanExplicitFalseMetadataCleanup&&proof.durableJournalHeld&&proof.activeApprovalSubjectTimingHeld&&proof.orphanTrueRemainsNonDeliverable);
  assert.equal(proof.unchangedOriginalProductFiles,1119);assert.equal(proof.signOrExecuteRetries,0);
  assert.deepEqual(originalSource,proof.originalSource);
  for(const[f,h]of Object.entries(proof.inputsSha256))assert.equal(sha(f),h);
  const delta=auditDelta();for(const k of ['changed','added','deleted','originalSource','currentSource'])assert.deepEqual(delta[k],proof[k]);
  assert(proof.fullProductionTypecheck&&proof.emittedProductionClosure&&proof.isolatedProductionBuild);
  assert.equal(proof.regressionTests,207);assert.equal(proof.regressionFiles,10);assert.equal(proof.currentProductMapsVerified,2);
  const build=read(proof.buildFile);assert(build.passed&&build.sourceUnchanged&&build.currentDevelopmentDistUnchanged);
  assert.deepEqual(build.sourceBefore,proof.currentSource);assert.deepEqual(build.sourceAfter,proof.currentSource);
  if(buildFile)assert.equal(path.resolve(buildFile),proof.buildFile);
  const compiler=require('../build-reviewed-generation-production-extension.cjs');assert.deepEqual(compiler.productSource(),proof.currentSource);
  assert.deepEqual(compiler.files(path.join(wallet,'dist')),build.developmentDist);
  assert.deepEqual(compiler.files(build.output),build.artifacts);
  return proof.currentSource;
}
const validate=(originalSource,buildFile)=>validateWithProof(read(qualificationFile),originalSource,buildFile);
module.exports={qualificationFile,validateWithProof,validate};
