// Current build and already owned services; this module does not create a runtime.
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),assert=require('node:assert/strict'),cp=require('node:child_process');
const wallet=path.resolve(__dirname,'../..'),root=path.resolve(wallet,'../..'),logs=path.join(wallet,'migrationToGRpcOrGraphQLDoc/workLog');
const foundation=path.join(require('node:os').homedir(),'.local/state/rtd-wallet-migration/dev-20261006-03/publication-foundation');
const operation=path.join(foundation,'C148-fixed-archive-and-tx-readmission-20261009-01/isolated-query-runtime');
const profileFile=path.join(operation,'profile.json'),buildFile=path.join(logs,'20261010-default-generation-positive-C188-build-02.json');
const lineage=require('./C191-product-source-lineage.cjs'),gateway=require('./C148-current-core-gateway-ownership.cjs');
const pythonFile=path.join(root,'link-u-smart-contract/all-in-one-deploy/localDeploy/capture_wallet_C159_current_query_scope.py');
const actualOrigin='chrome-extension://allmppilngnjjikoeinlmjpfpdemkdal';
const read=f=>JSON.parse(fs.readFileSync(f,'utf8')),sha=f=>crypto.createHash('sha256').update(fs.readFileSync(f)).digest('hex');
const pins=[__filename,buildFile,profileFile,lineage.qualificationFile,require.resolve('./C191-product-source-lineage.cjs'),
 require.resolve('./C148-current-core-gateway-ownership.cjs'),gateway.startedFile,gateway.qualifiedFile,pythonFile,path.join(logs,'20261010-C191-stable-extension-install-01.json')];
function validateProfile(file,bytes){
 assert.equal(path.resolve(file),profileFile);const build=read(buildFile);
 assert.equal(crypto.createHash('sha256').update(bytes).digest('hex'),build.compiledProfile.profileSha256);
 const profile=JSON.parse(bytes);assert.equal(profile.expectedGenesisDigest,'BkuLHhdtnoK7yLxo2eQuvcjHtdyipE7MMyxgTJiyHGg4');assert.equal(profile.generation,'dev-20261006-03');
 assert.deepEqual([profile.endpoints.fullnodeGrpcWeb,profile.endpoints.graphqlUrl,profile.endpoints.archiveGrpcWeb,profile.endpoints.accountHistoryUrl].map(v=>new URL(v).origin),['http://127.0.0.1:41750','http://127.0.0.1:42011','http://127.0.0.1:42012','http://127.0.0.1:42013']);return profile;
}
function validateOrigin(){const state=gateway.capture();assert.equal(state.origin,actualOrigin);assert.deepEqual(state.ports,[42011,42012,42013]);assert.equal(state.gatewayIds.length,3);return actualOrigin;}
function validateBuild(file,profile){assert.equal(path.resolve(file),buildFile);const build=read(buildFile);assert.deepEqual(lineage.validate(read(lineage.qualificationFile).originalSource,buildFile),build.sourceAfter);validateProfile(profile,fs.readFileSync(profile));validateOrigin();const install=read(path.join(logs,"20261010-C191-stable-extension-install-01.json"));return {...build,compilerOutput:build.output,output:install.stable};}
function capture(){validateBuild(buildFile,profileFile);const value=JSON.parse(cp.execFileSync(path.join(root,'rtd-archive-service/localDeploy/data/publisher-venv/bin/python'),[pythonFile],{encoding:'utf8',timeout:180000}));assert(value.passed&&value.actualScopeActorCount===36&&value.originalThirtyActorsAnd116ContainersHeld&&value.actualSixCurrentDebugConsumerBirthsHeld);return{currentScope:value,currentGateway:gateway.capture(),buildFileSha256:sha(buildFile),profileFileSha256:sha(profileFile)};}
function held(intentFile){const intent=read(intentFile);for(const[f,h]of Object.entries({...intent.inputsSha256,...intent.protectedOriginalsSha256}))assert.equal(sha(f),h);return capture();}
module.exports={buildFile,profileFile,operation,pins,validateProfile,validateBuild,validateOrigin,actualOrigin,held,capture};
