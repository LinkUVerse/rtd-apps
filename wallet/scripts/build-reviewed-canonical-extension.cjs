#!/usr/bin/env node
// Copyright (c) LinkU Labs, Inc.
// SPDX-License-Identifier: Apache-2.0
// Build an isolated extension from an explicitly reviewed local chain release.
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const { execFileSync } = require('node:child_process');
const ts = require('typescript');
const { files, productSource } = require('./build-reviewed-generation-production-extension.cjs');
const wallet = path.resolve(__dirname, '..');
const sha = data => crypto.createHash('sha256').update(data).digest('hex');

function verifyProfile(extension, profile) {
  const bundles = {};
  const names = new Set(['ui.js', 'background.js']);
  for (const name of fs.readdirSync(extension).filter(n => n.endsWith('.js.map'))) {
    const map = JSON.parse(fs.readFileSync(path.join(extension,name),'utf8'));
    if (map.sources?.some(source=>/\/ui\/index\.tsx(?:\?|$)/.test(source))) names.add(name.slice(0,-4));
  }
  for (const name of names) {
    const text = fs.readFileSync(path.join(extension,name),'utf8');
    const tree = ts.createSourceFile(name,text,ts.ScriptTarget.Latest,true,ts.ScriptKind.JS);
    assert.equal(tree.parseDiagnostics.length,0);let matches=0;
    function visit(node) {
      if(ts.isStringLiteral(node) && node.text.includes(profile.id)) {
        let registry;try{registry=JSON.parse(node.text)}catch{}
        if(registry?.local){assert.deepEqual(registry,{local:profile});matches++;}
      }
      ts.forEachChild(node,visit);
    }
    visit(tree);bundles[name]={sha256:sha(text),registryMatches:matches};
  }
  assert(bundles['background.js'].registryMatches>0);
  assert([...names].some(n=>n!=='background.js'&&bundles[n].registryMatches>0));
  return {passed:true,profileId:profile.id,profileRevision:profile.revision,bundles,uiBundles:[...names].filter(n=>n!=='background.js')};
}

