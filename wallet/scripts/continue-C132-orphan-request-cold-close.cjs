// Continue only the existing unapproved request after the recorded browser teardown.
process.env.PW_EXPERIMENTAL_SERVICE_WORKER_NETWORK_EVENTS='1';
const fs=require('node:fs'),path=require('node:path'),os=require('node:os'),cp=require('node:child_process');
const assert=require('node:assert/strict'),{chromium,expect}=require('@playwright/test');
const {read,sha,record,owner,h0}=require('./test-C129-fresh-sponsored-withdraw-ui-v2.cjs');
const {snapshot,cipher}=require('./test-C130-current-non-nft-pending-creator-v3.cjs');
const wallet=path.resolve(__dirname,'..'),logs=path.join(wallet,'migrationToGRpcOrGraphQLDoc/workLog');
const rt=path.join(os.homedir(),'.local/state/rtd-wallet-migration/dev-20261006-03');
const op=path.join(rt,'publication-foundation/C132-orphan-cold-close-20261009-01');
const profile=path.join(rt,'current-C131-orphan-request-20261009-01/profile');
const lineage=require('./lib/C131-product-source-lineage.cjs'),ownership=require('./lib/C132-current-core-gateway-ownership-v3.cjs');
const profileProcesses=()=>cp.execFileSync('ps',['-Ao','pid=,lstart=,command='],{encoding:'utf8'}).split('\n').filter(l=>l.includes('Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing')&&l.includes('--user-data-dir='+profile));
(async()=>{
  const[output]=process.argv.slice(2);assert(output&&!fs.existsSync(output));
  const failureFile=path.join(logs,'20261009-C132-orphan-request-cold-close-01.json'),failed=read(failureFile);
  const unapprovedFile=path.join(op,'unapproved.json'),saved=read(unapprovedFile),inputFile=path.join(op,'input.json');
  assert(!failed.passed&&failed.stage==='actual extension restart without approval');assert(failed.message.includes('waiting for event "serviceworker"'));
  assert(failed.approvedClicked===false&&failed.signatures===0&&failed.executeRequests===0);
  assert.deepEqual(saved.actualRequest,failed.actualRequest);assert.deepEqual(read(inputFile),failed.input);
  assert(saved.approvalDisabled&&saved.approvedClicked===false);
  const q=read(lineage.qualificationFile),source=lineage.validate(q.originalSource,q.buildFile),build=read(q.buildFile),authority=ownership.capture();
  const pins={...failed.inputsSha256,[failureFile]:sha(failureFile),[unapprovedFile]:sha(unapprovedFile),[inputFile]:sha(inputFile),[__filename]:sha(__filename)};
  for(const[f,h]of Object.entries(pins))assert.equal(sha(f),h);
  const beforeProcesses=profileProcesses();assert.deepEqual(beforeProcesses,[]);
  let context,page,worker,popup,result,stage='same existing profile cold start',closing=false;
  const traffic=[],frames=[],captureErrors=[],forbidden=[],jobs=[];
  try{
    context=await chromium.launchPersistentContext(profile,{executablePath:path.join(os.homedir(),'Library/Caches/ms-playwright/chromium-1243/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing'),headless:true,args:['--disable-extensions-except='+build.output,'--load-extension='+build.output]});
    await context.route('**/*',route=>{const r=route.request(),u=new URL(r.url());if(['http:','https:'].includes(u.protocol)){traffic.push({stage,url:u.href,method:r.method()});if(!['http://127.0.0.1:41750','http://127.0.0.1:42011','http://127.0.0.1:42012','http://127.0.0.1:42013'].includes(u.origin)||/\/(SimulateTransaction|VerifySignature|ExecuteTransaction)$/.test(u.pathname)){forbidden.push(u.href);return route.abort();}}return route.continue();});
    context.on('response',r=>{const at=stage,u=new URL(r.url());if(!['http:','https:'].includes(u.protocol))return;jobs.push((async()=>frames.push({stage:at,url:u.href,status:r.status(),headers:r.headers(),requestBase64:(r.request().postDataBuffer()??Buffer.alloc(0)).toString('base64'),responseBase64:(await r.body()).toString('base64')}))().catch(e=>captureErrors.push({stage:at,url:u.href,errorType:e.name,duringClosing:closing})));});
    const currentProcesses=profileProcesses();assert.equal(currentProcesses.length,1);
    worker=context.serviceWorkers()[0]??await context.waitForEvent('serviceworker',{timeout:30000});const loaded=await require('./lib/current-extension-worker.cjs').ensure(context,worker,build.output);worker=loaded.worker;assert((loaded.evidence.after??loaded.evidence.before).matchesDisk);
    assert.equal('chrome-extension://'+new URL(worker.url()).host,authority.origin);
    const base=new URL('ui.html',worker.url()).href;page=context.pages().find(p=>p.url().startsWith(authority.origin+'/'))??context.pages()[0]??await context.newPage();page.setDefaultTimeout(60000);await page.goto(base+'#/tokens');await expect(page.getByTestId('unlock-account-button')).toBeVisible();
    const beforeJournal=await snapshot(page),beforeCipher=await cipher(page),requests=await page.evaluate(async()=>(await chrome.storage.local.get({transactions:{}})).transactions);
    assert.deepEqual(beforeJournal,saved.initialJournal);assert.deepEqual(beforeCipher,saved.cipherBefore);
    assert.deepEqual(requests,{[saved.actualRequest.id]:saved.actualRequest});
    stage='normal locked-account recovery request close';popup=await context.newPage();await popup.goto(base+'#/dapp/approve/'+saved.actualRequest.id);const close=popup.getByRole('button',{name:'\u5173\u95ed\u8bf7\u6c42',exact:true});await expect(close).toBeEnabled();const body=await popup.locator('body').innerText();
    const scripts=Object.keys(build.artifacts).filter(f=>f.endsWith('.js')&&!['background.js','content-script.js','dapp-interface.js','egress-gate.js'].includes(f));const uiSource=await require('./lib/current-extension-ui-source.cjs').inspect(context,popup,build.output,scripts);assert(uiSource.matchesDisk);
    const stopped=popup.waitForEvent('close');stopped.catch(()=>{});await close.click();await stopped;
    await expect.poll(()=>page.evaluate(async()=>(await chrome.storage.local.get({transactions:{}})).transactions)).toEqual({});
    const afterRequests=await page.evaluate(async()=>(await chrome.storage.local.get({transactions:{}})).transactions),afterJournal=await snapshot(page),afterCipher=await cipher(page);
    assert.deepEqual(afterJournal,beforeJournal);assert.deepEqual(afterCipher,beforeCipher);await expect(page.getByTestId('unlock-account-button')).toBeVisible();assert.deepEqual(forbidden,[]);
    await Promise.all(jobs);assert.deepEqual(lineage.validate(q.originalSource,q.buildFile),source);assert.deepEqual(ownership.capture(),authority);for(const[f,h]of Object.entries(pins))assert.equal(sha(f),h);
    result={passed:true,observedAt:new Date().toISOString(),source,h0,owner,profile,actualRequest:saved.actualRequest,input:failed.input,
      previousExtensionReloadRequested:true,previousWorkerWakeObserved:false,previousFailurePreserved:true,beforeProcesses,currentProcesses,
      actualColdBrowserAndWorker:true,currentWorkerSource:loaded.evidence,currentUiSource:uiSource,requests,afterRequests,
      beforeJournal,afterJournal,beforeCipher,afterCipher,body,authority,traffic,frames,captureErrors,forbidden,
      normalLockedClose:true,metadataRemovedByProduct:true,unlocks:0,storageWritesByTool:0,
      simulations:0,nativeVerifications:0,signatures:0,executeRequests:0,nftBusinessRequests:0,fullUiCapture:captureErrors.length===0,
      fullNonNftM5Accepted:false,ordinaryChromeAccepted:false,parentAcceptance:false,inputsSha256:pins};
  }catch(e){result={passed:false,observedAt:new Date().toISOString(),stage,errorType:e.name,message:String(e.message).slice(0,1400),traffic,frames,captureErrors,forbidden,signatures:0,executeRequests:0,parentAcceptance:false};process.exitCode=1;}
  finally{closing=true;await context?.close();await Promise.all(jobs);record(path.resolve(output),result);console.log(JSON.stringify({passed:result.passed,stage:result.stage,frames:frames.length,message:result.message}));}
})().catch(e=>{console.error(JSON.stringify({passed:false,preflight:true,errorType:e.name,message:String(e.message).slice(0,700)}));process.exitCode=1;});
