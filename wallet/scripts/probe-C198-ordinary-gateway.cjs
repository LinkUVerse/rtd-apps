// Copyright (c) LinkU Labs, Inc.
// SPDX-License-Identifier: Apache-2.0
// Actual HTTP protocol checks only; not ordinary-browser permission or TLS acceptance.
const fs=require('node:fs'),path=require('node:path'),cp=require('node:child_process'),crypto=require('node:crypto'),a=require('node:assert/strict');
const {GrpcTypes}=require('rtd-typescript/grpc');
const root=path.resolve(__dirname,'../../..'),logs=path.resolve(__dirname,'../migrationToGRpcOrGraphQLDoc/workLog');
const py=path.join(root,'rtd-archive-service/localDeploy/data/publisher-venv/bin/python'),scopeFile=path.join(root,'link-u-smart-contract/all-in-one-deploy/localDeploy/manage_wallet_C198_ordinary_gateway_v3.py');
const sha=f=>crypto.createHash('sha256').update(fs.readFileSync(f)).digest('hex');
const origin='chrome-extension://kiahlcbejlgmnbmcggnhagbccojnbkaa',h0='BkuLHhdtnoK7yLxo2eQuvcjHtdyipE7MMyxgTJiyHGg4';
const scope=()=>JSON.parse(cp.execFileSync(py,[scopeFile,'verify'],{encoding:'utf8',timeout:180000}));
const frames=[];
async function request(url,body,requestOrigin,method='POST'){
 a(['http://127.0.0.1:41957/graphql','http://127.0.0.1:41958/archive/rtd.rpc.v2.LedgerService/GetServiceInfo','http://127.0.0.1:41959/account/graphql'].includes(url));
 const grpc=url.includes('/archive/');const headers={'origin':requestOrigin,'content-type':grpc?'application/grpc-web+proto':'application/json'};
 if(grpc)headers['x-grpc-web']='1';
 if(method==='OPTIONS'){headers['access-control-request-method']='POST';headers['access-control-request-headers']='content-type';}
 const r=await fetch(url,{method,headers,body:method==='POST'?body:undefined,redirect:'error',credentials:'omit',signal:AbortSignal.timeout(25000)}),bytes=Buffer.from(await r.arrayBuffer());a(bytes.length<16*1024*1024);
 const f={url,method,requestHeaders:headers,requestBase64:Buffer.from(method==='POST'?body:'').toString('base64'),status:r.status,responseHeaders:Object.fromEntries(r.headers),responseBase64:bytes.toString('base64')};frames.push(f);return f;
}
(async()=>{const output=path.resolve(process.argv[2]);a.equal(path.dirname(output),logs);a(!fs.existsSync(output));let before,result;try{
 before=scope();const graph=JSON.stringify({query:'{chainIdentifier checkpoint(sequenceNumber:0){digest}}'}),account=JSON.stringify({query:'query($chain:String!){accountHistoryCoverage(chainId:$chain){chainId checkpointLo checkpointHi}}',variables:{chain:h0}});
 const targets=[['http://127.0.0.1:41957/graphql',graph],['http://127.0.0.1:41958/archive/rtd.rpc.v2.LedgerService/GetServiceInfo',Buffer.alloc(5)],['http://127.0.0.1:41959/account/graphql',account]];
 for(const[url,body]of targets){const f=await request(url,body,origin);a.equal(f.status,200);a.equal(f.responseHeaders['access-control-allow-origin'],origin);const raw=Buffer.from(f.responseBase64,'base64');
 if(url.includes('/archive/')){a.equal(raw[0],0);const size=raw.readUInt32BE(1);a(size>0&&size+5<=raw.length);a.equal(GrpcTypes.GetServiceInfoResponse.fromBinary(raw.subarray(5,size+5)).chainId,h0);const tail=raw.subarray(size+5);a.equal(tail[0],128);a.equal(tail.readUInt32BE(1),tail.length-5);a(/grpc-status: 0/.test(tail.subarray(5).toString()));}
 else{const j=JSON.parse(raw);a(!j.errors);if(url.includes('/account/'))a.equal(j.data.accountHistoryCoverage.chainId,h0);else{a.equal(j.data.chainIdentifier,h0);a.equal(j.data.checkpoint.digest,h0);}}
 const opt=await request(url,body,origin,'OPTIONS');a.equal(opt.status,204);a.equal(opt.responseHeaders['access-control-allow-origin'],origin);
 const wrong=await request(url,body,'chrome-extension://aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa');a.equal(wrong.status,403);
 }
 a.deepEqual(scope(),before);result={passed:true,threeProtocolEntriesAccepted:true,correctOriginPostAndPreflightAccepted:3,wrongOriginRefused:3};
 }catch(e){result={passed:false,errorType:e.name,message:String(e.message).slice(0,600)};process.exitCode=1;}
 fs.writeFileSync(output,JSON.stringify({...result,observedAt:new Date().toISOString(),frames,currentScope:before,actualBrowserUiAccepted:false,ordinaryBrowserTlsAccepted:false,parentCompletion:false,signatures:0,executeRequests:0,inputsSha256:{[__filename]:sha(__filename),[scopeFile]:sha(scopeFile)}},null,2)+'\n',{flag:'wx',mode:0o600});console.log(JSON.stringify({...result,frames:frames.length}));})();
