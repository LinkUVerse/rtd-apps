// Independent review of complete saved entities, exact refusal boundaries and fixture-only scope.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),os=require('node:os'),crypto=require('node:crypto');
const logs=path.resolve(__dirname,'../migrationToGRpcOrGraphQLDoc/workLog');
const op=path.join(os.homedir(),'.local/state/rtd-wallet-migration/dev-20261006-03/C143-readonly-body-transport-20261009-02');
const read=file=>JSON.parse(fs.readFileSync(file)),sha=file=>crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
const hash=bytes=>crypto.createHash('sha256').update(bytes).digest('hex');

function check(record,receipts){
 assert.equal(record.passed,true);assert.equal(record.actualHttpFixtureRequests,11);assert.equal(record.actualFixedDigestFixtureRequests,1);assert.equal(record.actualReadonlyCases,17);
 for(const key of ['actualCancelledDeliveryBodyRetained','actualNoRedirectFollow','actualNoNetworkRetry','actual401WithoutAuthenticationRetry','actualTruncationRejected','browserDeliveryIsExplicitAdapter','bodyCapBoundsRetentionOnly','allOwnHttpListenersNormallyClosed'])assert.equal(record[key],true);
 for(const key of ['actualColdPendingAccepted','fullNonNftM5Accepted','parentCompletion','encodedWireBytesCaptured'])assert.equal(record[key],false);
 for(const key of ['originalProfilesOpened','walletServiceRequests','signatures','executeRequests','nftBusinessRequests'])assert.equal(record[key],0);
 assert.equal(record.actualRetentionCapRefusals,2);assert.equal(record.actualUnsupportedEncodingRefusals,1);assert.equal(record.actualForbiddenRequestsNotForwarded,6);
 assert.equal(record.serverRequests.length,11);assert.equal(record.adapters.length,17);assert.equal(record.eventReceipts,receipts.length);assert.equal(receipts.length,86);
 for(let i=0;i<receipts.length;i++){const value=receipts[i];assert.equal(value.sequence,i);assert.equal(value.event,value.row.events.at(-1).event);}
 const grouped=new Map();for(const value of receipts){const values=grouped.get(value.row.id)??[];values.push(value);grouped.set(value.row.id,values);}
 assert.equal(grouped.size,18);
 for(const values of grouped.values()){
  const final=values.at(-1).row;assert.equal(final.events.at(-1).event,'capture settled');assert.equal(final.originalRequestOverrides,false);
  assert.equal(final.encodedWireBytesCaptured,false);assert.equal(final.browserDeliveryCompletionMeans,'route.fulfill resolved; not application consumption');
  assert.equal(final.fetchOptions.maxRedirects,0);assert.equal(final.fetchOptions.maxRetries,0);assert(final.fetchOptions.timeout>0&&final.fetchOptions.timeout<=25000);
  for(let i=0;i<final.events.length;i++){assert.equal(values[i].row.events.length,i+1);assert.equal(values[i].event,final.events[i].event);if(i)assert(final.events[i].monotonic>=final.events[i-1].monotonic);}
  for(const value of values){const saved=value.row;assert.deepEqual(saved.events,final.events.slice(0,saved.events.length));
   for(const field of ['id','stage','url','method','requestBase64','requestHeadersArray','fetchOptions'])assert.deepEqual(saved[field],final[field]);
   if(saved.upstreamBodyComplete)for(const field of ['bodyRepresentation','responseBase64','responseSha256','responseBytes'])assert.equal(saved[field],final[field]);
  }
  if(final.upstreamBodyComplete){
   assert.equal(final.bodyRepresentation,'complete identity entity');const body=Buffer.from(final.responseBase64,'base64');assert.equal(body.toString('base64'),final.responseBase64);
   assert.equal(body.length,final.responseBytes);assert.equal(hash(body),final.responseSha256);
   if(final.headers['content-length']!==undefined)assert.equal(body.length,Number(final.headers['content-length']));
   assert(['identity',''].includes(String(final.headers['content-encoding']??'identity').toLowerCase()));
   const retained=final.events.findIndex(value=>value.event==='complete upstream entity persisted');assert(retained>=0);
   if(final.browserDeliveryAttempted){const attempt=final.events.findIndex(value=>value.event==='browser delivery attempted');assert(attempt>retained);}
  }else{assert.equal(final.responseBase64,null);assert.equal(final.responseSha256,null);assert.equal(final.responseBytes,null);assert.equal(final.browserDeliveryAttempted,false);}
  if(final.browserDeliveryCompleted){assert(final.upstreamBodyComplete&&final.browserDeliveryAttempted&&final.passed);assert(final.status<300||final.status>=400);}
  if(!final.upstreamFetchAttempted){assert.equal(final.responseDisposed,false);assert.equal(final.upstreamBodyComplete,false);}
 }
 for(const adapter of record.adapters){
  const row=adapter.record;assert.deepEqual(row,grouped.get(row.id).at(-1).row);
  assert.equal(adapter.fetchCalls,row.upstreamFetchAttempted?1:0);assert.equal(adapter.fulfillCalls,row.browserDeliveryAttempted?1:0);
  assert.equal(adapter.abortCalls,row.passed?0:1);assert.equal(adapter.persistedBeforeDelivery,row.browserDeliveryAttempted);
  if(row.browserDeliveryAttempted)assert.equal(adapter.fulfillBodyBase64,row.responseBase64);
  if(row.upstreamFetchAttempted)assert.deepEqual(adapter.fetchOptions,row.fetchOptions);
 }
 const positive=record.adapters[0].record,cancelled=record.adapters[1].record;
 assert(positive.passed&&positive.browserDeliveryCompleted);assert(!cancelled.passed&&cancelled.upstreamBodyComplete&&cancelled.browserDeliveryAttempted&&!cancelled.browserDeliveryCompleted);
 assert.equal(positive.responseBase64,cancelled.responseBase64);assert.equal(positive.responseSha256,record.actualPositiveIdentityEntitySha256);assert.equal(positive.responseBytes,record.actualPositiveIdentityEntityBytes);
 const redirect=record.adapters.find(value=>value.path==='/redirect').record;
 assert.equal(redirect.status,302);assert(redirect.upstreamBodyComplete&&!redirect.passed&&!redirect.browserDeliveryAttempted&&!redirect.browserDeliveryCompleted);
 assert.equal(Buffer.from(redirect.responseBase64,'base64').toString('utf8'),'redirect body');
 const expected=['/positive','/cancel','/notfound','/denied','/reset','/truncated','/redirect','/timeout','/too-large','/too-large-no-length','/encoded'];
 assert.deepEqual(record.serverRequests.map(value=>value.path),expected);
 const requestBase64=positive.requestBase64;
 for(const row of record.serverRequests){assert.equal(row.method,'POST');assert.equal(row.headers['x-c143-original-request'],row.path);assert.equal(row.bodyBase64,requestBase64);}
 for(const row of record.adapters.slice(11)){assert.equal(row.fetchCalls,0);assert(!row.record.upstreamFetchAttempted&&!row.record.upstreamBodyComplete&&!row.record.passed);}
 const fixed=[...grouped.values()].map(values=>values.at(-1).row).find(row=>row.kind==='grpc-readonly');assert(fixed&&fixed.passed&&fixed.upstreamBodyComplete);
 assert.equal(new URL(fixed.url).pathname,'/rtd.rpc.v2.LedgerService/GetTransaction');assert.equal(Buffer.from(fixed.requestBase64,'base64').toString('utf8'),'fixed-existing-recovery-digest');
 assert.equal(fixed.headers['grpc-status'],'5');assert.equal(fixed.responseBytes,0);
}

