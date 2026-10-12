// Retain complete upstream identity entities before attempting browser delivery.
// This helper is for controlled readonly acceptance; it never retries or follows redirects.
const assert=require('node:assert/strict'),crypto=require('node:crypto');
const {parse}=require('graphql');
const sha=bytes=>crypto.createHash('sha256').update(bytes).digest('hex');
const tick=()=>Number(process.hrtime.bigint())/1e9;
const methods=new Set(['GetServiceInfo','GetCheckpoint','GetObject','GetTransaction','GetCoinInfo','GetBalance','ListOwnedObjects','GetDatatype','GetFunction','GetPackage']);
const queryNames=new Set(['WalletGenesisIdentity','WalletSchemaCapabilities','WalletSnapshotAdmission','WalletHistoryCoverage','WalletSnapshotPin','WalletSnapshotRevalidate','WalletSnapshotRead']);
const rpc=/^\/(?:archive\/)?rtd\.rpc\.v2\.(LedgerService|StateService|MovePackageService)\/([A-Za-z]+)$/;

function classify(request,rules,fixedDigest,decodeLookup){
 const url=new URL(request.url()),method=request.method(),body=request.postDataBuffer()??Buffer.alloc(0);
 assert(['http:','https:'].includes(url.protocol),'Non HTTP request');
 assert(!url.username&&!url.password&&!url.hash,'URL credentials or fragment');
 assert(!/faucet|SimulateTransaction|VerifySignature|ExecuteTransaction/i.test(url.pathname),'Forbidden method');
 assert(!/"jsonrpc"\s*:/.test(body.toString('utf8')),'Legacy JSON RPC');
 const rule=rules.find(value=>value.origin===url.origin&&value.path===url.pathname&&value.method===method);
 assert(rule,'Unknown readonly origin/path/method');
 if(rule.kind==='grpc-readonly'){
  const match=url.pathname.match(rpc);assert(method==='POST'&&match&&methods.has(match[2]),'Unknown grpc method');
  if(match[2]==='GetTransaction'){
   assert(typeof decodeLookup==='function'&&typeof fixedDigest==='string'&&fixedDigest.length>0);
   assert.equal(decodeLookup(body),fixedDigest,'Wrong recovery digest');
  }
 }else if(rule.kind==='graphql-readonly'){
  assert.equal(method,'POST');const value=JSON.parse(body.toString('utf8'));
  assert(value&&typeof value.query==='string'&&value.query.length<=1024*1024);
  const definitions=parse(value.query).definitions,operations=definitions.filter(item=>item.kind==='OperationDefinition');
  assert.equal(operations.length,1);const operation=operations[0];
  assert(operation.operation==='query'&&operation.name&&queryNames.has(operation.name.value),'Unknown/non-query GraphQL operation');
  assert(definitions.every(item=>['OperationDefinition','FragmentDefinition'].includes(item.kind)));
  if(value.operationName!==undefined)assert.equal(value.operationName,operation.name.value);
 }else{assert.equal(rule.kind,'static-readonly');assert.equal(method,'GET');assert.equal(body.length,0);}
 return{kind:rule.kind,url:url.href,method,body};
}

