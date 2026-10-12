// Two real Chrome cold starts of only the newly confirmed controlled G3 stake profile.
process.env.PW_EXPERIMENTAL_SERVICE_WORKER_NETWORK_EVENTS='1';
const fs=require('node:fs'),path=require('node:path'),os=require('node:os'),crypto=require('node:crypto'),assert=require('node:assert/strict'),cp=require('node:child_process');
const {chromium,expect}=require('@playwright/test');
(async()=>{
 const output=process.argv[2];assert(output&&!fs.existsSync(output));
 const wallet=path.resolve(__dirname,'..'),logs=path.join(wallet,'migrationToGRpcOrGraphQLDoc/workLog'),rt=path.join(os.homedir(),'.local/state/rtd-wallet-migration/dev-20261006-03');
 const read=f=>JSON.parse(fs.readFileSync(f)),sha=f=>crypto.createHash('sha256').update(fs.readFileSync(f)).digest('hex');
 const fixture=path.join(rt,'current-G3-staking-fixture-20261007-01'),profile=path.join(fixture,'profile');
 const buildFile=path.join(logs,'20261007-default-generation-positive-C41-build-01.json'),priorFile=path.join(logs,'20261007-G3-staking-fixture-retained-C41-chrome-01.json'),nativeFile=path.join(logs,'20261007-G3-staking-fixture-native-audit-02.json');
 const build=read(buildFile),prior=read(priorFile),native=read(nativeFile),confirmedFile=path.join(fixture,'confirmed.json'),confirmed=read(confirmedFile);
 const resumeFile=process.argv[3],resume=resumeFile?read(resumeFile):null;
 if(resume){assert(resume.passed===false&&resume.fixture===fixture&&resume.encryptedStates?.length===1);assert.deepEqual(resume.journals[0],confirmed.terminal);}
 assert(build.passed&&prior.passed&&native.passed&&confirmed.passed&&prior.fixture===fixture);
 assert.equal(native.digest,confirmed.digest);assert.equal(native.receipt.checkpoint,'332734');assert.deepEqual(confirmed.terminal,prior.afterJournal);
 for(const[f,h]of Object.entries(native.inputsSha256))assert.equal(sha(f),h);
 assert(!cp.execFileSync('ps',['-Ao','command='],{encoding:'utf8'}).split('\n').some(s=>s.includes('Google Chrome')&&s.includes('--user-data-dir='+profile)));
 const password=read(path.join(fixture,'recovery-private.json')).password;
 const traffic=[],blocked=[],errors=[],frames=[],captureErrors=[],cancelledCaptures=[],jobs=[],checks=[];
 let context,page,worker,stage='first cold protected baseline',secret=false,proof={fixture,owner:prior.owner,digest:native.digest};
 const check=(label,value)=>{assert(value,label);checks.push({label,passed:true});console.log(JSON.stringify({stage,checks:checks.length}))};
 const journal=()=>require('./lib/lifecycle-journal-snapshot.cjs')(page);
 const cipher=()=>page.evaluate(async()=>{const name='RtdWallet DB';if(!(await indexedDB.databases()).some(d=>d.name===name))throw Error('Existing account DB required');const db=await new Promise((resolve,reject)=>{const r=indexedDB.open(name);r.onupgradeneeded=()=>{r.transaction.abort();reject(Error('No upgrade'))};r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(Error('Read account failed'))});try{const rows=await new Promise((resolve,reject)=>{const tx=db.transaction('accounts','readonly'),r=tx.objectStore('accounts').getAll();r.onsuccess=()=>resolve(r.result.map(x=>({id:x.id,address:x.address,publicKey:x.publicKey,encrypted:x.encrypted,type:x.type})));tx.onerror=()=>reject(Error('Account readonly failed'))});if(rows.length!==1||rows[0].type!=='imported'||typeof rows[0].encrypted!=='string')throw Error('Expected protected account');const bytes=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(JSON.stringify(rows)));return{count:rows.length,address:rows[0].address,type:rows[0].type,encryptedProjectionSha256:Array.from(new Uint8Array(bytes),b=>b.toString(16).padStart(2,'0')).join('')};}finally{db.close()}});
 const command=(method,args)=>page.evaluate(({method,args})=>new Promise((resolve,reject)=>{const p=chrome.runtime.connect({name:'rtd_ui<->background'}),id=crypto.randomUUID(),timer=setTimeout(()=>{p.disconnect();reject(Error('Readonly account command timeout'))},20000);p.onMessage.addListener(m=>{if(m?.kind==='rtd-ui-source-challenge'){p.postMessage({kind:'rtd-ui-source-confirm',nonce:m.nonce});return}if(m.id===id){clearTimeout(timer);p.disconnect();resolve(m.payload)}});p.postMessage({id,payload:method==='@setNetwork'?{type:'set-network',network:args}:{type:'method-payload',method,args}})}),{method,args});
 const unlock=async()=>{secret=true;await page.getByTestId('unlock-account-button').click();const d=page.getByRole('dialog');await d.locator('input[type=password]').fill(password);await d.getByRole('button',{name:/^(Unlock|解锁)$/}).click();await expect(d).toHaveCount(0);await expect(page.getByTestId('lock-account-button')).toBeVisible();secret=false;};

 const start=async()=>{
  for(const[f,h]of Object.entries(build.artifacts))assert.equal(sha(path.join(build.output,f)),h);
  context=await chromium.launchPersistentContext(profile,{executablePath:path.join(os.homedir(),'Library/Caches/ms-playwright/chromium-1243/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing'),headless:true,args:[`--disable-extensions-except=${build.output}`,`--load-extension=${build.output}`]});
  await context.route('**/*',route=>{const r=route.request(),u=new URL(r.url());if(['http:','https:'].includes(u.protocol)){traffic.push({url:u.href,method:r.method()});if(!['http://127.0.0.1:41750','http://127.0.0.1:41954','http://127.0.0.1:41955','http://127.0.0.1:41956','http://127.0.0.1:41718'].includes(u.origin)||/\/(SimulateTransaction|VerifySignature|ExecuteTransaction)$/.test(u.pathname)||String(r.postData()).includes('"jsonrpc"')){blocked.push(u.href);return route.abort()}}return route.continue()});
  context.on('response',r=>{if(!r.url().startsWith('http://127.0.0.1:41750/')||!r.url().includes('/rtd.rpc.v2.'))return;const observedStage=stage;jobs.push((async()=>{const bytes=await r.body();frames.push({stage:observedStage,url:r.url(),status:r.status(),requestBase64:r.request().postDataBuffer().toString('base64'),responseBase64:bytes.toString('base64')});assert.equal(r.status(),200)})().catch(e=>{const row={stage:observedStage,url:r.url(),status:r.status(),requestFailure:r.request().failure(),errorType:e.name,message:String(e.message).slice(0,220)};if(row.requestFailure?.errorText==='net::ERR_ABORTED')cancelledCaptures.push(row);else captureErrors.push(row)}))});
  const first=context.serviceWorkers()[0]||await context.waitForEvent('serviceworker');const loaded=await require('./lib/current-extension-worker.cjs').ensure(context,first,build.output);worker=loaded.worker;
  const workerSource=loaded.evidence.after??loaded.evidence.before;assert.equal(workerSource.workerSha256,build.artifacts['background.js']);
  page=await context.newPage();page.setDefaultTimeout(60000);page.on('pageerror',e=>errors.push(e.name));const base=new URL('ui.html',worker.url()).href;
  const uiSource=await require('./lib/current-extension-ui-source.cjs').inspect(context,page,build.output,Object.keys(build.artifacts).filter(f=>f.endsWith('.js')&&!['background.js','content-script.js','dapp-interface.js','egress-gate.js'].includes(f)),{url:base,navigate:async()=>{await page.goto(base+'#/tokens');await page.getByTestId('unlock-account-button').waitFor({timeout:60000})}});
  return {base,workerSource,uiSource};
 };
 try{
  proof.starts=[];proof.encryptedStates=[];proof.journals=[];
  for(let iteration=0;iteration<2;iteration++){
   stage='cold '+iteration+' protected baseline';const sources=await start();proof.starts.push(sources);
   const encrypted=await cipher();proof.encryptedStates.push(encrypted);assert.equal(encrypted.address,prior.owner);if(iteration)assert.deepEqual(encrypted,proof.encryptedStates[0]);if(resume)assert.deepEqual(encrypted,resume.encryptedStates[0]);
   const before=await journal();proof.journals.push(before);assert.deepEqual(before,confirmed.terminal);
   const accounts=(await command('getStoredEntities',{type:'accounts'})).args.entities;
   assert.equal(accounts.length,1);assert.equal(accounts[0].id,confirmed.terminal['journal-v2'][0].accountId);assert(accounts[0].isLocked&&accounts[0].address===prior.owner);
   check('cold '+iteration+' retains locked actual account and original complete success journal',true);
   await unlock();check('cold '+iteration+' normal actual UI password unlock',true);
   if(iteration===0){
    stage='original native-confirmed staking receipt';await page.goto(sources.base+'#/receipt?txdigest='+native.digest+'&from=tokens');
    await expect(page.getByTestId('transaction-status')).toHaveText('交易成功',{timeout:90000});
    await expect(page.getByText('交易已确认，资产数据仍在同步。',{exact:true})).toBeVisible({timeout:90000});
    await expect.poll(async()=>await page.locator('body').innerText(),{timeout:90000}).toMatch(/(?:^|\n)1\s+RTD(?:\n|$)/);
    proof.receiptText=(await page.locator('body').innerText()).slice(0,10000);proof.receiptRoute=new URL(page.url()).hash;
    assert(proof.receiptRoute.includes(native.digest));assert(/(?:^|\n)1\s+RTD(?:\n|$)/.test(proof.receiptText));
    await expect.poll(()=>frames.some(r=>r.url.endsWith('/GetTransaction')&&r.status===200),{timeout:30000}).toBe(true);
    check('original new stake native success and honest indexed synchronization rendered',true);
   }
   stage='cold '+iteration+' normal relock';await page.goto(sources.base+'#/tokens');await page.getByTestId('lock-account-button').click();await page.getByTestId('unlock-account-button').waitFor();
   const after=await cipher();proof.encryptedStates.push(after);assert.deepEqual(after,proof.encryptedStates[0]);
   const terminal=await journal();proof.journals.push(terminal);assert.deepEqual(terminal,confirmed.terminal);
   check('cold '+iteration+' normal relock preserves encrypted projection and all three stores',true);
   await context.close();context=null;
  }
  await Promise.allSettled(jobs);assert.deepEqual(blocked,[]);assert.deepEqual(errors,[]);assert.deepEqual(captureErrors,[]);
  check('two full Chrome closes with no signing simulation Execute or forbidden traffic',true);
  proof={...proof,passed:true,observedAt:new Date().toISOString(),retainedSource:build.sourceAfter,currentProductSource:native.currentProductSource,checks,traffic,frames,cancelledCaptures,captureErrors,errors,blocked,
   signatures:0,simulations:0,executeRequests:0,controlledNewFixtureColdStarts:2,originalProtectedProfilesOpened:0,certificateChanges:0,currentC42BrowserAccepted:false,
   inputsSha256:Object.fromEntries([__filename,buildFile,priorFile,nativeFile,confirmedFile,...(resumeFile?[resumeFile]:[])].map(f=>[f,sha(f)])),
   scope:'Two actual full retained C41 Chrome cold starts of only the newly once-approved G3 stake fixture. Real normal UI unlock/relock, immutable imported-account encrypted projection, exact original full three-store success journal, original native receipt and honest indexed-sync warning. Zero new approval/signature/simulation/Execute. This starts cipher evidence after original fixture closure; no claim of pre-approval cipher baseline, current C42 UI, indexed new stake, redeem, host reboot or full QA20/TX04 parent.'};
 }catch(e){proof={...proof,passed:false,stage,errorType:e.name,message:secret?'Private unlock stage redacted':String(e.message).replaceAll(password,'[redacted]').slice(0,600),checks,traffic,frames,cancelledCaptures,captureErrors,errors,blocked,simulations:0,signatures:0,executeRequests:0};process.exitCode=1}
 finally{if(context)await context.close();fs.writeFileSync(output,JSON.stringify(proof,null,2)+'\n',{flag:'wx',mode:0o600});console.log(JSON.stringify({passed:proof.passed,stage:proof.stage,checks:checks.length,frames:frames.length,executeRequests:0}))}
})().catch(e=>{console.error(JSON.stringify({passed:false,stage:'preflight',errorType:e.name}));process.exitCode=1});
