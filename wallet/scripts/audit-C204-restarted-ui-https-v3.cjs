// Copyright (c) LinkU Labs, Inc.
// SPDX-License-Identifier: Apache-2.0
// Offline audit of a sanitized HAR exported through the ordinary Chrome UI.
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),a=require('node:assert/strict');
const {GrpcTypes}=require('rtd-typescript/grpc');
const {files}=require('./build-reviewed-generation-production-extension.cjs');
const logs=path.resolve(__dirname,'../migrationToGRpcOrGraphQLDoc/workLog'),read=f=>JSON.parse(fs.readFileSync(f)),sha=f=>crypto.createHash('sha256').update(fs.readFileSync(f)).digest('hex');
const input=path.join(logs,'20261010-C204-restarted-ui-https-03.har'),installedFile=path.join(logs,'20261010-C201-ordinary-upgrade-installed-01.json'),preparedFile=path.join(logs,'20261010-C201-ordinary-upgrade-prepared-01.json'),bytecodeFile=path.join(logs,'20261010-C204-ordinary-bytecode-01.json');
const origin='chrome-extension://kiahlcbejlgmnbmcggnhagbccojnbkaa',h0='BkuLHhdtnoK7yLxo2eQuvcjHtdyipE7MMyxgTJiyHGg4',owner='0x9d7652713f02b13b73744ba47e4f21ca0a0a2966cc02df86adcde2041454e5bc';
const installed=read(installedFile),prepared=read(preparedFile),bytecode=read(bytecodeFile);
a(installed.passed&&bytecode.actualUiStaticBytesAccepted&&bytecode.actualWorkerStaticBytesAccepted);a.deepEqual(files(installed.stable),prepared.newArtifacts);a.deepEqual(files(installed.archive),prepared.oldArtifacts);
const entries=read(input).log.entries;
const header=(headers,name)=>headers.filter(h=>h.name.toLowerCase()===name.toLowerCase()).map(h=>h.value);
const body=e=>{const c=e.response.content;return c.text?Buffer.from(c.text,c.encoding==='base64'?'base64':'utf8'):null;};
function message(e,type){
 a.equal(e.response.status,200);const b=body(e);a(b&&b.length>=10);a.equal(b[0],0);const n=b.readUInt32BE(1);a(n>0&&5+n+5<=b.length);
 const t=b.subarray(n+5);a.equal(t[0],128);a.equal(t.readUInt32BE(1),t.length-5);const statuses=t.subarray(5).toString().split('\r\n').filter(x=>x.toLowerCase().startsWith('grpc-status:'));a.deepEqual(statuses.map(x=>x.slice(12).trim()),['0']);
 return type.fromBinary(b.subarray(5,n+5));
}
function validate(entries){
 const successful=[],incomplete=[],graphql=[];const counts={};
 for(const [i,e] of entries.entries()){
  const u=new URL(e.request.url);a.equal(u.hostname,'127.0.0.1');a(['41750','41957','41903','41959'].includes(u.port));a.equal(u.protocol,u.port==='41903'?'https:':'http:');a.equal(e.request.method,'POST');
  a(!/ExecuteTransaction|SimulateTransaction|SignTransaction|SignPersonalMessage/.test(u.pathname));
  a.deepEqual(header(e.request.headers,'Origin'),[origin]);a.equal(header(e.request.headers,'Authorization').length,0);a.equal(header(e.request.headers,'Cookie').length,0);
  const frames=e._initiator?.stack?.callFrames??[];a(frames.some(f=>f.url===origin+'/957.js'||f.url===origin+'/503.js'));
  counts[u.port]=(counts[u.port]??0)+1;
  if(u.pathname.endsWith('/graphql')){const q=JSON.parse(e.request.postData.text);a(!q.jsonrpc&&!/^\s*mutation\b/.test(q.query));}
  if(e.response.status!==200||!body(e)){incomplete.push({index:i,status:e.response.status,bodyPresent:!!body(e)});continue;}
  successful.push(i);
  if(u.pathname.endsWith('/graphql')){const q=JSON.parse(e.request.postData.text),j=JSON.parse(body(e));a(!q.jsonrpc&&!/^\s*mutation\b/.test(q.query));a(!j.errors&&j.data);graphql.push({index:i,url:e.request.url,query:q,data:j.data});}else{const method=u.pathname.split('/').at(-1),type=GrpcTypes[method+'Response'];a(type?.fromBinary,'Unknown captured gRPC response '+method);message(e,type);}
 }
 const native=entries.filter(e=>e.request.url==='http://127.0.0.1:41750/rtd.rpc.v2.LedgerService/GetServiceInfo'&&e.response.status===200&&body(e));
 const archive=entries.filter(e=>e.request.url==='https://127.0.0.1:41903/archive/rtd.rpc.v2.LedgerService/GetServiceInfo'&&e.response.status===200&&body(e));
 a(native.length&&archive.length);for(const e of [...native,...archive])a.equal(message(e,GrpcTypes.GetServiceInfoResponse).chainId,h0);
 const account=graphql.filter(r=>r.url.endsWith('/account/graphql'));a(account.length);for(const r of account){const c=r.data.accountHistoryCoverage;a.equal(c.chainId,h0);a(c.checkpointLo<=c.checkpointHi);a.equal(typeof c.allAccountActivityCertified,'boolean');}
 const genesis=graphql.filter(r=>r.data.walletGenesis);a(genesis.length>0);for(const r of genesis)a.equal(r.data.walletGenesis.digest,h0);
 return {entries:entries.length,counts,successfulBodies:successful.length,incomplete,fullGenesisChecked:true,nativeServiceInfoMessages:native.length,archiveServiceInfoMessages:archive.length,accountCoverageMessages:account.length,graphqlGenesisMessages:genesis.length};
}
const result=validate(entries),out=path.resolve(process.argv[2]);a.equal(path.dirname(out),logs);a(!fs.existsSync(out));
fs.writeFileSync(out,JSON.stringify({passed:true,observedAt:new Date().toISOString(),...result,actualOrdinaryUiThreeEntryTrafficAccepted:true,emptyBalanceResponseAccepted:false,actualWorkerNetworkAccepted:false,permissionMatrixAccepted:false,ordinaryTlsAccepted:true,actualUiHttpsArchiveAccepted:true,accountHistoryPageAccepted:false,allCapturedRequestsAccepted:result.incomplete.length===0,parentCompletion:false,replayedRequests:0,inputsSha256:Object.fromEntries([__filename,input,installedFile,preparedFile,bytecodeFile].map(f=>[f,sha(f)]))},null,2)+'\n',{flag:'wx',mode:0o600});
console.log(JSON.stringify({passed:true,...result}));
