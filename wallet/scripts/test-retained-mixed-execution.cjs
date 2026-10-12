#!/usr/bin/env node
// Read-only recovery of the single mixed-funding wallet attempt; never unlocks or approves.
const {chromium}=require('@playwright/test');
const fs=require('node:fs'),path=require('node:path'),os=require('node:os'),crypto=require('node:crypto');
const {execFileSync}=require('node:child_process');const assert=require('node:assert/strict');
const helper=require('./lib/test-mixed-native-execution.cjs');
let context,page,stage='admission',dispatches=0,simulations=0;
(async()=>{
 const attempt=JSON.parse(fs.readFileSync(path.join(helper.root,'attempt.json'),'utf8'));
 const cert=path.join(path.dirname(helper.root),'publication-foundation/native-query-ingress/server/tls.crt');
 const pub=execFileSync('openssl',['x509','-in',cert,'-pubkey','-noout']);const pin=crypto.createHash('sha256').update(execFileSync('openssl',['pkey','-pubin','-outform','DER'],{input:pub})).digest('base64');
 stage='launch';context=await chromium.launchPersistentContext(path.join(helper.root,'chromium-profile'),{executablePath:path.join(os.homedir(),'Library/Caches/ms-playwright/chromium-1243/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing'),headless:true,viewport:{width:800,height:600},args:[`--disable-extensions-except=${path.resolve('dist')}`,`--load-extension=${path.resolve('dist')}`,`--ignore-certificate-errors-spki-list=${pin}`]});
 context.on('request',r=>{if(/\/ExecuteTransaction(?:$|\?)/.test(r.url()))dispatches++;if(/\/SimulateTransaction(?:$|\?)/.test(r.url()))simulations++;});
 const worker=context.serviceWorkers()[0]||await context.waitForEvent('serviceworker');stage='verify worker';const loaded=await require('./lib/current-extension-worker.cjs').ensure(context,worker);
 page=await context.newPage();await page.goto(`chrome-extension://${new URL(loaded.worker.url()).host}/ui.html`);
 const command=(method,args)=>page.evaluate(({method,args})=>new Promise((resolve,reject)=>{const port=chrome.runtime.connect({name:'rtd_ui<->background'}),id=crypto.randomUUID();const timeout=setTimeout(()=>{port.disconnect();reject(new Error('command timeout'));},30000);port.onMessage.addListener(m=>{if(m.id!==id)return;clearTimeout(timeout);port.disconnect();resolve(m.payload);});port.postMessage({id,payload:{type:'method-payload',method,args}});}),{method,args});
 stage='locked original digest recovery';const evidence=await helper.verify({page,command,accountId:attempt.accountId});
 assert.equal(dispatches,0);assert.equal(simulations,0);
 console.log(JSON.stringify({...evidence,recoveryOnly:true,dispatches,simulations,provenance:loaded.evidence},(_,v)=>typeof v==='bigint'?v.toString():v,2));
})().catch(e=>{console.error(JSON.stringify({passed:false,stage,errorType:e.name,message:String(e.message).slice(0,500),dispatches,simulations}));process.exitCode=1;}).finally(async()=>{if(context)await context.close();});
