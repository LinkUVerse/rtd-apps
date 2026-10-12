// Read only: distinguish a generated/native-verified signature from dApp delivery.
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const audit=require('./lib/C118-non-nft-signing-audit.cjs'),base=require('./lib/C117-non-nft-validity-audit.cjs'),wire=require('./lib/C114-nft-wire-contract-v3.cjs');
const {GrpcTypes}=require('rtd-typescript/grpc'),{Transaction}=require('rtd-typescript/transactions'),{verifyTransactionSignature}=require('rtd-typescript/verify');
(async()=>{
 const[input,output]=process.argv.slice(2);assert(input&&output&&!fs.existsSync(output));const logs=path.resolve(__dirname,'../migrationToGRpcOrGraphQLDoc/workLog'),originalFile=path.join(logs,'20261007-C43-staking-forms-live-lock-chrome-01.json');
 const p=JSON.parse(fs.readFileSync(input)),original=JSON.parse(fs.readFileSync(originalFile)),owner=original.owner;
 assert.equal(p.passed,false);assert.equal(p.executeRequests,0);assert.equal(p.returnedSignatures,0);assert.equal(p.cipherBefore.owner,owner);
 assert.equal(p.cases.length,3);for(const row of p.cases)assert.equal(row.approval.prepared.sender,owner);
 const row=p.cases.find(r=>r.kind==='coin'),want=await base.expected(row.approval.prepared,'originalWindow');base.requireNonNft(row.approval.prepared,'coin',owner);
 assert.equal(Buffer.from(await Transaction.from(want.bytesBase64).build()).toString('base64'),want.bytesBase64);assert.equal(await Transaction.from(want.bytesBase64).getDigest(),want.digest);
 const native=p.frames.filter(f=>f.url==='http://127.0.0.1:41750/rtd.rpc.v2.SignatureVerificationService/VerifySignature');assert.equal(native.length,1);
 const request=audit.frame(native[0].requestBase64,GrpcTypes.VerifySignatureRequest,false),signature=Buffer.from(request.signature.bcs.value).toString('base64');
 audit.signatureFrame(native[0],want.bytesBase64,signature,owner);const key=await verifyTransactionSignature(Buffer.from(want.bytesBase64,'base64'),signature,{address:owner});assert.equal(key.toRtdAddress(),owner);
 const simulated=p.frames.filter(f=>{if(!f.url.endsWith('/SimulateTransaction')||!f.stage.startsWith('coin/originalWindow/'))return false;const value=audit.frame(f.requestBase64,GrpcTypes.SimulateTransactionRequest,false).transaction?.bcs?.value;return value&&Buffer.from(value).toString('base64')===want.bytesBase64});assert.equal(simulated.length,2);
 for(const f of simulated){const result=await wire.simulation(f,want,{});assert(result.success&&result.canonicalFinalBytesAndEffects)}
 const lineage=require('./lib/C109-product-source-lineage.cjs'),q=JSON.parse(fs.readFileSync(lineage.qualificationFile)),source=lineage.validate(q.originalSource,q.buildFile),build=JSON.parse(fs.readFileSync(q.buildFile));
 assert.equal(p.workerSource.workerSha256,build.artifacts['background.js']);assert.equal(p.workerSource.matchesDisk,true);assert.equal(p.uiSource.matchesDisk,true);assert(p.uiSource.loadedBundles.length>=3);for(const b of p.uiSource.loadedBundles){assert.equal(b.matchesDisk,true);assert.equal(b.loadedSha256,build.artifacts[b.file]);assert.equal(b.diskSha256,b.loadedSha256)}
 const files=[__filename,path.resolve(input),originalFile,lineage.qualificationFile,q.buildFile,path.resolve(__dirname,'lib/C118-non-nft-signing-audit.cjs'),path.resolve(__dirname,'lib/C117-non-nft-validity-audit.cjs'),path.resolve(__dirname,'lib/C114-nft-wire-contract-v3.cjs')];
 const result={passed:true,observedAt:new Date().toISOString(),readOnlyDiagnostic:true,actualWalletGeneratedNativeVerifiedSignatures:1,actualSameByteSimulations:2,locallyVerifiedSigner:owner,digest:want.digest,source,actualDappReturnedSignatures:0,dappDeliveryAccepted:false,actualCompleteSigningUiAccepted:false,parentCompletion:false,fullNonNftPhaseAccepted:false,nftBusinessRequests:0,auditNetworkRequests:0,auditSignatures:0,auditExecuteRequests:0,inputsSha256:Object.fromEntries(files.map(f=>[f,audit.sha(f)]))};
 fs.writeFileSync(output,JSON.stringify(result,null,2)+'\n',{flag:'wx',mode:0o600});console.log(JSON.stringify({passed:true,nativeVerified:1,dappReturned:0}));
})().catch(e=>{console.error(JSON.stringify({passed:false,errorType:e.name,message:String(e.message).slice(0,900)}));process.exitCode=1});
