// Copyright (c) LinkU Labs, Inc.
// SPDX-License-Identifier: Apache-2.0
// Read the three immutable historical receipts from current debug; never approve or resend.
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),crypto=require('node:crypto');
const {RtdGrpcClient,GrpcTypes}=require('rtd-typescript/grpc'),{bcs}=require('rtd-typescript/bcs'),{verifyTransactionSignature}=require('rtd-typescript/verify');
const parser=require('./lib/C88-post-write-bytes.cjs'),ownership=require('./lib/C148-current-core-gateway-ownership.cjs');
const logs=path.resolve(__dirname,'../migrationToGRpcOrGraphQLDoc/workLog'),read=p=>JSON.parse(fs.readFileSync(p)),sha=p=>crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex');
const names=[['coin','20261009-C128-executed-independent-03.json','actualDualSignCoinExecutionAccepted'],['stake','20261009-C129-sponsored-stake-execution-independent-01.json','actualFreshSponsoredStakeExecuted'],['withdraw','20261009-C129-sponsored-withdraw-execution-independent-01.json','actualFreshSponsoredWithdrawExecuted']];
(async()=>{
 const out=path.join(logs,'20261009-C152-current-debug-historical-sponsored-receipts-01.json');assert(!fs.existsSync(out));
 const frames=[],receipts=[],inputPins={},h0='BkuLHhdtnoK7yLxo2eQuvcjHtdyipE7MMyxgTJiyHGg4';let result,authority;
 const retain=p=>{inputPins[p]=sha(p)},checkPins=()=>{for(const[p,h]of Object.entries(inputPins))assert.equal(sha(p),h,p)};
 try{
  authority=ownership.capture();retain(__filename);
  const ledgerFile=path.join(logs,'20261009-TX01-TX04-non-nft-evidence-ledger-01.json'),ledger=read(ledgerFile);assert(ledger.passed);retain(ledgerFile);for(const[p,h]of Object.entries(ledger.linkedImmutableJsonSha256))assert.equal(sha(p),h);
  const lineage=require('./lib/C136-product-source-lineage.cjs'),q=read(lineage.qualificationFile),source=lineage.validate(q.originalSource,q.buildFile);
  const fetchRead=async(input,init)=>{
   const url=new URL(input instanceof Request?input.url:String(input));assert.equal(url.origin,'http://127.0.0.1:41750');assert(['/rtd.rpc.v2.LedgerService/GetServiceInfo','/rtd.rpc.v2.LedgerService/GetTransaction'].includes(url.pathname));assert.equal(init.method,'POST');
   const response=await fetch(input,{...init,signal:AbortSignal.timeout(25000),redirect:'error',credentials:'omit'}),bytes=Buffer.from(await response.clone().arrayBuffer());
   frames.push({url:url.href,status:response.status,headers:Object.fromEntries(response.headers),requestBase64:Buffer.from(init.body).toString('base64'),responseBase64:bytes.toString('base64')});assert.equal(response.status,200);assert.equal(response.headers.get('x-rtd-chain-id'),h0);return response;
  };
  const client=new RtdGrpcClient({network:'localnet',baseUrl:'http://127.0.0.1:41750',format:'binary',fetch:fetchRead,mvr:{url:''}});
  assert.equal((await client.ledgerService.getServiceInfo({})).response.chainId,h0);
  for(const[kind,name,flag]of names){
   const file=path.join(logs,name),p=read(file);assert(p.passed&&p[flag]&&p.h0===h0);retain(file);
   const candidates=Object.keys(p.inputsSha256).filter(n=>n.endsWith('/node-frames.json'));assert.equal(candidates.length,1);const originalFile=candidates[0];assert.equal(sha(originalFile),p.inputsSha256[originalFile]);retain(originalFile);
   const original=read(originalFile).filter(f=>f.url.endsWith('/GetTransaction')&&f.status===200&&f.headers['grpc-status']!=='5').map(f=>({request:GrpcTypes.GetTransactionRequest.fromBinary(parser.grpcBody(f.requestBase64,false)),response:GrpcTypes.GetTransactionResponse.fromBinary(parser.grpcBody(f.responseBase64,true))})).filter(f=>f.request.digest===p.digest);assert(original.length>0);
   const old=original.at(-1),current=(await client.ledgerService.getTransaction(old.request)).response.transaction,previous=old.response.transaction;assert(current&&previous);assert.equal(current.digest,p.digest);assert.equal(current.transaction.digest,p.digest);
   assert.deepEqual(Buffer.from(current.transaction.bcs.value),Buffer.from(previous.transaction.bcs.value));assert.deepEqual(Buffer.from(current.effects.bcs.value),Buffer.from(previous.effects.bcs.value));assert.equal(String(current.checkpoint),String(previous.checkpoint));
   assert.equal(parser.typed('TransactionData',current.transaction.bcs.value),p.digest);const data=parser.canonical(bcs.TransactionData,current.transaction.bcs.value),effects=parser.canonical(bcs.TransactionEffects,current.effects.bcs.value);assert.equal(effects.V2.status.$kind,'Success');assert.equal(effects.V2.transactionDigest,p.digest);assert(current.effects.status.success);
   const signatures=current.signatures.map(s=>Buffer.from(s.bcs.value).toString('base64'));assert.deepEqual(signatures,previous.signatures.map(s=>Buffer.from(s.bcs.value).toString('base64')));assert.equal(signatures.length,2);const addresses=[data.V1.sender,data.V1.gasData.owner];assert.notEqual(...addresses);
   for(const[i,address]of addresses.entries())assert.equal((await verifyTransactionSignature(Buffer.from(current.transaction.bcs.value),signatures[i],{address})).toRtdAddress(),address);
   receipts.push({kind,digest:p.digest,checkpoint:String(current.checkpoint),currentFullTransactionBytesIdentical:true,currentFullEffectsBytesIdentical:true,bothOriginalSignaturesLocallyVerified:true,sender:addresses[0],gasOwner:addresses[1],requestMask:old.request.readMask.paths});
  }
  assert.equal((await client.ledgerService.getServiceInfo({})).response.chainId,h0);checkPins();assert.deepEqual(ownership.capture(),authority);assert.deepEqual(lineage.validate(q.originalSource,q.buildFile),source);assert.equal(frames.length,5);
  result={passed:true,observedAt:new Date().toISOString(),source,h0,receipts,currentDebugHistoricalReceiptsRead:true,immutableHistoricalLedgerJsonsChecked:107,allCurrentTransactionEffectsAndBothSignaturesIdentical:true,newApprovals:0,signatures:0,executeRequests:0,nftBusinessRequests:0,archiveWriteAfterAcceptance:false,parentCompletion:false,fullNonNftAuthorizationAccepted:false,currentRuntimeAuthority:authority,frames,inputsSha256:inputPins};
 }catch(error){result={passed:false,observedAt:new Date().toISOString(),errorType:error.name,message:String(error.message).slice(0,1200),receipts,frames,newApprovals:0,signatures:0,executeRequests:0,parentCompletion:false};process.exitCode=1}
 fs.writeFileSync(out,JSON.stringify(result,null,2)+'\n',{flag:'wx',mode:0o600});console.log(JSON.stringify({passed:result.passed,receipts:receipts.length,requests:frames.length,message:result.message}));
})().catch(error=>{console.error(error.message);process.exitCode=1});
