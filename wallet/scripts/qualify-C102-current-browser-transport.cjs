// Actual measured Origin, exact isolated transport derivative and full original browser scope.
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),assert=require('node:assert/strict'),cp=require('node:child_process');
const logs=path.resolve(__dirname,'../migrationToGRpcOrGraphQLDoc/workLog'),read=f=>JSON.parse(fs.readFileSync(f)),sha=f=>crypto.createHash('sha256').update(fs.readFileSync(f)).digest('hex');
const [output]=process.argv.slice(2);assert(output&&!fs.existsSync(output));const files=[__filename];let result;
try{
 const load=name=>{const f=path.join(logs,name);files.push(f);const p=read(f);assert(p.passed);for(const[f,h]of Object.entries(p.inputsSha256??{}))assert.equal(sha(f),h);return p;};
 const original=load('20261008-C102-full-current-tools-qualification-01.json');
 const source=load('20261008-C102-production-source-independent-02.json');require('./lib/C102-product-source-lineage-v2.cjs').validate(source.originalSource,source.buildFile);
 const release=load('20261008-C102-controlled-parallel-release-independent-01.json');assert(release.oldAndNewBindingsMutuallyRefused&&release.certifiedPackagesPreserved===6);
 const origin=load('20261008-C102-current-origin-probe-02.json');assert(origin.profileClosed&&origin.allObservedHttpAttemptsAborted&&origin.forwardedHttpRequests===0);assert(origin.workerSource.matchesDisk&&origin.uiSource.matchesDisk&&origin.permissions.all&&!origin.permissions.unknownPort);
 const gateway=load('20261008-C102-current-gateway-started-01.json');assert.equal(gateway.origin,origin.origin);assert(gateway.actualOriginOnly&&gateway.originalTlsAndMethodsHeld&&gateway.original29And14Held&&gateway.original25ActorsAndCurrentPublisherHeld);
 const deltaFile=path.join(logs,'20261008-C102-current-browser-transport-source-delta-02.json');files.push(deltaFile);const pairs=read(deltaFile);assert.equal(pairs.length,2);
 for(const d of pairs){files.push(d.original,d.candidate);assert.equal(original.inputsSha256[d.original],sha(d.original));assert.equal(d.changes.length,8);let inverse=fs.readFileSync(d.candidate,'utf8');for(const{before,after,count}of d.changes.slice().reverse()){assert.equal(inverse.split(after).length-1,count);inverse=inverse.split(after).join(before);}assert.equal(inverse,fs.readFileSync(d.original,'utf8'));}
 const helper=path.join(__dirname,'lib/C102-current-gateway-ownership.cjs');files.push(helper);
 const authority=require(helper).capture();assert.equal(authority.origin,origin.origin);assert.deepEqual(authority.ports,[42011,42012,42013]);assert.equal(authority.gatewayId,gateway.containerId);
 for(const f of [...pairs.map(d=>d.candidate),helper,__filename])cp.execFileSync(process.execPath,['--check',f],{timeout:30000});
 result={passed:true,preparedOnly:true,observedAt:new Date().toISOString(),actualOrigin:origin.origin,originalFullBrowserAndRawAuditHeld:true,exactSourceDeltas:[8,8],actualBuild03AndItsExactRegistryHeld:true,actualLoadedRendererWorkerAndPermissionsHeld:true,allEmptyProbeHttpAttemptsAborted:true,completeOriginal29Containers14Health25ActorsAndCurrentPublisherHeld:true,oneExactOwnGatewayHeld:true,gatewayAuthority:authority,networkRequests:0,profilesOpened:0,executeRequests:0,currentThreeOwnerBrowserAccepted:false,parentCompletion:false,inputsSha256:Object.fromEntries([...new Set(files)].map(f=>[f,sha(f)]))};
}catch(e){result={passed:false,errorType:e.name,message:String(e.message).slice(0,1200)};process.exitCode=1;}
fs.writeFileSync(output,JSON.stringify(result,null,2)+'\n',{flag:'wx',mode:0o600});console.log(JSON.stringify({passed:result.passed,origin:result.actualOrigin,errorType:result.errorType,message:result.message}));
