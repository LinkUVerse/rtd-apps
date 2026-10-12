#!/usr/bin/env node
// Copyright (c) LinkU Labs, Inc.
// SPDX-License-Identifier: Apache-2.0
// Isolated production compiler: never replace the loaded development extension.
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const { execFileSync } = require('node:child_process');
const wallet = path.resolve(__dirname, '..');
const sha = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
function files(directory) {
  const rows = {};
  function visit(dir) {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true }).sort((a,b) => a.name.localeCompare(b.name))) {
      const file = path.join(dir, entry.name);
      assert(!entry.isSymbolicLink(), `Symlink in output: ${file}`);
      if (entry.isDirectory()) visit(file);
      else if (entry.isFile()) rows[path.relative(directory, file)] = sha(fs.readFileSync(file));
    }
  }
  visit(directory); return rows;
}
function productSource() {
  return JSON.parse(execFileSync('python3', ['-c',
    'import importlib.util,json; from pathlib import Path; p=Path("scripts/build-reviewed-local-extension.py"); s=importlib.util.spec_from_file_location("build",p); m=importlib.util.module_from_spec(s); s.loader.exec_module(m); h,n=m.source_hash(Path.cwd()); print(json.dumps({"sha256":h,"files":n}))'], { cwd: wallet, encoding:'utf8' }));
}
async function main() {
  const [outputArg, profileArg, evidenceArg, registryArg, reviewArg] = process.argv.slice(2);
  assert(outputArg && profileArg && evidenceArg, 'Usage: build output-directory profile.json proof.json');
  assert([5,7].includes(process.argv.length),'Optional release registry and independent offline review must be paired');
  const output = path.resolve(outputArg), profileFile = path.resolve(profileArg), evidence = path.resolve(evidenceArg);
  const privateRoot = path.resolve(process.env.HOME, '.local/state/rtd-wallet-migration/dev-20261003-01');
  assert(output.startsWith(privateRoot + path.sep));
  assert(!fs.existsSync(output) && !fs.existsSync(evidence), 'Fresh output and evidence required');
  const profileRaw = fs.readFileSync(profileFile), profile = JSON.parse(profileRaw);
  assert.equal(profile.id, 'certified-wallet-dev');
  assert.equal(profile.expectedGenesisDigest, '3tEPxLxUysGx4gfr8UEycvH7xohMWuwKVbTX5np4TCYj');
  // The caller must provide a clean environment. Refuse upload/auth-related inputs.
  for (const key of ['SENTRY_AUTH_TOKEN', 'WALLET_EXTERNAL_SERVICES', 'WALLET_REVIEWED_DEPLOYMENTS']) assert(!process.env[key], key);
  let release;
  if(registryArg){
    const registryFile=path.resolve(registryArg),reviewFile=path.resolve(reviewArg);
    assert(registryFile.startsWith(privateRoot+path.sep)&&reviewFile.startsWith(privateRoot+path.sep));
    const registryBytes=fs.readFileSync(registryFile),reviewBytes=fs.readFileSync(reviewFile),review=JSON.parse(reviewBytes);
    assert(review.passed&&review.scope==='Two offline original genesis-anchored certificate prefixes and compiled/self-address-only package sources, five exact Move pins. No service build authority, fresh runtime match, signing, execution or Chrome acceptance.');
    assert.equal(review.profileRevision,4);assert.equal(review.packages.length,5);assert.deepEqual(review.certifiedPrefixThrough,[24450,201271]);assert.deepEqual(review.verifiedCheckpoints,[24451,201272]);assert.equal(review.compiledPersonalKioskModules,6);assert.equal(review.sourcePersonalKioskFiles,6);
    assert.equal(sha(profileRaw),review.profileSha256);
    for(const[file,hash]of Object.entries(review.inputsSha256))assert.equal(sha(fs.readFileSync(file)),hash);
    
    assert.equal(sha(registryBytes),review.registrySha256);
    const registry=JSON.parse(registryBytes);assert.equal(registry.entries.length,1);
    assert.equal(registry.entries[0].trustedSha256,review.declarationSha256);
    assert.equal(sha(Buffer.from(registry.entries[0].json)),review.declarationSha256);
    execFileSync('pnpm',['exec','tsx','-e',`import {readFileSync} from 'node:fs'; import assert from 'node:assert/strict'; import {validateNetworkProfile} from './src/shared/rpc/profile'; import {selectReviewedDeployment} from './src/shared/rpc/reviewed-deployment-registry'; (async()=>{const p=validateNetworkProfile(JSON.parse(readFileSync(process.argv[1],'utf8')),{requireComplete:true});const s=await selectReviewedDeployment(p,readFileSync(process.argv[2],'utf8'));assert.equal(s.state,'reviewed')})()`,profileFile,registryFile],{cwd:wallet,stdio:'pipe',timeout:60000});
    process.env.WALLET_REVIEWED_DEPLOYMENTS=registryBytes.toString('utf8');
    release={registryFile,reviewFile,registrySha256:sha(registryBytes),reviewSha256:sha(reviewBytes),declarationSha256:review.declarationSha256};
  }
  process.env.NODE_ENV = 'production'; process.env.API_ENV = 'local';
  process.env.TS_NODE_PROJECT = './configs/ts/tsconfig.webpack.json';
  process.env.WALLET_NETWORK_PROFILES = JSON.stringify({local:profile});
  const sourceBefore = productSource(), distBefore = files(path.join(wallet,'dist'));
  const launcherBefore = sha(fs.readFileSync(__filename));
  require('ts-node/register');
  const config = await require('../webpack.config.ts').default();
  assert.equal(config.mode, 'production'); assert.equal(config.devtool, 'source-map');
  assert.equal(config.output.path, path.join(wallet,'dist'));
  config.output.path = output;
  const CopyPlugin = require('copy-webpack-plugin');
  const copies = config.plugins.filter(plugin => plugin instanceof CopyPlugin);
  assert.equal(copies.length, 1);
  let redirected = 0;
  for (const pattern of copies[0].patterns) {
    if (pattern.to) {
      assert.equal(pattern.to, path.join(wallet,'dist','[name][ext]'));
      pattern.to = path.join(output,'[name][ext]'); redirected++;
    }
  }
  assert.equal(redirected, 1, 'Exact manifest output must be redirected too');
  fs.mkdirSync(output, {mode:0o700});
  const compiler = require('webpack')(config);
  const stats = await new Promise((resolve,reject) => compiler.run((error,stats) => error ? reject(error) : resolve(stats)));
  await new Promise((resolve,reject) => compiler.close(error => error ? reject(error) : resolve()));
  const graph = stats.toJson({all:false,hash:true,errors:true,warnings:true,assets:true,entrypoints:true,chunks:true,chunkModules:true,modules:true,nestedModules:true,reasons:true,ids:true,
    assetsSpace:Infinity,modulesSpace:Infinity,nestedModulesSpace:Infinity,chunkModulesSpace:Infinity,reasonsSpace:Infinity,
    orphanModules:true,dependentModules:true,runtimeModules:true,cachedModules:true,cachedAssets:true,
    groupAssetsByChunk:false,groupAssetsByEmitStatus:false,groupAssetsByExtension:false,groupAssetsByInfo:false,groupAssetsByPath:false,
    groupModulesByAttributes:false,groupModulesByCacheStatus:false,groupModulesByExtension:false,groupModulesByLayer:false,groupModulesByPath:false,groupModulesByType:false});
  fs.writeFileSync(path.join(output,'compilation-graph.json'), JSON.stringify(graph), {flag:'wx',mode:0o600});
  const after = productSource(), distAfter = files(path.join(wallet,'dist'));
  const proof = {observedAt:new Date().toISOString(),mode:'production',sourceBefore,sourceAfter:after,
    sourceUnchanged:JSON.stringify(sourceBefore)===JSON.stringify(after),
    currentDevelopmentDistUnchanged:JSON.stringify(distBefore)===JSON.stringify(distAfter),
    developmentDist:distBefore,output,profileSha256:sha(profileRaw),
    profileUnchanged:sha(fs.readFileSync(profileFile))===sha(profileRaw),
    launcherSha256:launcherBefore,launcherUnchanged:sha(fs.readFileSync(__filename))===launcherBefore,
    compilationGraphSha256:sha(fs.readFileSync(path.join(output,'compilation-graph.json'))),
    compilationErrors:graph.errors?.length??0,compilationWarnings:graph.warnings?.length??0,
    artifacts:files(output),
    scope:'Actual isolated production compiler and complete emitted graph. No browser, service admission, traffic or release readiness claim.'};
  if (!stats.hasErrors()) proof.compiledProfile = require('./lib/verify-extension-local-profile.cjs')({extension:output,profileFile});
  if(release&&!stats.hasErrors()){
    proof.reviewedRelease={...release,inputsUnchanged:sha(fs.readFileSync(release.registryFile))===release.registrySha256&&sha(fs.readFileSync(release.reviewFile))===release.reviewSha256,
      compiled:require('./lib/verify-extension-reviewed-deployment.cjs')({extension:output,registryFile:release.registryFile,profileProof:proof.compiledProfile})};
  }
  proof.passed = !stats.hasErrors() && proof.sourceUnchanged && proof.currentDevelopmentDistUnchanged && proof.profileUnchanged && proof.launcherUnchanged && proof.compiledProfile?.passed===true;
  if(release)proof.passed=proof.passed&&proof.reviewedRelease?.inputsUnchanged===true&&proof.reviewedRelease?.compiled?.passed===true;
  fs.writeFileSync(evidence,JSON.stringify(proof,null,2)+'\n',{flag:'wx',mode:0o600});
  console.log(JSON.stringify({passed:proof.passed,errors:proof.compilationErrors,warnings:proof.compilationWarnings,output,source:sourceBefore}));
  if (!proof.passed) process.exitCode=1;
}
module.exports={files,productSource};
if(require.main===module)main().catch(error=>{console.error(JSON.stringify({passed:false,errorType:error.name,detail:String(error.message).slice(0,400),stack:String(error.stack).slice(0,2400)}));process.exitCode=1;});
