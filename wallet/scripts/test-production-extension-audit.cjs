// Copyright (c) LinkU Labs, Inc.
// SPDX-License-Identifier: Apache-2.0
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');const os=require('node:os');const path=require('node:path');
const {inspectModule,flattenModules,methodsFromDoc}=require('./audit-production-extension.cjs');
const {files}=require('./build-reviewed-production-extension.cjs');
const {execFileSync}=require('node:child_process');
const {methods}=methodsFromDoc();
test('39 documented methods and upstream aliases are rejected, including renamed chunk sources',()=>{
  for(const method of methods)assert.throws(()=>inspectModule('webpack:///new-chunk.ts',`fetch(url,{body:JSON.stringify({method:${JSON.stringify(method)}})})`,methods));
});
test('old transport, old Kit and shipped fixture dependencies are rejected',()=>{
  for(const name of ['/jsonRpc/client.ts','/@mysten/dapp-kit/dist/index.js','/rtd-dapp-kit/index.ts','/fixtures/a.ts','/tests/live.ts'])assert.throws(()=>inspectModule(name,'export {};',methods));
});
test('legacy calls and aliased imports cannot hide behind a modern module name',()=>{
  for(const code of ['new RtdClient({})','client.executeTransactionBlock({})','import { RtdClient as Modern } from "rtd-typescript/jsonRpc"','import { use } from "rtd-dapp-kit"'])assert.throws(()=>inspectModule('modern.ts',code,methods));
});
test('jsonrpc envelope exception only permits exact network-free validator source',()=>{
  assert.throws(()=>inspectModule('application.ts','const x={jsonrpc:"2.0"};',methods));
  assert.deepEqual(inspectModule('/@metamask/utils/dist/json.cjs','const x={jsonrpc:"2.0"};',methods),{validator:true});
  assert.throws(()=>inspectModule('/@metamask/utils/dist/json.cjs','const x={jsonrpc:"2.0"}; fetch(url);',methods));
});
test('concatenated/nested graph dependencies remain visible',()=>{
  assert.deepEqual(flattenModules([{name:'outer',modules:[{name:'inner',children:[{name:'deep'}]}]}]).map(row=>row.name),['outer','inner','deep']);
  assert.throws(()=>flattenModules([{name:'orphan modules',filteredChildren:99}]));
});
test('production original TypeScript generics are parsed as TS, not JSX',()=>{
  assert.deepEqual(inspectModule('module.ts','export function read<T>(value:T):T{return value}',methods),{validator:false});
  assert.deepEqual(inspectModule('component.tsx','export const c=<div/>;',methods),{validator:false});
});
test('artifact inventory detects added chunks, changed outputs and symlinks',()=>{
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),'rtd-release-audit-'));
  try{fs.writeFileSync(path.join(dir,'a.js'),'one');const old=files(dir);
    fs.writeFileSync(path.join(dir,'a.js'),'two');assert.notDeepEqual(files(dir),old);
    fs.writeFileSync(path.join(dir,'late.js'),'three');assert.equal(Object.keys(files(dir)).length,2);
    fs.symlinkSync(path.join(dir,'a.js'),path.join(dir,'alias.js'));assert.throws(()=>files(dir));
  }finally{fs.rmSync(dir,{recursive:true});}
});
test('release registry AST audit survives the actual ES5 ts-node hook and rejects missing UI/background literals',()=>{
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),'rtd-release-registry-audit-'));
  try{
    const registry=JSON.stringify({schemaVersion:1,entries:[]});
    fs.writeFileSync(path.join(dir,'registry.json'),registry);
    fs.writeFileSync(path.join(dir,'ui.js'),'const bootstrap=true;');
    fs.writeFileSync(path.join(dir,'async.js'),'const release='+JSON.stringify(registry)+';');
    fs.writeFileSync(path.join(dir,'background.js'),'const release='+JSON.stringify(registry)+';');
    const verify=require('./lib/verify-extension-reviewed-deployment.cjs');
    const args={extension:dir,registryFile:path.join(dir,'registry.json'),profileProof:{uiBundles:['ui.js','async.js','async.js']}};
    assert(verify(args).passed);
    const code=`require('ts-node/register');const verify=require('./scripts/lib/verify-extension-reviewed-deployment.cjs');const args=JSON.parse(process.argv[1]);if(!verify(args).passed)process.exit(1);`;
    execFileSync(process.execPath,['-e',code,JSON.stringify(args)],{cwd:path.resolve(__dirname,'..'),env:{...process.env,TS_NODE_PROJECT:'./configs/ts/tsconfig.webpack.json'},stdio:'pipe',timeout:60000});
    fs.writeFileSync(path.join(dir,'background.js'),'const bootstrap=true;');assert.throws(()=>verify(args));
    fs.writeFileSync(path.join(dir,'background.js'),'const release='+JSON.stringify(registry)+';');
    fs.writeFileSync(path.join(dir,'async.js'),'const bootstrap=true;');assert.throws(()=>verify(args));
  }finally{fs.rmSync(dir,{recursive:true});}
});
