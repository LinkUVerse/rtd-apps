// Read native Chrome extension inventory and public budget in a fresh task-owned profile.
const fs=require('node:fs'),path=require('node:path'),os=require('node:os'),crypto=require('node:crypto'),assert=require('node:assert/strict');
const {chromium,expect}=require('@playwright/test');
(async()=>{
 const [output,profile]=process.argv.slice(2),w=path.resolve(__dirname,'..'),log=path.join(w,'migrationToGRpcOrGraphQLDoc/workLog'),buildFile=path.join(log,'20261006-C28-name-production-build-01.json');
 const read=f=>JSON.parse(fs.readFileSync(f)),sha=f=>crypto.createHash('sha256').update(fs.readFileSync(f)).digest('hex'),build=read(buildFile);
 assert(build.passed&&!fs.existsSync(output)&&!fs.existsSync(profile)&&path.dirname(path.resolve(profile))===path.join(os.homedir(),'.local/state/rtd-wallet-migration/dev-20261003-01'));
 for(const[f,h]of Object.entries(build.artifacts))assert.equal(sha(path.join(build.output,f)),h);
 let context,proof,stage='fresh native Chrome inventory';const checks=[],traffic=[],forbidden=[],errors=[];
 const check=(label,value)=>{assert(value,label);checks.push({label,passed:true})};
 try{
  context=await chromium.launchPersistentContext(profile,{executablePath:path.join(os.homedir(),'Library/Caches/ms-playwright/chromium-1243/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing'),headless:true,args:[`--disable-extensions-except=${build.output}`,`--load-extension=${build.output}`]});
  context.on('request',r=>{const u=new URL(r.url());if(['http:','https:'].includes(u.protocol))traffic.push({origin:u.origin,path:u.pathname,method:r.method()})});
  await context.route('**/*',route=>{const r=route.request(),u=new URL(r.url());if(['http:','https:'].includes(u.protocol)&&(!(u.hostname==='127.0.0.1'&&['39400','39610','39613','39616'].includes(u.port))||/\/(SimulateTransaction|ExecuteTransaction)$/.test(u.pathname)||r.method()!=='POST'||String(r.postData()).includes('"jsonrpc"'))){forbidden.push({origin:u.origin,path:u.pathname});return route.abort()}return route.continue()});
  const first=context.serviceWorkers()[0]||await context.waitForEvent('serviceworker'),loaded=await require('./lib/current-extension-worker.cjs').ensure(context,first,build.output),worker=loaded.worker,workerSource=loaded.evidence.after??loaded.evidence.before;
  check('exact current production worker',workerSource.matchesDisk&&workerSource.workerSha256===build.artifacts['background.js']);
  const page=await context.newPage();page.on('pageerror',e=>errors.push(e.name));await page.goto('chrome://extensions');await expect(page.locator('extensions-item')).toHaveCount(1);
  const inventory=await page.locator('extensions-item').evaluateAll(items=>items.map(item=>({id:item.data.id,name:item.data.name,state:item.data.state,type:item.data.type,location:item.data.location})));
  check('native Chrome has exactly one enabled extension in this task profile',inventory.length===1&&inventory[0].id===new URL(worker.url()).host&&inventory[0].state==='ENABLED');
  stage='actual same-chain public service budget';
  const observed=await worker.evaluate(async()=>{const r=await fetch('http://127.0.0.1:39610/graphql',{method:'POST',headers:{'content-type':'application/json'},credentials:'omit',redirect:'error',body:JSON.stringify({query:'{ chainIdentifier serviceConfig { maxQueryDepth maxQueryNodes maxOutputNodes maxQueryPayloadSize } }'})});return{status:r.status,body:await r.json()}});
  check('actual public GraphQL same H0 without partial errors',observed.status===200&&(!observed.body.errors||observed.body.errors.length===0)&&observed.body.data.chainIdentifier==='3tEPxLxUysGx4gfr8UEycvH7xohMWuwKVbTX5np4TCYj');
  assert.deepEqual(observed.body.data.serviceConfig,{maxQueryDepth:20,maxQueryNodes:300,maxOutputNodes:1000000,maxQueryPayloadSize:5000});check('all four public runtime budgets match retained operations contract',true);
  check('no page error forbidden external legacy simulation or Execute request',errors.length===0&&forbidden.length===0&&traffic.every(row=>['http://127.0.0.1:39400','http://127.0.0.1:39610','http://127.0.0.1:39613','http://127.0.0.1:39616'].includes(row.origin)));
  proof={passed:true,observedAt:new Date().toISOString(),source:build.sourceAfter,profile,checks,inventory,workerSource,observed,traffic,errors,forbidden,simulations:0,signatures:0,executeRequests:0,certificateChanges:0,originalProfilesOpened:0,inputsSha256:Object.fromEntries([__filename,buildFile,path.join(__dirname,'lib/current-extension-worker.cjs')].map(f=>[f,sha(f)])),scope:'Actual current production native Chrome inventory in a fresh isolated task profile, one enabled wallet extension and actual same-H0 public service budgets only. No user main browser inspection/edit, original profiles, business traffic completeness, capacity/SLA, CA or permission acceptance.'};
 }catch(e){proof={passed:false,stage,errorType:e.name,message:String(e.message).slice(0,1000),profile,checks,traffic,errors,forbidden,simulations:0,signatures:0,executeRequests:0};process.exitCode=1}
 finally{if(context)await context.close();fs.writeFileSync(output,JSON.stringify(proof,null,2)+'\n',{flag:'wx',mode:0o600});console.log(JSON.stringify({passed:proof.passed,checks:checks.length,executeRequests:0}))}
})().catch(e=>{console.error(JSON.stringify({passed:false,errorType:e.name}));process.exitCode=1});
