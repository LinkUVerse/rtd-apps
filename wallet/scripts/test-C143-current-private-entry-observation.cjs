// Current empty CFT tooling test only. Never open a wallet profile or call its private signer.
process.env.PW_EXPERIMENTAL_SERVICE_WORKER_NETWORK_EVENTS='1';
const fs=require('node:fs'),path=require('node:path'),os=require('node:os'),crypto=require('node:crypto'),assert=require('node:assert/strict');
const {chromium}=require('@playwright/test'),helper=require('./lib/C143-private-signer-entry-observation.cjs');
const lineage=require('./lib/C136-product-source-lineage.cjs');
const logs=path.resolve(__dirname,'../migrationToGRpcOrGraphQLDoc/workLog');
const directory=path.join(os.homedir(),'.local/state/rtd-wallet-migration/dev-20261006-03/current-C143-direct-counter-empty-20261009-01');
const sha=file=>crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
function save(file,value){fs.writeFileSync(file,JSON.stringify(value,null,2)+'\n',{flag:'wx',mode:0o600});}

async function main(output){
 assert.equal(output,path.join(logs,'20261009-C143-current-private-entry-observation-01.json'));
 assert(!fs.existsSync(output)&&!fs.existsSync(directory));
 const qualification=JSON.parse(fs.readFileSync(lineage.qualificationFile)),source=lineage.validate(qualification.originalSource,qualification.buildFile);
 const buildFile=path.join(logs,'20261009-default-generation-positive-C136-build-01.json'),build=JSON.parse(fs.readFileSync(buildFile));
 assert.deepEqual(source,build.sourceAfter);for(const [file,value]of Object.entries(build.artifacts))assert.equal(sha(path.join(build.output,file)),value);
 const inputs=Object.fromEntries([__filename,require.resolve('./lib/C143-private-signer-entry-observation.cjs'),require.resolve('./lib/current-extension-worker-source-bytes.cjs'),
  lineage.qualificationFile,buildFile,path.join(build.output,'background.js'),path.join(build.output,'background.js.map'),path.join(logs,'20261009-C143-non-nft-cold-observation-design.md')].map(file=>[file,sha(file)]));
 fs.mkdirSync(directory,{mode:0o700});
 let context,monitor,fixtureSession,result;const traffic=[],snapshots=[];
 try{
  context=await chromium.launchPersistentContext(path.join(directory,'profile'),{executablePath:path.join(os.homedir(),'Library/Caches/ms-playwright/chromium-1243/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing'),headless:true,
   args:['--disable-extensions-except='+build.output,'--load-extension='+build.output,'--host-resolver-rules=MAP * ~NOTFOUND, EXCLUDE localhost']});
  await context.route('**/*',route=>{const url=route.request().url();if(/^https?:/.test(url)){traffic.push({url,method:route.request().method(),blocked:true});return route.abort();}return route.continue();});
  let worker=context.serviceWorkers()[0]??await context.waitForEvent('serviceworker',{timeout:30000});
  const loaded=await require('./lib/current-extension-worker-source-bytes.cjs').ensure(context,worker,build.output);worker=loaded.worker;
  const bytes=loaded.evidence.after??loaded.evidence.before;assert(bytes.matchesDisk);
  assert.equal(crypto.createHash('sha256').update(Buffer.from(bytes.actualSourceBase64,'base64')).digest('hex'),bytes.workerSha256);
  save(path.join(directory,'actual-worker-source.json'),loaded.evidence);
  monitor=await helper.observe(context,worker,build.output);save(path.join(directory,'production-entry-binding.json'),monitor.evidence);
  snapshots.push(await monitor.snapshot('empty current production worker after observer setup'));
  assert(snapshots.every(value=>Object.values(value.counts).every(count=>count===0)));
  // A separate no-crypto fixture proves the actual CDP condition counts
  // asynchronous calls once without pausing. It never invokes wallet methods.
  fixtureSession=await context.browser().newBrowserCDPSession();
  const target=(await fixtureSession.send('Target.getTargets')).targetInfos.find(value=>value.type==='service_worker'&&value.url===worker.url());assert(target);
  const attached=await fixtureSession.send('Target.attachToTarget',{targetId:target.targetId,flatten:false});
  const pending=new Map();let next=0,fixtureId,paused=0;
  const command=(method,params={})=>new Promise((resolve,reject)=>{
   const id=++next,timer=setTimeout(()=>{pending.delete(id);reject(new Error('Fixture debugger deadline'));},10000);
   pending.set(id,{resolve,reject,timer});fixtureSession.send('Target.sendMessageToTarget',{sessionId:attached.sessionId,message:JSON.stringify({id,method,params})}).catch(error=>{clearTimeout(timer);pending.delete(id);reject(error);});
  });
  fixtureSession.on('Target.receivedMessageFromTarget',event=>{
   if(event.sessionId!==attached.sessionId)return;const message=JSON.parse(event.message);
   if(message.method==='Debugger.scriptParsed'&&message.params.url==='C143-no-crypto-counter-fixture.js')fixtureId=message.params.scriptId;
   if(message.method==='Debugger.paused'){paused++;command('Debugger.resume').catch(()=>{});}
   if(message.id&&pending.has(message.id)){const entry=pending.get(message.id);clearTimeout(entry.timer);pending.delete(message.id);message.error?entry.reject(new Error('Fixture debugger protocol refusal')):entry.resolve(message.result);}
  });
  const evaluate=async expression=>{const value=await command('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true});assert(!value.exceptionDetails);return value.result.value;};
  await command('Debugger.enable');
  const key='__C143FixtureEntries_'+crypto.randomBytes(16).toString('hex'),token=crypto.randomUUID(),module=helper.modules[0];
  const fixtureSource=`globalThis[${JSON.stringify(key)}]={token:${JSON.stringify(token)},counts:{${JSON.stringify(module)}:0}};\nglobalThis.__C143NoCryptoFixture=async function(){\n const value=await Promise.resolve(7);\n return value;\n};\n//# sourceURL=C143-no-crypto-counter-fixture.js`;
  await evaluate(fixtureSource);assert(fixtureId);
  const locations=await command('Debugger.getPossibleBreakpoints',{start:{scriptId:fixtureId,lineNumber:2,columnNumber:0},end:{scriptId:fixtureId,lineNumber:3,columnNumber:0},restrictToFunction:true});assert(locations.locations.length);
  const first=locations.locations[0],location={scriptId:fixtureId,lineNumber:first.lineNumber,columnNumber:first.columnNumber};
  const breakpoint=await command('Debugger.setBreakpoint',{location,condition:helper.conditionFor(key,module,token)});assert.deepEqual(breakpoint.actualLocation,location);
  const fixtureSnapshots=[];
  fixtureSnapshots.push(await evaluate(`globalThis[${JSON.stringify(key)}].counts[${JSON.stringify(module)}]`));
  assert.equal(await evaluate('globalThis.__C143NoCryptoFixture()'),7);
  fixtureSnapshots.push(await evaluate(`globalThis[${JSON.stringify(key)}].counts[${JSON.stringify(module)}]`));
  assert.deepEqual(await evaluate('Promise.all([globalThis.__C143NoCryptoFixture(),globalThis.__C143NoCryptoFixture()])'),[7,7]);
  fixtureSnapshots.push(await evaluate(`globalThis[${JSON.stringify(key)}].counts[${JSON.stringify(module)}]`));
  assert.deepEqual(fixtureSnapshots,[0,1,3]);assert.equal(paused,0);
  await command('Debugger.removeBreakpoint',{breakpointId:breakpoint.breakpointId});
  assert.equal(await evaluate(`delete globalThis[${JSON.stringify(key)}]&&delete globalThis.__C143NoCryptoFixture`),true);
  await command('Debugger.disable');await fixtureSession.detach();fixtureSession=null;
  save(path.join(directory,'actual-no-crypto-fixture.json'),{fixtureOnly:true,fixtureSnapshots,actualLocation:location,pausedEvents:paused,fixtureSourceSha256:crypto.createHash('sha256').update(fixtureSource).digest('hex'),walletMethodsInvoked:0});
  // Reattach the production observer because disabling the independent fixture
  // debugger may alter VM breakpoint state. Never pretend stale counters live.
  const cleanupBeforeReattach=await monitor.close();monitor=null;
  monitor=await helper.observe(context,worker,build.output);snapshots.push(await monitor.snapshot('fresh production observer after fixture teardown'));
  assert(snapshots.every(value=>Object.values(value.counts).every(count=>count===0)));
  const cleanup=await monitor.close();monitor=null;
  assert.deepEqual(lineage.validate(qualification.originalSource,qualification.buildFile),source);
  assert(Object.entries(inputs).every(([file,value])=>sha(file)===value));
  save(path.join(directory,'production-entry-snapshots.json'),{snapshots,cleanupBeforeReattach,cleanup});
  result={passed:true,observedAt:new Date().toISOString(),scope:'Current empty-production-worker entry binding plus separate no-crypto CDP fixture only. No original pending/cold or wallet business acceptance.',
   currentThreePrivateEntriesActuallyBound:true,actualCurrentSourceAndMapHeld:true,emptyProductionObservedCounts:snapshots,
   actualSeparateNoCryptoFixtureCounts:[0,1,3],actualFixturePausedEvents:0,allOwnObserverStateNormallyRemoved:true,
   originalProfilesOpened:0,accountsImported:0,walletPrivateMethodsInvoked:0,signatures:0,executeRequests:0,nftBusinessRequests:0,
   actualColdPendingAccepted:false,fullNonNftM5Accepted:false,parentCompletion:false,traffic,inputsSha256:inputs};
 }catch(error){
  result={passed:false,observedAt:new Date().toISOString(),errorType:error.name,message:String(error.message).split('\n')[0].slice(0,180),snapshots,traffic,actualColdPendingAccepted:false,fullNonNftM5Accepted:false,parentCompletion:false,inputsSha256:inputs};process.exitCode=1;
 }finally{
  if(monitor)try{await monitor.close();}catch(error){result.monitorCleanupFailed=error.name;result.passed=false;process.exitCode=1;}
  if(fixtureSession)await fixtureSession.detach().catch(()=>{});
  if(context)await context.close();
  for(const file of ['actual-worker-source.json','production-entry-binding.json','actual-no-crypto-fixture.json','production-entry-snapshots.json']){
   const target=path.join(directory,file);if(fs.existsSync(target))result.inputsSha256[target]=sha(target);
  }
  save(path.join(directory,'evidence.json'),result);save(output,result);console.log(JSON.stringify({passed:result.passed,currentEntriesBound:result.currentThreePrivateEntriesActuallyBound??false,actualColdPendingAccepted:false}));
 }
}

if(require.main===module)main(path.resolve(process.argv[2]??'')).catch(error=>{console.error(JSON.stringify({passed:false,preflight:true,errorType:error.name,message:String(error.message).split('\n')[0].slice(0,180)}));process.exitCode=1;});
