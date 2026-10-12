// Read-only artifact correlation. No browser mutation, signature or network dispatch.
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {bcs}=require('rtd-typescript/bcs'),{Transaction}=require('rtd-typescript/transactions');
const {GrpcTypes}=require('rtd-typescript/grpc'),parser=require('./lib/C88-post-write-bytes.cjs');
const {sha,read,owner,sponsor,h0}=require('./test-C129-fresh-sponsored-withdraw-ui-v2.cjs');
const wallet=path.resolve(__dirname,'..'),root=path.resolve(wallet,'../..');
const op=path.join(process.env.HOME,'.local/state/rtd-wallet-migration/dev-20261006-03/publication-foundation/C132-orphan-cold-close-20261009-01');
const current=proof=>assert((proof.after??proof.before??proof).matchesDisk);
async function audit(p){
  assert(p.passed&&p.actualExtensionRestart&&p.sameProfileColdBrowser&&p.normalLockedClose&&p.metadataRemovedByProduct);
  assert(p.approvalDisabled&&p.approvedClicked===false&&p.storageWritesByTool===0);
  assert(p.cipherHeld&&p.durableJournalHeld&&p.normalUnlocksAfterCold===0);
  for(const k of ['simulations','nativeVerifications','signatures','executeRequests','nftBusinessRequests','originalProfilesOpened'])assert.equal(p[k],0);
  assert.equal(p.owner,owner);assert.equal(p.sponsor,sponsor);assert.equal(p.h0,h0);
  assert.deepEqual(p.forbidden,[]);assert(p.fullNonNftM5Accepted===false&&p.parentAcceptance===false);
  assert.deepEqual(p.finalJournal,p.initialJournal);assert.equal(Object.keys(p.initialJournal).length,3);
  assert(Object.values(p.initialJournal).every(v=>Array.isArray(v)&&v.length===0));
  assert.deepEqual(p.cipherAfter,p.cipherBefore);assert.equal(p.cipherBefore.owner,owner);assert(/^[0-9a-f]{64}$/.test(p.cipherBefore.sha256));
  assert.deepEqual(p.afterRequests,{});assert.equal(Object.keys(p.coldRequests).length,1);
  assert.deepEqual(p.coldRequests,{[p.actualRequest.id]:p.actualRequest});
  const r=p.actualRequest;assert.equal(r.approved,null);assert.equal(r.binding.mode,'execute');assert.equal(r.binding.account,owner);
  assert.equal(r.binding.chain,'rtd:localnet');assert.equal(r.tx.account,owner);assert.equal(r.tx.chain,'rtd:localnet');
  assert.equal(r.tx.type,'transaction');assert.equal(r.tx.justSign,undefined);assert.equal(r.tx.data,p.input.json);
  const endpoint=new URL(r.origin);assert.equal(endpoint.hostname,'127.0.0.1');assert.equal(endpoint.protocol,'http:');
  assert.equal(p.input.sender,owner);assert.equal(p.input.sponsor,sponsor);assert(p.input.onlyTwoReferencesChanged&&p.input.previousSignaturesUsed===false);
  const bytes=Buffer.from(p.input.bytesBase64,'base64');assert.equal(bytes.toString('base64'),p.input.bytesBase64);
  assert.equal(Buffer.from(await Transaction.from(p.input.json).build()).toString('base64'),p.input.bytesBase64);
  assert.equal(await Transaction.from(bytes).getDigest(),p.input.digest);
  const data=bcs.TransactionData.parse(bytes);assert.equal(data.V1.sender,owner);assert.equal(data.V1.gasData.owner,sponsor);
  assert.deepEqual(data.V1.kind.ProgrammableTransaction.commands.map(c=>c.$kind),['SplitCoins','TransferObjects']);
  assert.equal(data.V1.gasData.payment.length,1);
  const objectFrames=p.nativeFrames.filter(f=>f.url.endsWith('/GetObject')),infoFrames=p.nativeFrames.filter(f=>f.url.endsWith('/GetServiceInfo'));
  assert.equal(p.nativeFrames.length,3);assert.equal(infoFrames.length,1);assert.equal(objectFrames.length,2);
  const native=(f,req,res)=>{assert.equal(new URL(f.url).origin,'http://127.0.0.1:41750');assert.equal(f.status,200);assert.equal(f.headers['x-rtd-chain-id'],h0);
    return{request:req.fromBinary(parser.grpcBody(f.requestBase64,false)),response:res.fromBinary(parser.grpcBody(f.responseBase64,true))};};
  assert.equal(native(infoFrames[0],GrpcTypes.GetServiceInfoRequest,GrpcTypes.GetServiceInfoResponse).response.chainId,h0);
  const refs=[[data.V1.kind.ProgrammableTransaction.inputs[2].Object.ImmOrOwnedObject,owner],[data.V1.gasData.payment[0],sponsor]];
  for(const [ref,address]of refs){const decoded=objectFrames.map(f=>native(f,GrpcTypes.GetObjectRequest,GrpcTypes.GetObjectResponse));const selected=decoded.filter(x=>x.request.objectId===ref.objectId);assert.equal(selected.length,1);const o=selected[0].response.object;assert(o&&o.owner.kind===GrpcTypes.Owner_OwnerKind.ADDRESS);assert.equal(o.owner.address,address);assert.equal(String(o.version),ref.version);assert.equal(o.digest,ref.digest);}
  const originalFile=path.join(process.env.HOME,'.local/state/rtd-wallet-migration/dev-20261006-03/current-C129-single-sign-coin-20261009-03/negative-input.json');
  const original=bcs.TransactionData.parse(Buffer.from(read(originalFile).bytesBase64,'base64')),inverse=structuredClone(data);
  inverse.V1.kind.ProgrammableTransaction.inputs[2]=original.V1.kind.ProgrammableTransaction.inputs[2];inverse.V1.gasData.payment=original.V1.gasData.payment;assert.deepEqual(inverse,original);
  for(const p2 of [p.workerSource,p.uiSource,p.popupSource,p.restartedWorkerSource,p.coldWorkerSource,p.coldUiSource])current(p2);
  assert.equal(p.authority.origin,'chrome-extension://gfjgbndhkmndbgclghagipneaiajhnnm');
  assert(p.closedBody.includes('\u5173\u95ed\u8bf7\u6c42'));
  assert(p.traffic.some(f=>new URL(f.url).origin===r.origin));
  assert(p.traffic.every(f=>!['SimulateTransaction','VerifySignature','ExecuteTransaction'].includes(new URL(f.url).pathname.split('/').at(-1))));
  assert.equal(p.fullUiCapture,p.captureErrors.length===0);
  return true;
}
module.exports={audit};
if(require.main===module)(async()=>{
  const[file,out]=process.argv.slice(2);assert(file&&out&&!fs.existsSync(out));let result;
  try{
    const p=read(file);for(const[f,h]of Object.entries(p.inputsSha256))assert.equal(sha(path.isAbsolute(f)?f:path.join(root,f)),h);
    await audit(p);let mutations=0;
    for(const mutate of [p=>p.normalLockedClose=false,p=>p.metadataRemovedByProduct=false,p=>p.actualExtensionRestart=false,
      p=>p.sameProfileColdBrowser=false,p=>p.approvedClicked=true,p=>p.signatures=1,p=>p.executeRequests=1,
      p=>p.simulations=1,p=>p.cipherAfter.sha256='0'.repeat(64),p=>p.finalJournal['journal-v2']=[{pending:true}],
      p=>p.afterRequests[p.actualRequest.id]=p.actualRequest,p=>p.actualRequest.binding.account=sponsor,
      p=>p.input.previousSignaturesUsed=true,p=>p.input.digest+='bad',p=>p.nativeFrames.pop(),p=>p.coldUiSource.matchesDisk=false]){
      const bad=structuredClone(p);mutate(bad);await assert.rejects(()=>audit(bad));mutations++;
    }
    const lineage=require('./lib/C131-product-source-lineage.cjs'),q=read(lineage.qualificationFile);assert.deepEqual(lineage.validate(q.originalSource,q.buildFile),p.source);
    assert.deepEqual(require('./lib/C132-current-core-gateway-ownership-v3.cjs').capture(),p.authority);
    const unapprovedFile=path.join(op,'unapproved.json'),inputFile=path.join(op,'input.json');const u=read(unapprovedFile);
    assert.deepEqual(u.actualRequest,p.actualRequest);assert.deepEqual(u.initialJournal,p.initialJournal);assert.deepEqual(u.cipherBefore,p.cipherBefore);assert(u.approvedClicked===false&&u.approvalDisabled);assert.deepEqual(read(inputFile),p.input);
    result={passed:true,observedAt:new Date().toISOString(),source:p.source,h0,actualUnapprovedNormalCoinRequest:true,
      actualExtensionAndBrowserColdRestart:true,actualLockedUiMetadataCloseAccepted:true,actualCurrentUiAndWorkerAccepted:true,
      cipherAndThreeJournalStoresHeld:true,completeTwoReferenceOnlyInverseHeld:true,artifactMutationRefusals:mutations,
      captureErrors:p.captureErrors,fullUiCapture:p.fullUiCapture,scope:'Actual normal locked metadata close; no pending, full M5 or ordinary Chrome acceptance',
      signatures:0,simulations:0,executeRequests:0,nftBusinessRequests:0,fullNonNftM5Accepted:false,parentAcceptance:false,
      inputsSha256:{...p.inputsSha256,[path.resolve(file)]:sha(file),[__filename]:sha(__filename),[unapprovedFile]:sha(unapprovedFile),[inputFile]:sha(inputFile)}};
  }catch(e){result={passed:false,errorType:e.name,message:String(e.message).slice(0,1400),signatures:0,executeRequests:0,parentAcceptance:false};process.exitCode=1;}
  fs.writeFileSync(out,JSON.stringify(result,null,2)+'\n',{flag:'wx',mode:0o600});console.log(JSON.stringify({passed:result.passed,mutations:result.artifactMutationRefusals,message:result.message}));
})();
