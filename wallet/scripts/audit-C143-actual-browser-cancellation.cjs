// Actual browser requestfailed/requestfinished and preserved original API entity evidence.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),os=require('node:os'),crypto=require('node:crypto'),cp=require('node:child_process');
const logs=path.resolve(__dirname,'../migrationToGRpcOrGraphQLDoc/workLog');
const op=path.join(os.homedir(),'.local/state/rtd-wallet-migration/dev-20261006-03/C143-actual-browser-cancellation-20261009-02');
const read=file=>JSON.parse(fs.readFileSync(file)),sha=file=>crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex'),hash=bytes=>crypto.createHash('sha256').update(bytes).digest('hex');
const paths=['/graphql/positive','/graphql/cancel-after-body','/graphql/cancel-during-fetch'];

function check(record,events){
 assert.equal(record.passed,true);assert.equal(record.actualBrowserReadonlyRequests,3);assert.equal(record.actualCompleteEntitiesRetained,3);
 assert.equal(record.actualSuccessfulBrowserFinishObserved,1);assert.equal(record.actualAbortControllerFailuresObserved,2);
 for(const key of ['actualAbortAfterPersistenceRetainsBody','actualAbortDuringUpstreamFetchRetainsBody','actualCancelledRequestsNeverMarkedDelivered','allOwnBrowserAndHttpNormallyClosed'])assert.equal(record[key],true);
 for(const key of ['actualColdPendingAccepted','fullNonNftM5Accepted','parentCompletion','browserDeliveryIsExplicitAdapter'])assert.equal(record[key],false);
 for(const key of ['originalProfilesOpened','accountsImported','walletServiceRequests','signatures','executeRequests','nftBusinessRequests'])assert.equal(record[key],0);
 assert.equal(record.records.length,3);assert.deepEqual(record.browserOutcomes.map(row=>({path:row.path,status:row.status})),[{path:paths[0],status:'finished'},{path:paths[1],status:'failed'},{path:paths[2],status:'failed'}]);
 assert(record.browserOutcomes.slice(1).every(row=>row.errorText==='net::ERR_ABORTED'));
 const actualBody=Buffer.from(record.exactBodyBase64,'base64');assert.equal(actualBody.toString('base64'),record.exactBodyBase64);assert.equal(actualBody.length,record.exactBodyBytes);
 assert(record.actualBrowserPositiveEntity.finished&&record.actualBrowserPositiveEntity.status===200);assert.equal(record.actualBrowserPositiveEntity.text,actualBody.toString('utf8'));
 const posted=record.serverRequests.filter(row=>row.method==='POST');assert.deepEqual(posted.map(row=>row.path),paths);assert(posted.every(row=>row.bodyBase64===posted[0].bodyBase64));
 const bodies=new Map();for(let i=0;i<events.length;i++){assert.equal(events[i].sequence,i);assert.equal(events[i].event,events[i].row.events.at(-1).event);const rows=bodies.get(events[i].row.id)??[];rows.push(events[i]);bodies.set(events[i].row.id,rows);}assert.equal(bodies.size,3);
 for(let i=0;i<record.records.length;i++){
  const row=record.records[i],values=bodies.get(row.id);assert.equal(new URL(row.url).pathname,paths[i]);assert.deepEqual(row,values.at(-1).row);
  assert.equal(row.status,200);assert(row.upstreamFetchAttempted&&row.upstreamBodyComplete&&row.deliveryObservationRequired&&row.browserRequestOutcome.observed);
  assert.equal(row.bodyRepresentation,'complete identity entity');assert.equal(row.encodedWireBytesCaptured,false);assert.equal(row.originalRequestOverrides,false);
  assert.equal(row.responseBase64,record.exactBodyBase64);assert.equal(row.responseBytes,actualBody.length);assert.equal(row.responseSha256,hash(actualBody));
  assert.equal(row.requestBase64,posted[i].bodyBase64);assert.equal(row.fetchOptions.maxRetries,0);assert.equal(row.fetchOptions.maxRedirects,0);
  assert.equal(row.browserDeliveryCompletionMeans,'route.fulfill resolved and requestfinished observed; not application acceptance');
  assert.equal(row.browserRequestOutcome.url,row.url);assert.equal(row.browserRequestOutcome.method,'POST');assert.equal(row.browserRequestOutcome.status,i===0?'finished':'failed');
  assert.equal(row.events.at(-1).event,'capture settled');assert.equal(row.responseDisposed,true);
  for(let n=0;n<values.length;n++){
   assert.deepEqual(values[n].row.events,row.events.slice(0,n+1));if(n)assert(row.events[n].monotonic>=row.events[n-1].monotonic);
   for(const field of ['id','stage','url','method','requestBase64','requestHeadersArray','fetchOptions'])assert.deepEqual(values[n].row[field],row[field]);
   if(values[n].row.upstreamBodyComplete)for(const field of ['responseBase64','responseSha256','responseBytes','bodyRepresentation'])assert.equal(values[n].row[field],row[field]);
  }
  const entity=row.events.find(value=>value.event==='complete upstream entity persisted');assert(entity);
  if(i===0){assert(row.passed&&row.browserDeliveryAttempted&&row.browserDeliveryCompleted&&row.routeFulfillResolved);
   assert(row.events.find(value=>value.event==='browser delivery attempted').monotonic>=entity.monotonic);
  }else{assert(!row.passed&&!row.browserDeliveryAttempted&&!row.browserDeliveryCompleted&&!row.routeFulfillResolved);assert.equal(row.browserRequestOutcome.errorText,'net::ERR_ABORTED');}
  if(i===1)assert(entity.monotonic<=row.browserRequestOutcome.monotonic);
  if(i===2)assert(row.browserRequestOutcome.monotonic<entity.monotonic);
 }
}

