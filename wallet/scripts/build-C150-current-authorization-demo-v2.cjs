// Build the ordinary/imported authorization demo from its current original inputs.
const fs=require('node:fs'),path=require('node:path'),os=require('node:os'),cp=require('node:child_process'),crypto=require('node:crypto'),assert=require('node:assert/strict');
const wallet=path.resolve(__dirname,'..'),logs=path.join(wallet,'migrationToGRpcOrGraphQLDoc/workLog');
const read=f=>JSON.parse(fs.readFileSync(f)),sha=f=>crypto.createHash('sha256').update(fs.readFileSync(f)).digest('hex');
const [directory,output]=process.argv.slice(2),runtime=path.join(os.homedir(),'.local/state/rtd-wallet-migration/dev-20261006-03');
assert(directory&&output&&!fs.existsSync(directory)&&!fs.existsSync(output));assert.equal(path.dirname(path.resolve(directory)),runtime);assert(path.basename(directory).startsWith('C150-current-authorization-demo-'));
const lineage=require('./lib/C136-product-source-lineage.cjs'),q=read(lineage.qualificationFile),source=lineage.validate(q.originalSource,q.buildFile);
const buildlog=path.join(logs,'20261009-C150-authorization-demo-build-02.log');assert(!fs.existsSync(buildlog));
const environment={...process.env,VITE_RTD_NETWORK:'localnet',VITE_RTD_GRPC_URL:'http://127.0.0.1:41750'};
const command=[path.join(path.dirname(require.resolve('vite/package.json')),'bin/vite.js'),'build','--outDir',path.resolve(directory),'--sourcemap'];
const result=cp.spawnSync(process.execPath,command,{cwd:path.join(wallet,'tests/demo-app'),env:environment,encoding:'utf8',timeout:180000});
fs.writeFileSync(buildlog,(result.stdout??'')+(result.stderr??''),{flag:'wx',mode:0o600});assert.equal(result.status,0);assert(!result.error);
const artifacts={},sources={};
for(const entry of fs.readdirSync(directory,{recursive:true})){const file=path.join(directory,entry);if(!fs.statSync(file).isFile())continue;assert(!fs.lstatSync(file).isSymbolicLink());artifacts[entry]=sha(file);if(!file.endsWith('.map'))continue;const map=read(file);assert.equal(map.sources.length,map.sourcesContent.length);assert(fs.readFileSync(file.slice(0,-4),'utf8').includes('sourceMappingURL='+path.basename(file)));for(let i=0;i<map.sources.length;i++){const original=path.resolve(path.dirname(file),map.sources[i]);assert.equal(fs.readFileSync(original,'utf8'),map.sourcesContent[i]);sources[original]=sha(original);}}
for(const file of ['authorization-fixture.ts','index.tsx'])assert(sources[path.join(wallet,'tests/demo-app/src',file)]);
assert.deepEqual(lineage.validate(q.originalSource,q.buildFile),source);
const files=[__filename,buildlog,path.join(wallet,'tests/demo-app/vite.config.ts'),lineage.qualificationFile,...Object.keys(sources)];
const proof={passed:true,preparedOnly:true,observedAt:new Date().toISOString(),directory:path.resolve(directory),source,sourceUnchanged:true,sourceMapAllDiskSourcesEqual:true,sourceCount:Object.keys(sources).length,artifacts,sources,buildCommand:[process.execPath,...command],buildExitCode:0,buildEnvironment:{VITE_RTD_NETWORK:'localnet',VITE_RTD_GRPC_URL:'http://127.0.0.1:41750'},profilesOpened:0,networkRequests:0,executeRequests:0,parentCompletion:false,inputsSha256:Object.fromEntries(files.map(file=>[file,sha(file)]))};
fs.writeFileSync(output,JSON.stringify(proof,null,2)+'\n',{flag:'wx',mode:0o600});console.log(JSON.stringify({passed:true,sourceCount:proof.sourceCount,artifactCount:Object.keys(artifacts).length,preparedOnly:true}));
