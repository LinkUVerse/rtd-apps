// Copyright (c) LinkU Labs, Inc.
// SPDX-License-Identifier: Apache-2.0
// Offline audit of a sanitized HAR exported through the ordinary Chrome UI.
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),a=require('node:assert/strict');
const {GrpcTypes}=require('rtd-typescript/grpc');
const {files}=require('./build-reviewed-generation-production-extension.cjs');
const logs=path.resolve(__dirname,'../migrationToGRpcOrGraphQLDoc/workLog'),read=f=>JSON.parse(fs.readFileSync(f)),sha=f=>crypto.createHash('sha256').update(fs.readFileSync(f)).digest('hex');
const input=path.join(logs,'20261010-C205-restored-worker-preflight-01.har'),installedFile=path.join(logs,'20261010-C201-ordinary-upgrade-installed-01.json'),preparedFile=path.join(logs,'20261010-C201-ordinary-upgrade-prepared-01.json'),bytecodeFile=path.join(logs,'20261010-C204-ordinary-bytecode-01.json');
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

a.equal(entries.length,3);
const urls=['http://127.0.0.1:41750/rtd.rpc.v2.LedgerService/GetServiceInfo','http://127.0.0.1:41957/graphql','https://127.0.0.1:41903/archive/rtd.rpc.v2.LedgerService/GetServiceInfo'];
a.deepEqual(entries.map(e=>e.request.url),urls);
for(const e of entries){
 a.equal(e.request.method,'POST');a.equal(e.response.status,200);a(body(e));
 a.equal(header(e.request.headers,'Authorization').length,0);a.equal(header(e.request.headers,'Cookie').length,0);a.equal(e.request.cookies.length,0);
 a(e._initiator.stack.callFrames.some(f=>f.url===origin+'/background.js'));
 const origins=header(e.request.headers,'Origin');a(origins.length===0||(origins.length===1&&origins[0]===origin));
}
const native=message(entries[0],GrpcTypes.GetServiceInfoResponse),archive=message(entries[2],GrpcTypes.GetServiceInfoResponse);
a.equal(native.chainId,h0);a.equal(archive.chainId,h0);
const query=JSON.parse(entries[1].request.postData.text),data=JSON.parse(body(entries[1]));
a(!query.jsonrpc&&!/mutation/.test(query.query));a(/checkpoint/.test(query.query)&&/sequenceNumber:\s*0/.test(query.query));a(!data.errors);a.equal(data.data.checkpoint.digest,h0);
const result={passed:true,observedAt:new Date().toISOString(),actualWorkerNetworkAccepted:true,workerHttpsArchiveAccepted:true,fullGenesisChecked:true,grpcMessagesDecoded:2,uniqueGrpcStatusZeroTrailers:2,graphqlGenesisResponses:1,allCapturedRequestsAccepted:true,networkRequests:3,entryUrls:urls,signatures:0,executeRequests:0,permissionDenialAccepted:false,uiTlsNetworkAccepted:false,parentCompletion:false,inputsSha256:Object.fromEntries([__filename,input,installedFile,preparedFile,bytecodeFile].map(f=>[f,sha(f)]))};
fs.writeFileSync(path.join(logs,'20261010-C205-restored-worker-audit-01.json'),JSON.stringify(result,null,2)+'\n',{flag:'wx',mode:0o600});console.log(JSON.stringify({passed:true,actualWorkerNetworkAccepted:true,workerHttpsArchiveAccepted:true,fullGenesisChecked:true}));
