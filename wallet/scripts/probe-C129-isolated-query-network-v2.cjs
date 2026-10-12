// Real read-only identity, TLS and negative method/origin requests on the owned ingress.
const fs=require('node:fs'),path=require('node:path'),os=require('node:os'),assert=require('node:assert/strict'),crypto=require('node:crypto'),https=require('node:https'),loader=require('tsx/cjs/api');
const ownership=require('./lib/C129-current-core-gateway-ownership-v2.cjs');
const wallet=path.resolve(__dirname,'..'),logs=path.join(wallet,'migrationToGRpcOrGraphQLDoc/workLog'),runtime=path.join(os.homedir(),'.local/state/rtd-wallet-migration/dev-20261006-03/publication-foundation/C129-isolated-query-runtime-20261009-01');
const read=f=>JSON.parse(fs.readFileSync(f)),sha=f=>crypto.createHash('sha256').update(fs.readFileSync(f)).digest('hex');
const origin='chrome-extension://mkihdgajnjcingajgjlkibdiijjkeaef';
(async()=>{
 const output=process.argv[2];assert(output&&!fs.existsSync(output));const frames=[],tlsFrames=[],negative=[];let result,session;
 try{
  const authority=ownership.capture({requireNetwork:false});
  const profileFile=path.join(runtime,'profile.json'),intentFile=path.join(runtime,'intent.json'),qualified=path.join(logs,'20261009-C129-isolated-query-runtime-independent-01.json');
  const iq=read(qualified);assert(iq.passed&&!iq.installed);for(const[f,h]of Object.entries(iq.inputsSha256))assert.equal(sha(f),h);
  const load=n=>loader.require(path.join(wallet,'src/shared/rpc',n+'.ts'),__filename),{validateNetworkProfile}=load('profile'),{WalletReadSession}=load('session'),{probeNetworkIdentity}=load('identity');
  const originalFetch=globalThis.fetch;const observed=async(input,init)=>{const u=new URL(input instanceof Request?input.url:String(input));assert(['41750','42011','42012','42013'].includes(u.port));const response=await originalFetch(input,{...init,headers:{...Object.fromEntries(new Headers(init?.headers)),Origin:origin}});frames.push({url:u.href,status:response.status,headers:Object.fromEntries(response.headers),requestBase64:Buffer.from(init?.body??'').toString('base64'),responseBase64:Buffer.from(await response.clone().arrayBuffer()).toString('base64')});return response};
  session=new WalletReadSession(validateNetworkProfile(read(profileFile)));const at=performance.now();
  const identity=await probeNetworkIdentity(session,{fetch:observed});const elapsedMs=performance.now()-at;
  assert.equal(identity.state,'identity-verified');assert.equal(identity.endpoints.length,3);for(const e of identity.endpoints){assert.equal(e.state,'verified');assert.equal(e.genesisDigest,'BkuLHhdtnoK7yLxo2eQuvcjHtdyipE7MMyxgTJiyHGg4')}
  for(const [port,p,method,badOrigin,want] of [
   [42011,'/graphql','GET',false,403],[42011,'/graphql','POST',true,403],
   [42012,'/archive/rtd.rpc.v2.LedgerService/GetServiceInfo','GET',false,403],
   [42012,'/archive/rtd.rpc.v2.LedgerService/GetServiceInfo','POST',true,403],
   [42012,'/archive/rtd.rpc.v2.TransactionExecutionService/ExecuteTransaction','POST',false,404],
   [42012,'/archive/rtd.rpc.v2.SignatureVerificationService/VerifySignature','POST',false,404],
   [42011,'/','POST',false,404],[42013,'/account/graphql','GET',false,403],
   [42013,'/account/graphql','POST',true,403]]){
   const response=await originalFetch('http://127.0.0.1:'+port+p,{method,headers:{Origin:badOrigin?'chrome-extension://'+ 'a'.repeat(32):origin}});const body=await response.arrayBuffer();assert.equal(response.status,want);negative.push({port,path:p,method,badOrigin,status:response.status,bodySha256:crypto.createHash('sha256').update(Buffer.from(body)).digest('hex')});
  }
  const compose=read(path.join(runtime,'compose.json'));const mounted=(s,target)=>{const rows=compose.services[s].volumes.filter(v=>v.endsWith(':'+target+':ro'));assert.equal(rows.length,1);return rows[0].slice(0,-(':'+target+':ro').length)};
  const caFile=mounted('loopback','/trusted/ca.crt');
  const readerRoot=mounted('loopback','/reader');
  const certFile=path.join(readerRoot,'tls.crt'),keyFile=path.join(readerRoot,'tls.key');
  const tlsRequest=options=>new Promise((resolve,reject)=>{const request=https.request({hostname:'127.0.0.1',port:42031,path:'/graphql',method:'POST',servername:'localhost',ca:fs.readFileSync(caFile),cert:fs.readFileSync(certFile),key:fs.readFileSync(keyFile),rejectUnauthorized:true,headers:{'Content-Type':'application/json'},...options},response=>{const chunks=[];response.on('data',b=>chunks.push(b));response.on('end',()=>resolve({status:response.statusCode,bodyBase64:Buffer.concat(chunks).toString('base64')}))});request.on('error',reject);request.setTimeout(10000,()=>request.destroy(Error('TLS probe deadline')));request.end(JSON.stringify({query:'{ checkpoint(sequenceNumber: 0) { digest } }'}))});
  const valid=await tlsRequest({});assert.equal(valid.status,200);assert.equal(JSON.parse(Buffer.from(valid.bodyBase64,'base64')).data.checkpoint.digest,'BkuLHhdtnoK7yLxo2eQuvcjHtdyipE7MMyxgTJiyHGg4');tlsFrames.push({case:'valid CA SAN and mutual TLS',...valid});
  const absent=await tlsRequest({cert:undefined,key:undefined});assert.equal(absent.status,400);tlsFrames.push({case:'missing client certificate refused',...absent});
  for(const [name,options] of [['wrong SAN',{servername:'c119-wrong.invalid'}],['untrusted CA',{ca:undefined}]]){let error;try{await tlsRequest(options)}catch(e){error=e}assert(error&&/CERT|SELF_SIGNED|UNABLE_TO_VERIFY/.test(error.code));tlsFrames.push({case:name,errorCode:error.code,refused:true})}
  assert.deepEqual(ownership.capture({requireNetwork:false}),authority);
  const files=[__filename,ownership.startedFile,qualified,profileFile,intentFile,path.join(__dirname,'lib/C129-current-core-gateway-ownership-v2.cjs'),caFile,certFile,keyFile];
  result={passed:true,observedAt:new Date().toISOString(),actualOriginOnly:true,originalTlsAndMethodsHeld:true,original29And14Held:true,originalFullScopeHeld:true,businessAccepted:false,gatewayAuthority:authority,identity,elapsedMs,frames,tlsFrames,negative,signatures:0,simulations:0,executeRequests:0,nftBusinessRequests:0,originalServicesSignalled:0,databaseWrites:0,parentCompletion:false,fullNonNftPhaseAccepted:false,inputsSha256:Object.fromEntries(files.map(f=>[f,sha(f)]))};
 }catch(error){result={passed:false,observedAt:new Date().toISOString(),errorType:error.name,message:String(error.message).slice(0,1400),frames,tlsFrames,negative};process.exitCode=1}
 finally{session?.close()}
 fs.writeFileSync(output,JSON.stringify(result,(_,v)=>typeof v==='bigint'?v.toString():v,2)+'\n',{flag:'wx',mode:0o600});console.log(JSON.stringify({passed:result.passed,elapsedMs:result.elapsedMs,negative:negative.length,tls:tlsFrames.length,message:result.message}));
})().catch(error=>{console.error(JSON.stringify({passed:false,message:String(error.message).slice(0,600)}));process.exitCode=1});
