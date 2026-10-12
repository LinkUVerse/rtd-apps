// Real loopback HTTP and installed Playwright APIRequestContext; browser delivery is an explicit test adapter.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),http=require('node:http'),zlib=require('node:zlib'),crypto=require('node:crypto'),os=require('node:os');
const {request:api}=require('@playwright/test'),capture=require('./lib/C143-readonly-body-capture.cjs');
const logs=path.resolve(__dirname,'../migrationToGRpcOrGraphQLDoc/workLog');
const op=path.join(os.homedir(),'.local/state/rtd-wallet-migration/dev-20261006-03/C143-readonly-body-transport-20261009-01');
const sha=file=>crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
const hash=bytes=>crypto.createHash('sha256').update(bytes).digest('hex');
const save=(file,value)=>fs.writeFileSync(file,JSON.stringify(value,null,2)+'\n',{flag:'wx',mode:0o600});
const query=Buffer.from(JSON.stringify({query:'query WalletSnapshotAdmission { checkpoint(sequenceNumber: 0) { digest } }',variables:{}}));
const positive=Buffer.from(JSON.stringify({data:{checkpoint:{digest:'actual-isolated-fixture-positive'}},padding:'x'.repeat(1320)}));

async function main(output){
 assert.equal(output,path.join(logs,'20261009-C143-readonly-body-transport-01.json'));assert(!fs.existsSync(op)&&!fs.existsSync(output));fs.mkdirSync(op,{mode:0o700});
 const sourceFiles=[__filename,require.resolve('./lib/C143-readonly-body-capture.cjs'),require.resolve('@playwright/test'),require.resolve('graphql'),
  path.resolve(__dirname,'../../node_modules/.pnpm/playwright-core@1.57.0/node_modules/playwright-core/lib/server/fetch.js')];
 const inputs=Object.fromEntries(sourceFiles.map(file=>[file,sha(file)])),serverRequests=[],adapters=[],retained=[];let server,client,monitor,result;
 const endpoints=['/positive','/cancel','/notfound','/denied','/reset','/timeout','/redirect','/redirect-target','/truncated','/too-large','/too-large-no-length','/encoded','/unknown-query','/mutation','/bad-digest'];
 try{
  server=http.createServer(async(req,res)=>{
   const parts=[];for await(const chunk of req)parts.push(chunk);const body=Buffer.concat(parts),url=new URL(req.url,'http://127.0.0.1');
   serverRequests.push({path:url.pathname,search:url.search,method:req.method,headers:req.headers,bodyBase64:body.toString('base64'),monotonic:Number(process.hrtime.bigint())/1e9});
   switch(url.pathname){
    case '/positive':case '/cancel':res.writeHead(200,{'content-type':'application/json','content-length':positive.length,'x-fixture-complete':'true'}).end(positive);break;
    case '/notfound':res.writeHead(200,{'content-type':'application/grpc-web+proto','grpc-status':'5','content-length':'0'}).end();break;
    case '/denied':res.writeHead(401,{'content-type':'text/plain','www-authenticate':'Basic realm="fixture"'}).end('fixture denied');break;
    case '/reset':req.socket.destroy();break;
    case '/timeout':setTimeout(()=>{if(!res.destroyed)res.writeHead(200).end('too late');},180);break;
    case '/redirect':res.writeHead(302,{location:'/redirect-target'}).end('redirect body');break;
    case '/redirect-target':res.writeHead(200).end('must never arrive');break;
    case '/truncated':res.writeHead(200,{'content-length':'4000'});res.write('partial');setTimeout(()=>res.destroy(),10);break;
    case '/too-large':res.writeHead(200,{'content-length':'128'}).end(Buffer.alloc(128,1));break;
    case '/too-large-no-length':res.writeHead(200);res.write(Buffer.alloc(64,1));res.end(Buffer.alloc(64,2));break;
    case '/encoded':res.writeHead(200,{'content-type':'application/json','content-encoding':'gzip'}).end(zlib.gzipSync(positive));break;
    default:res.writeHead(500).end('not an allowed fixture');
   }
  });await new Promise((resolve,reject)=>{server.once('error',reject);server.listen(0,'127.0.0.1',resolve);});
  const origin='http://127.0.0.1:'+server.address().port;client=await api.newContext({timeout:25000});
  const rules=endpoints.map(endpoint=>({origin,path:endpoint,method:'POST',kind:'graphql-readonly'}));
  rules.push({origin,path:'/rtd.rpc.v2.LedgerService/GetTransaction',method:'POST',kind:'grpc-readonly'});
  monitor=capture.create({rules,fixedDigest:'fixed-existing-recovery-digest',decodeLookup:body=>body.toString('utf8'),
   stage:()=> 'isolated readonly transport fixture',maxBodyBytes:4096,
   persist:async(row,event)=>{const receipt={sequence:retained.length,event,row};retained.push(receipt);save(path.join(op,'event-'+String(receipt.sequence).padStart(4,'0')+'.json'),receipt);}});
  async function run(endpoint,{body=query,cancel=false,cap,timeout}={}){
   const adapter={path:endpoint,fetchCalls:0,fulfillCalls:0,abortCalls:0,fulfillBodyBase64:null,persistedBeforeDelivery:false},url=origin+endpoint;
   const request={url:()=>url,method:()=> 'POST',postDataBuffer:()=>body,headersArray:async()=>[{name:'content-type',value:'application/json'},{name:'x-c143-original-request',value:endpoint}]};
   const route={request:()=>request,fetch:async options=>{adapter.fetchCalls++;adapter.fetchOptions={...options};
    return client.fetch(url,{...options,method:'POST',headers:{'content-type':'application/json','x-c143-original-request':endpoint},data:body});},
    fulfill:async options=>{adapter.fulfillCalls++;assert.deepEqual(Object.keys(options).sort(),['body','response']);
     const persisted=retained.findLast(item=>item.row.url===url&&item.event==='complete upstream entity persisted');assert(persisted);
     assert(fs.existsSync(path.join(op,'event-'+String(persisted.sequence).padStart(4,'0')+'.json')));
     assert.equal(persisted.row.responseBase64,options.body.toString('base64'));adapter.persistedBeforeDelivery=true;
     adapter.fulfillBodyBase64=options.body.toString('base64');if(cancel)throw new Error('Explicit test browser delivery cancellation');},abort:async()=>{adapter.abortCalls++;}};
   let temporary;
   if(cap||timeout)temporary=capture.create({rules,fixedDigest:'fixed-existing-recovery-digest',decodeLookup:bytes=>bytes.toString('utf8'),maxBodyBytes:cap??4096,timeout:timeout??25000,
    stage:()=> 'isolated readonly transport fixture',persist:async(row,event)=>{const receipt={sequence:retained.length,event,row};retained.push(receipt);save(path.join(op,'event-'+String(receipt.sequence).padStart(4,'0')+'.json'),receipt);}});
   const record=await(temporary??monitor).handle(route);adapters.push({...adapter,record});if(temporary)await temporary.close();return record;
  }
  const good=await run('/positive');assert(good.passed&&good.upstreamBodyComplete&&good.browserDeliveryCompleted);assert.equal(good.responseBase64,positive.toString('base64'));
  const cancelled=await run('/cancel',{cancel:true});assert(!cancelled.passed&&cancelled.upstreamBodyComplete&&cancelled.browserDeliveryAttempted&&!cancelled.browserDeliveryCompleted);assert.equal(cancelled.responseBase64,positive.toString('base64'));
  const nf=await run('/notfound');assert(nf.passed&&nf.upstreamBodyComplete&&nf.status===200&&nf.headers['grpc-status']==='5'&&nf.responseBytes===0);
  const denied=await run('/denied');assert(denied.passed&&denied.status===401);assert.equal(serverRequests.filter(row=>row.path==='/denied').length,1);
  for(const endpoint of ['/reset','/redirect','/truncated']){const row=await run(endpoint);assert(!row.passed&&!row.upstreamBodyComplete&&!row.browserDeliveryAttempted);assert.equal(serverRequests.filter(value=>value.path===endpoint).length,1);}
  const timed=await run('/timeout',{timeout:50});assert(!timed.passed&&!timed.upstreamBodyComplete);assert.equal(serverRequests.filter(row=>row.path==='/timeout').length,1);
  assert.equal(serverRequests.filter(row=>row.path==='/redirect-target').length,0);
  for(const endpoint of ['/too-large','/too-large-no-length']){const row=await run(endpoint,{cap:64});assert(!row.passed&&!row.upstreamBodyComplete&&!row.browserDeliveryAttempted&&row.responseBase64===null);}
  const encoded=await run('/encoded');assert(!encoded.passed&&!encoded.upstreamBodyComplete&&!encoded.browserDeliveryAttempted);assert.equal(encoded.headers['content-encoding'],'gzip');
  const blocked=[['/unknown-query',Buffer.from('{"query":"query OtherOperation { checkpoint { digest } }"}')],
   ['/mutation',Buffer.from('{"query":"mutation WalletSnapshotAdmission { arbitraryWrite }"}')],
   ['/positive',Buffer.from('{"jsonrpc":"2.0","method":"sui_getObject"}')],
   ['/rtd.rpc.v2.TransactionExecutionService/ExecuteTransaction',Buffer.alloc(0)],
   ['/rtd.rpc.v2.LedgerService/GetTransaction',Buffer.from('wrong-digest')],['/unlisted-origin-path',query]];
  const before=serverRequests.length;for(const [endpoint,body]of blocked){const row=await run(endpoint,{body});assert(!row.upstreamFetchAttempted&&!row.passed);}assert.equal(serverRequests.length,before);
  // Real fixed-digest lookup forwarding is tested against a separate explicitly readonly endpoint.
  const lookupRequests=[];const lookupServer=http.createServer(async(req,res)=>{const parts=[];for await(const chunk of req)parts.push(chunk);lookupRequests.push(Buffer.concat(parts).toString('utf8'));res.writeHead(200,{'content-type':'application/grpc-web+proto','grpc-status':'5','content-length':'0'}).end();});
  await new Promise(resolve=>lookupServer.listen(0,'127.0.0.1',resolve));const lookupOrigin='http://127.0.0.1:'+lookupServer.address().port;
  try{
   const input={url:()=>lookupOrigin+'/rtd.rpc.v2.LedgerService/GetTransaction',method:()=> 'POST',postDataBuffer:()=>Buffer.from('fixed-existing-recovery-digest'),headersArray:async()=>[]};
   const fixed=capture.create({rules:[{origin:lookupOrigin,path:'/rtd.rpc.v2.LedgerService/GetTransaction',method:'POST',kind:'grpc-readonly'}],fixedDigest:'fixed-existing-recovery-digest',decodeLookup:bytes=>bytes.toString('utf8'),persist:async(row,event)=>{const receipt={sequence:retained.length,event,row};retained.push(receipt);save(path.join(op,'event-'+String(receipt.sequence).padStart(4,'0')+'.json'),receipt);}});
   const row=await fixed.handle({request:()=>input,fetch:options=>client.fetch(input.url(),{...options,method:'POST',data:input.postDataBuffer()}),fulfill:async()=>{},abort:async()=>{}});
   assert(row.passed&&row.upstreamBodyComplete);assert.deepEqual(lookupRequests,['fixed-existing-recovery-digest']);await fixed.close();
  }finally{lookupServer.closeAllConnections();await new Promise(resolve=>lookupServer.close(resolve));}
  await monitor.close();
  for(const row of serverRequests){assert.equal(row.method,'POST');assert.equal(row.headers['x-c143-original-request'],row.path);assert.equal(row.bodyBase64,query.toString('base64'));}
  for(const [file,value]of Object.entries(inputs))assert.equal(sha(file),value);
  result={passed:true,observedAt:new Date().toISOString(),scope:'Actual loopback HTTP and installed APIRequestContext; explicit delivery adapter and dependency fixtures only. No actual browser/cold business acceptance.',
   actualHttpFixtureRequests:serverRequests.length,actualFixedDigestFixtureRequests:lookupRequests.length,actualReadonlyCases:adapters.length,
   actualCancelledDeliveryBodyRetained:true,actualPositiveIdentityEntitySha256:hash(positive),actualPositiveIdentityEntityBytes:positive.length,
   actualNoRedirectFollow:true,actualNoNetworkRetry:true,actual401WithoutAuthenticationRetry:true,actualTruncationRejected:true,
   actualRetentionCapRefusals:2,actualUnsupportedEncodingRefusals:1,actualForbiddenRequestsNotForwarded:blocked.length,
   browserDeliveryIsExplicitAdapter:true,encodedWireBytesCaptured:false,bodyCapBoundsRetentionOnly:true,
   originalProfilesOpened:0,walletServiceRequests:0,signatures:0,executeRequests:0,nftBusinessRequests:0,
   actualColdPendingAccepted:false,fullNonNftM5Accepted:false,parentCompletion:false,serverRequests,adapters,inputsSha256:inputs};
 }catch(error){result={passed:false,observedAt:new Date().toISOString(),errorType:error.name,message:String(error.message).split('\n')[0].slice(0,250),serverRequests,adapters,actualColdPendingAccepted:false,fullNonNftM5Accepted:false,parentCompletion:false,inputsSha256:inputs};process.exitCode=1;
 }finally{
  if(client)await client.dispose();if(server){server.closeAllConnections();await new Promise(resolve=>server.close(resolve));}
  result.allOwnHttpListenersNormallyClosed=true;result.eventReceipts=retained.length;
  for(const file of fs.readdirSync(op)){const target=path.join(op,file);result.inputsSha256[target]=sha(target);}
  save(path.join(op,'evidence.json'),result);save(output,result);console.log(JSON.stringify({passed:result.passed,actualHttpFixtureRequests:result.actualHttpFixtureRequests,retainedEvents:retained.length,fullColdAccepted:false}));
 }
}

if(require.main===module)main(path.resolve(process.argv[2]??'')).catch(error=>{console.error(JSON.stringify({passed:false,preflight:true,errorType:error.name,message:String(error.message).split('\n')[0].slice(0,180)}));process.exitCode=1;});
