#!/usr/bin/env node
// Copyright (c) LinkU Labs, Inc.
// SPDX-License-Identifier: Apache-2.0
// Recover this retained original digest only. No approval, key import, signing or execution.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),os=require('node:os');
const {chromium}=require('@playwright/test');
const {Ed25519Keypair}=require('rtd-typescript/keypairs/ed25519');
const helper=require('./lib/test-dapp-post-dispatch.cjs');
const [event,output]=process.argv.slice(2);let context,stage='admission',dispatches=0,simulations=0,lookups=0;
(async()=>{
 assert(['lock','network','account','cancel'].includes(event));assert(output&&!fs.existsSync(output));
 assert.equal(path.dirname(path.resolve(output)),path.resolve('migrationToGRpcOrGraphQLDoc/workLog'));
 const root=helper.directory(event),attempt=JSON.parse(fs.readFileSync(path.join(root,'attempt.json'),'utf8'));
 assert.equal(fs.existsSync(path.join(root,'confirmed.json')),false,'Existing confirmed record uses the read-only previous-attempt audit');
 require('./lib/verify-extension-local-profile.cjs')({extension:path.resolve('dist'),profileFile:path.join(os.homedir(),'.local/state/rtd-wallet-migration/dev-20261003-01/wallet-profile-20261004-03/profile.json')});
 context=await chromium.launchPersistentContext(path.join(root,'chromium-profile'),{
  executablePath:path.join(os.homedir(),'Library/Caches/ms-playwright/chromium-1243/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing'),headless:true,
  args:[`--disable-extensions-except=${path.resolve('dist')}`,`--load-extension=${path.resolve('dist')}`,...helper.certificateArgs()],
 });
 context.on('request',r=>{if(/\/ExecuteTransaction(?:$|\?)/.test(r.url()))dispatches++;if(/\/SimulateTransaction(?:$|\?)/.test(r.url()))simulations++;if(/\/GetTransaction(?:$|\?)/.test(r.url()))lookups++;});
 const worker=context.serviceWorkers()[0]||await context.waitForEvent('serviceworker');
 const current=await require('./lib/current-extension-worker.cjs').ensure(context,worker);
 await current.worker.evaluate(()=>{
  const original=globalThis.fetch;
  globalThis.fetch=async(input,init)=>{
   const url=input instanceof Request?input.url:String(input);
   if(/\/(ExecuteTransaction|SimulateTransaction)(?:$|\?)/.test(url))throw new Error('Original digest recovery forbids simulation and execution');
   return original(input,init);
  };
 });
 const page=await context.newPage();await page.goto(new URL('ui.html',current.worker.url()).href);
 const command=(method,args)=>page.evaluate(({method,args})=>new Promise((resolve,reject)=>{
  const port=chrome.runtime.connect({name:'rtd_ui<->background'}),id=crypto.randomUUID();
  const timer=setTimeout(()=>{port.disconnect();reject(new Error('Read-only recovery command timed out'));},30000);
  port.onMessage.addListener(m=>{if(m.id!==id)return;clearTimeout(timer);port.disconnect();resolve(m.payload);});
  port.postMessage({id,payload:method==='@setNetwork'?{type:'set-network',network:args}:{type:'method-payload',method,args}});
 }),{method,args});
 stage='locked-account';const accounts=(await command('getStoredEntities',{type:'accounts'})).args.entities;
 const account=accounts.find(a=>a.id===attempt.accountId);
 console.error(JSON.stringify({recoveryAccountState:{found:!!account,accounts:accounts.length,isLocked:account?.isLocked,selected:account?.selected}}));assert(account);
 const initiallyLocked=account.isLocked===true;
 if(!initiallyLocked)assert.equal((await command('lockAccountSourceOrAccount',{id:attempt.accountId})).type,'done');
 // Restore only the authorized profile/selection, without unlocking or sending a transaction.
 assert.equal((await command('@setNetwork',{env:'local',customRpcUrl:null})).type,'done');
 if(!account.selected)assert.equal((await command('switchAccount',{accountID:attempt.accountId})).type,'done');
 stage='recover-original-digest';
 const recovered=await helper.verifyLocked({root,page,command,key:Ed25519Keypair.fromSecretKey(new Uint8Array(32).fill(7)),accountId:attempt.accountId});
 assert.equal(dispatches,0);assert.equal(simulations,0);
 const result={passed:true,event,recoveryOnly:true,initiallyLocked,explicitlyLockedBeforeRecovery:!initiallyLocked,recoveredWhileLocked:true,originalDigest:attempt.digest,recovered,workerProvenance:current.evidence,dispatches,simulations,browserLookups:lookups,nativeOriginalDigestLookups:1,nativeIdentityReads:1,scope:'Only the previously submitted original digest was recovered. This does not change the failed initial lifecycle report to a pass.'};
 helper.record(root,'restart-verified.json',{passed:true,digest:attempt.digest,recoveryOnly:true,dispatchRequests:dispatches,simulationRequests:simulations});
 fs.writeFileSync(output,JSON.stringify(result,null,2)+'\n',{flag:'wx',mode:0o600});console.log(JSON.stringify({passed:true,recoveryOnly:true,event,dispatches,simulations,lookups,digest:attempt.digest}));
})().catch(error=>{console.error(JSON.stringify({passed:false,event,stage,errorType:error.name,dispatches,simulations,lookups}));process.exitCode=1;}).finally(async()=>{if(context)await context.close();});
