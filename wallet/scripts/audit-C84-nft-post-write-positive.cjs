// Decode actual protobuf/BCS/GraphQL/history bytes independently of the production readers.
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),assert=require('node:assert/strict');
const {GrpcTypes}=require('rtd-typescript/grpc');
const {bcs,TypeTagSerializer}=require('rtd-typescript/bcs');
const {toBase58,normalizeStructTag}=require('rtd-typescript/utils');
const {blake2b}=require('@noble/hashes/blake2.js');
const read=f=>JSON.parse(fs.readFileSync(f,'utf8'));
const sha=f=>crypto.createHash('sha256').update(fs.readFileSync(f)).digest('hex');
function base64(value){assert.equal(typeof value,'string');const bytes=Buffer.from(value,'base64');assert.equal(bytes.toString('base64'),value);return bytes;}
function grpcBody(value,response){
 const bytes=base64(value);assert(bytes.length>=5&&bytes[0]===0);const end=5+bytes.readUInt32BE(1);assert(end<=bytes.length);
 if(response){assert(end+5<=bytes.length&&bytes[end]===128);assert.equal(end+5+bytes.readUInt32BE(end+1),bytes.length);const trailers=bytes.subarray(end+5).toString();assert.equal((trailers.match(/(^|\r\n)grpc-status:[ \t]*0(\r\n|$)/g)||[]).length,1);}
 else assert.equal(end,bytes.length);
 return bytes.subarray(5,end);
}
function canonical(codec,value){const bytes=Buffer.from(value),parsed=codec.parse(bytes);assert.deepEqual(Buffer.from(codec.serialize(parsed).toBytes()),bytes);return parsed;}
function typed(name,bytes){return toBase58(blake2b(Buffer.concat([Buffer.from(name+'::'),Buffer.from(bytes)]),{dkLen:32}));}
function rawOwner(owner){
 assert(owner);
 if(owner.kind===GrpcTypes.Owner_OwnerKind.ADDRESS)return {AddressOwner:owner.address};
 if(owner.kind===GrpcTypes.Owner_OwnerKind.OBJECT)return {ObjectOwner:owner.address};
 assert.fail('Controlled NFT has an unexpected native owner kind');
}
function nativeObjects(frames,expectedIds){
 const expected=new Set(expectedIds),objects=new Map();
 for(const frame of frames.filter(f=>f.url.endsWith('/GetObject'))){
  assert.equal(frame.status,200);
  const request=GrpcTypes.GetObjectRequest.fromBinary(grpcBody(frame.requestBase64,false));
  const response=GrpcTypes.GetObjectResponse.fromBinary(grpcBody(frame.responseBase64,true));
  assert(response.object&&response.object.objectId===request.objectId);
  if(!expected.has(request.objectId))continue;
  assert(!objects.has(request.objectId),'Duplicate native object observation');
  const object=response.object;assert(object.bcs?.value?.length&&object.contents?.value?.length);
  const parsed=canonical(bcs.Object,object.bcs.value);
  assert.equal(typed('Object',object.bcs.value),object.digest);assert.equal(parsed.data.$kind,'Move');
  assert.equal(parsed.data.Move.type.$kind,'Other');
  const type=normalizeStructTag(TypeTagSerializer.tagToString({struct:parsed.data.Move.type.Other}));
  assert.equal(type,normalizeStructTag(object.objectType));
  assert.equal(parsed.data.Move.version,String(object.version));
  assert.deepEqual(Buffer.from(parsed.data.Move.contents),Buffer.from(object.contents.value));
  assert.equal(bcs.Address.parse(Buffer.from(parsed.data.Move.contents).subarray(0,32)),request.objectId);
  assert.deepEqual(Buffer.from(bcs.Owner.serialize(parsed.owner).toBytes()),Buffer.from(bcs.Owner.serialize(rawOwner(object.owner)).toBytes()));
  assert.equal(parsed.previousTransaction,object.previousTransaction);
  objects.set(request.objectId,{objectId:object.objectId,version:String(object.version),digest:object.digest,
   type,owner:parsed.owner,content:Buffer.from(object.contents.value),objectBcs:Buffer.from(object.bcs.value),previousTransaction:object.previousTransaction});
 }
 assert.deepEqual([...objects.keys()].sort(),[...expected].sort());return objects;
}
function graphqlOwner(owner){
 assert(owner&&owner.address&&typeof owner.address.address==='string');
 if(owner.__typename==='AddressOwner')return {$kind:'AddressOwner',AddressOwner:owner.address.address};
 if(owner.__typename==='ObjectOwner')return {$kind:'ObjectOwner',ObjectOwner:owner.address.address};
 assert.fail('Unexpected controlled NFT GraphQL owner');
}
function snapshotObjects(frames,snapshot,h0,native){
 const found=new Map();let pins=0,reads=0;
 function walk(value){
  if(!value||typeof value!=='object')return;
  if(Array.isArray(value)){for(const v of value)walk(v);return;}
  if(native.has(value.address)&&value.contents&&typeof value.contents.bcs==='string'&&value.owner&&value.version!==undefined&&value.digest){
   const current=native.get(value.address);assert.equal(String(value.version),current.version);assert.equal(value.digest,current.digest);
   assert.equal(normalizeStructTag(value.contents.type.repr),current.type);
   assert.deepEqual(graphqlOwner(value.owner),current.owner);assert.deepEqual(base64(value.contents.bcs),current.content);
   if(value.previousTransaction!==undefined)assert.equal(value.previousTransaction.digest,current.previousTransaction);
   found.set(value.address,(found.get(value.address)||0)+1);
  }
  for(const v of Object.values(value))walk(v);
 }
 for(const frame of frames){
  if(!frame.url.endsWith('/graphql')||frame.url.endsWith('/account/graphql')||frame.status!==200)continue;
  const request=JSON.parse(base64(frame.requestBase64)),response=JSON.parse(base64(frame.responseBase64));
  assert(response.data&&!response.errors);const data=response.data;
  if(data.walletGenesis)assert.equal(data.walletGenesis.digest,h0);
  if(data.walletSnapshot){
   assert.equal(String(data.walletSnapshot.sequenceNumber),String(snapshot.checkpoint));assert.equal(data.walletSnapshot.digest,snapshot.digest);
   pins++;if(request.query.includes('WalletSnapshotRead'))reads++;walk(data.walletSnapshot.query);
  }
 }
 assert(pins>0&&reads>0);assert.deepEqual([...found.keys()].sort(),[...native.keys()].sort());
 return {pinnedFrames:pins,domainReadFrames:reads,rawNFTSelections:[...found.values()].reduce((a,b)=>a+b,0)};
}
function historyPages(frames,history,h0,original,sourceAddress,originalBrowser){
 const pages=[];let retainedFailures=0;
 for(const frame of frames.filter(f=>f.url.endsWith('/account/graphql'))){
  if(frame.status!==200){retainedFailures++;continue;}
  const request=JSON.parse(base64(frame.requestBase64)),response=JSON.parse(base64(frame.responseBase64));
  assert(response.data&&!response.errors);
  const page=response.data.accountHistory;if(!page)continue;
  if(page.snapshot!==history.snapshot||page.checkpointLo!==history.checkpointLo||page.checkpointHi!==history.checkpointHi)continue;
  assert.equal(page.chainId,h0);assert.equal(page.address,sourceAddress);assert.equal(request.variables.chain,h0);assert.equal(request.variables.address,sourceAddress);
  assert.equal(request.variables.lo,page.checkpointLo);assert.equal(request.variables.hi,page.checkpointHi);assert.equal(request.variables.limit,page.limit);
  assert(page.completeForRegisteredKiosks===true&&typeof page.registrationComplete==='boolean');
  pages.push({request:request.variables,page});
 }
 assert(pages.length>0);
 const attempts=[];let current;
 for(const row of pages){if(row.request.cursor===null){current=[];attempts.push(current);}assert(current);current.push(row);}
 const completed=attempts.filter(rows=>rows[rows.length-1].page.hasNextPage===false);assert(completed.length>0);
 const selected=completed[completed.length-1],transactions=[];let cursor=null,total;
 for(const row of selected){
  assert.equal(row.request.cursor,cursor);assert(typeof row.page.hasNextPage==='boolean');assert(Array.isArray(row.page.transactions));
  assert(Number.isSafeInteger(row.page.totalTransactions)&&row.page.totalTransactions>=0);
  if(total===undefined)total=row.page.totalTransactions;assert.equal(total,row.page.totalTransactions);
  for(const [key,value]of Object.entries(history.coverage))assert.equal(row.page[key],value);
  transactions.push(...row.page.transactions);cursor=row.page.nextCursor;
  if(row.page.hasNextPage)assert(typeof cursor==='string'&&cursor.length>0);else assert.equal(cursor,null);
 }
 assert.equal(transactions.length,total);assert.equal(new Set(transactions.map(r=>r.digest)).size,total);
 assert.equal(history.totalTransactions,total);assert.deepEqual(transactions.map(r=>r.digest).sort(),history.transactions.map(r=>r.digest).sort());
 for(const dispatched of original.sixFirstDispatches){
  const rows=transactions.filter(r=>r.digest===dispatched.digest);assert.equal(rows.length,1);const row=rows[0];
  const receipt=original.nativeReceipts.find(r=>r.digest===row.digest);assert(receipt&&receipt.nativeSuccessVerified);
  assert.equal(String(row.checkpoint),receipt.checkpoint);assert.equal(row.sender,sourceAddress);assert.equal(row.status,'SUCCESS');
  assert.equal(row.transaction.digest,row.digest);assert.equal(row.transaction.effects.digest,row.digest);
  const tx=base64(row.transaction.transactionBcs),fx=base64(row.transaction.effects.effectsBcs);
  canonical(bcs.TransactionData,tx);const effects=canonical(bcs.TransactionEffects,fx);
  assert.equal(typed('TransactionData',tx),row.digest);assert.equal(effects[effects.$kind].transactionDigest,row.digest);
  assert.equal(typed('TransactionEffects',fx),row.transaction.effects.effectsDigest);
  const originalExecution=originalBrowser.executions.find(e=>e.digest===row.digest);
  const preview=originalBrowser.previews.find(e=>e.approval.digest===row.digest);assert(originalExecution&&preview);
  assert.equal(tx.toString('base64'),preview.approval.prepared.bytesBase64);
  assert.equal(fx.toString('base64'),originalExecution.receipt.effectsBase64);
 }
 return {completePages:selected.length,totalTransactions:total,originalSixExactTransactionsAndEffects:6,retainedOtherAttempts:attempts.length-1,retainedFailureFrames:retainedFailures};
}
function main(){
 const [proofArg,outputArg]=process.argv.slice(2);assert(proofArg&&outputArg&&!fs.existsSync(outputArg));let result;
 try{
  const p=read(proofArg);assert(p.passed&&!p.preparedOnly&&p.indexedPostWriteAccepted&&!p.chromeAccepted&&!p.parentCompletion);
  assert.equal(p.targetCheckpoint,524022);assert.equal(p.profilesOpened+p.simulations+p.signatures+p.executeRequests,0);
  for(const [file,digest]of Object.entries(p.inputsSha256))assert.equal(sha(file),digest);
  const logs=path.resolve(__dirname,'../migrationToGRpcOrGraphQLDoc/workLog');
  const originalFile=path.join(logs,'20261007-C48-nft-execution-browser-independent-02.json'),original=read(originalFile);
  const seedFile=path.join(logs,'20261007-C43-nonempty-kiosk-native-independent-01.json'),seed=read(seedFile);
  const browserFile=path.join(logs,'20261007-C48-nft-execution-browser-01.json'),browser=read(browserFile);
  assert(original.passed&&original.originalExecutions===6&&original.normalRelockChromeAbsent&&original.journalsRetained&&seed.passed&&browser.passed);
  for(const [file,digest]of Object.entries(original.inputsSha256))assert.equal(sha(file),digest);
  assert.equal(p.h0,original.h0);assert.equal(p.h0,seed.h0);assert.equal(p.h0,browser.h0);
  const allowed=new Set(['http://127.0.0.1:41750','http://127.0.0.1:41957','http://127.0.0.1:41958','http://127.0.0.1:41959']);
  for(const frame of p.frames){const url=new URL(frame.url);assert(allowed.has(url.origin));assert(['asset','fullnode','history'].includes(frame.phase));assert(['/graphql','/account/graphql'].includes(url.pathname)||/\/(GetCheckpoint|GetServiceInfo|GetObject|GetAvailableRange)$/.test(url.pathname));}
  const ids=[...seed.nfts,...seed.obNfts].map(n=>n.objectId);assert.equal(new Set(ids).size,8);
  const nftFrames=p.frames.filter(f=>f.url.endsWith('/GetObject'));assert.equal(nftFrames.length,8);
  assert(nftFrames.every(f=>f.phase==='fullnode'&&new URL(f.url).origin==='http://127.0.0.1:41750'));
  const native=nativeObjects(nftFrames,ids);
  for(const object of original.currentTransferredNFTs){const actual=native.get(object.objectId);assert.equal(actual.objectBcs.toString('base64'),object.objectBcsBase64);assert.equal(actual.version,object.version);assert.equal(actual.digest,object.digest);assert.deepEqual(actual.owner,object.owner);assert.equal(actual.previousTransaction,object.previousTransaction);}
  assert(BigInt(p.snapshot.checkpoint)>=524022n);const gql=snapshotObjects(p.frames.filter(f=>f.phase==='asset'),p.snapshot,p.h0,native);
  const owners=[seed.addresses.source,seed.addresses.existingTarget,seed.addresses.newTarget];assert.deepEqual(p.ownerResults.map(r=>r.owner),owners);
  const discoveries=new Map();
  for(const row of p.ownerResults)for(const object of [...row.direct,...row.kiosks.flatMap(k=>k.items)]){
   if(!native.has(object.objectId))continue;assert(!discoveries.has(object.objectId));discoveries.set(object.objectId,row.owner);
  }
  assert.deepEqual([...discoveries.keys()].sort(),[...native.keys()].sort());
  for(const dispatched of original.sixFirstDispatches){assert.equal(discoveries.get(dispatched.objectId),dispatched.recipient);
   const object=original.currentTransferredNFTs.find(n=>n.objectId===dispatched.objectId),row=p.ownerResults.find(r=>r.owner===dispatched.recipient);
   if(object.targetKiosk){const kiosk=row.kiosks.find(k=>k.kioskId===object.targetKiosk);assert(kiosk?.kind==='originbyte'&&kiosk.items.some(n=>n.objectId===object.objectId));}
   else assert(row.direct.some(n=>n.objectId===object.objectId));
  }
  const source=p.ownerResults.find(r=>r.owner===seed.addresses.source),sourceItems=source.kiosks.flatMap(k=>k.items);
  const locked=seed.nfts.find(n=>n.value.serial==='3'),exclusive=seed.nfts.find(n=>n.value.serial==='4');
  assert.deepEqual(sourceItems.map(n=>n.objectId).sort(),[locked.objectId,exclusive.objectId].sort());
  assert(sourceItems.find(n=>n.objectId===locked.objectId).isLocked);const item=sourceItems.find(n=>n.objectId===exclusive.objectId);assert(item.listing?.isExclusive&&String(item.listing.price)==='1000000');
  for(const expected of seed.kiosks){const kiosk=source.kiosks.find(k=>k.kioskId===expected.objectId);assert(kiosk?.kind==='framework');assert.equal(kiosk.ownerCap.isPersonal,expected.kind==='personal');assert.equal(kiosk.ownerCap.objectId,expected.kind==='personal'?seed.personalCap.objectId:seed.frameworkCap.objectId);}
  assert(p.sourceHistory.checkpointHi>=524022);const history=historyPages(p.frames.filter(f=>f.phase==='history'),p.sourceHistory,p.h0,original,seed.addresses.source,browser);
  const intentFile=Object.keys(p.inputsSha256).find(f=>f.endsWith('/nonempty-kiosk-C43-20261007-01/intent.json'));assert(intentFile);const pins=read(intentFile).protectedOriginalsSha256;assert.equal(Object.keys(pins).length,1015);for(const [file,digest]of Object.entries(pins))assert.equal(sha(file),digest);
  assert.deepEqual(require('./build-reviewed-generation-production-extension.cjs').productSource(),p.productSource);
  result={passed:true,observedAt:new Date().toISOString(),h0:p.h0,targetCheckpoint:524022,actualNativeObjects:8,actualTransferredNFTs:6,
   actualGraphql:gql,actualSupportedHistory:history,indexedPostWriteAccepted:true,chromeAccepted:false,parentCompletion:false,
   additionalNetworkRequests:0,additionalSignatures:0,additionalExecutions:0,
   inputsSha256:Object.fromEntries([__filename,path.resolve(proofArg),originalFile,seedFile,browserFile,intentFile].map(f=>[f,sha(f)])),
   scope:'Independent actual native protobuf/BCS and type digests, same-S GraphQL content/owner bytes, complete supported history pagination with exact original six transaction/effect BCS, retained source caps/lock/exclusive listing and actual target discovery. No Chrome or whole-parent acceptance.'};
 }catch(e){result={passed:false,observedAt:new Date().toISOString(),errorType:e.name};process.exitCode=1;}
 fs.writeFileSync(outputArg,JSON.stringify(result,null,2)+'\n',{flag:'wx',mode:0o600});console.log(JSON.stringify({passed:result.passed,indexedPostWriteAccepted:result.indexedPostWriteAccepted,errorType:result.errorType}));
}
module.exports={base64,grpcBody,nativeObjects,snapshotObjects,historyPages,canonical,typed};
if(require.main===module)main();
