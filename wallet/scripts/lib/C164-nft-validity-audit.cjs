// Independent expiry construction and full raw-wire/UI contract for three non-NFT routes.
const fs=require('node:fs'),path=require('node:path'),assert=require('./C158-bounded-strict-assert.cjs'),crypto=require('node:crypto');
const {bcs}=require('rtd-typescript/bcs'),{Transaction}=require('rtd-typescript/transactions'),{GrpcTypes}=require('rtd-typescript/grpc');
const wire=require('./C114-nft-wire-contract-v3.cjs');
const names=Object.freeze(['originalWindow','expirationNone','expiredEpoch','expirationLargeEpoch',
 'windowMinTimestamp','windowMaxTimestamp','validDuringNoTimestamp','validDuringMinTimestamp','validDuringMaxTimestamp']);
const encode=data=>Buffer.from(bcs.TransactionData.serialize(data).toBytes()).toString('base64');
const sha=f=>crypto.createHash('sha256').update(fs.readFileSync(f)).digest('hex');
function requireNonNft(prepared,kind,owner){
 assert(['coin','stake','withdraw'].includes(kind));assert.equal(prepared.sender,owner);assert.equal(prepared.input.sender,owner);
 if(kind==='coin'){assert.equal(prepared.input.coinType,'0x'+'0'.repeat(63)+'2::rtd::RTD');assert.equal(prepared.input.amount,'0.000000001');assert.equal(prepared.input.to,owner)}
 else {assert.equal(prepared.input.kind,kind);if(kind==='stake')assert.equal(prepared.input.amount,'1000000000');else assert(/^0x[0-9a-f]{64}$/.test(prepared.input.objectId))}
 const data=wire.canonical(prepared.bytesBase64);assert.equal(data.V1.sender,owner);assert.equal(data.V1.gasData.owner,owner);
 assert.equal(data.V1.gasData.budget,prepared.gasBudget);assert(['Validity','ValidDuring'].includes(data.V1.expiration.$kind));
 assert.equal(data.V1.expiration[data.V1.expiration.$kind].minTimestamp,null);assert.equal(data.V1.expiration[data.V1.expiration.$kind].maxTimestamp,null);
 return data;
}
async function expected(prepared,name){
 assert(names.includes(name));const original=wire.canonical(prepared.bytesBase64),data=structuredClone(original),e=original.V1.expiration,w=e[e.$kind];
 let expiration;
 switch(name){
 case 'originalWindow':expiration=structuredClone(e);break;
 case 'expirationNone':expiration={$kind:'None',None:true};break;
 case 'expiredEpoch':expiration={$kind:'Epoch',Epoch:'0'};break;
 case 'expirationLargeEpoch':expiration={$kind:'Epoch',Epoch:'9007199254740993'};break;
 case 'windowMinTimestamp':case 'windowMaxTimestamp':expiration=structuredClone(e);expiration[e.$kind][name==='windowMinTimestamp'?'minTimestamp':'maxTimestamp']=name==='windowMinTimestamp'?'1':'18446744073709551615';break;
 default:expiration={$kind:'ValidDuring',ValidDuring:{minEpoch:w.minEpoch,maxEpoch:w.maxEpoch,minTimestamp:null,maxTimestamp:null,chain:w.chain,nonce:w.nonce}};
  if(name==='validDuringMinTimestamp')expiration.ValidDuring.minTimestamp='1';
  if(name==='validDuringMaxTimestamp')expiration.ValidDuring.maxTimestamp='18446744073709551615';
 }
 data.V1.expiration=expiration;const bytesBase64=encode(data),digest=await Transaction.from(bytesBase64).getDigest();
 const timestampUnsupported=['windowMinTimestamp','windowMaxTimestamp','validDuringMinTimestamp','validDuringMaxTimestamp'].includes(name);
 return {name,bytesBase64,digest,expiration,expired:name==='expiredEpoch',timestampUnsupported,
  approvalEnabled:name!=='expiredEpoch'&&!timestampUnsupported,originalDigest:prepared.digest};
}
async function auditOne(row,base,{owner,origin,demoOrigin,initialJournal,build}){
 const want=await expected(base,row.variant.name);for(const k of Object.keys(want))assert.deepEqual(row.variant[k],want[k]);
 assert.equal(Buffer.from(await Transaction.from(row.variant.json).build()).toString('base64'),want.bytesBase64);
 assert.equal(row.request.tx.data,row.variant.json);assert.equal(row.request.tx.justSign,true);assert.equal(row.request.tx.type,'transaction');
 assert.equal(row.request.tx.account,owner);assert.equal(row.request.tx.chain,'rtd:localnet');assert.equal(row.request.origin,demoOrigin);assert.equal(row.request.approved,null);
 assert(/^http:\/\/127\.0\.0\.1:[0-9]+$/.test(demoOrigin));assert.equal('chrome-extension://'+new URL(row.popupUrl).host,origin);
 assert.equal(row.approvalEnabled,want.approvalEnabled);assert.equal(row.approvedClicked,false);assert(row.normalRejectClosedPopup&&row.noSignatureReturned);
 assert(/reject/i.test(row.rejectionText));assert.deepEqual(row.pendingRequestsAfterReject,{});assert.deepEqual(row.journalAfterReject,initialJournal);
 assert.equal(row.simulations.length,1);const frame=row.simulations[0];
 const normalized={...frame,headers:frame.headers??frame.responseHeaders};
 const result=await wire.simulation(normalized,want,{allowFailure:want.expired||want.timestampUnsupported,item:{...row,objectType:base.input.objectType}});
 if(want.expired||want.timestampUnsupported){
  assert.equal(row.observed.prepared.length,0);assert(result.error);
  assert.equal(result.error.status,want.expired?13:3);
  assert.equal(result.error.message,want.expired?'Transaction Expired':'Error checking transaction input objects: Feature is not supported: Timestamp-based transaction expiration is not yet supported');
  assert(/Gas estimation failed|网络费用估算失败/.test(row.body));
 }else{
  assert(result.success&&result.canonicalFinalBytesAndEffects);assert.equal(row.observed.prepared.length,1);
  const p=row.observed.prepared[0];assert.equal(p.bytesBase64,want.bytesBase64);assert.equal(p.digest,want.digest);
  assert.equal(p.dappApproval.requestId,row.request.id);assert(p.dappApproval.accountId&&typeof p.dappApproval.expiresAt==='number');
  assert(/^[0-9a-f]{64}$/.test(p.dappApproval.approvalTokenSha256));assert(!Object.hasOwn(p.dappApproval,'approvalToken'));
  assert(row.body.includes(want.digest));
  if(want.name==='expirationNone')assert(/No transaction expiration|交易未设置有效期/.test(row.body));
  else if(want.name==='expirationLargeEpoch'){assert(row.body.includes('9007199254740993'));assert(!row.body.includes('9007199254740992'))}
  else {const w=want.expiration[want.expiration.$kind];for(const n of [w.minEpoch,w.maxEpoch].filter(v=>v!==null))assert(row.body.includes(n));
   if(want.expiration.$kind==='Validity'&&w.allowedProposers){assert(/Restricted proposing validators|限定提议验证者/.test(row.body));assert(row.body.includes(w.allowedProposers.proposers.join(', ')))}
   if(want.expiration.$kind==='ValidDuring')assert(!/Restricted proposing validators|限定提议验证者/.test(row.body));}
 }
 assert(row.uiSource.loadedBundles.length>0);for(const s of row.uiSource.loadedBundles)assert.equal(s.loadedSha256,build.artifacts[s.file]);
 return {kind:row.kind,name:want.name,digest:want.digest,status:result.error?.status??0,canonicalFinalEffects:!result.error,
  actualRequestId:row.request.id,normalRejectAccepted:true,actualBodySha256:crypto.createHash('sha256').update(row.body).digest('hex')};
}
module.exports={names,expected,auditOne};
