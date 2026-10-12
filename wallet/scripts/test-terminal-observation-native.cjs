#!/usr/bin/env node
// Current production coordinator + strict native IDB in a separate public fixture namespace.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),os=require('node:os'),http=require('node:http'),crypto=require('node:crypto');
const {execFileSync}=require('node:child_process');const {chromium}=require('@playwright/test');
(async()=>{
 const output=path.resolve(process.argv[2]);assert(!fs.existsSync(output));
 const wallet=path.resolve(__dirname,'..'),root=fs.mkdtempSync(path.join(os.tmpdir(),'rtd-terminal-observation-'));
 const entry=path.join(root,'entry.ts'),bundle=path.join(root,'bundle.js'),meta=path.join(root,'meta.json');
 fs.writeFileSync(entry,`export * from ${JSON.stringify(path.join(wallet,'tests/unit/rpc/network-capability-observation-browser-harness.ts'))}; export * from ${JSON.stringify(path.join(wallet,'src/shared/rpc/capability-observation-lifetime.ts'))};`);
 execFileSync('pnpm',['exec','esbuild',entry,'--bundle','--platform=browser','--format=iife','--global-name=TerminalHarness',`--outfile=${bundle}`,`--metafile=${meta}`],{cwd:wallet,stdio:'pipe'});
 const sha=f=>crypto.createHash('sha256').update(fs.readFileSync(f)).digest('hex');
 const inputs=Object.fromEntries(Object.keys(JSON.parse(fs.readFileSync(meta)).inputs).map(f=>{const file=path.resolve(wallet,f);return[file,sha(file)];}));
 const saved=[];fs.mkdirSync(path.join(root,'inputs'));for(const [i,[file,digest]]of Object.entries(inputs).entries()){const preserved=path.join(root,'inputs',String(i)+'.txt');fs.copyFileSync(file,preserved);saved.push({original:file,preserved,sha256:digest});}fs.writeFileSync(path.join(root,'inputs-manifest.json'),JSON.stringify(saved,null,2)+'\n');
 let server,context,stage='launch';const errors=[],external=[];const checks=[];
 try{
  server=http.createServer((req,res)=>{res.setHeader('Content-Security-Policy',"default-src 'self'; connect-src 'none'; script-src 'self'");res.setHeader('Cache-Control','no-store');res.setHeader('Content-Type',req.url==='/bundle.js'?'text/javascript':'text/html');res.end(req.url==='/bundle.js'?fs.readFileSync(bundle):'<!doctype html><script src="/bundle.js"></script>');});
  await new Promise(r=>server.listen(0,'127.0.0.1',r));const origin=`http://127.0.0.1:${server.address().port}`;
  context=await chromium.launchPersistentContext(path.join(root,'profile'),{executablePath:path.join(os.homedir(),'Library/Caches/ms-playwright/chromium-1243/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing'),headless:true});
  context.on('request',r=>{if(new URL(r.url()).origin!==origin)external.push(true);});
  await context.route('**/*',r=>new URL(r.request().url()).origin===origin?r.continue():r.abort());
  const page=await context.newPage();page.on('pageerror',e=>errors.push(e.name));await page.goto(origin);
  const prefix='RtdWallet NetworkAdmission:test:terminal-';
  stage='actual ignored fetch cleanup';
  const first=await page.evaluate(async(prefix)=>{
   const H=TerminalHarness;globalThis.held=H.observation(prefix+'held','held-service');await held.entered;held.session.close();await held.run;return held.result();
  },prefix);
  assert.equal(first.pending,1);assert.equal(first.phase,'unavailable');assert(first.noPositiveFields);checks.push('native original reservation survives session close while abort-ignoring fetch remains physical');
  await page.evaluate(()=>held.release());
  await require('@playwright/test').expect.poll(async()=>page.evaluate(async()=> (await held.result()).pending)).toBe(0);
  const next=await page.evaluate(async(prefix)=>{const h=TerminalHarness.observation(prefix+'held','normal');await h.run;return h.result();},prefix);
  assert.equal(next.phase,'read-contracts-assessed');assert.equal(next.faults,0);checks.push('actual cleanup settles and strict own-reservation removal permits a fresh independent observation');
  stage='known identity negative';
  const wrong=await page.evaluate(async(prefix)=>{const h=TerminalHarness.observation(prefix+'wrong','wrong-service');await h.run;return h.result();},prefix);
  assert.equal(wrong.phase,'quarantined');assert.equal(wrong.identityFaults,1);assert.equal(wrong.pending,0);checks.push('known wrong chain remains native committed Fault');
  stage='failed commit and clone';
  const negative=await page.evaluate(async(prefix)=>{
   const H=TerminalHarness,p=H.publicProfile(),s=new H.WalletReadSession(p),store=new H.WalletNetworkAdmissionStore({databaseName:prefix+'abort'});
   const ticket=await store.begin(p,[{kind:'identity',role:'fullnode'}]);const life=new H.CapabilityObservationLifetime(s,ticket),receipt=await life.fail(new Error('controlled failure'));
   let cloneRejected=false;try{await store.finishFailed(p,ticket,structuredClone(receipt));}catch{cloneRejected=true;}
   const put=IDBObjectStore.prototype.put;let aborts=0;
   IDBObjectStore.prototype.put=function(...args){const req=put.apply(this,args);req.addEventListener('success',()=>{aborts++;this.transaction.abort();},{once:true});return req;};
   let commitRejected=false;try{await store.finishFailed(p,ticket,receipt);}catch{commitRejected=true;}finally{IDBObjectStore.prototype.put=put;}
   let repeatedRejected=false;try{await store.finishFailed(p,ticket,receipt);}catch{repeatedRejected=true;}
   const row=await store.capture(p);let lostOwnerRejected=false;
   const replacement=new H.WalletNetworkAdmissionStore({databaseName:prefix+'abort'});
   const replacementReceipt=await new H.CapabilityObservationLifetime(s,ticket).fail(new Error());
   try{await replacement.finishFailed(p,ticket,replacementReceipt);}catch{lostOwnerRejected=true;}
   return{cloneRejected,commitRejected,repeatedRejected,lostOwnerRejected,aborts,pending:row.pending.length,faults:row.faults.length};
  },prefix);
  assert.deepEqual(negative,{cloneRejected:true,commitRejected:true,repeatedRejected:true,lostOwnerRejected:true,aborts:1,pending:1,faults:0});checks.push('strict native transaction abort retains pending; cloned/reused receipt and replacement store cannot clear it');
  stage='concurrent fault and sibling reservation';
  const merge=await page.evaluate(async(prefix)=>{
    const H=TerminalHarness,p=H.publicProfile(),session=new H.WalletReadSession(p);
    const a=new H.WalletNetworkAdmissionStore({databaseName:prefix+'merge'}),b=new H.WalletNetworkAdmissionStore({databaseName:prefix+'merge'});
    const own=await a.begin(p,[{kind:'graphql-domain',domain:'assets'}]);
    const other=await b.begin(p,[{kind:'graphql-domain',domain:'balances'}]);
    const sibling=await b.begin(p,[{kind:'move-group',group:'display'}]);
    await b.complete(p,other,[{kind:'graphql-domain',domain:'balances',reason:'schema'}]);
    const receipt=await new H.CapabilityObservationLifetime(session,own).fail(new Error('settled transient failure'));
    await a.finishFailed(p,own,receipt);const row=await a.capture(p);
    return{faults:row.faults,pending:row.pending.map(t=>t.id),sibling:sibling.id,own:own.id};
  },prefix);
  assert.deepEqual(merge.faults,[{kind:'graphql-domain',domain:'balances',reason:'schema'}]);assert.deepEqual(merge.pending,[merge.sibling]);assert(!merge.pending.includes(merge.own));
  checks.push('native own failure cleanup preserves a separately committed Fault and another still-pending owner');
  assert.deepEqual(errors,[]);assert.deepEqual(external,[]);
  for(const [f,d]of Object.entries(inputs))assert.equal(sha(f),d,'compiler input changed');
  fs.writeFileSync(output,JSON.stringify({passed:true,observedAt:new Date().toISOString(),checkCount:checks.length,checks,inputsSha256:inputs,preservedInputs:saved,compilerMetafileSha256:sha(meta),bundleSha256:sha(bundle),fixture:root,signatures:0,executions:0,certificateChanges:0,originalProfileWrites:0,productionDatabasesOpened:0,scope:'Current production classes + actual native strict IDB; synthetic readonly Fullnode protocol, no live chain or wallet-profile acceptance'},null,2)+'\n',{flag:'wx'});
  console.log(JSON.stringify({passed:true,checks:checks.length}));
 }catch(e){console.error(JSON.stringify({passed:false,stage,errorType:e.name,location:String(e.stack).split('\n').find(s=>s.includes('test-terminal-observation-native.cjs:')),fixture:root}));process.exitCode=1;}
 finally{await context?.close();if(server)await new Promise(r=>server.close(r));}
})().catch(e=>{console.error(JSON.stringify({passed:false,errorType:e.name}));process.exitCode=1;});
