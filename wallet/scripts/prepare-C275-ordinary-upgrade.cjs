// Preserve the installed C257 build; add only the independently certified G4 release binding.
const fs=require('node:fs'),path=require('node:path'),a=require('node:assert/strict'),crypto=require('node:crypto');
const {files,productSource}=require('./build-reviewed-generation-production-extension.cjs');
const logs=path.resolve(__dirname,'../migrationToGRpcOrGraphQLDoc/workLog');
const read=f=>JSON.parse(fs.readFileSync(f)),sha=f=>crypto.createHash('sha256').update(fs.readFileSync(f)).digest('hex');
const oldFile=path.join(logs,'20261011-default-generation-positive-C257-build-01.json'),installedFile=path.join(logs,'20261011-C257-ordinary-upgrade-installed-01.json'),newFile=path.join(logs,'20261011-default-generation-positive-C275-build-01.json'),closureFile=path.join(logs,'20261011-default-generation-positive-C275-closure-01.json');
const old=read(oldFile),installed=read(installedFile),fresh=read(newFile),closure=read(closureFile);
a(old.passed&&installed.passed&&fresh.passed&&closure.passed);
a.deepEqual(productSource(),old.sourceAfter);a.deepEqual(fresh.sourceAfter,old.sourceAfter);a.deepEqual(closure.source,old.sourceAfter);
a.deepEqual(files(installed.stable),old.artifacts);a.deepEqual(files(fresh.output),fresh.artifacts);
a.equal(fresh.profileSha256,old.profileSha256);
const originalRegistry=read(old.reviewedRelease.registryFile),nextRegistry=read(fresh.reviewedRelease.registryFile);
a.equal(nextRegistry.entries.length,2);a.deepEqual(nextRegistry.entries[0],originalRegistry.entries[0]);
a.equal(nextRegistry.entries[1].profileBindingKey,JSON.parse(nextRegistry.entries[1].json).profileBindingKey);
const originalManifest=read(path.join(installed.stable,'manifest.json')),nextManifest=read(path.join(fresh.output,'manifest.json'));a.deepEqual(nextManifest,originalManifest);
const stable=installed.stable,archive=stable+'-C257-retained-by-C275-20261011-01',prepared=stable+'-C275-prepared-upgrade-20261011-01',output=path.join(logs,'20261011-C275-ordinary-upgrade-prepared-01.json');
a(!fs.existsSync(archive)&&!fs.existsSync(prepared)&&!fs.existsSync(output));
fs.cpSync(fresh.output,prepared,{recursive:true,errorOnExist:true,force:false});a.deepEqual(files(prepared),fresh.artifacts);
const record={passed:true,preparedOnly:true,observedAt:new Date().toISOString(),source:fresh.sourceAfter,oldVersion:originalManifest.version,newVersion:nextManifest.version,expectedExtensionId:installed.extensionId,stable,archive,prepared,compilerOutput:fresh.output,oldArtifacts:old.artifacts,newArtifacts:fresh.artifacts,
  productSourceUnchanged:true,originalDefaultProfileUnchanged:true,previousReleaseEntryPreserved:true,additionalCertifiedReleaseEntries:1,
  manifestUnchanged:true,permissionsUnchanged:true,productionClosureReviewed:true,installedFilesUnchanged:true,profileDatabaseReadOrEdited:false,userStandingUpgradeAuthorization:true,installed:false,ordinaryBrowserAccepted:false,parentCompletion:false,
  inputsSha256:Object.fromEntries([__filename,oldFile,installedFile,newFile,closureFile].map(f=>[f,sha(f)]))};
fs.writeFileSync(output,JSON.stringify(record,null,2)+'\n',{flag:'wx',mode:0o600});console.log(JSON.stringify({passed:true,installed:false,permissionsUnchanged:true,additionalCertifiedReleaseEntries:1}));
