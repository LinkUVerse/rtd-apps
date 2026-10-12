// Current authored ABI function + actual Chrome locks/strict IDB, isolated readonly fixture.
const fs=require('node:fs'),path=require('node:path'),os=require('node:os'),http=require('node:http'),crypto=require('node:crypto'),assert=require('node:assert/strict');
const {execFileSync}=require('node:child_process'),{chromium,expect}=require('@playwright/test');
(async()=>{
 const output=path.resolve(process.argv[2]);assert(!fs.existsSync(output));
 const wallet=path.resolve(__dirname,'..'),root=fs.mkdtempSync(path.join(os.tmpdir(),'rtd-transaction-move-'));fs.chmodSync(root,0o700);
 const bundle=path.join(root,'bundle.js'),meta=path.join(root,'meta.json'),sha=f=>crypto.createHash('sha256').update(fs.readFileSync(f)).digest('hex');
 execFileSync('pnpm',['exec','esbuild','tests/unit/rpc/transaction-move-browser-harness.ts','--bundle','--platform=browser','--format=iife','--global-name=MoveHarness',`--outfile=${bundle}`,`--metafile=${meta}`],{cwd:wallet,stdio:'pipe'});
 const inputs=Object.fromEntries(Object.keys(JSON.parse(fs.readFileSync(meta)).inputs).map(f=>{const file=path.resolve(wallet,f);return[file,sha(file)]}));inputs[__filename]=sha(__filename);
 fs.mkdirSync(path.join(root,'inputs'));const preserved=Object.entries(inputs).map(([f,d],i)=>{const p=path.join(root,'inputs',String(i)+'.txt');fs.copyFileSync(f,p);return{original:f,preserved:p,sha256:d}});
 const checks=[],errors=[],external=[],check=(label,value)=>{assert(value,label);checks.push({label,passed:true});console.log(JSON.stringify({check:label,passed:true}))};let server,context,stage='launch',proof;
 try{
  server=http.createServer((req,res)=>{res.setHeader('Content-Security-Policy',"default-src 'self'; connect-src 'none'; script-src 'self'");res.setHeader('Cache-Control','no-store');res.setHeader('Content-Type',req.url==='/bundle.js'?'text/javascript':'text/html');res.end(req.url==='/bundle.js'?fs.readFileSync(bundle):'<!doctype html><script src="/bundle.js"></script>')});
  await new Promise(r=>server.listen(0,'127.0.0.1',r));const origin=`http://127.0.0.1:${server.address().port}`;
  context=await chromium.launchPersistentContext(path.join(root,'profile'),{executablePath:path.join(os.homedir(),'Library/Caches/ms-playwright/chromium-1243/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing'),headless:true});
  context.on('request',r=>{if(new URL(r.url()).origin!==origin)external.push(true)});await context.route('**/*',r=>new URL(r.request().url()).origin===origin?r.continue():r.abort());
  const init=async(page,suffix)=>{page.on('pageerror',e=>errors.push(e.name));await page.goto(origin);await page.evaluate(suffix=>{
   const H=MoveHarness;window.p=H.validateNetworkProfile(H.profileFixture());window.session=new H.WalletReadSession(p);window.database='RtdWallet NetworkAdmission:test:transaction-move-'+suffix;
   window.store=new H.WalletNetworkAdmissionStore({databaseName:database});window.observations=new H.WalletNetworkObservations({databaseName:'RtdWallet NetworkObservations:test:transaction-move-'+suffix});
   window.run=fetch=>H.assertTransactionMoveObservation(session,{fetch,admission:store,observations});window.row=()=>store.capture(p);
   window.marker=async id=>{const db=await H.rawDatabase(database);const value=await new Promise((resolve,reject)=>{const tx=db.transaction('capability-owner-v1','readonly'),req=tx.objectStore('capability-owner-v1').get(id);req.onsuccess=()=>resolve(req.result??null);req.onerror=()=>reject(req.error)});db.close();return value};
  },suffix)};
  const a=await context.newPage(),b=await context.newPage();await init(a,'held');await init(b,'held');
  stage='actual transaction Move observation ignored fetch';
  const held=await a.evaluate(async()=>{
   const H=MoveHarness,gate=Promise.withResolvers(),entered=Promise.withResolvers(),wire=H.moveWireFixture();window.release=()=>gate.resolve();window.caller=new AbortController();window.authorized=false;window.failure=null;
   window.result=H.assertTransactionMoveObservation(session,{admission:store,observations,signal:caller.signal,fetch:async(...args)=>{entered.resolve();await gate.promise;return wire.fetch(...args)}}).then(()=>{authorized=true},e=>{failure=e.name;entered.reject(e)});await entered.promise;
   const r=await row();return{ticket:r.pending[0].id,marker:await marker(r.pending[0].id)};
  });
  check('authored Move entry commits managed marker and exact original ticket',held.marker?.id===held.ticket);
  await a.evaluate(async()=>{caller.abort(new Error('controlled cancellation'));await result});
  const cancelled=await a.evaluate(async()=>({authorized,failure,pending:(await row()).pending.map(t=>t.id)}));check('caller fails promptly without authorizing or releasing physical work',!cancelled.authorized&&cancelled.failure&&cancelled.pending.length===1&&cancelled.pending[0]===held.ticket);
  const blocked=await b.evaluate(async()=>{const wire=MoveHarness.moveWireFixture();try{await run(wire.fetch);return{reason:null,requests:wire.requests.length}}catch(e){return{reason:e.reason,requests:wire.requests.length}}});
  check('another native page cannot adopt a live ABI owner or issue IO',blocked.reason==='reviewing'&&blocked.requests===0);
  await a.evaluate(()=>release());await expect.poll(()=>a.evaluate(async()=> (await row()).pending.length)).toBe(0);
  check('settled failure removes only its marker and pending',await a.evaluate(async id=>await marker(id),held.ticket)===null);
  const fresh=await b.evaluate(async()=>({state:(await run(MoveHarness.moveWireFixture().fetch)).state,pending:(await row()).pending.length}));check('fresh actual authored Move probe succeeds after committed cleanup',fresh.state==='authored-target-contracts-checked'&&fresh.pending===0);
  stage='actual page destruction adoption';await init(a,'destroyed');await init(b,'destroyed');
  const original=await a.evaluate(async()=>{
   const entered=Promise.withResolvers();window.result=run(async()=>{entered.resolve();await new Promise(()=>{});throw new Error('unreachable')}).catch(()=>{});await entered.promise;const r=await row();return{id:r.pending[0].id,marker:await marker(r.pending[0].id)};
  });await a.close();
  const successor=await b.evaluate(async()=>{
   const gate=Promise.withResolvers(),entered=Promise.withResolvers(),wire=MoveHarness.moveWireFixture();window.release=()=>gate.resolve();window.successor=run(async(...args)=>{entered.resolve();await gate.promise;return wire.fetch(...args)});void successor.catch(e=>entered.reject(e));await entered.promise;const r=await row();return{id:r.pending[0].id,marker:await marker(r.pending[0].id)};
  });
  check('destroyed page permits actual authored Move function to adopt same marked ticket',successor.id===original.id&&successor.marker.incarnation!==original.marker.incarnation);
  const waiting=await b.evaluate(async()=>{try{await store.assertClear(p);return false}catch(e){return e.reason==='reviewing'}});check('adoption before complete fresh probe keeps authorization blocked',waiting);
  await b.evaluate(async()=>{release();await successor});check('complete fresh probe commits positive then clears original marker',await b.evaluate(async id=>(await row()).pending.length===0&&await marker(id)===null,original.id));
  stage='legacy pending';const c=await context.newPage();await init(c,'legacy');await init(b,'legacy');
  const legacy=await c.evaluate(async()=>{const t=await store.begin(p,['fullnode','graphql','archive'].map(role=>({kind:'identity',role})));return t.id});await c.close();
  const refused=await b.evaluate(async()=>{const wire=MoveHarness.moveWireFixture();let reason;try{await run(wire.fetch)}catch(e){reason=e.reason}return{reason,requests:wire.requests.length,ids:(await row()).pending.map(t=>t.id)}});
  check('unmarked legacy ticket remains and refuses IO after owner page closes',refused.reason==='reviewing'&&refused.requests===0&&refused.ids.length===1&&refused.ids[0]===legacy);
  stage='known chain negative';await init(b,'wrong');const wrong=await b.evaluate(async()=>{
   try{await run(MoveHarness.moveWireFixture(role=>role==='fullnode'?{digest:'11111111111111111111111111111111'}:{}).fetch)}catch{}
   const r=await row();return{pending:r.pending.length,faults:r.faults};
  });check('actual ABI probe chain negative remains durable quarantine',wrong.pending===0&&wrong.faults.some(f=>f.kind==='identity'&&f.role==='fullnode'&&f.reason==='chain-mismatch'));
  stage='strict failure commit';await init(b,'commit');const aborted=await b.evaluate(async()=>{
   const gate=Promise.withResolvers(),entered=Promise.withResolvers(),wire=MoveHarness.moveWireFixture(),caller=new AbortController();
   const task=MoveHarness.assertTransactionMoveObservation(session,{admission:store,observations,signal:caller.signal,fetch:async(...args)=>{entered.resolve();await gate.promise;return wire.fetch(...args)}}).catch(e=>entered.reject(e));await entered.promise;const id=(await row()).pending[0].id;caller.abort();await task;
   const put=IDBObjectStore.prototype.put,ended=Promise.withResolvers();IDBObjectStore.prototype.put=function(...args){const req=put.apply(this,args);req.addEventListener('success',()=>{this.transaction.addEventListener('abort',()=>ended.resolve(),{once:true});this.transaction.abort()},{once:true});return req};gate.resolve();await ended.promise;IDBObjectStore.prototype.put=put;
   const r=await row();return{id,ids:r.pending.map(t=>t.id),marker:await marker(id)};
  });check('strict failed terminal commit retains original ticket and marker',aborted.ids.length===1&&aborted.ids[0]===aborted.id&&aborted.marker?.id===aborted.id);
  check('no external requests or page errors',errors.length===0&&external.length===0);for(const[f,d]of Object.entries(inputs))assert.equal(sha(f),d);
  proof={passed:true,observedAt:new Date().toISOString(),checks,fixture:root,inputsSha256:inputs,preservedInputs:preserved,bundleSha256:sha(bundle),compilerMetafileSha256:sha(meta),signatures:0,simulations:0,executeRequests:0,originalProfileWrites:0,productionDatabasesOpened:0,certificateChanges:0,scope:'Current transaction Move ABI function with readonly synthetic protocol and native Chrome strict IDB/owner locks: actual cancellation, page destruction, original marked-ticket adoption, legacy refusal and storage abort. No live-chain or extension transaction acceptance.'};
 }catch(e){proof={passed:false,stage,errorType:e.name,message:String(e.message).slice(0,500),checks,fixture:root,errors,external};process.exitCode=1}
 finally{await context?.close();if(server)await new Promise(r=>{server.close(r);server.closeAllConnections()});fs.writeFileSync(output,JSON.stringify(proof,null,2)+'\n',{flag:'wx',mode:0o600});console.log(JSON.stringify({passed:proof.passed,stage:proof.stage,checks:checks.length}))}
})().catch(e=>{console.error(JSON.stringify({passed:false,errorType:e.name}));process.exitCode=1});
