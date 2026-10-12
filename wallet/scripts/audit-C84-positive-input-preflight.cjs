// Independent sealed-input audit; this accepts preparation only, never positive indexed results.
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),assert=require('node:assert/strict');
const [proofArg,outputArg]=process.argv.slice(2);assert(proofArg&&outputArg&&!fs.existsSync(outputArg));
const read=f=>JSON.parse(fs.readFileSync(f,'utf8')),sha=f=>crypto.createHash('sha256').update(fs.readFileSync(f)).digest('hex');
let result;
try{
 const p=read(proofArg);assert(p.passed&&p.preparedOnly&&!p.indexedPostWriteAccepted&&!p.chromeAccepted&&!p.parentCompletion);
 assert.equal(p.frames.length,0);assert.equal(p.profilesOpened+p.simulations+p.signatures+p.executeRequests,0);
 const files=Object.keys(p.inputsSha256);for(const [file,h]of Object.entries(p.inputsSha256))assert.equal(sha(file),h);
 const readyFile=files.find(f=>f.endsWith('/20261008-C83-nft-post-write-readiness-01.json'));
 const nativeFile=files.find(f=>f.endsWith('/20261007-C48-nft-execution-browser-independent-02.json'));
 const seedFile=files.find(f=>f.endsWith('/20261007-C43-nonempty-kiosk-native-independent-01.json'));
 assert(readyFile&&nativeFile&&seedFile);
 const ready=read(readyFile),native=read(nativeFile),seed=read(seedFile);
 assert(ready.passed&&native.passed&&seed.passed);assert.equal(ready.targetCheckpoint,524022);
 assert.equal(p.actualCoverageReady,Object.values(ready.coverageGates).every(x=>x===true));
 assert.equal(p.h0,ready.h0);assert.equal(p.h0,native.h0);assert.equal(p.h0,seed.h0);
 assert.equal(native.originalExecutions,6);assert(native.journalsRetained&&native.normalRelockChromeAbsent);
 assert.equal(native.auditExecutions+native.auditSignatures+native.auditSimulations,0);
 const receipts=new Map(native.nativeReceipts.map(r=>[r.digest,r]));assert.equal(receipts.size,6);
 assert.equal(Math.max(...native.nativeReceipts.map(r=>Number(r.checkpoint))),524022);
 const ids=[...seed.nfts,...seed.obNfts].map(n=>n.objectId);assert.equal(new Set(ids).size,8);
 const transfers=new Set();
 for(const n of native.currentTransferredNFTs){
  assert(ids.includes(n.objectId)&&!transfers.has(n.objectId));transfers.add(n.objectId);
  const tx=native.sixFirstDispatches.find(d=>d.objectId===n.objectId);assert(tx&&tx.digest===n.previousTransaction);
  assert(receipts.get(tx.digest).nativeSuccessVerified);
  if(n.targetKiosk)assert.equal(n.owner.$kind,'ObjectOwner');else{assert.equal(n.owner.$kind,'AddressOwner');assert.equal(n.owner.AddressOwner,tx.recipient);}
 }
 assert.equal(transfers.size,6);
 const intentFile=files.find(f=>f.endsWith('/nonempty-kiosk-C43-20261007-01/intent.json'));assert(intentFile);
 const pins=read(intentFile).protectedOriginalsSha256;assert.equal(Object.keys(pins).length,1015);
 for(const [file,h]of Object.entries(pins))assert.equal(sha(file),h);
 assert.deepEqual(require('./build-reviewed-generation-production-extension.cjs').productSource(),p.productSource);
 result={passed:true,observedAt:new Date().toISOString(),preparedOnly:true,indexedPostWriteAccepted:false,
  exactEightOriginalNFTs:8,exactSixOriginalNativeReceipts:6,actualSevenCoverageReady:p.actualCoverageReady,
  actualNetworkRequests:0,actualSignatures:0,actualExecutions:0,originalPrivateFilesHeld:1015,
  inputsSha256:Object.fromEntries([__filename,path.resolve(proofArg),readyFile,nativeFile,seedFile,intentFile].map(f=>[f,sha(f)])),
  scope:'Independent actual preparation proof, exact original identities and native terminals, no-positive-acceptance fields and zero frames. Full positive native/GraphQL/history raw-frame acceptance and Chrome remain unexecuted.'};
}catch(e){result={passed:false,observedAt:new Date().toISOString(),errorType:e.name};process.exitCode=1;}
fs.writeFileSync(outputArg,JSON.stringify(result,null,2)+'\n',{flag:'wx',mode:0o600});console.log(JSON.stringify({passed:result.passed,preparedOnly:result.preparedOnly,indexedPostWriteAccepted:false}));
