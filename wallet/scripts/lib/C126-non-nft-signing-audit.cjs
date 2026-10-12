// Independent actual sign-only signatures, canonical simulation pairs and native verification. C126 retains this complete audit.
const fs=require('node:fs'),assert=require('node:assert/strict'),crypto=require('node:crypto');
const {GrpcTypes}=require('rtd-typescript/grpc'),{Transaction}=require('rtd-typescript/transactions');
const {verifyTransactionSignature}=require('rtd-typescript/verify');
const base=require('./C117-non-nft-validity-audit.cjs'),wire=require('./C114-nft-wire-contract-v3.cjs');
const names=Object.freeze(['originalWindow','expirationNone','expirationLargeEpoch','validDuringNoTimestamp']);
const sha=f=>crypto.createHash('sha256').update(fs.readFileSync(f)).digest('hex');
function frame(encoded,type,response){
 const bytes=Buffer.from(encoded,'base64');assert.equal(bytes.toString('base64'),encoded);assert(bytes.length>=5&&bytes[0]===0);
 const end=5+bytes.readUInt32BE(1);assert(end<=bytes.length);
 if(response){assert.equal(bytes[end],128);assert.equal(end+5+bytes.readUInt32BE(end+1),bytes.length);assert(/(?:^|\r\n)grpc-status:\s*0\r\n/.test(bytes.subarray(end+5).toString()))}
 else assert.equal(end,bytes.length);return type.fromBinary(bytes.subarray(5,end));
}
function replaceRequest(row,change){
 const copy=structuredClone(row),request=frame(copy.requestBase64,GrpcTypes.VerifySignatureRequest,false);change(request);
 const body=Buffer.from(GrpcTypes.VerifySignatureRequest.toBinary(request)),header=Buffer.alloc(5);header.writeUInt32BE(body.length,1);
 copy.requestBase64=Buffer.concat([header,body]).toString('base64');return copy;
}
function signatureFrame(row,bytesBase64,signature,owner){
 assert.equal(row.url,'http://127.0.0.1:41750/rtd.rpc.v2.SignatureVerificationService/VerifySignature');assert.equal(row.status,200);
 const request=frame(row.requestBase64,GrpcTypes.VerifySignatureRequest,false),response=frame(row.responseBase64,GrpcTypes.VerifySignatureResponse,true);
 assert.equal(request.message.name,'TransactionData');assert.equal(Buffer.from(request.message.value).toString('base64'),bytesBase64);
 assert.equal(Buffer.from(request.signature.bcs.value).toString('base64'),signature);assert.equal(request.signature.signature.oneofKind,undefined);
 assert.equal(request.address,owner);assert.deepEqual(request.jwks,[]);assert.equal(response.isValid,true);assert(!response.reason);
 return {actualNativeSignatureValid:true,sender:owner,requestBase64:row.requestBase64,responseBase64:row.responseBase64};
}
async function auditOne(row,prepared,{owner,origin,demoOrigin,initialJournal,build}){
 assert(names.includes(row.variant.name));const sponsored=await require('./C126-sponsored-non-nft-expected-v2.cjs').expected(prepared,row.kind),want=await base.expected(sponsored,row.variant.name);
 const {p:inventory,refs}=require('./C126-sponsored-non-nft-expected-v2.cjs').selected();assert.match(row.body,/Sponsored|已赞助/);assert.match(row.body,/Sponsor Pays|赞助方支付/);
 assert.deepEqual(row.sponsorContract,{inventoryFile:require('./C126-sponsored-non-nft-expected-v2.cjs').inventoryFile,inventorySha256:sha(require('./C126-sponsored-non-nft-expected-v2.cjs').inventoryFile),sender:inventory.sender,sponsor:inventory.sponsor,sourceDigest:prepared.digest,sourceBytesBase64:prepared.bytesBase64,senderCoin:refs.sender,sponsorCoin:refs.sponsor});
 for(const k of Object.keys(want))assert.deepEqual(row.variant[k],want[k]);assert(want.approvalEnabled&&!want.expired&&!want.timestampUnsupported);
 assert.equal(Buffer.from(await Transaction.from(row.variant.json).build()).toString('base64'),want.bytesBase64);
 assert.equal(row.request.tx.data,row.variant.json);assert.equal(row.request.tx.justSign,true);assert.equal(row.request.tx.type,'transaction');
 assert.equal(row.request.tx.account,owner);assert.equal(row.request.tx.chain,'rtd:localnet');assert.equal(row.request.origin,demoOrigin);assert.equal(row.request.approved,null);
 assert(/^http:\/\/127\.0\.0\.1:[0-9]+$/.test(demoOrigin));assert.equal('chrome-extension://'+new URL(row.popupUrl).host,origin);
 assert.equal(row.approvalEnabled,true);assert.equal(row.approvedClicked,true);assert(row.normalApproveClosedPopup);assert.equal(row.noSignatureReturned,false);
 assert.deepEqual(row.pendingRequestsAfterApproval,{});assert.deepEqual(row.journalAfterApproval,initialJournal);
 assert.equal(row.simulations.length,2);assert.equal(row.previewSimulations.length,1);assert.deepEqual(row.previewSimulations[0],row.simulations[0]);
 for(const f of row.simulations){const result=await wire.simulation({...f,headers:f.headers??f.responseHeaders},want,{});assert(result.success&&result.canonicalFinalBytesAndEffects)}
 assert.equal(row.observed.prepared.length,1);const p=row.observed.prepared[0];assert.equal(p.bytesBase64,want.bytesBase64);assert.equal(p.digest,want.digest);
 assert.equal(p.dappApproval.requestId,row.request.id);assert(p.dappApproval.accountId&&typeof p.dappApproval.expiresAt==='number');
 assert(/^[0-9a-f]{64}$/.test(p.dappApproval.approvalTokenSha256));assert(!Object.hasOwn(p.dappApproval,'approvalToken'));assert(row.body.includes(want.digest));
 if(want.name==='expirationNone')assert(/No transaction expiration|交易未设置有效期/.test(row.body));
 else if(want.name==='expirationLargeEpoch'){assert(row.body.includes('9007199254740993'));assert(!row.body.includes('9007199254740992'))}
 else {const v=want.expiration[want.expiration.$kind];for(const n of [v.minEpoch,v.maxEpoch].filter(v=>v!==null))assert(row.body.includes(n));
  if(want.expiration.$kind==='Validity'&&v.allowedProposers){assert(/Restricted proposing validators|限定提议验证者/.test(row.body));assert(row.body.includes(v.allowedProposers.proposers.join(', ')))}
  if(want.expiration.$kind==='ValidDuring')assert(!/Restricted proposing validators|限定提议验证者/.test(row.body));}
 assert(row.uiSource.loadedBundles.length>0);for(const s of row.uiSource.loadedBundles)assert.equal(s.loadedSha256,build.artifacts[s.file]);
 assert.equal(row.signedResult.bytes,want.bytesBase64);assert.equal(await Transaction.from(row.signedResult.bytes).getDigest(),want.digest);
 const key=await verifyTransactionSignature(Buffer.from(row.signedResult.bytes,'base64'),row.signedResult.signature,{address:owner});assert.equal(key.toRtdAddress(),owner);assert.equal(row.locallyVerifiedSigner,owner);
 assert.equal(row.verificationFrames.length,1);signatureFrame(row.verificationFrames[0],want.bytesBase64,row.signedResult.signature,owner);
 return {kind:row.kind,name:want.name,digest:want.digest,actualRequestId:row.request.id,signature:row.signedResult.signature,
  signatureVerifiedLocally:true,nativeSignatureVerified:true,formalSameByteSimulations:2,actualBodySha256:crypto.createHash('sha256').update(row.body).digest('hex')};
}
async function audit(p,build){
 const v=p.validityUi;assert(v.passed&&v.normalDisconnect);assert.equal(v.disconnectPermissionPresent,false);assert.equal(v.signatures,12);assert.equal(v.executeRequests,0);
 assert.equal(v.records.length,12);assert.equal(v.surfaces.length,12);assert.deepEqual(p.cases.map(r=>r.kind),['coin','stake','withdraw']);
 assert(p.validityCleanup.length===1&&p.validityCleanup[0].demoClosed&&p.validityCleanup[0].serverClosed);
 const cfg={owner:p.owner,origin:p.gatewayAuthority.origin,demoOrigin:v.demoOrigin,initialJournal:p.initialJournal,build},records=[],ids=new Set(),tokens=new Set();let mutants=0;
 for(const c of p.cases){base.requireNonNft(c.approval.prepared,c.kind,p.owner);const rows=v.records.filter(r=>r.kind===c.kind);assert.deepEqual(rows.map(r=>r.variant.name),names);
  for(const row of rows){const actual=await auditOne(row,c.approval.prepared,cfg);assert(!ids.has(row.request.id));ids.add(row.request.id);
   const token=row.observed.prepared[0].dappApproval.approvalTokenSha256;assert(!tokens.has(token));tokens.add(token);
   for(const f of [...row.simulations,...row.verificationFrames]){const matches=p.frames.filter(raw=>raw.url===f.url&&raw.stage===f.stage&&raw.requestBase64===f.requestBase64&&raw.responseBase64===f.responseBase64);assert.equal(matches.length,1);assert.deepEqual(matches[0],f)}
   for(const change of [x=>x.simulations[0].status=503,x=>x.variant.digest+='bad',x=>x.approvalEnabled=false,x=>x.request.tx.justSign=false,
    x=>x.signedResult.bytes+='AQ==',x=>{const b=Buffer.from(x.signedResult.signature,'base64');b[1]^=1;x.signedResult.signature=b.toString('base64')},
    x=>x.verificationFrames[0]=replaceRequest(x.verificationFrames[0],q=>q.address='0x'+'0'.repeat(63)+'1')]){
    const changed=structuredClone(row);change(changed);await assert.rejects(()=>auditOne(changed,c.approval.prepared,cfg));mutants++;
   }records.push(actual);
  }
 }
 assert.equal(ids.size,12);assert.equal(tokens.size,12);assert.equal(mutants,84);assert.equal(p.frames.filter(f=>f.url.endsWith('/rtd.rpc.v2.SignatureVerificationService/VerifySignature')).length,12);
 return {actualNonNftWalletStandardSigningAccepted:true,actualSigningAccepted:true,actualNormalDappCases:12,actualWalletSignatures:12,
  actualCanonicalPositiveFinalEffects:24,actualNativeSignatureVerificationFrames:12,actualUniqueRequestIds:12,actualUniqueApprovalTokens:12,
  actualWireAndUiMutationRefusals:84,independentlyAuditedSigningCases:records,actualNormalApproveAndDisconnectAccepted:true,nftBusinessRequests:0,
  fullNonNftAuthorizationAccepted:false,fullNonNftPhaseAccepted:false,parentCompletion:false};
}
module.exports={names,frame,replaceRequest,signatureFrame,auditOne,audit,sha};
