// Copyright (c) LinkU Labs, Inc.
// SPDX-License-Identifier: Apache-2.0
// Prepare the reviewed feedback-only build without editing the installed wallet.
const fs=require('node:fs'),path=require('node:path'),a=require('node:assert/strict'),crypto=require('node:crypto');
const build=require('./build-reviewed-generation-production-extension.cjs');
const logs=path.resolve(__dirname,'../migrationToGRpcOrGraphQLDoc/workLog'),read=f=>JSON.parse(fs.readFileSync(f)),sha=f=>crypto.createHash('sha256').update(fs.readFileSync(f)).digest('hex');
const oldInstallFile=path.join(logs,'20261011-C221-ordinary-upgrade-installed-01.json'),oldFile=path.join(logs,'20261011-default-generation-positive-C221-build-01.json'),newFile=path.join(logs,'20261011-default-generation-positive-C224-build-01.json'),closureFile=path.join(logs,'20261011-default-generation-positive-C224-closure-01.json'),qualificationFile=path.join(logs,'20261011-C224-source-and-checks-01.json');
const oldInstall=read(oldInstallFile),old=read(oldFile),fresh=read(newFile),closure=read(closureFile),qualification=read(qualificationFile);
a(oldInstall.passed&&old.passed&&fresh.passed&&closure.passed&&qualification.passed);
a(qualification.productionModuleChangesExpected&&qualification.backgroundChangesReviewed&&qualification.profileRegistryAndManifestUnchanged);
a.deepEqual(build.productSource(),qualification.currentSource);a.deepEqual(fresh.sourceBefore,qualification.currentSource);a.deepEqual(fresh.sourceAfter,qualification.currentSource);a.deepEqual(closure.source,qualification.currentSource);
for(const p of [closure,qualification])for(const[f,h]of Object.entries(p.inputsSha256))a.equal(sha(f),h);
a.deepEqual(build.files(oldInstall.stable),old.artifacts);a.deepEqual(build.files(fresh.output),fresh.artifacts);
a.equal(fresh.profileSha256,old.profileSha256);a.equal(fresh.reviewedRelease.registrySha256,old.reviewedRelease.registrySha256);a.equal(fresh.reviewedRelease.declarationSha256,old.reviewedRelease.declarationSha256);
const originalManifest=read(path.join(oldInstall.stable,'manifest.json')),newManifest=read(path.join(fresh.output,'manifest.json'));a.deepEqual(newManifest,originalManifest);
const stable=oldInstall.stable,archive=stable+'-C221-retained-by-C224-20261011-01',prepared=stable+'-C224-prepared-upgrade-20261011-01',output=path.join(logs,'20261011-C224-ordinary-upgrade-prepared-01.json');
a(!fs.existsSync(archive)&&!fs.existsSync(prepared)&&!fs.existsSync(output));fs.cpSync(fresh.output,prepared,{recursive:true,errorOnExist:true,force:false});a.deepEqual(build.files(prepared),fresh.artifacts);a.deepEqual(build.files(stable),old.artifacts);
const record={passed:true,preparedOnly:true,observedAt:new Date().toISOString(),source:fresh.sourceAfter,oldVersion:originalManifest.version,newVersion:newManifest.version,expectedExtensionId:oldInstall.extensionId,stable,archive,prepared,compilerOutput:fresh.output,oldArtifacts:old.artifacts,newArtifacts:fresh.artifacts,profileAndCompleteReleaseAuthorityUnchanged:true,manifestUnchanged:true,permissionsUnchanged:true,productionClosureReviewed:true,installedFilesUnchanged:true,profileDatabaseReadOrEdited:false,userConfirmationRequiredBeforeInstall:false,userStandingUpgradeAuthorization:true,installed:false,ordinaryBrowserAccepted:false,parentCompletion:false,inputsSha256:Object.fromEntries([__filename,oldInstallFile,oldFile,newFile,closureFile,qualificationFile].map(f=>[f,sha(f)]))};
fs.writeFileSync(output,JSON.stringify(record,null,2)+'\n',{flag:'wx',mode:0o600});console.log(JSON.stringify({passed:true,newVersion:record.newVersion,installed:false,permissionsUnchanged:true}));
