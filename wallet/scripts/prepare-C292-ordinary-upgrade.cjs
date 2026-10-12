// Review the unavailable exchange route and preserve the installed C278 build.
const fs=require('node:fs'),path=require('node:path'),a=require('node:assert/strict'),crypto=require('node:crypto');
const {files,productSource}=require('./build-reviewed-generation-production-extension.cjs');
const logs=path.resolve(__dirname,'../migrationToGRpcOrGraphQLDoc/workLog');
const read=f=>JSON.parse(fs.readFileSync(f)),sha=f=>crypto.createHash('sha256').update(fs.readFileSync(f)).digest('hex');
const oldFile=path.join(logs,'20261012-default-generation-positive-C278-build-01.json'),installedFile=path.join(logs,'20261012-C278-ordinary-upgrade-installed-01.json'),newFile=path.join(logs,'20261012-default-generation-positive-C292-build-01.json'),closureFile=path.join(logs,'20261012-default-generation-positive-C292-closure-01.json'),checksFile=path.join(logs,'20261012-C292-checks-01.json');
const old=read(oldFile),installed=read(installedFile),fresh=read(newFile),closure=read(closureFile),checks=read(checksFile);
a(old.passed&&installed.passed&&fresh.passed&&closure.passed&&checks.passed);
a.deepEqual(productSource(),fresh.sourceAfter);a.deepEqual(fresh.sourceBefore,fresh.sourceAfter);a.deepEqual(closure.source,fresh.sourceAfter);a.deepEqual(checks.source,fresh.sourceAfter);
for(const proof of [closure,checks])for(const[file,hash]of Object.entries(proof.inputsSha256))a.equal(sha(file),hash);
a.deepEqual(files(installed.stable),old.artifacts);a.deepEqual(files(fresh.output),fresh.artifacts);
a.equal(fresh.profileSha256,old.profileSha256);a.equal(fresh.reviewedRelease.registrySha256,old.reviewedRelease.registrySha256);
a.equal(fresh.reviewedRelease.declarationSha256,old.reviewedRelease.declarationSha256);
function modules(dir){const map=new Map();for(const name of Object.keys(files(dir)).filter(n=>n.endsWith('.js.map'))){const m=read(path.join(dir,name));m.sources.forEach((s,i)=>{if(s.startsWith('webpack:///webpack/'))return;const previous=map.get(s);a(previous===undefined||previous===m.sourcesContent[i]);map.set(s,m.sourcesContent[i]);});}return map;}
const before=modules(installed.stable),after=modules(fresh.output);a.deepEqual([...before.keys()].sort(),[...after.keys()].sort());
const changed=[...before.keys()].filter(k=>before.get(k)!==after.get(k)).sort();
a.deepEqual(changed,['webpack:///./ui/app/pages/home/usdc-promo/UsdcPromo.tsx']);
const originalManifest=read(path.join(installed.stable,'manifest.json')),nextManifest=read(path.join(fresh.output,'manifest.json'));a.deepEqual(nextManifest,originalManifest);
const stable=installed.stable,archive=stable+'-C278-retained-by-C292-20261012-01',prepared=stable+'-C292-prepared-upgrade-20261012-01',output=path.join(logs,'20261012-C292-ordinary-upgrade-prepared-01.json');
a(!fs.existsSync(archive)&&!fs.existsSync(prepared)&&!fs.existsSync(output));
fs.cpSync(fresh.output,prepared,{recursive:true,errorOnExist:true,force:false});a.deepEqual(files(prepared),fresh.artifacts);
const record={passed:true,preparedOnly:true,observedAt:new Date().toISOString(),source:fresh.sourceAfter,oldVersion:originalManifest.version,newVersion:nextManifest.version,expectedExtensionId:installed.extensionId,stable,archive,prepared,compilerOutput:fresh.output,oldArtifacts:old.artifacts,newArtifacts:fresh.artifacts,
  productionModuleChanges:changed,productSourceUnchanged:false,originalDefaultProfileUnchanged:true,completeReleaseRegistryUnchanged:true,
  manifestUnchanged:true,permissionsUnchanged:true,productionClosureReviewed:true,installedFilesUnchanged:true,profileDatabaseReadOrEdited:false,userStandingUpgradeAuthorization:true,installed:false,ordinaryBrowserAccepted:false,parentCompletion:false,
  inputsSha256:Object.fromEntries([__filename,oldFile,installedFile,newFile,closureFile,checksFile].map(f=>[f,sha(f)]))};
fs.writeFileSync(output,JSON.stringify(record,null,2)+'\n',{flag:'wx',mode:0o600});console.log(JSON.stringify({passed:true,installed:false,permissionsUnchanged:true,productionModuleChanges:changed}));
