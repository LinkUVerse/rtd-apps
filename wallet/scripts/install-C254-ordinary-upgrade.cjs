// Copyright (c) LinkU Labs, Inc.
// SPDX-License-Identifier: Apache-2.0
// Only under standing user-authorized upgrade and native-UI disable of the exact test extension.
const fs=require('node:fs'),path=require('node:path'),a=require('node:assert/strict'),crypto=require('node:crypto');
const {files,productSource}=require('./build-reviewed-generation-production-extension.cjs');
const logs=path.resolve(__dirname,'../migrationToGRpcOrGraphQLDoc/workLog'),read=f=>JSON.parse(fs.readFileSync(f)),sha=f=>crypto.createHash('sha256').update(fs.readFileSync(f)).digest('hex');
const preparedFile=path.join(logs,'20261011-C254-ordinary-upgrade-prepared-01.json'),consentFile=path.join(logs,'20261011-C254-ordinary-upgrade-user-confirmation-01.json'),disabledFile=path.join(logs,'20261011-C254-ordinary-extension-disabled-01.json');
const p=read(preparedFile),consent=read(consentFile),disabled=read(disabledFile),output=path.join(logs,'20261011-C254-ordinary-upgrade-installed-01.json');
a(p.passed&&p.preparedOnly&&!p.installed&&p.permissionsUnchanged);a(consent.userStandingAuthorizationCoversSamePathUpgrade===true);a.equal(consent.preparedReportSha256,sha(preparedFile));a.equal(consent.expectedExtensionId,p.expectedExtensionId);
a(disabled.passed&&disabled.nativeAxConfirmedDisabled&&disabled.userProfileDatabaseEdited===false);a.equal(disabled.extensionId,p.expectedExtensionId);a(Date.now()-Date.parse(disabled.observedAt)>=0&&Date.now()-Date.parse(disabled.observedAt)<300000);
a(!fs.existsSync(output)&&!fs.existsSync(p.archive));for(const[f,h]of Object.entries(p.inputsSha256))a.equal(sha(f),h);a.deepEqual(productSource(),p.source);a.deepEqual(files(p.stable),p.oldArtifacts);a.deepEqual(files(p.prepared),p.newArtifacts);a.deepEqual(files(p.compilerOutput),p.newArtifacts);
fs.renameSync(p.stable,p.archive);try{fs.renameSync(p.prepared,p.stable);}catch(e){fs.renameSync(p.archive,p.stable);throw e;}
const fd=fs.openSync(path.dirname(p.stable),'r');fs.fsyncSync(fd);fs.closeSync(fd);
a.deepEqual(files(p.archive),p.oldArtifacts);a.deepEqual(files(p.stable),p.newArtifacts);a.deepEqual(productSource(),p.source);
const proof={passed:true,observedAt:new Date().toISOString(),source:p.source,stable:p.stable,archive:p.archive,compilerOutput:p.compilerOutput,oldVersion:p.oldVersion,newVersion:p.newVersion,extensionId:p.expectedExtensionId,oldArtifactsFullyPreserved:true,newInstalledArtifactsEqualCompilerOutput:true,manifestUnmodifiedAfterCompiler:true,profileDatabaseReadOrEdited:false,permissionsUnchanged:true,ordinaryBrowserReloadAccepted:false,parentCompletion:false,inputsSha256:Object.fromEntries([__filename,preparedFile,consentFile,disabledFile].map(f=>[f,sha(f)]))};fs.writeFileSync(output,JSON.stringify(proof,null,2)+'\n',{flag:'wx',mode:0o600});console.log(JSON.stringify({passed:true,newVersion:p.newVersion,oldArtifactsFullyPreserved:true,profileDatabaseReadOrEdited:false}));
