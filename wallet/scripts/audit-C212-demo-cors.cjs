// Offline audit of ordinary Chrome HAR: no browser actions or substituted responses.
const fs=require('node:fs'),path=require('node:path'),a=require('node:assert/strict'),crypto=require('node:crypto');
const {GrpcTypes}=require('rtd-typescript/grpc');
const L=path.resolve(__dirname,'../migrationToGRpcOrGraphQLDoc/workLog');
const F=path.join(process.env.HOME,'.local/state/rtd-wallet-migration/dev-20261006-03/publication-foundation');
const op=path.join(F,'C212-exact-demo-origin-20261010-02'),h0='BkuLHhdtnoK7yLxo2eQuvcjHtdyipE7MMyxgTJiyHGg4';
const read=f=>JSON.parse(fs.readFileSync(f)),sha=f=>crypto.createHash('sha256').update(fs.readFileSync(f)).digest('hex');
const header=(rows,n)=>rows.filter(h=>h.name.toLowerCase()===n).map(h=>h.value);
const content=e=>Buffer.from(e.response.content.text,e.response.content.encoding==='base64'?'base64':'utf8');
const reports=[],inputs=[__filename];
for(const [kind,origin,admitted] of [['allowed','http://127.0.0.1:41960',true],['denied','http://localhost:41960',false],['restored','http://127.0.0.1:41960',false]]){
 const file=path.join(L,`20261010-C212-demo-${kind}-01.har`);inputs.push(file);fs.chmodSync(file,0o600);
 const es=read(file).log.entries;a.equal(es.length,8);const pairs=new Map();
 for(const e of es){
  const u=new URL(e.request.url);a.equal(u.hostname,'127.0.0.1');a(['41750','41957','41958','41959'].includes(u.port));a(['POST','OPTIONS'].includes(e.request.method));
  const route=u.port==='41750'?'/rtd.rpc.v2.LedgerService/GetServiceInfo':u.port==='41958'?'/archive/rtd.rpc.v2.LedgerService/GetServiceInfo':u.port==='41957'?'/graphql':'/account/graphql';a.equal(u.pathname,route);
  for(const n of ['authorization','cookie'])a.deepEqual(header(e.request.headers,n),[]);a.equal(e.request.cookies.length,0);
  if(e.request.method==='POST'&&e.response.status===0){a.deepEqual(header(e.request.headers,'origin'),[]);a.deepEqual(header(e.request.headers,'referer'),[origin+'/']);}
  else a.deepEqual(header(e.request.headers,'origin'),[origin]);
  if(e.request.method==='POST')a(e._initiator.stack.callFrames.some(f=>f.url===origin+'/cors-C212.js'));
  else a.deepEqual(header(e.request.headers,'access-control-request-method'),['POST']);
  const pair=pairs.get(u.port)||{};a(!pair[e.request.method]);pair[e.request.method]=e;pairs.set(u.port,pair);
 }
 const accepted=[];
 for(const [port,{POST:e,OPTIONS:o}]of pairs){
  a(e&&o);
  if(port!=='41750'&&!admitted){a.equal(o.response.status,403);a.equal(e.response.status,0);a.equal(e.response._error,'net::ERR_FAILED');a(!e.response.content.text);continue;}
  a.equal(e.response.status,200);a.equal(o.response.status,port==='41750'?200:204);
  const acao=port==='41750'?'*':origin;
  a.deepEqual(header(e.response.headers,'access-control-allow-origin'),[acao]);a.deepEqual(header(o.response.headers,'access-control-allow-origin'),[acao]);
  a.deepEqual(header(e.response.headers,'access-control-allow-credentials'),[]);
  if(['41750','41958'].includes(port)){
   const body=content(e);a.equal(body[0],0);const n=body.readUInt32BE(1),tail=body.subarray(5+n);a.equal(tail[0],128);a.equal(tail.readUInt32BE(1),tail.length-5);
   a.deepEqual(tail.subarray(5).toString().split('\r\n').filter(v=>/^grpc-status:/i.test(v)).map(v=>v.split(':')[1].trim()),['0']);
   const decoded=GrpcTypes.GetServiceInfoResponse.fromBinary(body.subarray(5,5+n));a.equal(decoded.chainId,h0);a(typeof decoded.checkpointHeight==='bigint'&&decoded.checkpointHeight>=0n);
  }else{
   const body=JSON.parse(content(e));a(!body.errors);const req=JSON.parse(e.request.postData.text);
   if(port==='41957'){a.equal(req.query,'query DemoGenesis { checkpoint(sequenceNumber: 0) { digest } }');a.deepEqual(body,{data:{checkpoint:{digest:h0}}});}
   else {a.equal(req.variables.chain,h0);a(req.query.startsWith('query DemoCoverage('));const c=body.data.accountHistoryCoverage;a.equal(c.chainId,h0);a(Number.isSafeInteger(c.checkpointLo)&&Number.isSafeInteger(c.checkpointHi)&&c.checkpointLo>=0&&c.checkpointHi>=c.checkpointLo);a(/^[1-9A-HJ-NP-Za-km-z]{43,44}$/.test(c.checkpointDigest));a.equal(typeof c.allAccountActivityCertified,'boolean');}
  }
  accepted.push(port);
 }
 reports.push({kind,origin,entries:es.length,acceptedPorts:accepted,privateEntriesDenied:!admitted});
}
for(const name of ['prepared.json','allowed.json','restored.json']){const file=path.join(op,name);a(read(file).passed);inputs.push(file);}
const restored=read(path.join(op,'restored.json'));a(restored.originalWhitelistRestored&&restored.containerUnchanged);
for(const[f,h]of Object.entries(restored.inputsSha256))a.equal(sha(f),h);
inputs.push(path.resolve(__dirname,'../tests/demo-app/cors-C212.html'),path.resolve(__dirname,'../tests/demo-app/cors-C212.js'));
const proof={passed:true,observedAt:new Date().toISOString(),ordinaryChromeNativeHarAccepted:true,privateApprovedWebOriginAccepted:true,privateUnapprovedWebOriginRejected:true,temporaryOriginRemovedAndBrowserRejectionAccepted:true,exactOrigin:'http://127.0.0.1:41960',existingWalletEdgePorts:[41957,41958,41959],noNewProxy:true,noOriginOverrideInPage:true,credentialsAndCookies:0,signatures:0,executeRequests:0,nativeNodeWildcardCorsObserved:true,reports,parentCompletion:false,inputsSha256:Object.fromEntries(inputs.map(f=>[f,sha(f)]))};
fs.writeFileSync(path.join(L,'20261010-C212-demo-cors-audit-01.json'),JSON.stringify(proof,null,2)+'\n',{flag:'wx',mode:0o600});console.log(JSON.stringify({passed:true,reports}));
