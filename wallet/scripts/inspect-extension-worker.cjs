#!/usr/bin/env node
const {chromium}=require('@playwright/test');
const fs=require('node:fs'),path=require('node:path'),os=require('node:os'),crypto=require('node:crypto');
(async()=>{
 const root=path.join(os.homedir(),'.local/state/rtd-wallet-migration/dev-20261003-01/dapp-execution-browser-01/chromium-profile');
 const context=await chromium.launchPersistentContext(root,{executablePath:path.join(os.homedir(),'Library/Caches/ms-playwright/chromium-1243/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing'),headless:true,args:[`--disable-extensions-except=${path.resolve('dist')}`,`--load-extension=${path.resolve('dist')}`]});
 try{
  const worker=context.serviceWorkers()[0]||await context.waitForEvent('serviceworker',{timeout:15000});
  const {inspect,ensure}=require('./lib/current-extension-worker.cjs');
  const evidence=process.argv.includes('--reload') ? (await ensure(context,worker)).evidence : await inspect(context,worker);
  console.log(JSON.stringify({...evidence,scope:'executed worker source via CDP; optional extension reload preserves storage, no unlock or transaction'},null,2));
 }finally{await context.close();}
})().catch(error=>{console.error(JSON.stringify({error:error.message}));process.exitCode=1;});
