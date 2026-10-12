// Copyright (c) LinkU Labs, Inc.
// SPDX-License-Identifier: Apache-2.0
// Prepare and audit an exact same-ID upgrade. Never modifies installed files or a Chrome profile.
const fs=require('node:fs'),path=require('node:path'),a=require('node:assert/strict'),crypto=require('node:crypto');
const build=require('./build-reviewed-generation-production-extension.cjs');
const logs=path.resolve(__dirname,'../migrationToGRpcOrGraphQLDoc/workLog'),read=f=>JSON.parse(fs.readFileSync(f)),sha=f=>crypto.createHash('sha256').update(fs.readFileSync(f)).digest('hex');
const oldFile=path.join(logs,'20261007-default-generation-positive-C46-build-03.json'),newFile=path.join(logs,'20261010-default-generation-positive-C198-build-01.json'),closureFile=path.join(logs,'20261010-default-generation-positive-C198-closure-01.json'),acceptedFile=path.join(logs,'20261010-default-generation-positive-C188-build-02.json');
const old=read(oldFile),fresh=read(newFile),closure=read(closureFile),accepted=read(acceptedFile);
a(old.passed&&fresh.passed&&closure.passed&&accepted.passed);
a.deepEqual(build.productSource(),accepted.sourceAfter);a.deepEqual(fresh.sourceBefore,accepted.sourceAfter);a.deepEqual(fresh.sourceAfter,accepted.sourceAfter);a.deepEqual(closure.source,accepted.sourceAfter);
a.equal(fresh.profileSha256,old.profileSha256);a.equal(fresh.reviewedRelease.registrySha256,old.reviewedRelease.registrySha256);a.equal(fresh.reviewedRelease.declarationSha256,old.reviewedRelease.declarationSha256);a(fresh.reviewedRelease.compiled.passed&&fresh.compiledProfile.passed);
a.deepEqual(build.files(old.output),old.artifacts);a.deepEqual(build.files(fresh.output),fresh.artifacts);
for(const[f,h]of Object.entries(closure.inputsSha256))a.equal(sha(f),h);
const originalManifest=read(path.join(old.output,'manifest.json')),newManifest=read(path.join(fresh.output,'manifest.json'));
const normalized=structuredClone(newManifest);normalized.version=originalManifest.version;normalized.version_name=originalManifest.version_name;a.deepEqual(normalized,originalManifest);
a.equal(newManifest.version,'26.10.10.0');a.equal(originalManifest.version,'26.10.7.0');
const archive=old.output+'-original-retained-by-C198-20261010-01',prepared=old.output+'-C198-prepared-upgrade-20261010-01',output=path.join(logs,'20261010-C198-ordinary-upgrade-prepared-01.json');
a(!fs.existsSync(archive)&&!fs.existsSync(prepared)&&!fs.existsSync(output));
fs.cpSync(fresh.output,prepared,{recursive:true,errorOnExist:true,force:false});a.deepEqual(build.files(prepared),fresh.artifacts);a.deepEqual(build.files(old.output),old.artifacts);
const record={passed:true,preparedOnly:true,observedAt:new Date().toISOString(),source:fresh.sourceAfter,oldVersion:originalManifest.version,newVersion:newManifest.version,expectedExtensionId:'kiahlcbejlgmnbmcggnhagbccojnbkaa',stable:old.output,archive,prepared,compilerOutput:fresh.output,oldBuildFile:oldFile,newBuildFile:newFile,closureFile,oldArtifacts:old.artifacts,newArtifacts:fresh.artifacts,profileAndCompleteReleaseAuthorityUnchanged:true,manifestOnlyVersionAndVersionNameChanged:true,permissionsUnchanged:true,productionClosureReviewed:true,installedFilesUnchanged:true,profileDatabaseReadOrEdited:false,userConfirmationRequiredBeforeInstall:true,installed:false,ordinaryBrowserAccepted:false,parentCompletion:false,inputsSha256:Object.fromEntries([__filename,oldFile,newFile,closureFile,acceptedFile].map(f=>[f,sha(f)]))};
fs.writeFileSync(output,JSON.stringify(record,null,2)+'\n',{flag:'wx',mode:0o600});console.log(JSON.stringify({passed:true,oldVersion:record.oldVersion,newVersion:record.newVersion,permissionsUnchanged:true,installed:false}));
