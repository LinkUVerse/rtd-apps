// Copyright (c) LinkU Labs, Inc.
// SPDX-License-Identifier: Apache-2.0
// Independent test wallet only. Never opens original profiles or submits transactions.
const {chromium}=require('@playwright/test');
const {Ed25519Keypair}=require('rtd-typescript/keypairs/ed25519');
const fs=require('node:fs'),path=require('node:path'),os=require('node:os'),crypto=require('node:crypto'),assert=require('node:assert/strict');
const {execFileSync}=require('node:child_process');
const sha=bytes=>crypto.createHash('sha256').update(bytes).digest('hex');

(async()=>{
  const [outputArg,fixtureArg]=process.argv.slice(2),output=path.resolve(outputArg),fixture=path.resolve(fixtureArg);
  const wallet=path.resolve(__dirname,'..'),runtime=path.join(os.homedir(),'.local/state/rtd-wallet-migration/dev-20261003-01');
  assert(path.dirname(fixture)===runtime&&path.basename(fixture).startsWith('rollback-fixture-'));
  assert(!fs.existsSync(fixture)&&!fs.existsSync(output));
  fs.mkdirSync(fixture,{mode:0o700});
  const extension=path.join(fixture,'extension'),profileDir=path.join(fixture,'chrome-profile');
  const logs=path.join(wallet,'migrationToGRpcOrGraphQLDoc/workLog');
  const older=JSON.parse(fs.readFileSync(path.join(logs,'20261006-indexed-event-production-build-01.json')));
  const reviewed=JSON.parse(fs.readFileSync(path.join(logs,'20261006-NET-04-reviewed-production-build-03.json')));
  assert(older.passed&&reviewed.passed);
  const profileFile=path.join(runtime,'wallet-profile-20261004-03/profile.json');
  const network=JSON.parse(fs.readFileSync(profileFile));
  const binding=execFileSync('pnpm',['exec','tsx','-e',`import {readFileSync} from 'node:fs';import {validateNetworkProfile,networkBindingKey} from './src/shared/rpc/profile';console.log(networkBindingKey(validateNetworkProfile(JSON.parse(readFileSync(process.argv[1],'utf8')))))`,profileFile],{cwd:wallet,encoding:'utf8'}).trim();
  const key=Ed25519Keypair.fromSecretKey(crypto.randomBytes(32)),secret=key.getSecretKey(),password=crypto.randomBytes(24).toString('base64url');
  const requests=[],checks=[],stages=[];let context,page,stage='prepare',extensionId,accountId,baseline;
  const check=(name,value)=>{if(!value)throw new Error(name);checks.push({name,passed:true});};
  const copy=proof=>{
    assert(context===undefined,'Browser must close before controlled package replacement');
    if(fs.existsSync(extension))fs.rmSync(extension,{recursive:true});
    fs.mkdirSync(extension,{mode:0o700});
    for(const[name,digest]of Object.entries(proof.artifacts)){
      const source=path.join(proof.output,name);assert(!fs.lstatSync(source).isSymbolicLink());assert.equal(sha(fs.readFileSync(source)),digest);
      if(name==='compilation-graph.json'||name.endsWith('.map'))continue;
      assert(!path.isAbsolute(name)&&!name.split(path.sep).includes('..'));
      const target=path.join(extension,name);fs.mkdirSync(path.dirname(target),{recursive:true});fs.copyFileSync(source,target);
    }
    assert(!JSON.parse(fs.readFileSync(path.join(extension,'manifest.json'))).key,'Stable controlled installation path derives ID');
  };
  const command=(method,args)=>page.evaluate(({method,args})=>new Promise((resolve,reject)=>{
    const port=chrome.runtime.connect({name:'rtd_ui<->background'}),id=crypto.randomUUID();
    const timer=setTimeout(()=>{port.disconnect();reject(new Error('UI control timeout'));},30000);
    port.onMessage.addListener(message=>{
      if(message?.kind==='rtd-ui-source-challenge'){port.postMessage({kind:'rtd-ui-source-confirm',nonce:message.nonce});return;}
      if(message.id===id){clearTimeout(timer);port.disconnect();resolve(message.payload);}
    });port.postMessage({id,payload:{type:'method-payload',method,args}});
  }),{method,args});
  const accounts=async()=>{const r=await command('getStoredEntities',{type:'accounts'});assert.equal(r.method,'storedEntitiesResponse');return r.args.entities;};
  const start=async(proof,label)=>{
    stage=label+' launch';copy(proof);
    context=await chromium.launchPersistentContext(profileDir,{executablePath:path.join(os.homedir(),'Library/Caches/ms-playwright/chromium-1243/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing'),headless:true,args:[`--disable-extensions-except=${extension}`,`--load-extension=${extension}`]});
    context.on('request',request=>{const u=new URL(request.url());if(['http:','https:'].includes(u.protocol))requests.push({stage:label,origin:u.origin,path:u.pathname,local:['127.0.0.1','localhost'].includes(u.hostname)});});
    await context.route('**/*',async route=>{const u=route.request().url();if(/\/(?:SimulateTransaction|ExecuteTransaction)(?:$|\?)/.test(u)){await route.abort();throw new Error('Rollback verification forbids transaction requests');}await route.continue();});
    // Use the same ordinary developer-mode UI required by the installation guide.
    const manager=await context.newPage();await manager.goto('chrome://extensions');
    const developer=manager.locator('extensions-manager extensions-toolbar #devMode');await developer.waitFor();
    if(await developer.getAttribute('aria-pressed')!=='true')await developer.click();
    await manager.close();
    const worker=context.serviceWorkers()[0]||await context.waitForEvent('serviceworker',{timeout:15000});
    const id=new URL(worker.url()).host;if(extensionId)check(label+' same extension ID',id===extensionId);else extensionId=id;
    stage=label+' active worker source';
    const active=context.serviceWorkers().filter(w=>new URL(w.url()).host===id).at(-1);
    assert(active,'Actual active extension worker required');
    const loaded=await require('./lib/current-extension-worker.cjs').ensure(context,active,extension);
    const workerSource=loaded.evidence.after??loaded.evidence.before;check(label+' actual worker source',workerSource.matchesDisk&&workerSource.workerSha256===proof.artifacts['background.js']);
    page=await context.newPage();page.setDefaultTimeout(20000);
    await page.goto(`chrome-extension://${id}/ui.html`,{waitUntil:'domcontentloaded'});
    await page.locator('a[href*="add-account"], a[href*="/tokens"], input[type="password"]').first().waitFor({timeout:20000});
    stage=label+' loaded UI source';
    const uiSource=await require('./lib/current-extension-ui-source.cjs').inspect(context,page,extension);
    for(const row of uiSource.loadedBundles)check(label+' actual UI '+row.file,row.matchesDisk&&row.loadedSha256===proof.artifacts[row.file]);
    stages.push({label,workerSource,uiSource,workerReload:loaded.evidence});
  };
  const snapshot=()=>page.evaluate(async()=>{
    const hash=async value=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(JSON.stringify(value))))).map(x=>x.toString(16).padStart(2,'0')).join('');
    const open=name=>new Promise((resolve,reject)=>{const r=indexedDB.open(name);r.onupgradeneeded=()=>{r.transaction.abort();reject(new Error('Readonly snapshot forbids creating database'));};r.onerror=r.onblocked=()=>reject(new Error('Readonly database unavailable'));r.onsuccess=()=>resolve(r.result);});
    const db=await open('RtdWallet DB');
    const encrypted=await new Promise((resolve,reject)=>{const tx=db.transaction('accounts','readonly'),r=tx.objectStore('accounts').getAll();let rows;r.onsuccess=()=>{rows=r.result.map(x=>({id:x.id,address:x.address,publicKey:x.publicKey,encrypted:x.encrypted,type:x.type}));};tx.oncomplete=()=>resolve(rows);tx.onerror=tx.onabort=()=>reject(new Error('Readonly account snapshot failed'));});db.close();
    const j=await open('RtdWallet TransactionJournal'),version=j.version,names=Array.from(j.objectStoreNames);
    const rows=await new Promise((resolve,reject)=>{const tx=j.transaction(names,'readonly'),out={};for(const n of names){const r=tx.objectStore(n).getAll();r.onsuccess=()=>{out[n]=r.result;};}tx.oncomplete=()=>resolve(out);tx.onerror=tx.onabort=()=>reject(new Error('Readonly journal snapshot failed'));});j.close();
    const config=await chrome.storage.local.get(['wallet_custom_profile_v2','wallet_network_v2','rtd_Env','rtd_Env_RPC']);
    return{encryptedAccountsSha256:await hash(encrypted),encryptedAccountCount:encrypted.length,journalVersion:version,journalSha256:await hash(rows),journalStores:names,pendingCount:rows['pending-scopes-v2'].length,recordCount:rows['journal-v2'].length,networkConfigSha256:await hash(config)};
  });
  const paused=async(label)=>{
    stage=label+' future journal recovery';const result=await command('recoverPreparedTransaction',{accountId});
    check(label+' future journal unavailable',result.error===true&&/交易恢复存储不可用/.test(result.message));
    const before=await snapshot();check(label+' retained dummy pending',before.pendingCount===1&&before.recordCount===1&&before.journalVersion===3);
    stage=label+' wrong H0 preview';const wrong={...network,id:'rollback-wrong-genesis',displayName:'rollback wrong genesis',expectedGenesisDigest:'11111111111111111111111111111111'};
    const rejected=await command('prepareCustomProfile',{profile:wrong});check(label+' invalid custom preview refused',rejected.error===true);
    const after=await snapshot();check(label+' wrong H0 changes no preserved data',JSON.stringify(before)===JSON.stringify(after));
    check(label+' encrypted key unchanged',after.encryptedAccountsSha256===baseline.encryptedAccountsSha256);
    check(label+' journal unchanged',after.journalSha256===baseline.journalSha256);
    check(label+' network configuration unchanged',after.networkConfigSha256===baseline.networkConfigSha256);
    stages.at(-1).preserved=after;stages.at(-1).recoveryRejected=true;stages.at(-1).customPreviewFailure={message:rejected.message,chainMismatchObserved:/属于不同链/.test(rejected.message),permissionDenied:/授权这些服务地址/.test(rejected.message)};
  };
  const verifyKey=async label=>{
    const rows=await accounts();check(label+' same imported account',rows.length===1&&rows[0].id===accountId&&rows[0].address===key.toRtdAddress()&&rows[0].type==='imported');
    check(label+' restart locks account',rows[0].isLocked===true);
    const denied=await command('unlockAccountSourceOrAccount',{id:accountId,password:'wrong independent fixture password'});check(label+' wrong password cannot unlock',denied.error===true&&(await accounts())[0].isLocked===true);
    const badExport=await command('getAccountKeyPair',{accountID:accountId,password:'wrong independent fixture password'});check(label+' wrong password cannot export',badExport.error===true);
    const unlocked=await command('unlockAccountSourceOrAccount',{id:accountId,password});check(label+' correct password unlocks',!unlocked.error&&(await accounts())[0].isLocked===false);
    const exported=await command('getAccountKeyPair',{accountID:accountId,password});check(label+' actual decrypted key preserved',exported.method==='getAccountKeyPairResponse'&&exported.args.keyPair===secret);
  };
  try{
    await start(older,'original production');
    stage='import independent unfunded key';await page.goto(`chrome-extension://${extensionId}/ui.html#/accounts/import-private-key`);
    await page.locator('textarea[name="privateKey"]').fill(secret);await page.locator('textarea[name="privateKey"]').blur();await page.locator('button[type="submit"]').click();
    await page.locator('input[name="password.input"]').fill(password);await page.locator('input[name="password.confirmation"]').fill(password);await page.locator('button#acceptedTos').click();await page.locator('button[type="submit"]').click();await page.waitForURL(/#\/tokens/);
    const imported=await accounts();check('real UI imported independent account',imported.length===1&&imported[0].address===key.toRtdAddress());accountId=imported[0].id;
    const scope=JSON.stringify([2,network.expectedGenesisDigest,network.generation,key.toRtdAddress()]);
    const record={schemaVersion:2,id:JSON.stringify([scope,'rollback-public-dummy']),scope,chainId:network.expectedGenesisDigest,generation:network.generation,accountId,accountAddress:key.toRtdAddress(),requestId:'rollback-public-dummy',originRef:'wallet-ui',digest:network.expectedGenesisDigest,createdAt:Date.now(),endpointRevision:network.revision,bindingKey:binding,state:'dispatch-pending'};
    stage='future journal fixture';await page.evaluate(record=>new Promise((resolve,reject)=>{
      const r=indexedDB.open('RtdWallet TransactionJournal',3);r.onblocked=r.onerror=()=>reject(new Error('Future fixture database unavailable'));
      r.onupgradeneeded=()=>{const db=r.result;for(const[name,keyPath]of [['journal-v2','id'],['pending-scopes-v2','scope'],['metadata-v2','key']])if(!db.objectStoreNames.contains(name))db.createObjectStore(name,{keyPath});};
      r.onsuccess=()=>{const db=r.result,tx=db.transaction(['journal-v2','pending-scopes-v2'],'readwrite',{durability:'strict'});tx.objectStore('journal-v2').add(record);tx.objectStore('pending-scopes-v2').add({scope:record.scope,recordId:record.id});tx.oncomplete=()=>{db.close();resolve(true);};tx.onerror=tx.onabort=()=>{db.close();reject(new Error('Future fixture commit failed'));};};
    }),record);
    // Public, valid configuration fixture: persistence is tested; identity/permission
    // approval is deliberately not claimed by seeding this independent test store.
    await page.evaluate(async profile=>{await chrome.storage.local.set({wallet_custom_profile_v2:profile,wallet_network_v2:{schemaVersion:2,env:'customRPC',profile}});},network);
    baseline=await snapshot();check('one future dummy record persisted',baseline.journalVersion===3&&baseline.pendingCount===1&&baseline.recordCount===1);
    await paused('original production');await context.close();context=undefined;
    await start(reviewed,'reviewed production');await verifyKey('reviewed production');await paused('reviewed production');await context.close();context=undefined;
    await start(older,'rolled back production');await verifyKey('rolled back production');await paused('rolled back production');
    check('all transaction request attempts zero',requests.every(r=>!/\/(?:SimulateTransaction|ExecuteTransaction)$/.test(r.path)));
    check('all observed network requests local',requests.every(r=>r.local));
    const proof={passed:true,scope:'Independent real encrypted key, seeded valid public profile configuration and public dummy future journal survive production upgrade/rollback. Unavailable journal and custom preview refused; custom preview error category is explicit. No actual profile permission/save approval, chain execution, broadcast pending, physical crash or HTTPS acceptance.',certificateMode:'normal-ca',fixture,profileDirectory:profileDir,extensionId,account:{id:accountId,address:key.toRtdAddress()},baseline,stages,checks,checkCount:checks.length,requests,profileConfigurationSeededFixture:true,actualProfileSaveAccepted:false,wrongGenesisAccepted:stages.every(r=>r.customPreviewFailure.chainMismatchObserved),signatures:0,simulations:0,executions:0,certificateChanges:0,originalProfilesOpened:0,inputsSha256:Object.fromEntries([__filename,path.join(__dirname,'lib/current-extension-worker.cjs'),path.join(__dirname,'lib/current-extension-ui-source.cjs'),path.join(logs,'20261006-indexed-event-production-build-01.json'),path.join(logs,'20261006-NET-04-reviewed-production-build-03.json'),profileFile].map(file=>[file,sha(fs.readFileSync(file))]))};
    fs.writeFileSync(output,JSON.stringify(proof,null,2)+'\n',{flag:'wx',mode:0o600});console.log(JSON.stringify({passed:true,checkCount:checks.length,stages:stages.length,signatures:0,simulations:0,executions:0}));
  }catch(error){const message=String(error.message).replaceAll(password,'[redacted]').replaceAll(secret,'[redacted]').slice(0,2000);fs.writeFileSync(output,JSON.stringify({passed:false,stage,errorType:error.name,message,completedChecks:checks,fixture,signatures:0,simulations:0,executions:0},null,2)+'\n',{flag:'wx',mode:0o600});console.error(JSON.stringify({passed:false,stage,errorType:error.name,message}));process.exitCode=1;}
  finally{if(context)await context.close();}
})().catch(error=>{console.error(JSON.stringify({passed:false,stage:'preflight',errorType:error.name}));process.exitCode=1;});
