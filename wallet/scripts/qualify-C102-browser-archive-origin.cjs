// Bind independent fresh checkpoint reads to the actual installed extension Origin.
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),assert=require('node:assert/strict'),cp=require('node:child_process');
const logs=path.resolve(__dirname,'../migrationToGRpcOrGraphQLDoc/workLog'),read=f=>JSON.parse(fs.readFileSync(f)),sha=f=>crypto.createHash('sha256').update(fs.readFileSync(f)).digest('hex');
const [output]=process.argv.slice(2);assert(output&&!fs.existsSync(output));const files=[__filename];let result;
try{
 const qFile=path.join(logs,'20261008-C102-full-current-tools-qualification-01.json');files.push(qFile);const q=read(qFile);assert(q.passed);for(const[f,h]of Object.entries(q.inputsSha256))assert.equal(sha(f),h);
 const sourceFile=path.join(logs,'20261008-C102-production-source-independent-01.json');files.push(sourceFile);const source=read(sourceFile);require('./lib/C102-product-source-lineage.cjs').validate(source.originalSource,source.buildFile);files.push(source.buildFile);
 const build=read(source.buildFile),manifestFile=path.join(build.output,'manifest.json');files.push(manifestFile);const manifest=read(manifestFile);assert.equal(sha(manifestFile),build.artifacts['manifest.json']);
 const bytes=crypto.createHash('sha256').update(Buffer.from(manifest.key,'base64')).digest().subarray(0,16);
 const extensionId=Array.from(bytes).map(n=>String.fromCharCode(97+(n>>4),97+(n&15))).join('');
 assert.equal(extensionId,'kiahlcbejlgmnbmcggnhagbccojnbkaa');const origin='chrome-extension://'+extensionId;
 const configFile=path.resolve(process.env.HOME,'.local/state/rtd-wallet-migration/dev-20261006-03/publication-foundation/C48-isolated-nft-execution-gateway-20261007-01/nginx.conf');files.push(configFile);
 const config=fs.readFileSync(configFile,'utf8'),map=config.match(/map \$http_origin \$origin_ok \{([^}]+)\}/);assert(map);assert.equal(map[1].trim(),'default 0; "" 1; "'+origin+'" 1;');
 const deltaFile=path.join(logs,'20261008-C102-browser-archive-origin-source-delta-01.json');files.push(deltaFile);const d=read(deltaFile);assert.equal(d.changes.length,2);files.push(d.originalSource,d.candidateSource);assert.equal(q.inputsSha256[d.originalSource],sha(d.originalSource));
 let inverse=fs.readFileSync(d.candidateSource,'utf8');for(const[a,b]of d.changes.slice().reverse()){assert.equal(inverse.split(b).length,2);inverse=inverse.replace(b,a);}assert.equal(inverse,fs.readFileSync(d.originalSource,'utf8'));
 for(const f of [d.candidateSource,__filename])cp.execFileSync(process.execPath,['--check',f],{timeout:30000});
 result={passed:true,preparedOnly:true,observedAt:new Date().toISOString(),origin,extensionId,exactSourceDeltas:2,actualBuildManifestOriginHeld:true,installedGatewayWhitelistHeld:true,wholeAuditorAndTypedReadsHeld:true,networkRequests:0,profilesOpened:0,executeRequests:0,serviceSignals:0,parentCompletion:false,inputsSha256:Object.fromEntries([...new Set(files)].map(f=>[f,sha(f)]))};
}catch(e){result={passed:false,errorType:e.name,message:String(e.message).slice(0,900)};process.exitCode=1;}
fs.writeFileSync(output,JSON.stringify(result,null,2)+'\n',{flag:'wx',mode:0o600});console.log(JSON.stringify({passed:result.passed,origin:result.origin,errorType:result.errorType,message:result.message}));