function main(output){
 assert.equal(output,path.join(logs,'20261009-C143-actual-browser-cancellation-independent-01.json'));assert(!fs.existsSync(output));
 const proof=path.join(logs,'20261009-C143-actual-browser-cancellation-02.json'),record=read(proof);assert.equal(sha(proof),sha(path.join(op,'evidence.json')));
 for(const [file,value]of Object.entries(record.inputsSha256))assert.equal(sha(file),value);
 const eventFiles=fs.readdirSync(op).filter(file=>/^event-\d{4}\.json$/.test(file)).sort();const events=eventFiles.map(file=>read(path.join(op,file)));
 assert.deepEqual(record.records,read(path.join(op,'all-original-capture-records.json')));check(record,events);
 const first=path.join(logs,'20261009-C143-actual-browser-cancellation-01.json');assert.equal(read(first).passed,false);assert.equal(read(first).serverRequests.length,0);
 const oldTest=path.join(__dirname,'test-C143-actual-browser-cancellation.cjs'),currentTest=path.join(__dirname,'test-C143-actual-browser-cancellation-v2.cjs');
 let inverse=fs.readFileSync(currentTest,'utf8');inverse=inverse.replaceAll('C143-actual-browser-cancellation-20261009-02','C143-actual-browser-cancellation-20261009-01').replaceAll('20261009-C143-actual-browser-cancellation-02.json','20261009-C143-actual-browser-cancellation-01.json').replace('MAP * ~NOTFOUND, EXCLUDE 127.0.0.1, EXCLUDE localhost','MAP * ~NOTFOUND, EXCLUDE localhost');assert.equal(inverse,fs.readFileSync(oldTest,'utf8'));
 let rejected=0;const reject=(r,e=events)=>{assert.throws(()=>check(r,e));rejected++;};
 for(const [key,value]of [['passed',false],['actualBrowserReadonlyRequests',4],['actualCompleteEntitiesRetained',2],['actualSuccessfulBrowserFinishObserved',0],['actualAbortControllerFailuresObserved',0],
  ['actualAbortAfterPersistenceRetainsBody',false],['actualAbortDuringUpstreamFetchRetainsBody',false],['actualCancelledRequestsNeverMarkedDelivered',false],['allOwnBrowserAndHttpNormallyClosed',false],
  ['actualColdPendingAccepted',true],['fullNonNftM5Accepted',true],['parentCompletion',true],['browserDeliveryIsExplicitAdapter',true],['originalProfilesOpened',1],['accountsImported',1],
  ['walletServiceRequests',1],['signatures',1],['executeRequests',1],['nftBusinessRequests',1]])reject({...record,[key]:value});
 for(const mutate of [r=>r.records[1].browserDeliveryCompleted=true,r=>r.records[1].browserRequestOutcome.observed=false,r=>r.records[2].upstreamBodyComplete=false,
  r=>r.records[0].responseBase64='',r=>r.records[0].routeFulfillResolved=false,r=>r.browserOutcomes[2].status='finished',r=>r.serverRequests.push({...r.serverRequests.at(-1)}),
  r=>r.actualBrowserPositiveEntity.text='different']){const changed=structuredClone(record);mutate(changed);reject(changed);}
 const changedEvents=structuredClone(events);changedEvents.find(value=>value.event==='complete upstream entity persisted').row.responseBase64='';reject(record,changedEvents);
 for(const dir of [op,op.replace('20261009-02','20261009-01')]){
  assert(!fs.existsSync(path.join(dir,'profile','SingletonLock'))&&!fs.existsSync(path.join(dir,'profile','SingletonSocket')));
  const pids=cp.spawnSync('pgrep',['-f',path.join(dir,'profile')],{encoding:'utf8'}).stdout.trim().split('\n').filter(value=>/^\d+$/.test(value)&&Number(value)!==process.pid&&Number(value)!==process.ppid);
  for(const pid of pids){const comm=cp.spawnSync('ps',['-p',pid,'-o','comm='],{encoding:'utf8'}).stdout;assert(!/Google Chrome for Testing(?: Helper)?\s*$/.test(comm));}
 }
 const files=[__filename,proof,first,oldTest,currentTest,path.join(op,'evidence.json'),path.join(op,'all-original-capture-records.json'),...eventFiles.map(file=>path.join(op,file))];
 const result={passed:true,observedAt:new Date().toISOString(),actualBrowserRequestsVerified:3,actualRetainedCompleteIdentityEntities:3,
  actualSuccessfulBrowserRequestFinishedVerified:1,actualBrowserRequestFailedAbortEventsVerified:2,actualDuringAndAfterBodyAbortRetentionVerified:true,
  actualCancellationNeverAcceptedAsDelivery:true,allIntermediateEntityReceiptsVerified:true,savedEventReceiptsVerified:events.length,scopeMutantsRejected:rejected,
  actualIdentityBodySha256:hash(Buffer.from(record.exactBodyBase64,'base64')),actualIdentityBodyBytes:record.exactBodyBytes,
  oneSetupSourceInverseVerified:true,failedFirstSetupRetained:true,actualOwnEmptyBrowsersAbsent:true,allProfilesNormallyClosed:true,browserDeliveryIsExplicitAdapter:false,
  originalProfilesOpened:0,accountsImported:0,walletServiceRequests:0,signatures:0,executeRequests:0,nftBusinessRequests:0,
  actualColdPendingAccepted:false,fullNonNftM5Accepted:false,parentCompletion:false,
  scope:'Actual empty CFT/loopback fixture/API routes and browser finish/abort events only; no current extension, accounts, wallet services or original pending/cold acceptance.',
  inputsSha256:Object.fromEntries(files.map(file=>[file,sha(file)]))};
 fs.writeFileSync(output,JSON.stringify(result,null,2)+'\n',{flag:'wx',mode:0o600});console.log(JSON.stringify({passed:true,actualBodies:3,actualBrowserAbortEvents:2,scopeMutantsRejected:rejected,fullColdAccepted:false}));
}

if(require.main===module)main(path.resolve(process.argv[2]??''));
