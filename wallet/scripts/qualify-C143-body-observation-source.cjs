// Source inverse plus explicit EventEmitter lifecycle fixtures, not cold acceptance.
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),crypto=require('node:crypto');
const {EventEmitter}=require('node:events');
const logs=path.resolve(__dirname,'../migrationToGRpcOrGraphQLDoc/workLog');
const v3=path.join(__dirname,'lib/C143-readonly-body-capture-v3.cjs'),v2=path.join(__dirname,'lib/C143-readonly-body-capture-v2.cjs');
const sha=file=>crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');

async function main(){
 const output=path.join(logs,'20261009-C143-v3-complete-source-inverse-02.json');assert(!fs.existsSync(output));
 let source=fs.readFileSync(v3,'utf8');
 const replace=(a,b)=>{assert(source.includes(a));source=source.replace(a,b);};
 replace("function create({rules,fixedDigest,decodeLookup,persist,stage=()=>'',maxBodyBytes=128*1024*1024,timeout=25000,deliveryTracker=null})","function create({rules,fixedDigest,decodeLookup,persist,stage=()=>'',maxBodyBytes=128*1024*1024,timeout=25000})");
 replace('const request=route.request(),delivery=deliveryTracker?.watch(request),row={','const request=route.request(),row={');
 replace("browserDeliveryAttempted:false,browserDeliveryCompleted:false,routeFulfillResolved:false,deliveryObservationRequired:Boolean(delivery),browserRequestOutcome:null,\n   browserDeliveryCompletionMeans:delivery?'route.fulfill resolved and requestfinished observed; not application acceptance':'route.fulfill resolved; not application consumption',","browserDeliveryAttempted:false,browserDeliveryCompleted:false,browserDeliveryCompletionMeans:'route.fulfill resolved; not application consumption',");
 replace("if(delivery&&delivery.peek().status==='failed'){row.browserRequestOutcome=delivery.peek();assert.fail('Browser request already failed after entity capture');}\n   row.browserDeliveryAttempted=true;await retain(row,'browser delivery attempted');\n   await route.fulfill({response,body});row.routeFulfillResolved=true;\n   if(delivery){row.browserRequestOutcome=await delivery.wait(timeout);assert(row.browserRequestOutcome.observed&&row.browserRequestOutcome.status==='finished','Browser delivery was not observed finished');}\n   row.browserDeliveryCompleted=true;row.passed=true;","row.browserDeliveryAttempted=true;await retain(row,'browser delivery attempted');\n   await route.fulfill({response,body});row.browserDeliveryCompleted=true;row.passed=true;");
 replace("if(delivery&&delivery.peek().observed)row.browserRequestOutcome=delivery.peek();\n   row.passed=false;row.errorType=error.name;","row.passed=false;row.errorType=error.name;");
 const start=source.indexOf('\nfunction createDeliveryTracker(context){'),end=source.indexOf('\nmodule.exports={create,classify,createDeliveryTracker};');assert(start>=0&&end>start);
 source=source.slice(0,start)+source.slice(end);source=source.replace('module.exports={create,classify,createDeliveryTracker};','module.exports={create,classify};');
 source=source.replace('\n\n\nmodule.exports={create,classify};','\n\nmodule.exports={create,classify};');assert.equal(source,fs.readFileSync(v2,'utf8'));
 const {createDeliveryTracker,create}=require(v3),request=()=>({url:()=> 'http://127.0.0.1/fixture',method:()=> 'POST',failure:()=>({errorText:'explicit observer fixture cancellation'})});
 const emitter=new EventEmitter(),tracker=createDeliveryTracker(emitter),cases=[];
 let item=request();emitter.emit('request',item);emitter.emit('requestfinished',item);assert.deepEqual((await tracker.watch(item).wait(10)).status,'finished');cases.push('finish before wait');
 item=request();emitter.emit('requestfailed',item);const failed=await tracker.watch(item).wait(10);assert(failed.observed&&failed.status==='failed');cases.push('failure before wait');
 item=request();const observed=tracker.watch(item).wait(100);emitter.emit('requestfinished',item);assert.equal((await observed).status,'finished');cases.push('actual pending Future event');
 emitter.emit('requestfailed',item);assert.equal(tracker.watch(item).peek().status,'finished');cases.push('duplicate completion cannot overwrite first');
 item=request();await assert.rejects(tracker.watch(item).wait(5),/not observed/);assert.equal(tracker.watch(item).peek().observed,false);cases.push('no event remains unobserved after deadline');
 item=request();const waiting=tracker.watch(item).wait(100);tracker.close();await assert.rejects(waiting,/closed/);cases.push('close cancels waiter');
 assert.throws(()=>tracker.watch(item));for(const name of ['request','requestfinished','requestfailed'])assert.equal(emitter.listenerCount(name),0);cases.push('closed observer refuses reads and removes own listeners');
 const monitor=create({rules:[{origin:'http://127.0.0.1',path:'/graphql',method:'POST',kind:'graphql-readonly'}],persist:async()=>{throw new Error('Explicit persistence refusal fixture');}});
 const fake={request:()=>({url:()=> 'http://127.0.0.1/graphql',method:()=> 'POST',postDataBuffer:()=>Buffer.from('{"query":"query WalletSnapshotAdmission { x }"}'),headersArray:async()=>[]}),fetch:async()=>{throw new Error('Fetch must not run');},abort:async()=>{}};
 await assert.rejects(monitor.handle(fake),/persistence refusal/);await assert.rejects(monitor.drain(),/persistence\/settlement/);cases.push('persistence failure cannot disappear after job settlement');
 const result={passed:true,preparedOnly:true,observedAt:new Date().toISOString(),wholeSourceInverse:true,v3OnlyAddsActualBrowserOutcomeObservation:true,v2AllReadOnlyRulesBodyCaptureAndRefusalsHeld:true,
  explicitObserverLifecycleFixtureTests:cases.length,fixtureCases:cases,missingObservationNeverReturnedAsSuccess:true,persistenceFailureNeverReturnedAsDrained:true,
  actualColdPendingAccepted:false,fullNonNftM5Accepted:false,parentCompletion:false,
  scope:'Whole-source inverse and explicit local observer/persistence fixtures only; actual browser transport has separate retained proof.',
  inputsSha256:Object.fromEntries([__filename,v3,v2].map(file=>[file,sha(file)]))};
 fs.writeFileSync(output,JSON.stringify(result,null,2)+'\n',{flag:'wx',mode:0o600});console.log(JSON.stringify({passed:true,wholeSourceInverse:true,explicitFixtureTests:cases.length,preparedOnly:true}));
}

if(require.main===module)main().catch(error=>{console.error(JSON.stringify({passed:false,errorType:error.name,message:String(error.message).split('\n')[0].slice(0,180)}));process.exitCode=1;});
