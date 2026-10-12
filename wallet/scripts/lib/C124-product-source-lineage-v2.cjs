// C124 full source delta + current isolated build. Earlier source guards stay unchanged.
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {sha,read,auditDelta}=require('../qualify-C124-product-delta.cjs');
const wallet=path.resolve(__dirname,'../..'),logs=path.join(wallet,'migrationToGRpcOrGraphQLDoc/workLog');
const qualificationFile=path.join(logs,'20261009-C124-production-source-independent-02.json');
function validateWithProof(proof,originalSource,buildFile){
 assert(proof.passed&&proof.preparedOnly&&proof.exactProductDeltaAccepted&&proof.completeOriginalProductionInverseAccepted&&proof.allOriginalTestCasesHeld);
 assert.equal(proof.unchangedOriginalProductFiles,1120);assert.equal(proof.maximumReadonlyProbeAttempts,2);assert(proof.originalNativeWindowAssertionsHeld&&proof.originalTicketAndTotalDeadlineHeld);assert.equal(proof.signOrExecuteRetries,0);
 assert.deepEqual(originalSource,proof.originalSource);
 for(const[f,h]of Object.entries(proof.inputsSha256))assert.equal(sha(f),h);
 const delta=auditDelta();for(const k of ['changed','added','deleted','originalSource','currentSource'])assert.deepEqual(delta[k],proof[k]);
 const build=read(proof.buildFile);assert(build.passed&&build.sourceUnchanged&&build.currentDevelopmentDistUnchanged);assert.deepEqual(build.sourceBefore,proof.currentSource);assert.deepEqual(build.sourceAfter,proof.currentSource);if(buildFile)assert.equal(path.resolve(buildFile),proof.buildFile);
 const compiler=require('../build-reviewed-generation-production-extension.cjs');assert.deepEqual(compiler.productSource(),proof.currentSource);assert.deepEqual(compiler.files(path.join(wallet,'dist')),build.developmentDist);for(const[f,h]of Object.entries(build.artifacts))assert.equal(sha(path.join(build.output,f)),h);
 const previous=read(proof.previousQualificationFile);assert(previous.passed&&previous.exactProductDeltaAccepted);assert.deepEqual(previous.currentSource,proof.originalSource);for(const[f,h]of Object.entries(previous.inputsSha256))assert.equal(sha(f),h);
 assert(proof.fullProductionTypecheck&&proof.emittedProductionClosure&&proof.isolatedProductionBuild&&proof.originalC46C102C109BuildsHeld);assert.equal(proof.regressionTests,282);assert.equal(proof.currentProductMapsVerified,1);
 return proof.currentSource;
}
const validate=(originalSource,buildFile)=>validateWithProof(read(qualificationFile),originalSource,buildFile);
module.exports={qualificationFile,validateWithProof,validate};
