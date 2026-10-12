// Production store/lifetime in native Chromium; synthetic isolated admission only, never chain or signing.
const fs=require('node:fs'),path=require('node:path'),os=require('node:os'),http=require('node:http'),crypto=require('node:crypto'),assert=require('node:assert/strict');
const{execFileSync}=require('node:child_process'),{chromium,expect}=require('@playwright/test');
(async()=>{
 const[output,fixture]=process.argv.slice(2),wallet=path.resolve(__dirname,'..'),rt=path.join(os.homedir(),'.local/state/rtd-wallet-migration/dev-20261003-01');
 assert(path.dirname(path.resolve(fixture))===rt&&!fs.existsSync(fixture)&&!fs.existsSync(output));fs.mkdirSync(fixture,{mode:0o700});
 const sha=f=>crypto.createHash('sha256').update(fs.readFileSync(f)).digest('hex'),bundle=path.join(fixture,'bundle.js');
 const source=()=>JSON.parse(execFileSync('python3',['-c','import importlib.util,json;from pathlib import Path;p=Path("scripts/build-reviewed-local-extension.py");s=importlib.util.spec_from_file_location("b",p);m=importlib.util.module_from_spec(s);s.loader.exec_module(m);h,n=m.source_hash(Path.cwd());print(json.dumps({"sha256":h,"files":n}))'],{cwd:wallet,encoding:'utf8'}));
 const before=source(),checks=[],errors=[],forbidden=[],requests=[],late=[];let context,server,stage='bundle',proof;
 const check=(label,value)=>{assert(value,label);checks.push({label,passed:true})};
 try{
  execFileSync('pnpm',['exec','esbuild','tests/unit/rpc/capability-owner-browser-harness.ts','--bundle','--platform=browser','--format=iife','--global-name=OwnerHarness',`--outfile=${bundle}`],{cwd:wallet,stdio:'pipe'});
  server=http.createServer((req,res)=>{requests.push(req.url);res.setHeader('Cache-Control','no-store');if(req.url==='/bundle.js'){res.setHeader('Content-Type','text/javascript');return res.end(fs.readFileSync(bundle))}if(req.url==='/late'){res.writeHead(200,{'Content-Type':'text/plain'});res.write('held-');late.push(res);return}res.setHeader('Content-Type','text/html');res.end('<!doctype html><script src="/bundle.js"></script>')});
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));const origin=`http://127.0.0.1:${server.address().port}`;
  const launch=async()=>{const ctx=await chromium.launchPersistentContext(path.join(fixture,'profile'),{executablePath:path.join(os.homedir(),'Library/Caches/ms-playwright/chromium-1243/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing'),headless:true});ctx.on('page',p=>p.on('pageerror',e=>errors.push(e.name)));await ctx.route('**/*',route=>{if(new URL(route.request().url()).origin!==origin){forbidden.push(new URL(route.request().url()).origin);return route.abort()}return route.continue()});return ctx};
  context=await launch();let a=await context.newPage(),b=await context.newPage();await a.goto(origin);await b.goto(origin);
  const init=async(page,name)=>page.evaluate(name=>{const H=OwnerHarness;window.p=H.validateNetworkProfile(H.profileFixture());window.database='RtdWallet NetworkAdmission:test:'+name;window.store=new H.WalletNetworkAdmissionStore({databaseName:database});window.area={kind:'graphql-domain',domain:'balances'};window.marker=async id=>{const db=await H.rawDatabase(database);return new Promise((resolve,reject)=>{const tx=db.transaction('capability-owner-v1','readonly'),get=tx.objectStore('capability-owner-v1').get(id);tx.oncomplete=()=>{db.close();resolve(get.result??null)};tx.onabort=()=>{db.close();reject(new Error('marker read aborted'))}})}},name);
  const row=page=>page.evaluate(async()=>{const value=await store.capture(p);return{pending:value?.pending??[],faults:value?.faults??[]}});
  const rejected=page=>page.evaluate(async()=>{try{await store.beginRecoverable(p,[area]);return null}catch(e){return e.reason}});
  stage='v1/v2 retained upgrade';
  const upgrade=await a.evaluate(async()=>{
   const H=OwnerHarness,results=[];
   for(const version of[1,2]){
    const name='RtdWallet NetworkAdmission:test:owner-upgrade-'+version,profile=H.validateNetworkProfile(H.profileFixture()),binding=H.networkBindingKey(profile);
    const value={schemaVersion:1,bindingKey:binding,faults:[{kind:'graphql-domain',domain:'assets',reason:'schema'}],pending:[]};
    const db=await new Promise((resolve,reject)=>{const r=indexedDB.open(name,version);r.onupgradeneeded=()=>{r.result.createObjectStore('admission-v1',{keyPath:'bindingKey'});if(version===2){r.result.createObjectStore('egress-context-v1',{keyPath:'key'});r.result.createObjectStore('egress-ticket-v1',{keyPath:'id'})}};r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error)});
    const contextRow={key:'global',schemaVersion:1,epoch:'1'.repeat(64),revision:0,pending:[]},ticketRow={id:'synthetic-retention',fixture:'not-an-authority'};
    await new Promise((resolve,reject)=>{const tx=db.transaction([...db.objectStoreNames],'readwrite',{durability:'strict'});tx.objectStore('admission-v1').put(value);if(version===2){tx.objectStore('egress-context-v1').put(contextRow);tx.objectStore('egress-ticket-v1').put(ticketRow)}tx.oncomplete=resolve;tx.onabort=()=>reject(tx.error)});db.close();
    const store=new H.WalletNetworkAdmissionStore({databaseName:name});const captured=await store.capture(profile);if(JSON.stringify(captured)!==JSON.stringify(value))throw new Error('original admission changed');
    const upgraded=await H.rawDatabase(name);if(upgraded.version!==3||upgraded.objectStoreNames.length!==4)throw new Error('upgrade shape');
    const retained=await new Promise((resolve,reject)=>{const tx=upgraded.transaction([...upgraded.objectStoreNames],'readonly'),rows={};for(const n of upgraded.objectStoreNames){const get=tx.objectStore(n).getAll();get.onsuccess=()=>rows[n]=get.result}tx.oncomplete=()=>resolve(rows);tx.onabort=()=>reject(tx.error)});upgraded.close();
    if(retained['capability-owner-v1'].length||version===2&&(JSON.stringify(retained['egress-context-v1'])!==JSON.stringify([contextRow])||JSON.stringify(retained['egress-ticket-v1'])!==JSON.stringify([ticketRow])))throw new Error('original egress rewritten');results.push({version,originalRowsPreserved:true,newVersion:3});
   }return results;
  });check('native v1/v2 upgrade preserves admission and raw egress bytes',upgrade.length===2);
  await init(a,'owner-live');await init(b,'owner-live');
  const original=await a.evaluate(async()=>{window.ticket=await store.beginRecoverable(p,[area]);return{ticket,marker:await marker(ticket.id)}});
  check('pending and protocol owner marker committed together',(await row(b)).pending[0].id===original.ticket.id&&original.marker.schemaVersion===1);
  check('second live page cannot adopt the first native owner',await rejected(b)==='reviewing');
  check('failed competitor does not add or erase pending',(await row(b)).pending.length===1);
  stage='actual page close and original ticket adoption';await a.close();
  const adopted=await b.evaluate(async()=>{window.ticket=await store.beginRecoverable(p,[area]);let blocked;try{await store.assertClear(p,[area])}catch(e){blocked=e.reason}return{ticket,marker:await marker(ticket.id),blocked}});
  check('actual page destruction permits same original ticket adoption',adopted.ticket.id===original.ticket.id);
  check('successor incarnation changes without deleting reservation',adopted.marker.incarnation!==original.marker.incarnation&&(await row(b)).pending.length===1);
  check('adoption alone does not admit ordinary reads',adopted.blocked==='reviewing');
  await b.evaluate(async()=>{await store.complete(p,ticket,[])});check('owned completion removes pending and owner marker atomically',(await row(b)).pending.length===0&&await b.evaluate(async id=>await marker(id),original.ticket.id)===null);
  stage='retained normal browser restart';
  await init(b,'owner-browser-restart');const restartTicket=await b.evaluate(async()=>{window.ticket=await store.beginRecoverable(p,[area]);return ticket.id});await context.close();context=null;
  context=await launch();a=await context.newPage();b=await context.newPage();await a.goto(origin);await b.goto(origin);await init(a,'owner-browser-restart');
  const restarted=await a.evaluate(async()=>{window.ticket=await store.beginRecoverable(p,[area]);return{ticket,record:await store.capture(p)}});
  check('normal browser restart retains and adopts same pending without clearing it',restarted.ticket.id===restartTicket&&restarted.record.pending.length===1);
  await a.evaluate(async()=>{const H=OwnerHarness,lifetime=new H.CapabilityObservationLifetime(new H.WalletReadSession(p),ticket);await store.finishFailed(p,ticket,await lifetime.fail(new Error('transient successor failure')))});
  check('empty transient successor failure retains original pending',(await row(a)).pending.length===1);
  await init(b,'owner-browser-restart');const retry=await b.evaluate(async()=>{window.ticket=await store.beginRecoverable(p,[area]);await store.complete(p,ticket,[]);return ticket.id});check('fresh terminal owner can retry original reservation after raw work ended',retry===restartTicket&&(await row(b)).pending.length===0);
  stage='unmarked legacy pending';await init(a,'owner-legacy');await init(b,'owner-legacy');const legacy=await a.evaluate(async()=>{window.ticket=await store.begin(p,[area]);return ticket.id});await a.close();
  check('unmarked legacy reservation is never adopted or cleared',await rejected(b)==='reviewing'&&(await row(b)).pending[0].id===legacy);
  stage='late raw body and negative preservation';a=await context.newPage();await a.goto(origin);await init(a,'owner-late-body');await init(b,'owner-late-body');
  await a.evaluate(async()=>{const H=OwnerHarness;window.ticket=await store.beginRecoverable(p,[area,{kind:'identity',role:'graphql'}]);const lifetime=new H.CapabilityObservationLifetime(new H.WalletReadSession(p),ticket);window.bodyStarted=false;const work=lifetime.track(fetch('/late').then(async response=>{window.bodyStarted=true;await response.text();throw new H.NetworkIdentityError('graphql','chain-mismatch')}));void work.catch(()=>{});window.finished=false;window.cleanup=lifetime.fail(new Error('caller cancelled')).then(receipt=>store.finishFailed(p,ticket,receipt)).then(()=>{window.finished=true})});
  await expect.poll(()=>a.evaluate(()=>bodyStarted)).toBe(true);
  const held=await a.evaluate(async()=>({ticket,marker:await marker(ticket.id)}));
  // The competing target must match the full original observation areas.
  const heldReject=await b.evaluate(async()=>{try{await store.beginRecoverable(p,[area,{kind:'identity',role:'graphql'}]);return null}catch(e){return e.reason}});
  check('caller cancellation with live native raw body cannot release or adopt owner',heldReject==='reviewing'&&(await row(b)).pending.length===1&&!await a.evaluate(()=>finished));
  assert(late.length===1);late.shift().end('late-wrong-chain');await expect.poll(()=>a.evaluate(()=>finished)).toBe(true);
  const negative=await row(b);check('late definite identity fault is merged before reservation and marker release',negative.pending.length===0&&negative.faults.some(f=>f.kind==='identity'&&f.reason==='chain-mismatch')&&await a.evaluate(async id=>await marker(id),held.ticket.id)===null);
  check('negative still blocks a successor observation',await rejected(b)==='quarantined');
  stage='corrupt owner marker';await init(a,'owner-corrupt');await init(b,'owner-corrupt');const corrupt=await a.evaluate(async()=>{window.ticket=await store.beginRecoverable(p,[area]);const saved=await marker(ticket.id),db=await OwnerHarness.rawDatabase(database);await new Promise((resolve,reject)=>{const tx=db.transaction('capability-owner-v1','readwrite',{durability:'strict'});tx.objectStore('capability-owner-v1').put({...saved,bindingKey:'wrong-binding'});tx.oncomplete=resolve;tx.onabort=()=>reject(tx.error)});db.close();return ticket.id});await a.close();
  check('corrupt protocol marker rejects without deleting pending',await rejected(b)==='corrupt'&&(await row(b)).pending[0].id===corrupt);
  await context.close();context=null;check('native ownership checks have no page errors or external attempts',errors.length===0&&forbidden.length===0);
  const after=source();assert.deepEqual(before,after);const inputs=[__filename,'tests/unit/rpc/capability-owner-browser-harness.ts','src/shared/rpc/capability-owner-lock.ts','src/shared/rpc/network-admission-store.ts','src/shared/rpc/network-admission-database.ts','src/shared/rpc/capability-observation-lifetime.ts'].map(f=>path.isAbsolute(f)?f:path.join(wallet,f));
  proof={passed:true,observedAt:new Date().toISOString(),source:before,fixture,checks,upgrade,requests,errors,forbidden,signatures:0,simulations:0,executeRequests:0,originalProfilesOpened:0,certificateChanges:0,bundleSha256:sha(bundle),inputsSha256:Object.fromEntries(inputs.map(f=>[f,sha(f)])),scope:'Native store and raw lifetime only in synthetic isolated Chrome databases: v1/v2 retention, active ownership, actual page destruction and retained browser restart, original pending adoption with no early clearance, empty successor failure and late identity fault preservation. No actual chain capability report, transaction authority or extension product acceptance.'};
 }catch(e){proof={passed:false,stage,errorType:e.name,message:String(e.message).slice(0,1000),source:before,fixture,checks,errors,forbidden,simulations:0,signatures:0,executeRequests:0};process.exitCode=1}
 finally{if(context)await context.close();for(const response of late)response.destroy();if(server)await new Promise(resolve=>{server.close(resolve);server.closeAllConnections()});fs.writeFileSync(output,JSON.stringify(proof,null,2)+'\n',{flag:'wx',mode:0o600});console.log(JSON.stringify({passed:proof.passed,stage:proof.stage,checks:checks.length,executeRequests:0}))}
})().catch(e=>{console.error(String(e.message).slice(0,300));process.exitCode=1});
