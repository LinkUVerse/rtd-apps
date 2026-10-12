// Actual isolated empty CFT/API route and browser request outcome, never a wallet account/profile.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),http=require('node:http'),crypto=require('node:crypto'),os=require('node:os');
const {chromium,expect}=require('@playwright/test'),capture=require('./lib/C143-readonly-body-capture-v3.cjs');
const logs=path.resolve(__dirname,'../migrationToGRpcOrGraphQLDoc/workLog');
const op=path.join(os.homedir(),'.local/state/rtd-wallet-migration/dev-20261006-03/C143-actual-browser-cancellation-20261009-02');
const sha=file=>crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
const save=(file,value)=>fs.writeFileSync(file,JSON.stringify(value,null,2)+'\n',{flag:'wx',mode:0o600});
const positive=Buffer.from(JSON.stringify({data:{checkpoint:{digest:'isolated-actual-browser-fixture'}},padding:'y'.repeat(1335)}));

async function main(output){
 assert.equal(output,path.join(logs,'20261009-C143-actual-browser-cancellation-02.json'));assert(!fs.existsSync(output)&&!fs.existsSync(op));fs.mkdirSync(op,{mode:0o700});
 const executable=path.join(os.homedir(),'Library/Caches/ms-playwright/chromium-1243/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing');
 const files=[__filename,require.resolve('./lib/C143-readonly-body-capture-v3.cjs'),executable,require.resolve('@playwright/test')],inputs=Object.fromEntries(files.map(file=>[file,sha(file)]));
 const serverRequests=[],events=[],browserOutcomes=[],jobs=[];let server,context,tracker,monitor,page,result;
 try{
  server=http.createServer(async(req,res)=>{
   const url=new URL(req.url,'http://127.0.0.1');const chunks=[];for await(const chunk of req)chunks.push(chunk);const body=Buffer.concat(chunks);
   serverRequests.push({path:url.pathname,method:req.method,bodyBase64:body.toString('base64'),monotonic:Number(process.hrtime.bigint())/1e9});
   if(req.method==='GET'&&url.pathname==='/'){res.writeHead(200,{'content-type':'text/html'}).end('<!doctype html><title>C143 empty cancellation fixture</title><p>Readonly software test</p>');return;}
   if(req.method==='POST'&&['/graphql/positive','/graphql/cancel-after-body','/graphql/cancel-during-fetch'].includes(url.pathname)){
    const reply=()=>{if(!res.destroyed)res.writeHead(200,{'content-type':'application/json','content-length':positive.length,'cache-control':'no-store'}).end(positive);};
    if(url.pathname.endsWith('cancel-during-fetch'))setTimeout(reply,180);else reply();return;
   }res.writeHead(404).end();
  });await new Promise((resolve,reject)=>{server.once('error',reject);server.listen(0,'127.0.0.1',resolve);});const origin='http://127.0.0.1:'+server.address().port;
  context=await chromium.launchPersistentContext(path.join(op,'profile'),{executablePath:executable,headless:true,args:['--host-resolver-rules=MAP * ~NOTFOUND, EXCLUDE 127.0.0.1, EXCLUDE localhost']});
  tracker=capture.createDeliveryTracker(context);
  const paths=['/graphql/positive','/graphql/cancel-after-body','/graphql/cancel-during-fetch'];
  monitor=capture.create({rules:paths.map(value=>({origin,path:value,method:'POST',kind:'graphql-readonly'})),deliveryTracker:tracker,
   persist:async(row,event)=>{const receipt={sequence:events.length,event,row};events.push(receipt);save(path.join(op,'event-'+String(receipt.sequence).padStart(4,'0')+'.json'),receipt);
    if(new URL(row.url).pathname==='/graphql/cancel-after-body'&&event==='complete upstream entity persisted'){
     await page.evaluate(()=>globalThis.__C143Controller.abort());await expect.poll(()=>tracker.watch(activeRequest).peek().status).toBe('failed');
    }
   }});
  let activeRequest;context.on('request',request=>{if(paths.includes(new URL(request.url()).pathname))activeRequest=request;});
  context.on('requestfinished',request=>{if(paths.includes(new URL(request.url()).pathname))browserOutcomes.push({path:new URL(request.url()).pathname,status:'finished'});});
  context.on('requestfailed',request=>{if(paths.includes(new URL(request.url()).pathname))browserOutcomes.push({path:new URL(request.url()).pathname,status:'failed',errorText:request.failure()?.errorText});});
  await context.route('**/*',route=>{const url=new URL(route.request().url());if(url.origin===origin&&paths.includes(url.pathname)){const job=monitor.handle(route);jobs.push(job);return job;}
   if(url.origin===origin&&url.pathname==='/'&&route.request().method()==='GET')return route.continue();return route.abort();});
  page=context.pages()[0]??await context.newPage();await page.goto(origin+'/');
  async function start(pathname){await page.evaluate(pathname=>{
   globalThis.__C143Controller=new AbortController();globalThis.__C143FetchOutcome=null;
   fetch(pathname,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({query:'query WalletSnapshotAdmission { checkpoint(sequenceNumber: 0) { digest } }'}),signal:globalThis.__C143Controller.signal})
    .then(async response=>{globalThis.__C143FetchOutcome={finished:true,status:response.status,text:await response.text()};},error=>{globalThis.__C143FetchOutcome={finished:false,errorType:error.name};});
  },pathname);}
  await start(paths[0]);await expect.poll(()=>page.evaluate(()=>globalThis.__C143FetchOutcome)).not.toBe(null);await monitor.drain();
  const good=monitor.records[0];assert(good.passed&&good.browserDeliveryCompleted&&good.routeFulfillResolved&&good.browserRequestOutcome.status==='finished');
  const actualGood=await page.evaluate(()=>globalThis.__C143FetchOutcome);assert.equal(actualGood.text,positive.toString('utf8'));
  await start(paths[1]);await expect.poll(()=>page.evaluate(()=>globalThis.__C143FetchOutcome)).not.toBe(null);await monitor.drain();
  const after=monitor.records[1];assert(!after.passed&&after.upstreamBodyComplete&&!after.browserDeliveryAttempted&&!after.browserDeliveryCompleted&&!after.routeFulfillResolved);
  assert(after.browserRequestOutcome.observed&&after.browserRequestOutcome.status==='failed');assert.equal((await page.evaluate(()=>globalThis.__C143FetchOutcome)).errorType,'AbortError');
  await start(paths[2]);await expect.poll(()=>serverRequests.some(value=>value.path===paths[2])).toBe(true);await page.evaluate(()=>globalThis.__C143Controller.abort());
  await expect.poll(()=>page.evaluate(()=>globalThis.__C143FetchOutcome)).not.toBe(null);await monitor.drain();
  const during=monitor.records[2];assert(!during.passed&&during.upstreamBodyComplete&&!during.browserDeliveryAttempted&&!during.browserDeliveryCompleted);
  assert(during.browserRequestOutcome.observed&&during.browserRequestOutcome.status==='failed');assert.equal((await page.evaluate(()=>globalThis.__C143FetchOutcome)).errorType,'AbortError');
  assert.equal(monitor.records.length,3);for(const row of monitor.records){assert.equal(row.responseBase64,positive.toString('base64'));assert.equal(row.fetchOptions.maxRetries,0);assert.equal(row.fetchOptions.maxRedirects,0);}
  assert.deepEqual(browserOutcomes.map(value=>({path:value.path,status:value.status})),[{path:paths[0],status:'finished'},{path:paths[1],status:'failed'},{path:paths[2],status:'failed'}]);
  assert.deepEqual(serverRequests.filter(value=>value.method==='POST').map(value=>value.path),paths);
  const records=await monitor.close();save(path.join(op,'all-original-capture-records.json'),records);
  result={passed:true,observedAt:new Date().toISOString(),scope:'Actual empty CFT fixture route/API transport and request events only. No current extension, account, wallet services or original cold pending acceptance.',
   actualBrowserReadonlyRequests:3,actualCompleteEntitiesRetained:3,actualSuccessfulBrowserFinishObserved:1,actualAbortControllerFailuresObserved:2,
   actualAbortAfterPersistenceRetainsBody:true,actualAbortDuringUpstreamFetchRetainsBody:true,actualCancelledRequestsNeverMarkedDelivered:true,
   exactBodyBase64:positive.toString('base64'),exactBodyBytes:positive.length,actualBrowserPositiveEntity:actualGood,
   browserOutcomes,serverRequests,records,browserDeliveryIsExplicitAdapter:false,originalProfilesOpened:0,accountsImported:0,walletServiceRequests:0,
   signatures:0,executeRequests:0,nftBusinessRequests:0,actualColdPendingAccepted:false,fullNonNftM5Accepted:false,parentCompletion:false,inputsSha256:inputs};
 }catch(error){result={passed:false,observedAt:new Date().toISOString(),errorType:error.name,message:String(error.message).split('\n')[0].slice(0,250),browserOutcomes,serverRequests,records:monitor?.records??[],actualColdPendingAccepted:false,fullNonNftM5Accepted:false,parentCompletion:false,inputsSha256:inputs};process.exitCode=1;
 }finally{
  if(monitor)await monitor.close();if(tracker)tracker.close();if(context)await context.close();if(server){server.closeAllConnections();await new Promise(resolve=>server.close(resolve));}
  await Promise.all(jobs);result.allOwnBrowserAndHttpNormallyClosed=true;
  for(const file of fs.readdirSync(op)){const target=path.join(op,file);if(fs.statSync(target).isFile())result.inputsSha256[target]=sha(target);}
  save(path.join(op,'evidence.json'),result);save(output,result);console.log(JSON.stringify({passed:result.passed,actualBrowserRequests:result.actualBrowserReadonlyRequests,actualBodies:result.actualCompleteEntitiesRetained,fullColdAccepted:false}));
 }
}

if(require.main===module)main(path.resolve(process.argv[2]??'')).catch(error=>{console.error(JSON.stringify({passed:false,preflight:true,errorType:error.name,message:String(error.message).split('\n')[0].slice(0,180)}));process.exitCode=1;});
