// Bind the current single-module UI fix to retained RPC/route evidence.
const fs=require('node:fs'),path=require('node:path'),a=require('node:assert/strict'),crypto=require('node:crypto');
const {files,productSource}=require('./build-reviewed-generation-production-extension.cjs');
const logs=path.resolve(__dirname,'../migrationToGRpcOrGraphQLDoc/workLog'),inputs={};
const sha=f=>crypto.createHash('sha256').update(fs.readFileSync(f)).digest('hex');
function read(name){const f=path.resolve(logs,name);inputs[f]=sha(f);return JSON.parse(fs.readFileSync(f));}
const old=read('20261012-C295-traceability-complete-01.json');
const install=read('20261012-C362-ordinary-upgrade-installed-01.json'),prepared=read('20261012-C362-ordinary-upgrade-prepared-01.json');
const build=read('20261012-default-generation-positive-C362-build-01.json'),checks=read('20261012-C362-checks-01.json');
const closure=read('20261012-default-generation-positive-C362-closure-01.json'),ui=read('20261012-C362-native-browser-01.json');
a([old,install,prepared,build,checks,closure,ui].every(x=>x.passed));
a.deepEqual(productSource(),build.sourceAfter);a.deepEqual(checks.source,build.sourceAfter);a.deepEqual(closure.source,build.sourceAfter);
a.equal(checks.targetedTests,269);a.equal(checks.testFailures,0);a.equal(checks.typechecks,2);
a.deepEqual(files(install.stable),build.artifacts);a.deepEqual(files(install.archive),prepared.oldArtifacts);
a.deepEqual(prepared.productionModuleChanges,['webpack:///./ui/app/staking/validators/SelectValidatorCard.tsx']);
a(prepared.permissionsUnchanged&&prepared.manifestOnlyVersionChanges&&install.oldArtifactsFullyPreserved);
a(ui.stakeSelectionLinkSurvivedDelayedNextAction&&ui.stakingInputsAndPreviewVisible&&ui.previewDisabledWithEmptyAmount);
a.equal(ui.stakeQuantityVisibleAvailable,'100 RTD');a.equal(ui.finalPage,'#/tokens');a.equal(ui.originalFourAccountsRetained.length,4);
a.equal(old.methods.length,21);a.equal(old.routes.length,54);
for(const proof of [prepared,checks,closure])for(const [p,h] of Object.entries(proof.inputsSha256))a.equal(sha(p),h);
const result={passed:true,observedAt:new Date().toISOString(),validatorSelectionFixAccepted:true,source:build.sourceAfter,
 currentInstalledVersion:install.newVersion,actualOrdinaryChromeAccepted:true,originalFourAccountsRetained:true,
 normalStakingProofRotationKeepsActiveAddress:true,networkOrInactiveOrReadFailureClearsSelectionTested:true,
 transactionPreparationAndAuthorizationModulesUnchanged:true,productionModuleChanges:prepared.productionModuleChanges,
 methods:old.methods,routes:old.routes,groups:old.groups,traceabilityComplete:true,
 allRoutesBrowserRetested:false,priorExplicitExceptionsRetained:true,newHarCaptured:false,newJournalHashClaimed:false,
 signatures:0,executions:0,parentCompletion:false,inputsSha256:inputs};
fs.writeFileSync(path.join(logs,'20261012-C362-upgrade-completion-01.json'),JSON.stringify(result,null,2)+'\n',{flag:'wx',mode:0o600});
console.log(JSON.stringify({passed:true,tests:269,methods:21,routes:54,version:install.newVersion}));
