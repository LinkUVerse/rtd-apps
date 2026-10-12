#!/usr/bin/env node
// Copyright (c) LinkU Labs, Inc.
// SPDX-License-Identifier: Apache-2.0
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const { files, productSource } = require('./build-reviewed-name-production-extension.cjs');
const ts = require('typescript');
const wallet = path.resolve(__dirname,'..');
const legacyModule = /\/(?:jsonRpc|json-rpc-client|rtd-dapp-kit|@mysten\/dapp-kit)(?:\/|@)|\/(?:tests?|__tests__|fixtures?)\//;
const legacyCall = /\b(?:new\s+(?:RtdClient|SuiClient)\s*\(|useRtdClient(?:Query|Mutation)?\s*\(|(?:executeTransactionBlock|dryRunTransactionBlock|devInspectTransactionBlock|queryTransactionBlocks)\s*\()/;
const legacyImport = /^(?:rtd-dapp-kit|@mysten\/dapp-kit)(?:\/|$)|^(?:rtd-typescript|@mysten\/sui)\/jsonRpc(?:\/|$)/;
function inspectSource(name,content,methods) {
  const kind=/\.[jt]sx$/.test(name)?ts.ScriptKind.TSX:/\.tsx?$/.test(name)?ts.ScriptKind.TS:ts.ScriptKind.JS;
  const tree=ts.createSourceFile(name,content,ts.ScriptTarget.Latest,true,kind);
  assert.equal(tree.parseDiagnostics.length,0,`Cannot inspect ${name}`);
  const literals=[],envelopes=[],imports=[];
  function visit(node) {
    if(ts.isStringLiteralLike(node) && methods.has(node.text))literals.push(node.text);
    if(ts.isPropertyAssignment(node) && (ts.isIdentifier(node.name)||ts.isStringLiteralLike(node.name)) && node.name.text==='jsonrpc')envelopes.push(node.getStart(tree));
    if(ts.isImportDeclaration(node)&&ts.isStringLiteralLike(node.moduleSpecifier))imports.push(node.moduleSpecifier.text);
    ts.forEachChild(node,visit);
  }
  visit(tree);return {literals,envelopes,imports};
}
function inspectModule(name,content,methods) {
  assert(!legacyModule.test(name.replaceAll('\\','/')),`Forbidden emitted module: ${name}`);
  const result = inspectSource(name,content,methods);
  assert.equal(result.literals.length,0,`Old wire method: ${name}`);
  assert(!legacyCall.test(content),`Legacy requester call: ${name}`);
  assert(!result.imports.some(value=>legacyImport.test(value)),`Legacy transport/Kit import: ${name}`);
  if(result.envelopes.length) {
    assert(name.endsWith('/@metamask/utils/dist/json.cjs'),`JSON-RPC envelope: ${name}`);
    assert(!/\b(?:fetch|XMLHttpRequest|WebSocket)\s*\(/.test(content),`Validator network sender: ${name}`);
  }
  return {validator:result.envelopes.length>0};
}
function flattenModules(rows) {
  const result=[];
  for(const row of rows??[]) {
    assert(!row.filteredChildren && !row.filteredModules, 'Module graph was truncated or grouped');
    if(row.name)result.push(row);
    result.push(...flattenModules(row.modules),...flattenModules(row.children));
  }
  return result;
}
function methodsFromDoc() {
  const doc=fs.readFileSync(path.join(wallet,'migrationToGRpcOrGraphQLDoc/08-JSON-RPC全量迁移对照表.md'),'utf8');
  const section=n=>doc.split(`## ${n}.`)[1].split(`## ${n+1}.`)[0];
  const names=text=>[...text.matchAll(/`((?:rtdx?_[a-zA-Z]+|rpc\.discover))`/g)].map(match=>match[1]);
  const used=names(section(2)),unused=names(section(5));
  assert.equal(used.length,21);assert.equal(unused.length,18);
  assert.equal(new Set([...used,...unused]).size,39);
  const methods=new Set([...used,...unused]);
  for(const name of [...methods])methods.add(name.replace(/^rtd/,'sui').replace('Rtd','Sui'));
  return {used,unused,methods};
}
function audit(output,buildFile) {
  const sha=file=>crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
  const inputFiles=[__filename,path.join(__dirname,'build-reviewed-name-production-extension.cjs'),path.join(__dirname,'build-reviewed-local-extension.py'),
    path.join(__dirname,'test-production-extension-audit.cjs'),path.join(__dirname,'lib/verify-extension-local-profile.cjs'),
    path.join(wallet,'migrationToGRpcOrGraphQLDoc/08-JSON-RPC全量迁移对照表.md'),buildFile];
  const inputsSha256=Object.fromEntries(inputFiles.map(file=>[file,sha(file)]));
  const proof=JSON.parse(fs.readFileSync(buildFile));
  assert(proof.passed && proof.mode==='production');assert.equal(proof.output,output);
  assert.equal(proof.launcherSha256,inputsSha256[path.join(__dirname,'build-reviewed-name-production-extension.cjs')],'Build launcher changed');
  assert.deepEqual(files(output),proof.artifacts,'Production output changed after build');
  assert.deepEqual(files(path.join(wallet,'dist')),proof.developmentDist,'Loaded C16 changed');
  assert.deepEqual(productSource(),proof.sourceAfter,'Product source changed after build');
  const graph=JSON.parse(fs.readFileSync(path.join(output,'compilation-graph.json')));
  assert.equal(graph.errors.length,0);
  assert(!graph.filteredModules && !graph.filteredAssets,'Compilation graph is incomplete');
  const js=Object.keys(proof.artifacts).filter(name=>name.endsWith('.js')).sort();
  assert(js.length>=4);
  const assets=graph.assets.map(row=>row.name);
  for(const file of js)assert(assets.includes(file),`Output JS absent from compilation: ${file}`);
  const {used,unused,methods}=methodsFromDoc();
  const entries=Object.keys(graph.entrypoints).sort();
  assert.deepEqual(entries,['background','content-script','dapp-interface','egress-gate','ui']);
  const moduleRows=flattenModules(graph.modules);
  assert(moduleRows.length>0,'Compilation module graph absent');
  for(const row of moduleRows) {
    const name=row.name.replaceAll('\\','/');
    assert(!legacyModule.test(name),`Forbidden compiled dependency: ${name}`);
    if(row.identifier)assert(!legacyModule.test(row.identifier.replaceAll('\\','/')),`Forbidden compiled identifier: ${name}`);
  }
  const sources=new Map(),chunks=[];
  for(const file of js) {
    const mapFile=file+'.map';assert(proof.artifacts[mapFile],`Uninspected JS chunk: ${file}`);
    const map=JSON.parse(fs.readFileSync(path.join(output,mapFile)));
    assert.equal(map.file,file);assert.equal(map.sources.length,map.sourcesContent.length);
    assert(map.sources.length>0);
    let validators=0;
    for(let i=0;i<map.sources.length;i++) {
      const name=map.sources[i],content=map.sourcesContent[i];
      assert.equal(typeof content,'string',`Source content missing: ${name}`);
      const result=inspectModule(name,content,methods);if(result.validator)validators++;
      // Webpack generates entry-specific bootstrap/runtime code under the same map name.
      // Each is inspected above; only original modules must have identical content across chunks.
      const sourceKey=name.startsWith('webpack:///webpack/')?`${file}:${name}`:name;
      const previous=sources.get(sourceKey);assert(previous===undefined || previous===content,`Source differs between chunks: ${name}`);
      sources.set(sourceKey,content);
    }
    chunks.push({file,javascriptSha256:proof.artifacts[file],mapSha256:proof.artifacts[mapFile],sourceCount:map.sources.length,validatorModules:validators});
  }
  for(const entry of entries) {
    const files=graph.entrypoints[entry].assets.map(value=>value.name).filter(name=>name.endsWith('.js'));
    assert(files.length>0 && files.every(file=>js.includes(file)),`Entry JS closure incomplete: ${entry}`);
  }
  for(const file of inputFiles)assert.equal(sha(file),inputsSha256[file],'Audit input changed during execution');
  return {passed:true,observedAt:new Date().toISOString(),mode:'production',source:proof.sourceAfter,inputsSha256,inputsUnchanged:true,
    sourceUnchanged:true,currentDevelopmentDistUnchanged:true,compiledProfile:proof.compiledProfile,
    usedMethods:used,unusedMethods:unused,upstreamMethodSpellingsChecked:true,
    compilationGraphSha256:proof.compilationGraphSha256,moduleCount:moduleRows.length,
    compilationModules:moduleRows.map(row=>({name:row.name,id:row.id??null,chunks:row.chunks??[],dependencies:(row.reasons??[]).map(reason=>reason.moduleName).filter(Boolean)})),
    uniqueSourceCount:sources.size,chunks,entrypoints:graph.entrypoints,
    scope:'Complete actual production compilation graph and all emitted JS source-map closure, old wire literals/transport/requesters/Kit/fixtures rejected. Structural validator exception is source-specific and network-free. Static closure does not prove every dynamic request or any browser feature; REL-02 and full QA remain separate.'};
}
module.exports={inspectModule,flattenModules,methodsFromDoc,audit};
if(require.main===module) {
  try {
    const [output,buildFile,resultFile]=process.argv.slice(2);assert(output&&buildFile&&resultFile);
    const result=audit(path.resolve(output),path.resolve(buildFile));
    fs.writeFileSync(resultFile,JSON.stringify(result,null,2)+'\n',{flag:'wx',mode:0o600});
    console.log(JSON.stringify({passed:true,modules:result.moduleCount,sources:result.uniqueSourceCount,chunks:result.chunks.length}));
  }catch(error){console.error(JSON.stringify({passed:false,errorType:error.name,detail:String(error.message).slice(0,400)}));process.exitCode=1;}
}