async function main() {
  const [releaseArg, outputArg, proofArg] = process.argv.slice(2);
  const release=path.resolve(releaseArg),output=path.resolve(outputArg),proofFile=path.resolve(proofArg);
  const privateRoot=path.join(os.homedir(),'.local/state/rtd-wallet-migration')+path.sep;
  assert([release,output,proofFile].every(p=>p.startsWith(privateRoot)));
  assert(!fs.existsSync(output)&&!fs.existsSync(proofFile));
  for(const key of ['SENTRY_AUTH_TOKEN','WALLET_EXTERNAL_SERVICES','WALLET_REVIEWED_DEPLOYMENTS','WALLET_NETWORK_PROFILES'])assert(!process.env[key],key);
  const profileFile=path.join(release,'profile.json'),registryFile=path.join(release,'registry.json'),reviewFile=path.join(release,'audit.json');
  const profileRaw=fs.readFileSync(profileFile),registryRaw=fs.readFileSync(registryFile),reviewRaw=fs.readFileSync(reviewFile);
  const profile=JSON.parse(profileRaw),review=JSON.parse(reviewRaw),registry=JSON.parse(registryRaw);
  assert(review.passed&&review.freshRootAndFieldVerified&&review.packages===6);
  assert.equal(review.scope,'Controlled offline certificate-backed dev Move release authority; fresh runtime comparison remains separate');
  assert.equal(review.profileSha256,sha(profileRaw));assert.equal(review.registrySha256,sha(registryRaw));
  assert.equal(review.h0,profile.expectedGenesisDigest);assert.equal(review.generation,profile.generation);
  assert.equal(registry.entries.length,1);assert.equal(registry.entries[0].trustedSha256,review.declarationSha256);
  assert.equal(sha(registry.entries[0].json),review.declarationSha256);
  for(const[file,digest]of Object.entries(review.inputsSha256))assert.equal(sha(fs.readFileSync(file)),digest);
  if(review.runtimeBinding) {
    const {file,...expected}=review.runtimeBinding, runtime=JSON.parse(fs.readFileSync(file,'utf8'));
    for(const [key,value]of Object.entries(expected)) assert.equal(runtime[key],value,`runtime.${key}`);
    assert.equal(expected.expectedGenesisDigest,profile.expectedGenesisDigest);
    assert.equal(expected.rpcUrl,profile.endpoints.fullnodeGrpcWeb);
  }
  execFileSync('pnpm',['exec','tsx','-e',`import {readFileSync} from 'node:fs';import assert from 'node:assert/strict';import {validateNetworkProfile} from './src/shared/rpc/profile';import {selectReviewedDeployment} from './src/shared/rpc/reviewed-deployment-registry';(async()=>{const profile=validateNetworkProfile(JSON.parse(readFileSync(process.argv[1],'utf8')),{requireComplete:true});assert.equal((await selectReviewedDeployment(profile,readFileSync(process.argv[2],'utf8'))).state,'reviewed')})()`,profileFile,registryFile],{cwd:wallet,stdio:'pipe',timeout:60000});
  Object.assign(process.env,{NODE_ENV:'production',API_ENV:'local',TS_NODE_PROJECT:'./configs/ts/tsconfig.webpack.json',WALLET_NETWORK_PROFILES:JSON.stringify({local:profile}),WALLET_REVIEWED_DEPLOYMENTS:registryRaw.toString()});
  const before=productSource(),distBefore=files(path.join(wallet,'dist')),launcher=sha(fs.readFileSync(__filename));
  require('ts-node/register');const config=await require('../webpack.config.ts').default();
  assert.equal(config.mode,'production');assert.equal(config.devtool,'source-map');assert.equal(config.output.path,path.join(wallet,'dist'));
  config.output.path=output;
  const CopyPlugin=require('copy-webpack-plugin'),copies=config.plugins.filter(p=>p instanceof CopyPlugin);assert.equal(copies.length,1);
  let redirected=0;for(const pattern of copies[0].patterns)if(pattern.to){assert.equal(pattern.to,path.join(wallet,'dist','[name][ext]'));pattern.to=path.join(output,'[name][ext]');redirected++;}assert.equal(redirected,1);
  fs.mkdirSync(output,{mode:0o700});const compiler=require('webpack')(config);
  const stats=await new Promise((resolve,reject)=>compiler.run((error,stats)=>error?reject(error):resolve(stats)));
  await new Promise((resolve,reject)=>compiler.close(error=>error?reject(error):resolve()));
  const graph=stats.toJson({all:false,hash:true,errors:true,warnings:true,assets:true,entrypoints:true,chunks:true,chunkModules:true,modules:true,nestedModules:true,reasons:true,ids:true,assetsSpace:Infinity,modulesSpace:Infinity,nestedModulesSpace:Infinity,chunkModulesSpace:Infinity,reasonsSpace:Infinity,orphanModules:true,dependentModules:true,runtimeModules:true,cachedModules:true,cachedAssets:true,groupAssetsByChunk:false,groupAssetsByEmitStatus:false,groupAssetsByExtension:false,groupAssetsByInfo:false,groupAssetsByPath:false,groupModulesByAttributes:false,groupModulesByCacheStatus:false,groupModulesByExtension:false,groupModulesByLayer:false,groupModulesByPath:false,groupModulesByType:false});
  fs.writeFileSync(path.join(output,'compilation-graph.json'),JSON.stringify(graph),{flag:'wx',mode:0o600});
  const after=productSource(),distAfter=files(path.join(wallet,'dist'));
  const result={observedAt:new Date().toISOString(),mode:'production',sourceBefore:before,sourceAfter:after,sourceUnchanged:JSON.stringify(before)===JSON.stringify(after),currentDevelopmentDistUnchanged:JSON.stringify(distBefore)===JSON.stringify(distAfter),output,profileSha256:sha(profileRaw),profileUnchanged:sha(fs.readFileSync(profileFile))===sha(profileRaw),launcherSha256:launcher,launcherUnchanged:sha(fs.readFileSync(__filename))===launcher,compilationGraphSha256:sha(fs.readFileSync(path.join(output,'compilation-graph.json'))),compilationErrors:graph.errors?.length??0,compilationWarnings:graph.warnings?.length??0,artifacts:files(output),scope:'Isolated production compilation; no browser or end-to-end acceptance claim.'};
  if(!stats.hasErrors()) {
    result.compiledProfile=verifyProfile(output,profile);
    result.reviewedRelease={registryFile,reviewFile,registrySha256:sha(registryRaw),reviewSha256:sha(reviewRaw),inputsUnchanged:sha(fs.readFileSync(registryFile))===sha(registryRaw)&&sha(fs.readFileSync(reviewFile))===sha(reviewRaw),compiled:require('./lib/verify-extension-reviewed-deployment.cjs')({extension:output,registryFile,profileProof:result.compiledProfile})};
  }
  result.passed=!stats.hasErrors()&&result.sourceUnchanged&&result.currentDevelopmentDistUnchanged&&result.profileUnchanged&&result.launcherUnchanged&&result.compiledProfile?.passed&&result.reviewedRelease?.inputsUnchanged&&result.reviewedRelease?.compiled?.passed;
  fs.writeFileSync(proofFile,JSON.stringify(result,null,2)+'\n',{flag:'wx',mode:0o600});
  console.log(JSON.stringify({passed:result.passed,errors:result.compilationErrors,warnings:result.compilationWarnings,output}));
  if(!result.passed)process.exitCode=1;
}
if(require.main===module)main().catch(error=>{console.error(error);process.exitCode=1;});
module.exports={verifyProfile};
