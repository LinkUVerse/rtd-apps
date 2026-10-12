// Compile real background state writers and exercise only a fresh owned fixture profile.
const fs = require('node:fs'), path = require('node:path'), crypto = require('node:crypto');
const assert = require('node:assert/strict'), {execFileSync} = require('node:child_process');
const { chromium } = require('@playwright/test');
const sha = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
async function main() {
  const [rootArg, outputArg] = process.argv.slice(2); assert(rootArg && outputArg);
  const wallet = path.resolve(__dirname, '..'), root = path.resolve(rootArg), output = path.resolve(outputArg);
  assert(root.startsWith(path.join(process.env.HOME, '.local/state/rtd-wallet-migration/dev-20261003-01') + path.sep));
  assert(!fs.existsSync(root) && !fs.existsSync(output));
  fs.mkdirSync(root,{mode:0o700}); const extension=path.join(root,'extension'); fs.mkdirSync(extension,{mode:0o700});
  const metafile=path.join(root,'compiler-metafile.json');
  const compiled=execFileSync('pnpm',['exec','esbuild','tests/unit/rpc/context-mutation-browser-harness.ts','--bundle','--platform=browser','--format=iife','--global-name=ContextHarness','--define:global=globalThis','--define:process.env={}',`--outfile=${path.join(extension,'formal.js')}`,`--metafile=${metafile}`],{cwd:wallet,encoding:'utf8',stdio:'pipe'});
  fs.writeFileSync(path.join(root,'compiler.log'),compiled,{flag:'wx'});
  const compilerInputsSha256=Object.fromEntries(Object.keys(JSON.parse(fs.readFileSync(metafile)).inputs).filter(p=>p!=='<define:process.env>').map(p=>[path.resolve(wallet,p),sha(fs.readFileSync(path.resolve(wallet,p)))]));
  const sources={
    'manifest.json': JSON.stringify({manifest_version:3,name:'RTD isolated actual context writers',version:'1.0.0',permissions:['storage','alarms'],background:{service_worker:'background.js'},content_security_policy:{extension_pages:"default-src 'none'; script-src 'self';"}}),
    'background.js':"importScripts('formal.js');globalThis.H=ContextHarness;globalThis.Buffer=H.Buffer;globalThis.p=H.validateNetworkProfile(H.profileFixture());globalThis.fixtureErrors=[];",
    'ui.html':'<!doctype html><script src="formal.js"></script><script src="ui.js"></script>',
    'ui.js':'globalThis.H=ContextHarness;globalThis.Buffer=H.Buffer;globalThis.p=H.validateNetworkProfile(H.profileFixture());globalThis.gateStore=new H.WalletDappEgressStore();globalThis.dummyCount=0;',
  };
  for(const [name,body]of Object.entries(sources))fs.writeFileSync(path.join(extension,name),body,{flag:'wx'});
  const fixtureFilesSha256=Object.fromEntries(fs.readdirSync(extension).map(name=>[name,sha(fs.readFileSync(path.join(extension,name)))]));
  const checks=[];const check=(name,value)=>{assert(value,name);checks.push(name);};let context;let networkRequests=0;
  try {
    context=await chromium.launchPersistentContext(path.join(root,'profile'),{headless:true,executablePath:path.join(process.env.HOME,'Library/Caches/ms-playwright/chromium-1243/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing'),args:[`--disable-extensions-except=${extension}`,`--load-extension=${extension}`,'--enable-unsafe-extension-debugging']});
    context.on('request',r=>{if(/^https?:/.test(r.url()))networkRequests++;});
    const worker=context.serviceWorkers()[0]??await context.waitForEvent('serviceworker');
    const page=await context.newPage();await page.goto(worker.url().replace('background.js','ui.html'));
    await page.waitForFunction(()=>!!globalThis.gateStore);
    const raw=()=>worker.evaluate(async()=>{
      const r=indexedDB.open('RtdWallet NetworkAdmission',2),db=await new Promise((resolve,reject)=>{r.onsuccess=()=>resolve(r.result);r.onerror=reject;});
      const tx=db.transaction('egress-context-v1','readonly'),q=tx.objectStore('egress-context-v1').get('global');
      return new Promise((resolve,reject)=>{tx.oncomplete=()=>{db.close();resolve(q.result);};tx.onabort=reject;});
    });
    check('construction-imports-do-not-start-background-or-ui-epoch',await worker.evaluate(async()=>!(await indexedDB.databases()).some(d=>d.name==='RtdWallet NetworkAdmission')));
    check('actual-ui-import-cannot-initialize-epoch',await page.evaluate(async()=>{try{await H.initializeWalletContext();return false;}catch{return true;}}));
    await worker.evaluate(async()=>{await Promise.all([H.initializeWalletContext(),H.initializeWalletContext()]);globalThis.admission=new H.WalletNetworkAdmissionStore();const t=await admission.begin(p,[{kind:'identity',role:'fullnode'}]);await admission.complete(p,t,[]);});
    const originalEpoch=(await raw()).epoch;check('one-background-startup-creates-clear-native-context',(await raw()).pending.length===0);
    await worker.evaluate(()=>H.initializeWalletContext());check('repeated-startup-preserves-generation',(await raw()).epoch===originalEpoch);
    await worker.evaluate(()=>H.getDB());check('actual-account-db-initialization-finishes-after-write',(await raw()).pending.length===0&&(await raw()).revision===1);
    const source={origin:'https://public-fixture.example',tabId:1,frameId:0,documentId:'public-fixture-document',requestId:'public-fixture-request',account:'0x'+'a'.repeat(64),gateOwner:'b'.repeat(64)};
    const hold=async()=>{
      const issued=await worker.evaluate(async source=>H.walletDappEgressStore.issue(await H.walletDappEgressStore.capture(p,source),'public-dummy'),source);
      await page.evaluate(async issued=>{globalThis.issued=issued;globalThis.receipt=await gateStore.consume(p,issued.ticket,issued.binding);},issued);
    };
    const denied=()=>page.evaluate(async()=>{try{await gateStore.deliver(p,receipt,issued.binding,()=>{dummyCount++;});return false;}catch{return dummyCount===0;}});
    const mutate=async(name,operation,arg)=>{
      await hold();const before=(await raw()).revision;await worker.evaluate(operation,arg);
      const after=await raw();check(name+'-native-revision-advanced',after.revision>before&&after.pending.length===0);check(name+'-held-result-refused',await denied());
    };
    await mutate('actual-network-selection',()=>H.network.setActiveNetwork({env:'mainnet',customRpcUrl:null}));
    check('actual-network-storage-committed',await worker.evaluate(async()=> (await chrome.storage.local.get('wallet_network_v2')).wallet_network_v2.env==='mainnet'));
    await mutate('actual-permission-save',()=>H.permissions.storePermission({id:'public-id',origin:'https://public-fixture.example',accounts:['0x'+'a'.repeat(64)],allowed:true,permissions:['viewAccount','suggestTransactions'],createdDate:'public-fixture',responseDate:'public-fixture',requestMsgID:'public-request'}));
    await mutate('actual-permission-revoke',()=>H.permissions.delete('https://public-fixture.example'));
    check('actual-permission-storage-revoked',await worker.evaluate(async()=>!(await H.permissions.getPermissions())['https://public-fixture.example']));
    await mutate('actual-session-unlock-write',()=>H.setEphemeralValue('public-test-material',{publicDummy:'no-account-key'}));
    check('actual-native-session-storage-encrypted-roundtrip',await worker.evaluate(async()=> (await H.getEphemeralValue('public-test-material')).publicDummy==='no-account-key'));
    await mutate('actual-session-lock-removal',()=>H.clearEphemeralValue('public-test-material'));
    check('actual-native-session-material-removed',await worker.evaluate(async()=>await H.getEphemeralValue('public-test-material')===null));
    await mutate('actual-add-account-transaction',async()=>{
      const instances=await H.addNewAccounts([{type:'imported',address:'0x'+'a'.repeat(64),publicKey:'public-fixture-no-key',encrypted:'public-fixture-no-cipher',lastUnlockedOn:null,selected:false,nickname:null,createdAt:1}]);globalThis.fixtureAccountID=instances[0].id;
    });
    await mutate('actual-selected-account-transaction',()=>H.changeActiveAccount(fixtureAccountID));
    await mutate('actual-mnemonic-source-save',async()=>{
      globalThis.fixtureSource=await H.MnemonicAccountSource.createNew({password:'public-fixture-password',entropyInput:new Uint8Array(16)});
      await H.MnemonicAccountSource.save(fixtureSource,{skipBackup:true,skipEventEmit:true});
    });
    await mutate('actual-qredo-source-save',()=>H.QredoAccountSource.save({id:'public-qredo-source',type:'qredo',encrypted:'public-dummy',apiUrl:'https://public-fixture.example',organization:'public',origin:'https://public-fixture.example',service:'public',originFavIcon:null,createdAt:1},{skipBackup:true,skipEventEmit:true}));
    await hold();
    await worker.evaluate(()=>{
      globalThis.fixtureSettled=false;globalThis.fixtureMutation=H.withWalletContextMutation(async()=>{
        await chrome.storage.local.set({publicMutation:'started'});await new Promise(resolve=>globalThis.fixtureRelease=resolve);
      }).then(()=>{fixtureSettled=true;},()=>{fixtureErrors.push('unexpected');});
    });
    for(let i=0;i<50;i++){if(await worker.evaluate(()=>typeof fixtureRelease==='function'))break;await new Promise(r=>setTimeout(r,20));}
    check('actual-external-write-starts-only-under-durable-pending',(await raw()).pending.length===1);
    check('actual-in-progress-write-refuses-held-result',await denied());
    check('actual-in-progress-write-refuses-new-lease',await worker.evaluate(async source=>{try{await H.walletDappEgressStore.capture(p,source);return false;}catch{return true;}},source));
    await worker.evaluate(async()=>{fixtureRelease();await fixtureMutation;});check('actual-external-write-clears-only-after-operation-completion',(await raw()).pending.length===0);
    // Native Dexie transaction must stay blocked until its own commit, not leaf put completion.
    await hold();await worker.evaluate(()=>{
      globalThis.fixtureDexieRelease=undefined;globalThis.fixtureDexieDone=false;
      globalThis.fixtureDexie=(async()=>{const db=await H.getDB();await db.transaction('rw',db.accountSources,async()=>{
        await H.MnemonicAccountSource.save({...fixtureSource,id:'public-nested-source'},{skipBackup:true,skipEventEmit:true});
        await H.Dexie.waitFor(new Promise(resolve=>globalThis.fixtureDexieRelease=resolve),5000);
      });fixtureDexieDone=true;})().catch(()=>{fixtureErrors.push('dexie');});
    });
    for(let i=0;i<50;i++){if(await worker.evaluate(()=>typeof fixtureDexieRelease==='function'))break;await new Promise(r=>setTimeout(r,20));}
    check('actual-nested-source-save-retains-pending-until-native-commit',(await raw()).pending.length===1);
    check('actual-nested-uncommitted-account-write-refuses-held-result',await denied());
    await worker.evaluate(async()=>{fixtureDexieRelease();await fixtureDexie;});
    for(let i=0;i<50;i++){if(!(await raw()).pending.length)break;await new Promise(r=>setTimeout(r,20));}
    check('actual-nested-source-save-finish-follows-native-commit',(await raw()).pending.length===0&&await worker.evaluate(async()=>!!(await (await H.getDB()).accountSources.get('public-nested-source'))));
    await mutate('actual-account-removal',async()=>{
      await H.accountsHandleUIMessage({id:'public-remove',payload:{type:'method-payload',method:'removeAccount',args:{accountID:fixtureAccountID}}},{send:async()=>{}});
    });
    // Invoke exact real UI branch with a privileged fixture receiver, not a UI authentication proof.
    await mutate('actual-ui-password-replacement',async()=>{
      const ui=Object.create(H.UiConnection.prototype);globalThis.fixtureUiReplies=[];ui.send=msg=>{fixtureUiReplies.push(msg);};
      await ui.handleMessage({id:'public-password-reset',payload:{type:'method-payload',method:'resetPassword',args:{password:'public-new-password',recoveryData:[{accountSourceID:fixtureSource.id,entropy:'00'.repeat(16)}]}}});
      if(fixtureUiReplies.some(msg=>msg.payload?.error))throw new Error('UI reset refused');
    });
    await mutate('actual-ui-wallet-clear',async()=>{
      const ui=Object.create(H.UiConnection.prototype);globalThis.fixtureUiReplies=[];ui.send=msg=>{fixtureUiReplies.push(msg);};
      await ui.handleMessage({id:'public-clear',payload:{type:'method-payload',method:'clearWallet',args:{}}});
      if(fixtureUiReplies.some(msg=>msg.payload?.error))throw new Error('UI clear refused');
    });
    check('actual-ui-clear-removes-only-fresh-fixture-account-and-source-data',await worker.evaluate(async()=>{const db=await H.getDB();return await db.accounts.count()===0&&await db.accountSources.count()===0;}));
    // One successful fresh final callback remains possible after confirmed mutations.
    await hold();await page.evaluate(()=>gateStore.deliver(p,receipt,issued.binding,()=>{dummyCount++;}));check('fresh-context-delivers-one-public-dummy',await page.evaluate(()=>dummyCount===1));
    // Last: an aborted native transaction intentionally preserves unknown rather than clearing it.
    const failed=await worker.evaluate(async()=>{
      const db=await H.getDB();try{await db.transaction('rw',db.accountSources,async()=>{await H.MnemonicAccountSource.save({...fixtureSource,id:'public-aborted-source'},{skipBackup:true,skipEventEmit:true});throw new Error('public-abort');});}catch{}
      return !(await db.accountSources.get('public-aborted-source'));
    });check('actual-nested-abort-rolls-back-account-source',failed);check('actual-nested-abort-preserves-unknown-pending',(await raw()).pending.length===1);
    check('actual-aborted-operation-refuses-future-egress',await worker.evaluate(async source=>{try{await H.walletDappEgressStore.capture(p,source);return false;}catch{return true;}},source));
    check('no-fixture-background-completion-errors',await worker.evaluate(()=>fixtureErrors.length===0));check('no-http-or-service-requests',networkRequests===0);
    for(const[file,digest]of Object.entries(compilerInputsSha256))assert.equal(sha(fs.readFileSync(file)),digest);
    for(const[name,digest]of Object.entries(fixtureFilesSha256))assert.equal(sha(fs.readFileSync(path.join(extension,name))),digest);
    const proof={passed:true,observedAt:new Date().toISOString(),browser:context.browser().version(),checks,checkCount:checks.length,launcherSha256:sha(fs.readFileSync(__filename)),compilerInputsSha256,compilerMetafileSha256:sha(fs.readFileSync(metafile)),fixtureFilesSha256,networkRequests,signatures:0,executions:0,originalProfileWrites:0,certificateChanges:0,fixtureDummyPublications:1,scope:'Real formal background mutations and native Chrome storage/Dexie in a fresh fixture profile. Private permission save/UI handlers invoked by privileged harness; no actual approval UI/source authentication, original product DB upgrade, signature/transaction or readiness proof. Public fixed entropy only in disposable fixture.'};
    fs.writeFileSync(output,JSON.stringify(proof,null,2),{flag:'wx'});console.log(JSON.stringify({passed:true,checks:checks.length}));
  }catch(error){fs.writeFileSync(output+'.failure.json',JSON.stringify({passed:false,errorType:error.name,completedChecks:checks,compilerInputsSha256,fixtureFilesSha256},null,2),{flag:'wx'});throw error;}
  finally{if(context)await context.close();}
}
main().catch(error=>{console.error(JSON.stringify({passed:false,errorType:error.name,detail:String(error.message).slice(0,180)}));process.exitCode=1;});