function main(output){
 assert.equal(output,path.join(logs,'20261009-C143-readonly-body-transport-independent-02.json'));assert(!fs.existsSync(output));
 const proof=path.join(logs,'20261009-C143-readonly-body-transport-02.json'),record=read(proof);assert.equal(sha(proof),sha(path.join(op,'evidence.json')));
 for(const [file,value]of Object.entries(record.inputsSha256))assert.equal(sha(file),value);
 const files=fs.readdirSync(op).filter(value=>/^event-\d{4}\.json$/.test(value)).sort();const receipts=files.map(value=>read(path.join(op,value)));check(record,receipts);
 // Complete-source inverse checks; retain the failed first attempt and both producers.
 const helperFile=path.join(__dirname,'lib/C143-readonly-body-capture-v2.cjs'),oldHelperFile=path.join(__dirname,'lib/C143-readonly-body-capture.cjs');
 let inverse=fs.readFileSync(helperFile,'utf8');inverse=inverse.replace("\n   assert(row.status<300||row.status>=400,'Redirect response is retained but not delivered');",'');
 inverse=inverse.replace("await retain(row,row.upstreamBodyComplete?(row.browserDeliveryAttempted?'browser delivery failed after retained entity':'readonly response refused after retained entity'):'request or upstream capture failed');","await retain(row,row.upstreamBodyComplete?'browser delivery failed after retained entity':'request or upstream capture failed');");
 assert.equal(inverse,fs.readFileSync(oldHelperFile,'utf8'));
 const testFile=path.join(__dirname,'test-C143-readonly-body-capture-v2.cjs'),oldTestFile=path.join(__dirname,'test-C143-readonly-body-capture.cjs');let testInverse=fs.readFileSync(testFile,'utf8');
 for(const [a,b]of [['./lib/C143-readonly-body-capture-v2.cjs','./lib/C143-readonly-body-capture.cjs'],['C143-readonly-body-transport-20261009-02','C143-readonly-body-transport-20261009-01'],['20261009-C143-readonly-body-transport-02.json','20261009-C143-readonly-body-transport-01.json']])testInverse=testInverse.replaceAll(a,b);
 testInverse=testInverse.replace("for(const endpoint of ['/reset','/truncated'])","for(const endpoint of ['/reset','/redirect','/truncated'])");
 testInverse=testInverse.replace("const redirect=await run('/redirect');assert(!redirect.passed&&redirect.status===302&&redirect.upstreamBodyComplete&&!redirect.browserDeliveryAttempted&&!redirect.browserDeliveryCompleted);assert.equal(serverRequests.filter(row=>row.path==='/redirect').length,1);\n  ",'');
 assert.equal(testInverse,fs.readFileSync(oldTestFile,'utf8'));assert.equal(read(path.join(logs,'20261009-C143-readonly-body-transport-01.json')).passed,false);
 let rejected=0;const reject=(r,e=receipts)=>{assert.throws(()=>check(r,e));rejected++;};
 for(const [key,value]of [['passed',false],['actualHttpFixtureRequests',12],['actualFixedDigestFixtureRequests',0],['actualReadonlyCases',18],
  ['actualCancelledDeliveryBodyRetained',false],['actualNoRedirectFollow',false],['actualNoNetworkRetry',false],['actual401WithoutAuthenticationRetry',false],
  ['actualTruncationRejected',false],['browserDeliveryIsExplicitAdapter',false],['bodyCapBoundsRetentionOnly',false],['allOwnHttpListenersNormallyClosed',false],
  ['actualColdPendingAccepted',true],['fullNonNftM5Accepted',true],['parentCompletion',true],['encodedWireBytesCaptured',true],['originalProfilesOpened',1],
  ['walletServiceRequests',1],['signatures',1],['executeRequests',1],['nftBusinessRequests',1],['actualRetentionCapRefusals',0],['actualUnsupportedEncodingRefusals',0],['actualForbiddenRequestsNotForwarded',0]])reject({...record,[key]:value});
 for(const mutate of [r=>r.adapters[1].record.browserDeliveryCompleted=true,r=>r.adapters[1].record.upstreamBodyComplete=false,r=>r.adapters[0].record.responseSha256='wrong',
  r=>r.adapters[0].record.fetchOptions.maxRetries=1,r=>r.adapters[0].record.fetchOptions.maxRedirects=1,r=>r.adapters[0].persistedBeforeDelivery=false,
  r=>r.adapters[11].fetchCalls=1,r=>r.serverRequests.push({...r.serverRequests[0],path:'/redirect-target'})]){const changed=structuredClone(record);mutate(changed);reject(changed);}
 const eventChange=structuredClone(receipts);eventChange.find(value=>value.event==='complete upstream entity persisted').row.responseBase64='';reject(record,eventChange);
 const artifacts=[__filename,proof,path.join(op,'evidence.json'),helperFile,oldHelperFile,testFile,oldTestFile,path.join(logs,'20261009-C143-readonly-body-transport-01.json'),...files.map(file=>path.join(op,file))];
 const result={passed:true,observedAt:new Date().toISOString(),actualFixtureHttpRequestsVerified:11,actualFixedDigestFixtureEntityVerified:true,
  actualCompleteEntityBeforeDeliveryVerified:true,actualCancelledDeliveryEntityPreserved:true,actualRedirectEntityRetainedWithoutDelivery:true,
  actualNoRetryAndNoRedirectFollowVerified:true,actualIdentityEntitySha256:record.actualPositiveIdentityEntitySha256,actualIdentityEntityBytes:record.actualPositiveIdentityEntityBytes,
  actualRetentionCapAndEncodingRefusalsVerified:true,actualForbiddenRequestsNeverForwarded:true,completeSourceInverseChecks:2,failedFirstAttemptPreserved:true,
  savedEventReceiptsVerified:receipts.length,scopeMutantsRejected:rejected,browserDeliveryIsExplicitAdapter:true,encodedWireBytesCaptured:false,
  originalProfilesOpened:0,walletServiceRequests:0,signatures:0,executeRequests:0,nftBusinessRequests:0,
  actualColdPendingAccepted:false,fullNonNftM5Accepted:false,parentCompletion:false,
  scope:'Loopback HTTP/installed APIRequestContext and explicit delivery adapter only; not actual browser cancellation or original pending/cold business acceptance.',
  inputsSha256:Object.fromEntries(artifacts.map(file=>[file,sha(file)]))};
 fs.writeFileSync(output,JSON.stringify(result,null,2)+'\n',{flag:'wx',mode:0o600});console.log(JSON.stringify({passed:true,eventReceipts:receipts.length,scopeMutantsRejected:rejected,fullColdAccepted:false}));
}

if(require.main===module)main(path.resolve(process.argv[2]??''));
