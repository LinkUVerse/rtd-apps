// Deterministic collector boundary qualification. This is not a real UI acceptance.
const fs=require('node:fs'),crypto=require('node:crypto'),assert=require('node:assert/strict');
const capture=require('./lib/C184-nonblocking-complete-body-capture.cjs'),audit=require('./lib/C182-independent-zero-dispatch-correlation.cjs');
const url='http://127.0.0.1:41750/rtd.rpc.v2.LedgerService/GetServiceInfo',popup='chrome-extension://allmppilngnjjikoeinlmjpfpdemkdal/ui.html#/dapp/approve/12345678-abcd';
class TargetClosedError extends Error{}
async function run({closed=true,worker=false,headerFailure=true,fetchFailure=false}={}){
 const events=[],counts={fetch:0,dispose:0,fulfill:0,abort:0},body=Buffer.from([0,0,0,0,0]);
 const request={url:()=>url,method:()=>'POST',postDataBuffer:()=>body,serviceWorker:()=>worker?{}:null,frame:()=>({page:()=>({url:()=>popup,isClosed:()=>closed})}),headersArray:async()=>{if(headerFailure)throw new TargetClosedError('request.headersArray: Target page has been closed');return [{name:'content-type',value:'application/grpc-web+proto'}];}};
 const outcome={observed:true,status:headerFailure||fetchFailure?'failed':'finished',url,method:'POST',errorText:headerFailure||fetchFailure?'net::ERR_FAILED':null};
 const tracker={watch:()=>({peek:()=>outcome,wait:async()=>outcome})};
 const response={url:()=>url,status:()=>200,headersArray:()=>[{name:'content-length',value:'1'}],headers:()=>({'content-length':'1'}),body:async()=>Buffer.from('a'),dispose:async()=>{counts.dispose++;}};
 const route={request:()=>request,abort:async()=>{counts.abort++;},fetch:async()=>{counts.fetch++;if(fetchFailure)throw new TargetClosedError('route.fetch: owner closed');return response;},fulfill:async()=>{counts.fulfill++;}};
 const c=capture.create({rules:[{origin:'http://127.0.0.1:41750',path:new URL(url).pathname,method:'POST',kind:'grpc-readonly'}],persist:async(row,event)=>events.push({row,event}),stage:()=> 'direct/originalWindow/real sponsored approval',deliveryTracker:tracker});
 const row=await c.handle(route);assert.deepEqual(await c.close(),[row]);return{row,events,counts,outcome};
}
(async()=>{const[output]=process.argv.slice(2);assert(output&&!fs.existsSync(output));const z=await run();assert(z.row.cancelledBeforeUpstreamDispatch);assert.equal(z.counts.fetch,0);assert.equal(z.counts.fulfill,0);assert.equal(z.counts.dispose,0);assert(!z.row.passed&&!z.row.upstreamBodyComplete);
 const network={requests:[{id:1,url,method:'POST',requestBase64:z.row.requestBase64,terminal:'failed',failure:'net::ERR_FAILED'}],responses:[],routeBindings:[{requestId:1,captureId:z.row.id}]},p={cases:[{observed:{transactions:{'12345678-abcd':{id:'12345678-abcd'}}},popupUrl:popup,normalPopupClosed:true,normalPopupClosedAt:new Date().toISOString()}],denials:[]};
 assert.equal(audit.early(z.row,z.events,network,p),1);
 const changes=[r=>r.upstreamDispatchCalls=1,r=>r.upstreamFetchAttempted=true,r=>r.ownerClosedAtHeaderFailure=false,r=>r.sourceOwner.kind='non-page',r=>r.sourceOwner.url=popup.replace('/dapp/approve/','/tokens/'),r=>r.kind='grpc-validation',r=>r.requestHeadersArray=[],r=>r.requestHeaderLookupCompleted=true,r=>r.errorClass='Error',r=>r.responseBase64='',r=>r.status=200,r=>r.browserRequestOutcome.status='finished'];
 for(const mutate of changes){const r=structuredClone(z.row);mutate(r);assert.throws(()=>audit.early(r,z.events,network,p));}
 const net=structuredClone(network);net.responses.push({requestId:1,status:200});assert.throws(()=>audit.early(z.row,z.events,net,p));
 const noOwner=structuredClone(p);noOwner.cases=[];assert.throws(()=>audit.early(z.row,z.events,network,noOwner));
 for(const settings of [{closed:false},{worker:true},{headerFailure:false,fetchFailure:true}]){const r=await run(settings);assert(!r.row.cancelledBeforeUpstreamDispatch);assert(!r.row.passed);assert.equal(r.counts.fetch,settings.fetchFailure?1:0);}
 const normal=await run({closed:false,headerFailure:false});assert(normal.row.passed&&normal.row.upstreamBodyComplete&&normal.row.browserDeliveryCompleted&&normal.row.responseDisposed);assert.equal(normal.counts.fetch,1);assert.equal(normal.counts.fulfill,1);assert.equal(normal.counts.dispose,1);assert.equal(normal.row.responseBase64,Buffer.from('a').toString('base64'));
 const files=[__filename,require.resolve('./lib/C184-nonblocking-complete-body-capture.cjs'),require.resolve('./lib/C182-independent-zero-dispatch-correlation.cjs'),require.resolve('./lib/C173-original-entity-and-browser-copy-correlation.cjs')];
 const result={passed:true,observedAt:new Date().toISOString(),qualificationOnly:true,actualUiAcceptance:false,positiveZeroDispatchCase:1,originalFullEntityCase:1,unsafeCollectorCasesRejected:3,independentBoundaryMutationsRejected:14,newApprovals:0,newExecuteRequests:0,inputsSha256:Object.fromEntries(files.map(f=>[f,crypto.createHash('sha256').update(fs.readFileSync(f)).digest('hex')]))};fs.writeFileSync(output,JSON.stringify(result,null,2)+'\n',{flag:'wx',mode:0o600});console.log(JSON.stringify({passed:true,qualificationOnly:true,independentBoundaryMutationsRejected:14}));})().catch(e=>{console.error(String(e.stack));process.exitCode=1;});