function create({rules,fixedDigest,decodeLookup,persist,stage=()=>'',maxBodyBytes=128*1024*1024,timeout=25000}){
 assert(Array.isArray(rules)&&rules.length>0&&typeof persist==='function'&&typeof stage==='function');
 assert(Number.isSafeInteger(maxBodyBytes)&&maxBodyBytes>0&&maxBodyBytes<=128*1024*1024);
 assert(Number.isSafeInteger(timeout)&&timeout>0&&timeout<=25000);
 const normalized=rules.map(rule=>{
  const url=new URL(rule.origin);assert(['http:','https:'].includes(url.protocol)&&url.origin===rule.origin);
  assert(typeof rule.path==='string'&&rule.path.startsWith('/')&&!rule.path.includes('?'));
  assert(['grpc-readonly','graphql-readonly','static-readonly'].includes(rule.kind));
  return{...rule};
 });
 const records=[],jobs=new Set(),fatal=[];let accepting=true;
 const retain=async(row,event)=>{row.events.push({event,monotonic:tick(),at:new Date().toISOString()});await persist(structuredClone(row),event);};
 const capture=async route=>{
  const request=route.request(),row={id:crypto.randomUUID(),stage:stage(),url:request.url(),method:request.method(),
   requestBase64:(request.postDataBuffer()??Buffer.alloc(0)).toString('base64'),requestHeadersArray:await request.headersArray(),
   events:[],fetchOptions:{maxRedirects:0,maxRetries:0,timeout},upstreamFetchAttempted:false,upstreamBodyComplete:false,
   browserDeliveryAttempted:false,browserDeliveryCompleted:false,browserDeliveryCompletionMeans:'route.fulfill resolved; not application consumption',
   encodedWireBytesCaptured:false,bodyRepresentation:null,responseBase64:null,responseSha256:null,responseBytes:null,
   passed:false,originalRequestOverrides:false};records.push(row);
  let response;
  try{
   await retain(row,'request observed');assert(accepting,'Capture already closed');
   const allowed=classify(request,normalized,fixedDigest,decodeLookup);row.kind=allowed.kind;
   row.upstreamFetchAttempted=true;await retain(row,'readonly request admitted');
   // No method/header/body/URL override. Playwright fetch may add its transport defaults.
   response=await route.fetch(row.fetchOptions);assert.equal(response.url(),row.url,'Response URL changed');
   row.status=response.status();row.headersArray=response.headersArray();row.headers=response.headers();
   await retain(row,'upstream fetch returned');
   const encoding=String(row.headers['content-encoding']??'identity').toLowerCase();
   assert(encoding==='identity'||encoding==='','Unsupported encoded entity');
   const length=row.headers['content-length'];
   if(length!==undefined){assert(/^\d+$/.test(length));assert(Number(length)<=maxBodyBytes,'Entity exceeds retention cap');}
   const body=await response.body();assert(body.length<=maxBodyBytes,'Entity exceeds retention cap');
   if(length!==undefined)assert.equal(body.length,Number(length),'Incomplete identity entity');
   row.upstreamBodyComplete=true;row.bodyRepresentation='complete identity entity';row.responseBase64=body.toString('base64');
   row.responseBytes=body.length;row.responseSha256=sha(body);await retain(row,'complete upstream entity persisted');
   assert(row.status<300||row.status>=400,'Redirect response is retained but not delivered');
   row.browserDeliveryAttempted=true;await retain(row,'browser delivery attempted');
   await route.fulfill({response,body});row.browserDeliveryCompleted=true;row.passed=true;
   await retain(row,'browser delivery completed');
  }catch(error){
   row.passed=false;row.errorType=error.name;row.errorMessage=String(error.message).split('\n')[0].slice(0,180);
   await retain(row,row.upstreamBodyComplete?(row.browserDeliveryAttempted?'browser delivery failed after retained entity':'readonly response refused after retained entity'):'request or upstream capture failed');
   await route.abort('failed').catch(()=>{});
  }finally{
   if(response)await response.dispose();row.responseDisposed=Boolean(response);await retain(row,'capture settled');
  }
  return row;
 };
 const handle=route=>{const job=capture(route);jobs.add(job);job.then(()=>jobs.delete(job),error=>{fatal.push(error);jobs.delete(job);});return job;};
 const drain=async()=>{while(jobs.size)await Promise.all([...jobs]);if(fatal.length)throw new AggregateError(fatal,'Capture persistence/settlement failed');return structuredClone(records);};
 const close=async()=>{accepting=false;return drain();};
 return{handle,drain,close,records};
}

module.exports={create,classify};
