// Copyright (c) LinkU Labs, Inc.
// SPDX-License-Identifier: Apache-2.0
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,existsSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {GrpcTypes} from 'rtd-typescript/grpc';
import {homedir} from 'node:os';

const L='migrationToGRpcOrGraphQLDoc/workLog';
const OP=homedir()+'/.local/state/rtd-wallet-migration/dev-20261011-04/C313-network-lifecycle-20261012-01';
const H0='BTrU3deMDbnWcUWLJ2ruDj9vbCC4gaYnVj8qV3K2nFah';
const files=new Set<string>([process.argv[1]]);
const hash=(b:Buffer|string)=>createHash('sha256').update(b).digest('hex');
function raw(p:string){files.add(p);return readFileSync(p);}
function json(p:string){return JSON.parse(raw(p).toString());}
function grpc(body:Buffer,type:any){
  assert.equal(body[0],0);const end=5+body.readUInt32BE(1);
  assert.equal(body[end],128);assert.equal(end+5+body.readUInt32BE(end+1),body.length);
  const trailer=body.subarray(end+5).toString();assert.match(trailer,/(?:^|\r\n)grpc-status:\s*0\r\n/);
  return type.fromBinary(body.subarray(5,end));
}
function main(){
 const output=process.argv[2];assert(output&&!existsSync(output));
 const ui=json(`${L}/20261012-C313-native-ui-01.json`);
 const entries=json(`${L}/20261012-C313-late-read-matrix-01.har`).log.entries;
 const events=raw(`${OP}/events-60s.jsonl`).toString().trim().split('\n').map(JSON.parse);
 const cases=[
  ['account-revision-02','confirm-revision-4-account-held','account','WalletAccountHistory',60000],
  ['graphql-revision-01','confirm-revision-5-graphql-held','graphql','WalletSnapshotAdmissionAndPin',60000],
  ['fullnode-account-01','restore-bad0-cancel-old-native-balance','fullnode','ListBalances',10000],
  ['archive-page-01','leave-receipt-cancel-old-archive-object','archive','BatchGetObjects',20000],
 ] as const;
 const reports:any[]=[];
 for(const[tag,action,role,method,timeout]of cases){
  const req=events.filter((e:any)=>e.event==='request'&&e.arm===tag);assert.equal(req.length,1);
  const request=req[0];assert.equal(request.role,role);assert.equal(request.operation,method);
  const event=(kind:string)=>{const rows=events.filter((e:any)=>e.id===request.id&&e.event===kind);assert.equal(rows.length,1);return rows[0];};
  const held=event('held'),closed=event('downstream-close'),released=event('release'),upstream=event('upstream-response');
  const click=ui.actions.find((a:any)=>a.action===action);assert(click);
  assert(Date.parse(held.at)<Date.parse(click.at)&&Date.parse(click.at)<Date.parse(closed.at));
  assert(Date.parse(closed.at)<Date.parse(released.at)&&Date.parse(released.at)<Date.parse(ui.afterAllLateReleases.at));
  assert.equal(closed.ended,false);assert.equal(released.downstreamDestroyed,true);
  assert(Date.parse(closed.at)-Date.parse(click.at)<1000);
  assert(closed.elapsedMs<timeout,'Cancellation must precede the production deadline');
  const requestBody=raw(`${OP}/long-${request.id}-request.bin`),body=raw(`${OP}/long-${request.id}-response.bin`);
  assert.equal(hash(requestBody),request.requestSha256);assert.equal(hash(body),released.responseSha256);assert.equal(released.responseSha256,upstream.responseSha256);assert.equal(released.status,200);
  const matches=entries.flatMap((e:any,i:number)=>e.request.url.includes(`/c313/${role}`)
   &&(role==='account'||role==='graphql'||e.request.url.endsWith('/'+method))
   &&Math.abs(Date.parse(e.startedDateTime)-Date.parse(request.at))<100?[{e,i}]:[]);
  assert.equal(matches.length,1);const {e:wire,i}=matches[0];
  assert.equal(wire.response.status,0);assert.equal(wire.response._error,'net::ERR_ABORTED');
  assert(Math.abs(Date.parse(wire.startedDateTime)+wire.time-Date.parse(closed.at))<150);
  assert.equal(hash(Buffer.from(wire.request.postData.text,role==='account'||role==='graphql'?'utf8':'latin1')),hash(requestBody));
  let payload:any;
  if(role==='account'){
   const r=JSON.parse(body.toString());assert(!r.errors);const h=r.data.accountHistory;
   const variables=JSON.parse(requestBody.toString()).variables;
   assert.equal(h.chainId,H0);assert.equal(h.checkpointLo,0);assert.equal(h.checkpointHi,variables.hi);
   assert.equal(h.address,variables.address);assert.equal(h.totalTransactions,3);assert.equal(h.allAccountActivityCertified,false);
   payload={checkpointHi:h.checkpointHi,totalTransactions:h.totalTransactions,address:h.address};
  }else if(role==='graphql'){
   const r=JSON.parse(body.toString());assert(!r.errors);assert.equal(r.data.walletGenesis.digest,H0);
   assert(r.data.walletSnapshot);payload={genesisDigest:H0,fields:Object.keys(r.data)};
  }else if(role==='fullnode'){
   const req=GrpcTypes.ListBalancesRequest.fromBinary(requestBody.subarray(5));assert.equal(req.owner,'0x32707d815917729a49dc103a1b511f297de389b19600611fcc1a5cdb8b91dcb7');
   const r=grpc(body,GrpcTypes.ListBalancesResponse);assert.equal(r.balances.length,1);
   payload=GrpcTypes.ListBalancesResponse.toJson(r);
  }else{
   const r=grpc(body,GrpcTypes.BatchGetObjectsResponse);assert.equal(r.objects.length,1);
   payload=GrpcTypes.BatchGetObjectsResponse.toJson(r);
   assert(JSON.stringify(payload).includes('0x5b4dfb01f146fb1fae6aa080cc3067cc903796d71b1777ad6a115676560119f1'));
   assert(JSON.stringify(payload).includes('42118'));
  }
  reports.push({tag,role,method,requestId:request.id,harIndex:i,bodySha256:hash(body),payload,
   heldAt:held.at,actionAt:click.at,cancelAt:closed.at,releasedAt:released.at,
   cancelAfterActionMs:Date.parse(closed.at)-Date.parse(click.at),cancelBeforeTimeout:true,
   oldResponseNotDelivered:true});
 }
 const exceptions:any[]=[];let graphql=0,native=0;
 for(const[e,i]of entries.map((e:any,i:number)=>[e,i])){
  assert.equal(new URL(e.request.url).hostname,'127.0.0.1');assert.equal(e.request.method,'POST');
  assert(!/ExecuteTransaction|SimulateTransaction|VerifySignature|json-rpc/.test(e.request.url));
  const method=e.request.url.split('/').at(-1);
  if(e.response._error||e.response.status!==200){exceptions.push({index:i,url:e.request.url,status:e.response.status,error:e.response._error??null});continue;}
  if(e.request.postData.mimeType==='application/json'){
   const q=JSON.parse(e.request.postData.text);assert(/^\s*(query\b|\{)/.test(q.query));assert(!/\b(mutation|subscription)\b/.test(q.query));
   const r=JSON.parse(e.response.content.text);assert(r.data||r.errors);graphql++;
  }else{
   assert.equal(e.response.content.encoding,'base64');const b=Buffer.from(e.response.content.text,'base64');
   const cls=(GrpcTypes as any)[method+'Response'];assert(cls,'Unknown native method '+method);
   const r=grpc(b,cls);if(method==='GetServiceInfo')assert.equal(r.chainId,H0);native++;
  }
 }
 assert(ui.afterAllLateReleases.lines.includes('文本 100'));assert(ui.afterAllLateReleases.lines.includes('单选按钮 RTD 命运链结 0xbad0…0456, Value: 1'));
 const original=json(homedir()+'/.local/state/rtd-wallet-migration/dev-20261011-04/C274-profile.json');
 assert.deepEqual(ui.restoredForm.packages,original.packages);assert.equal(ui.restoredForm.fields['配置标识'],original.id);
 const fieldMap={'Fullnode gRPC-Web':'fullnodeGrpcWeb','GraphQL（可选）':'graphqlUrl','归档 gRPC-Web（可选）':'archiveGrpcWeb','账户历史服务（可选）':'accountHistoryUrl'};
 for(const[f,k]of Object.entries(fieldMap))assert.equal(ui.restoredForm.fields[f],original.endpoints[k]);
 assert.equal(ui.restoredForm.savedRevision,4);assert.equal(ui.accounts.unselected.length,3);
 const cleanup=json(`${OP}/cleanup-60s.json`);assert(cleanup.passed&&cleanup.temporaryPortClosed&&cleanup.originalGatewayBytesRestored);
 const tests=json(`${L}/20261012-C313-lifecycle-tests-01.json`);assert(tests.success&&tests.numFailedTests===0&&tests.numPassedTests===105);
 const report={passed:true,at:new Date().toISOString(),reports,requests:entries.length,successfulGraphqlFrames:graphql,
  successfulNativeFrames:native,exceptions,exceptionFramesCountedSeparately:true,allFourLateReadCategoriesAccepted:true,
  testsPassed:105,originalProfileRestored:true,originalAccountsRetained:4,fixtureCleaned:true,
  actualBackendGenerationReplacementAccepted:false,walRecoveryAccepted:false,fullParentCompletion:false,
  originalAsyncSchedulingReplayedOffline:false,
  inputsSha256:Object.fromEntries([...files].map(p=>[p,hash(readFileSync(p))]))};
 writeFileSync(output,JSON.stringify(report,null,2)+'\n',{flag:'wx',mode:0o600});
 console.log(JSON.stringify({passed:true,requests:entries.length,cases:reports.length,exceptions:exceptions.length,testsPassed:105}));
}
main();
