// A real unapproved Coin request, extension restart, browser cold start and normal close.
process.env.PW_EXPERIMENTAL_SERVICE_WORKER_NETWORK_EVENTS='1';
const fs=require('node:fs'),path=require('node:path'),os=require('node:os'),crypto=require('node:crypto');
const assert=require('node:assert/strict'),http=require('node:http');
const {chromium,expect}=require('@playwright/test'),{bcs}=require('rtd-typescript/bcs');
const {Transaction}=require('rtd-typescript/transactions'),{RtdGrpcClient,GrpcTypes}=require('rtd-typescript/grpc');
const {Ed25519Keypair}=require('rtd-typescript/keypairs/ed25519');
const {read,sha,record,owner,sponsor,h0}=require('./test-C129-fresh-sponsored-withdraw-ui-v2.cjs');
const {snapshot,cipher}=require('./test-C130-current-non-nft-pending-creator-v3.cjs');
const lineage=require('./lib/C131-product-source-lineage.cjs'),ownership=require('./lib/C132-current-core-gateway-ownership-v3.cjs');
const wallet=path.resolve(__dirname,'..'),logs=path.join(wallet,'migrationToGRpcOrGraphQLDoc/workLog');
const rt=path.join(os.homedir(),'.local/state/rtd-wallet-migration/dev-20261006-03');
const fixture=path.join(rt,'current-C131-orphan-request-20261009-01'),profile=path.join(fixture,'profile');
const command=(page,method,args)=>page.evaluate(({method,args})=>new Promise((resolve,reject)=>{
  const port=chrome.runtime.connect({name:'rtd_ui<->background'}),id=crypto.randomUUID();
  const timer=setTimeout(()=>{port.disconnect();reject(Error('UI control timeout'))},20000);
  port.onMessage.addListener(m=>{if(m?.kind==='rtd-ui-source-challenge'){port.postMessage({kind:'rtd-ui-source-confirm',nonce:m.nonce});return;}if(m.id===id){clearTimeout(timer);port.disconnect();resolve(m.payload);}});
  port.postMessage({id,payload:method==='@setNetwork'?{type:'set-network',network:args}:{type:'method-payload',method,args}});
}),{method,args});
async function main(){
  const [readinessFile,out]=process.argv.slice(2);assert(out&&!fs.existsSync(out));
  const op=path.join(rt,'publication-foundation/C132-orphan-cold-close-20261009-01');assert(!fs.existsSync(op));
  const originFile=path.join(logs,'20261009-C131-fresh-profile-origin-01.json'),origin=read(originFile);
  const q=read(lineage.qualificationFile),source=lineage.validate(q.originalSource,q.buildFile),build=read(q.buildFile);
  const demoFile=path.join(logs,'20261009-C131-real-standard-demo-build-01.json'),demo=read(demoFile);
  assert(origin.passed&&demo.passed&&demo.sourceMapAllDiskSourcesEqual);assert.deepEqual(origin.source,source);assert.deepEqual(demo.source,source);
  assert.equal(origin.profile,profile);assert.equal(origin.origin,'chrome-extension://gfjgbndhkmndbgclghagipneaiajhnnm');
  const ready=()=>{const p=read(readinessFile);assert(p.passed&&p.infrastructureReadyForProductionProbe&&p.h0===h0);
    assert.equal(Object.keys(p.coverageGates).length,7);assert(Object.values(p.coverageGates).every(v=>v===true));
    const age=Date.now()-Date.parse(p.observedAt);assert(age>=0&&age<300000);
    for(const[f,h]of Object.entries(p.inputsSha256))assert.equal(sha(path.isAbsolute(f)?f:path.resolve(wallet,'../..',f)),h);return p;};
  ready();const authority=ownership.capture();assert.equal(authority.origin,origin.origin);
  for(const[f,h]of Object.entries(demo.artifacts))assert.equal(sha(path.join(demo.directory,f)),h);
  const keyFile=path.join(rt,'config/rtd.keystore'),key=read(keyFile).map(e=>Ed25519Keypair.fromSecretKey(Buffer.from(e,'base64').subarray(1))).find(k=>k.toRtdAddress()===owner);assert(key);
  const password=crypto.randomBytes(32).toString('base64url');assert(!fs.existsSync(path.join(fixture,'recovery-private.json')));
  fs.mkdirSync(op,{mode:0o700});record(path.join(fixture,'recovery-private.json'),{password});
  const inputs=[__filename,originFile,lineage.qualificationFile,q.buildFile,demoFile,keyFile,path.resolve(readinessFile),
    require.resolve('./lib/C132-current-core-gateway-ownership-v3.cjs'),ownership.startedFile,ownership.qualifiedFile,
    require.resolve('./test-C130-current-non-nft-pending-creator-v3.cjs')];
  const protectedPins=Object.fromEntries(inputs.map(f=>[f,sha(f)]));
  const traffic=[],frames=[],nativeFrames=[],captureErrors=[],forbidden=[],jobs=[];
  let context,page,worker,popup,server,stage='native current Coin references',privateStage=false,closing=false;
  let initialJournal,cipherBefore,input,actualRequest,workerSource,uiSource,popupSource,restartedWorkerSource;
  let finalJournal,cipherAfter,afterRequests,coldRequests,coldWorkerSource,coldUiSource,closedBody,result;
  const allowed=new Set(['http://127.0.0.1:41750','http://127.0.0.1:42011','http://127.0.0.1:42012','http://127.0.0.1:42013','http://127.0.0.1:41718']);
  const executable=path.join(os.homedir(),'Library/Caches/ms-playwright/chromium-1243/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing');
  const nativeFetch=globalThis.fetch,sdk=new RtdGrpcClient({network:'localnet',baseUrl:'http://127.0.0.1:41750',format:'binary',mvr:{url:''},fetch:async(i,init)=>{
    const u=new URL(i instanceof Request?i.url:String(i));assert.equal(u.origin,'http://127.0.0.1:41750');
    assert(['GetServiceInfo','GetObject'].includes(u.pathname.split('/').at(-1)));
    const r=await nativeFetch(i,init);nativeFrames.push({stage,url:u.href,status:r.status,headers:Object.fromEntries(r.headers),requestBase64:Buffer.from(init.body).toString('base64'),responseBase64:Buffer.from(await r.clone().arrayBuffer()).toString('base64')});return r;
  }});
  const scripts=Object.keys(build.artifacts).filter(f=>f.endsWith('.js')&&!['background.js','content-script.js','dapp-interface.js','egress-gate.js'].includes(f));
  async function launch(){
    closing=false;context=await chromium.launchPersistentContext(profile,{executablePath:executable,headless:true,viewport:{width:800,height:700},args:['--disable-extensions-except='+build.output,'--load-extension='+build.output]});
    await context.route('**/*',route=>{const r=route.request(),u=new URL(r.url());if(['http:','https:'].includes(u.protocol)){
      traffic.push({stage,url:u.href,method:r.method()});if(!allowed.has(u.origin)||/\/(ExecuteTransaction|SimulateTransaction|VerifySignature)$/.test(u.pathname)||u.pathname.includes('faucet')||String(r.postData()).includes('"jsonrpc"')){forbidden.push(u.href);return route.abort();}}
      return route.continue();});
    context.on('response',response=>{const at=stage,u=new URL(response.url());if(!['http:','https:'].includes(u.protocol))return;
      jobs.push((async()=>{const body=await response.body();frames.push({stage:at,url:u.href,status:response.status(),headers:response.headers(),requestBase64:(response.request().postDataBuffer()??Buffer.alloc(0)).toString('base64'),responseBase64:body.toString('base64')});})().catch(e=>captureErrors.push({stage:at,url:u.href,errorType:e.name,duringClosing:closing})));});
    worker=context.serviceWorkers()[0]??await context.waitForEvent('serviceworker',{timeout:30000});
    const loaded=await require('./lib/current-extension-worker.cjs').ensure(context,worker,build.output);worker=loaded.worker;
    assert((loaded.evidence.after??loaded.evidence.before).matchesDisk);assert.equal('chrome-extension://'+new URL(worker.url()).host,origin.origin);
    page=context.pages().find(p=>p.url().startsWith(origin.origin+'/'))??context.pages()[0]??await context.newPage();page.setDefaultTimeout(60000);
    return loaded.evidence;
  }
  const transactions=()=>page.evaluate(async()=>(await chrome.storage.local.get({transactions:{}})).transactions);
  try{
    const info=(await sdk.ledgerService.getServiceInfo({})).response;assert.equal(info.chainId,h0);
    const old=read(path.join(rt,'current-C129-single-sign-coin-20261009-03/negative-input.json'));
    const original=bcs.TransactionData.parse(Buffer.from(old.bytesBase64,'base64')),data=structuredClone(original);
    assert.equal(data.V1.sender,owner);assert.equal(data.V1.gasData.owner,sponsor);assert.notEqual(owner,sponsor);
    assert.deepEqual(data.V1.kind.ProgrammableTransaction.commands.map(c=>c.$kind),['SplitCoins','TransferObjects']);
    const coinRef=data.V1.kind.ProgrammableTransaction.inputs[2].Object.ImmOrOwnedObject,gasRef=data.V1.gasData.payment[0];
    for(const [id,expectedOwner,ref]of[[coinRef.objectId,owner,coinRef],[gasRef.objectId,sponsor,gasRef]]){
      const o=(await sdk.ledgerService.getObject({objectId:id,readMask:{paths:['object_id','version','digest','owner','object_type','bcs','contents','previous_transaction','storage_rebate']}})).response.object;
      assert(o&&o.owner.address===expectedOwner&&o.owner.kind===GrpcTypes.Owner_OwnerKind.ADDRESS);
      ref.version=String(o.version);ref.digest=o.digest;
    }
    const inverse=structuredClone(data);inverse.V1.kind.ProgrammableTransaction.inputs[2]=original.V1.kind.ProgrammableTransaction.inputs[2];inverse.V1.gasData.payment=original.V1.gasData.payment;assert.deepEqual(inverse,original);
    const bytes=bcs.TransactionData.serialize(data).toBytes(),tx=Transaction.from(bytes),json=await tx.toJSON();input={bytesBase64:Buffer.from(bytes).toString('base64'),json,digest:await tx.getDigest(),sender:owner,sponsor,onlyTwoReferencesChanged:true,previousSignaturesUsed:false};record(path.join(op,'input.json'),input);
    stage='fresh current production launch';workerSource=await launch();const base=new URL('ui.html',worker.url()).href;
    uiSource=await require('./lib/current-extension-ui-source.cjs').inspect(context,page,build.output,scripts,{url:base,navigate:async()=>{await page.goto(base);await page.locator('button,a,input').first().waitFor();}});assert(uiSource.matchesDisk);
    stage='normal dev account import';privateStage=true;await page.goto(base+'#/accounts/import-private-key');await page.locator('[name="privateKey"]').fill(key.getSecretKey());await page.locator('[name="privateKey"]').blur();await expect(page.locator('button[type="submit"]')).toBeEnabled();await page.locator('button[type="submit"]').click();await page.waitForURL(/protect-account/);await page.locator('[name="password.input"]').fill(password);await page.locator('[name="password.confirmation"]').fill(password);await page.locator('#acceptedTos').click();await page.locator('button[type="submit"]').click();await page.waitForURL(/#\/tokens/);privateStage=false;
    const accounts=(await command(page,'getStoredEntities',{type:'accounts'})).args.entities;assert.equal(accounts.length,1);assert.equal(accounts[0].address,owner);assert.equal((await command(page,'@setNetwork',{env:'local',customRpcUrl:null})).type,'done');
    initialJournal=await snapshot(page);cipherBefore=await cipher(page);assert(Object.values(initialJournal).every(v=>v.length===0));assert.equal(cipherBefore.owner,owner);assert.deepEqual(await transactions(),{});
    server=http.createServer((r,s)=>{const u=new URL(r.url,'http://127.0.0.1'),name=u.pathname==='/'?'index.html':u.pathname.slice(1);if(r.method!=='GET'||!Object.hasOwn(demo.artifacts,name)){s.writeHead(404).end();return;}s.setHeader('Content-Type',name.endsWith('.js')?'text/javascript':name.endsWith('.map')?'application/json':'text/html');s.setHeader('Cache-Control','no-store');s.end(fs.readFileSync(path.join(demo.directory,name)));});await new Promise((resolve,reject)=>{server.once('error',reject);server.listen(0,'127.0.0.1',resolve);});
    const demoOrigin='http://127.0.0.1:'+server.address().port;allowed.add(demoOrigin);const dapp=await context.newPage();dapp.setDefaultTimeout(60000);const url=new URL(demoOrigin);url.searchParams.set('authorization',Buffer.from(json).toString('base64'));await dapp.goto(url.href);
    stage='normal Wallet Standard Connect';await expect(dapp.getByRole('button',{name:'Connect',exact:true})).toBeEnabled();let opened=context.waitForEvent('page');opened.catch(()=>{});await dapp.getByRole('button',{name:'Connect',exact:true}).click();const connect=await opened;await connect.getByRole('button',{name:/^(Continue|\u7ee7\u7eed)$/}).click();await connect.getByRole('button',{name:/^(Connect|\u8fde\u63a5)$/}).click();await expect.poll(()=>dapp.locator('#accounts').innerText()).toBe(JSON.stringify([owner]));
    stage='ordinary sponsored Execute request remains unapproved';opened=context.waitForEvent('page');opened.catch(()=>{});await dapp.getByRole('button',{name:'Execute sponsored transaction',exact:true}).click();popup=await opened;popup.setDefaultTimeout(60000);await popup.getByText(/Sponsored execution requires both sender and sponsor signatures|\u8d5e\u52a9\u4ea4\u6613\u9700\u8981\u53d1\u9001\u65b9\u548c\u8d5e\u52a9\u65b9\u5171\u540c\u7b7e\u540d/).waitFor();
    const approve=popup.locator('button').filter({has:popup.locator('.nova-button__label').filter({hasText:/^(Approve|\u6279\u51c6)$/})});await expect(approve).toHaveCount(1);await expect(approve).toBeDisabled();
    const requests=await transactions();assert.equal(Object.keys(requests).length,1);actualRequest=Object.values(requests)[0];assert.equal(actualRequest.origin,demoOrigin);assert.equal(actualRequest.approved,null);assert.equal(actualRequest.binding.mode,'execute');assert.equal(actualRequest.binding.account,owner);assert.equal(actualRequest.tx.data,json);
    popupSource=await require('./lib/current-extension-ui-source.cjs').inspect(context,popup,build.output,scripts);assert(popupSource.matchesDisk);
    record(path.join(op,'unapproved.json'),{actualRequest,initialJournal,cipherBefore,workerSource,uiSource,popupSource,approvalDisabled:true,approvedClicked:false});
    stage='actual extension restart without approval';const restarted=context.waitForEvent('serviceworker',{predicate:w=>w!==worker,timeout:30000});restarted.catch(()=>{});await worker.evaluate(()=>{setTimeout(()=>chrome.runtime.reload(),0);});worker=await restarted;
    const reloaded=await require('./lib/current-extension-worker.cjs').ensure(context,worker,build.output);worker=reloaded.worker;restartedWorkerSource=reloaded.evidence;assert((reloaded.evidence.after??reloaded.evidence.before).matchesDisk);
    assert.deepEqual(await worker.evaluate(async()=>(await chrome.storage.local.get({transactions:{}})).transactions),requests);
    closing=true;await context.close();context=undefined;await Promise.all(jobs);
    stage='same profile cold browser lock gate';coldWorkerSource=await launch();const coldBase=new URL('ui.html',worker.url()).href;await page.goto(coldBase+'#/tokens');await expect(page.getByTestId('unlock-account-button')).toBeVisible();
    assert.deepEqual(await snapshot(page),initialJournal);assert.deepEqual(await cipher(page),cipherBefore);coldRequests=await transactions();assert.deepEqual(coldRequests,requests);
    popup=await context.newPage();await popup.goto(coldBase+'#/dapp/approve/'+actualRequest.id);const close=popup.getByRole('button',{name:'\u5173\u95ed\u8bf7\u6c42',exact:true});await expect(close).toBeEnabled();closedBody=await popup.locator('body').innerText();coldUiSource=await require('./lib/current-extension-ui-source.cjs').inspect(context,popup,build.output,scripts);assert(coldUiSource.matchesDisk);
    stage='normal locked UI close';const stopped=popup.waitForEvent('close');stopped.catch(()=>{});await close.click();await stopped;await expect.poll(transactions).toEqual({});afterRequests=await transactions();finalJournal=await snapshot(page);cipherAfter=await cipher(page);assert.deepEqual(finalJournal,initialJournal);assert.deepEqual(cipherAfter,cipherBefore);await expect(page.getByTestId('unlock-account-button')).toBeVisible();assert.deepEqual(forbidden,[]);
    await Promise.all(jobs);assert.deepEqual(ownership.capture(),authority);assert.deepEqual(lineage.validate(q.originalSource,q.buildFile),source);for(const[f,h]of Object.entries(protectedPins))assert.equal(sha(f),h);
    result={passed:true,observedAt:new Date().toISOString(),source,profile,h0,owner,sponsor,input,actualRequest,coldRequests,afterRequests,initialJournal,finalJournal,cipherBefore,cipherAfter,workerSource,uiSource,popupSource,restartedWorkerSource,coldWorkerSource,coldUiSource,closedBody,authority,traffic,frames,nativeFrames,captureErrors,forbidden,
      approvedClicked:false,approvalDisabled:true,actualExtensionRestart:true,sameProfileColdBrowser:true,normalLockedClose:true,metadataRemovedByProduct:true,storageWritesByTool:0,cipherHeld:true,durableJournalHeld:true,normalUnlocksAfterCold:0,simulations:0,nativeVerifications:0,signatures:0,executeRequests:0,originalProfilesOpened:0,nftBusinessRequests:0,fullUiCapture:captureErrors.length===0,fullNonNftM5Accepted:false,parentAcceptance:false,inputsSha256:protectedPins};
  }catch(e){result={passed:false,observedAt:new Date().toISOString(),stage,errorType:e.name,message:privateStage?'Private diagnostic withheld':String(e.message).replaceAll(password,'[redacted]').replaceAll(key.getSecretKey(),'[redacted]').slice(0,1400),input,actualRequest,traffic,frames,nativeFrames,captureErrors,forbidden,approvedClicked:false,signatures:0,executeRequests:0,parentAcceptance:false};process.exitCode=1;}
  finally{closing=true;await context?.close();if(server){server.closeAllConnections();await new Promise(r=>server.close(r));}await Promise.all(jobs);record(path.resolve(out),result);console.log(JSON.stringify({passed:result.passed,stage:result.stage,frames:frames.length,forbidden:forbidden.length}));}
}
if(require.main===module)main().catch(e=>{console.error(JSON.stringify({passed:false,preflight:true,errorType:e.name,message:String(e.message).slice(0,700)}));process.exitCode=1;});
