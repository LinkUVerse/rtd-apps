// Independent complete cold frames/cipher/journal validation. No network mutation.
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),assert=require('node:assert/strict'),cp=require('node:child_process');
const {GrpcTypes}=require('rtd-typescript/grpc'),{bcs}=require('rtd-typescript/bcs');
const {Transaction}=require('rtd-typescript/transactions'),{verifyTransactionSignature}=require('rtd-typescript/verify');
const {toBase64}=require('rtd-typescript/utils');
const read=f=>JSON.parse(fs.readFileSync(f)),sha=f=>crypto.createHash('sha256').update(fs.readFileSync(f)).digest('hex');
function frame(encoded,T,response,allowMissing){
 const raw=Buffer.from(encoded,'base64');let offset=0,data=null,status=null;
 assert(raw.length>=5&&raw.length<=8*1024*1024);
 while(offset<raw.length){assert(offset+5<=raw.length);const flag=raw[offset],size=raw.readUInt32BE(offset+1),end=offset+5+size;assert(end<=raw.length);
  if(flag===0){assert(data===null&&status===null);data=T.fromBinary(raw.subarray(offset+5,end));}
  else{assert(response&&flag===128&&status===null&&end===raw.length);const tail=raw.subarray(offset+5,end).toString('ascii');const match=tail.match(/(?:^|\r\n)grpc-status:\s*(\d+)\r\n/);assert(match);status=Number(match[1]);}
  offset=end;
 }
 if(response){assert(status===0||(allowMissing&&status===5));assert((status===0&&data!==null)||(status===5&&data===null));}
 else assert(data!==null&&status===null);
 return {data,status};
}
(async()=>{
 const [proofFile,nativeFile,output]=process.argv.slice(2);assert(output&&!fs.existsSync(output));
 const p=read(proofFile),native=read(nativeFile);assert(p.passed&&native.passed&&p.digest===native.digest);
 assert(p.controlledNewFixtureColdStarts===2&&p.originalProtectedProfilesOpened===0&&!p.currentC42BrowserAccepted);
 assert(p.executeRequests===0&&p.simulations===0&&p.signatures===0);
 assert.deepEqual(p.blocked,[]);assert.deepEqual(p.errors,[]);assert.deepEqual(p.captureErrors,[]);
 for(const report of [p,native])for(const[f,h]of Object.entries(report.inputsSha256))assert.equal(sha(f),h);
 const buildFile=path.resolve('migrationToGRpcOrGraphQLDoc/workLog/20261007-default-generation-positive-C41-build-01.json'),build=read(buildFile);assert(build.passed);
 for(const[f,h]of Object.entries(build.artifacts))assert.equal(sha(path.join(build.output,f)),h);
 assert.equal(p.starts.length,2);
 for(const s of p.starts){assert.equal(s.workerSource.workerSha256,build.artifacts['background.js']);assert(s.uiSource.matchesDisk);for(const r of s.uiSource.loadedBundles)assert.equal(r.loadedSha256,build.artifacts[r.file]);}
 assert.equal(p.encryptedStates.length,4);for(const s of p.encryptedStates){assert.deepEqual(s,p.encryptedStates[0]);assert(s.count===1&&s.address===native.owner&&s.type==='imported');}
 const confirmedFile=path.join(p.fixture,'confirmed.json'),confirmed=read(confirmedFile);
 assert.equal(p.journals.length,4);for(const j of p.journals)assert.deepEqual(j,confirmed.terminal);
 const journal=confirmed.terminal['journal-v2'][0];assert(confirmed.passed&&journal.state==='confirmed-success'&&journal.digest===native.digest&&journal.receipt.effectsBase64===native.receipt.effectsBase64);
 assert(p.receiptRoute.includes(native.digest)&&p.receiptText.includes('交易成功')&&p.receiptText.includes('交易已确认，资产数据仍在同步。'));
 assert(/(?:^|\n)1\s+RTD(?:\n|$)/.test(p.receiptText));
 const methodCounts={},missing=[],transactions=[],genesis=[];
 for(const row of p.frames){
  const url=new URL(row.url);assert.equal(url.origin,'http://127.0.0.1:41750');const name=url.pathname.split('/').pop();
  assert(['GetServiceInfo','GetCheckpoint','GetObject','GetCoinInfo','GetDatatype','GetFunction','GetPackage','GetTransaction'].includes(name));
  assert.equal(row.status,200);const request=frame(row.requestBase64,GrpcTypes[name+'Request'],false,false).data;
  const response=frame(row.responseBase64,GrpcTypes[name+'Response'],true,name==='GetObject');methodCounts[name]=(methodCounts[name]??0)+1;
  if(response.status===5){missing.push({objectId:request.objectId,normalMissingObject:true});continue;}
  if(name==='GetServiceInfo')assert.equal(response.data.chainId,native.h0);
  if(name==='GetCheckpoint'&&response.data.checkpoint.sequenceNumber===0n){assert.equal(response.data.checkpoint.digest,native.h0);genesis.push(native.h0);}
  if(name==='GetTransaction'){
   assert.equal(request.digest,native.digest);const t=response.data.transaction;
   assert.equal(t.digest,native.digest);assert.equal(String(t.checkpoint),native.receipt.checkpoint);
   const attempt=read(path.join(p.fixture,'attempt.json'));assert.equal(toBase64(t.transaction.bcs.value),attempt.bytesBase64);
   const parsed=bcs.TransactionData.parse(t.transaction.bcs.value);assert.equal(toBase64(bcs.TransactionData.serialize(parsed).toBytes()),attempt.bytesBase64);
   assert.equal(await Transaction.from(t.transaction.bcs.value).getDigest(),native.digest);
   assert.equal(toBase64(t.effects.bcs.value),native.receipt.effectsBase64);
   const effects=bcs.TransactionEffects.parse(t.effects.bcs.value);assert.equal(toBase64(bcs.TransactionEffects.serialize(effects).toBytes()),native.receipt.effectsBase64);
   assert.equal(effects[effects.$kind].transactionDigest,native.digest);
   assert.equal(t.signatures.length,1);assert.equal((await verifyTransactionSignature(t.transaction.bcs.value,toBase64(t.signatures[0].bcs.value))).toRtdAddress(),native.owner);
   transactions.push({digest:t.digest,checkpoint:String(t.checkpoint),canonicalTransactionEffectsAndSignatureVerified:true});
  }
 }
 assert(p.frames.length>=40&&transactions.length===1&&genesis.length>=1);
 assert(!cp.execFileSync('ps',['-Ao','command='],{encoding:'utf8'}).split('\n').some(s=>s.includes('Google Chrome')&&s.includes('--user-data-dir='+path.join(p.fixture,'profile'))));
 const report={passed:true,observedAt:new Date().toISOString(),owner:native.owner,digest:native.digest,checkpoint:native.receipt.checkpoint,
  retainedSource:build.sourceAfter,currentProductSource:native.currentProductSource,binaryFramesVerified:p.frames.length,methodCounts,missingObjects:missing,originalTransactionFrames:transactions,
  coldStarts:2,cipherStates:4,wholeJournalStates:4,exactCipherAndWholeOriginalJournalPreserved:true,normalUnlockRelockVerified:true,ownedChromeAbsent:true,
  auditNetworkRequests:0,signatures:0,simulations:0,executeRequests:0,currentC42BrowserAccepted:false,indexedPositionAccepted:false,
  inputsSha256:Object.fromEntries([__filename,proofFile,nativeFile,buildFile,confirmedFile].map(f=>[path.resolve(f),sha(f)])),
  scope:'Independent complete cold native binary frames with strict data/trailer/status0 and explicit normal GetObject missing5, actual same-H0 service/genesis, original stake canonical bytes/effects/signature/checkpoint. Two loaded retained C41 cold UI/workers, four identical cipher projections and exact whole original three-store journal, real normal unlock/relock and current absence of owned Chrome. Public receipt retains native success/indexed-sync and exact1RTD across separate visual rows. No new network/signature/dispatch, C42 browser, pre-approval cipher, actual host reboot, indexed redeem or complete parent claim.'};
 fs.writeFileSync(output,JSON.stringify(report,null,2)+'\n',{flag:'wx',mode:0o600});console.log(JSON.stringify({passed:true,frames:p.frames.length,coldStarts:2,transactions:transactions.length,missingObjects:missing.length,executeRequests:0}));
})().catch(error=>{console.error(JSON.stringify({passed:false,errorType:error.name,message:String(error.message).slice(0,500)}));process.exitCode=1});
