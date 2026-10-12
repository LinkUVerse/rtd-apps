// Copyright (c) LinkU Labs, Inc.
// SPDX-License-Identifier: Apache-2.0
// Independently decode actual request/response frames and the exclusive PurchaseCap.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const{RtdGrpcClient,GrpcTypes}=require('rtd-typescript/grpc'),{bcs}=require('rtd-typescript/bcs'),{Transaction}=require('rtd-typescript/transactions');
const{normalizeStructTag}=require('rtd-typescript/utils');
function frame(encoded,trailers){const raw=Buffer.from(encoded,'base64'),rows=[];for(let i=0;i<raw.length;){assert(i+5<=raw.length);const flag=raw[i],n=raw.readUInt32BE(i+1);assert([0,128].includes(flag)&&i+5+n<=raw.length);rows.push({flag,data:raw.subarray(i+5,i+5+n)});i+=5+n;}assert.equal(rows.length,trailers?2:1);assert.equal(rows[0].flag,0);if(trailers){assert.equal(rows[1].flag,128);assert.match(rows[1].data.toString(),/(^|\r\n)grpc-status:\s*0(\r\n|$)/);}return rows[0].data;}
(async()=>{
 const[op,nativeFile,simFile,output]=process.argv.slice(2),read=f=>JSON.parse(fs.readFileSync(f)),sha=f=>crypto.createHash('sha256').update(fs.readFileSync(f)).digest('hex');assert(!fs.existsSync(output));
 const n=read(nativeFile),p=read(simFile),binding=read(path.join(op,'seed/route-binding.json'));assert(n.passed&&p.passed&&p.protectedObjectRefsAndContentHeld&&p.signatures===0&&p.executeRequests===0&&p.simulations===4);assert.equal(p.operation,op);assert.equal(p.rows.length,4);assert.equal(p.frames.length,4);
 for(const[f,h]of Object.entries({...n.inputsSha256,...p.inputsSha256}))assert.equal(sha(f),h);
 const rows=[];
 for(const f of p.frames){
  const req=GrpcTypes.SimulateTransactionRequest.fromBinary(frame(f.requestBase64,false)),res=GrpcTypes.SimulateTransactionResponse.fromBinary(frame(f.responseBase64,true)),serial=f.stage.slice('serial'.length),row=p.rows.find(r=>r.serial===serial);
  assert(row&&f.status===200&&req.checks===GrpcTypes.SimulateTransactionRequest_TransactionChecks.ENABLED&&req.doGasSelection===false);const bytes=Buffer.from(req.transaction.bcs.value);assert.equal(bytes.toString('base64'),row.bytesBase64);assert.equal(await Transaction.from(bytes).getDigest(),row.digest);
  const data=bcs.TransactionData.parse(bytes);assert.equal(bcs.TransactionData.serialize(data).toBase64(),row.bytesBase64);assert.equal(data.V1.sender,n.addresses.source);assert.equal(data.V1.gasData.owner,n.addresses.source);
  const effects=bcs.TransactionEffects.parse(res.transaction.effects.bcs.value);assert.equal(bcs.TransactionEffects.serialize(effects).toBase64(),Buffer.from(res.transaction.effects.bcs.value).toString('base64'));assert.equal(effects.V2.transactionDigest,row.digest);
  const success=serial==='1'||serial==='2';assert.equal(res.transaction.effects.status.success,success);assert.equal(effects.V2.status.$kind,success?'Success':'Failure');
  let abortCode=null;
  if(!success){assert.equal(effects.V2.status.Failure.error.$kind,'MoveAbort');abortCode=effects.V2.status.Failure.error.MoveAbort[1];assert.equal(abortCode,serial==='3'?'8':'4');}
  if(serial==='2'){const listing=effects.V2.changedObjects.find(([id])=>id===n.ordinaryListing.objectId);assert(listing&&listing[1].outputState.$kind==='NotExist'&&listing[1].idOperation.$kind==='Deleted');}
  rows.push({serial,nftId:row.nftId,digest:row.digest,actualEnabledWire:true,expectedSuccess:success,abortCode,ordinaryListingRemovedInSimulatedEffects:serial==='2'});
 }
 const priorFailures=['01','02'].map(v=>path.join(path.dirname(simFile),'20261007-C43-nonempty-kiosk-take-simulations-'+v+'.json'));
 for(const f of priorFailures){const r=read(f);assert(!r.passed&&r.frames.length===0&&r.rows.length===0&&r.executeRequests===0&&r.message==='Assignment to constant variable.');}
 const client=new RtdGrpcClient({network:'localnet',baseUrl:'http://127.0.0.1:41750',format:'binary',mvr:{url:''}}),paths=[],fetch0=globalThis.fetch;
 globalThis.fetch=(input,init)=>{const u=new URL(input instanceof Request?input.url:String(input));assert(u.origin==='http://127.0.0.1:41750'&&['/GetServiceInfo','/BatchGetObjects'].some(s=>u.pathname.endsWith(s)));paths.push(u.href);return fetch0(input,init);};
 let purchase;
 try{
  assert.equal((await client.ledgerService.getServiceInfo({})).response.chainId,n.h0);
  const seed=read(path.join(op,'seed/recovered.json')).Transaction;
  const type=normalizeStructTag('0x2::kiosk::PurchaseCap<'+binding.nftType+'>'),ids=Object.entries(seed.objectTypes).filter(([,t])=>normalizeStructTag(t)===type).map(([id])=>id);assert.equal(ids.length,1);
  const o=(await client.core.getObject({objectId:ids[0],include:{content:true}})).object;assert(o&&!(o instanceof Error));assert.equal(o.owner.AddressOwner,n.addresses.source);
  const codec=bcs.struct('PurchaseCap',{id:bcs.Address,kiosk_id:bcs.Address,item_id:bcs.Address,min_price:bcs.u64()}),v=codec.parse(o.content);assert.equal(codec.serialize(v).toBase64(),Buffer.from(o.content).toString('base64'));
  assert.equal(v.id,o.objectId);assert.equal(v.kiosk_id,n.frameworkCap.value.for);assert.equal(v.item_id,n.nfts.find(r=>r.value.serial==='4').objectId);assert.equal(v.min_price,'1000000');purchase={objectId:o.objectId,type,version:o.version,digest:o.digest,owner:o.owner,value:v};
  const fresh=(await client.core.getObjects({objectIds:n.nfts.map(r=>r.objectId),include:{content:true}})).objects;
  assert.equal(fresh.length,6);for(let i=0;i<fresh.length;i++){const actual=fresh[i],previous=n.nfts[i];assert(!(actual instanceof Error));assert.equal(actual.version,previous.version);assert.equal(actual.digest,previous.digest);assert.deepEqual(actual.owner,previous.owner);}
  assert.equal((await client.ledgerService.getServiceInfo({})).response.chainId,n.h0);
 }finally{globalThis.fetch=fetch0;}
 const report={passed:true,observedAt:new Date().toISOString(),operation:op,h0:n.h0,rows,purchaseCap:purchase,paths,actualSimulationFramesIndependentlyDecoded:4,retainedToolFailures:2,originalObjectsHeld:true,auditSimulations:0,signatures:0,executeRequests:0,indexedAccepted:false,chromeAccepted:false,inputsSha256:Object.fromEntries([__filename,nativeFile,simFile,path.join(op,'seed/recovered.json'),path.join(op,'seed/route-binding.json'),...priorFailures].map(f=>[path.resolve(f),sha(f)])),scope:'Independent complete unary/trailer raw four ENABLED simulation BCS/digests/effects, regular/ordinary successes, actual ordinary Listing deletion, locked8/exclusive4; actual canonical PurchaseCap exact owner/kiosk/item/price and fresh unchanged six NFT refs. Two original tool-only const failures had zero simulation/sign/execute. No new simulation, signing, submission, actual indexed or Chrome claim.'};
 fs.writeFileSync(output,JSON.stringify(report,null,2)+'\n',{flag:'wx',mode:0o600});console.log(JSON.stringify({passed:true,rawSimulationsVerified:4,purchaseCapVerified:true,executeRequests:0}));
})().catch(e=>{console.error(JSON.stringify({passed:false,errorType:e.name,message:String(e.message).slice(0,600)}));process.exitCode=1});
