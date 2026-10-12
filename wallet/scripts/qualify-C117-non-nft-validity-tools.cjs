// Offline qualification from actual archived non-NFT wires; never call fetch or open a profile.
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),crypto=require('node:crypto');
const {Transaction}=require('rtd-typescript/transactions'),{GrpcTypes}=require('rtd-typescript/grpc');
const audit=require('./lib/C117-non-nft-validity-audit.cjs'),variants=require('./lib/C114-nft-validity-variants-v2.cjs'),wire=require('./lib/C114-nft-wire-contract-v3.cjs');
const wallet=path.resolve(__dirname,'..'),logs=path.join(wallet,'migrationToGRpcOrGraphQLDoc/workLog');
const read=f=>JSON.parse(fs.readFileSync(f)),sha=f=>crypto.createHash('sha256').update(fs.readFileSync(f)).digest('hex');
const pins=q=>{for(const[f,h]of Object.entries(q.inputsSha256))assert.equal(sha(path.isAbsolute(f)?f:path.resolve(wallet,f)),h)};
function disabled(encoded){const b=Buffer.from(encoded,'base64');assert(b[0]===0&&b.readUInt32BE(1)+5===b.length);const r=GrpcTypes.SimulateTransactionRequest.fromBinary(b.subarray(5));r.checks=GrpcTypes.SimulateTransactionRequest_TransactionChecks.DISABLED;const body=Buffer.from(GrpcTypes.SimulateTransactionRequest.toBinary(r)),head=Buffer.alloc(5);head.writeUInt32BE(body.length,1);return Buffer.concat([head,body]).toString('base64')}
(async()=>{
 const output=process.argv[2];assert(output&&!fs.existsSync(output));assert.equal(path.resolve(output),path.join(logs,'20261008-C117-non-nft-tools-qualified-01.json'));
 const sourceFile=path.join(logs,'20261008-C117-non-nft-tools-source-prepared-01.json'),source=read(sourceFile);assert(source.passed&&source.preparedOnly);pins(source);
 assert.equal(source.completeSourceInverses.length,5);for(const x of source.completeSourceInverses){assert.equal(sha(x.old),x.originalSha256);assert.equal(sha(x.new),x.candidateSha256);let s=fs.readFileSync(x.new,'utf8');for(const d of [...x.deltas].reverse()){assert.equal(s.split(d.toText).length-1,d.count);s=s.split(d.toText).join(d.fromText)}assert.equal(s,fs.readFileSync(x.old,'utf8'))}
 const lineage=require('./lib/C109-product-source-lineage.cjs'),q=read(lineage.qualificationFile),current=lineage.validate(q.originalSource,q.buildFile);
 const baseFile=path.join(logs,'20261008-C110-current-internal-gas-chrome-01.json'),base=read(baseFile);assert(base.passed);pins(base);
 const nativeFile=path.join(logs,'20261008-C115-non-nft-native-validity-01-native-frames.json'),native=read(nativeFile);assert(native.passed);pins(native);
 assert.deepEqual(base.cases.map(r=>r.kind),['coin','stake','withdraw']);assert.equal(native.records.length,15);
 const demoFile=path.join(logs,'20261008-C114-validity-demo-build-02.json');require('./lib/C117-real-non-nft-validity-ui.cjs').validateDemo(demoFile);
 let canonicalVariants=0,positiveFrames=0,negativeFrames=0,mutants=0;const qualified=[];
 for(const c of base.cases){const prepared=c.approval.prepared;audit.requireNonNft(prepared,c.kind,base.owner);const generated=await variants.build(prepared);assert.deepEqual(generated.map(r=>r.name),audit.names);
  for(const got of generated){const want=await audit.expected(prepared,got.name);for(const k of Object.keys(want))assert.deepEqual(got[k],want[k]);assert.equal(Buffer.from(await Transaction.from(got.json).build()).toString('base64'),want.bytesBase64);canonicalVariants++;qualified.push({kind:c.kind,...want})}
  const f=c.originalSimulations.find(r=>r.bytesBase64===prepared.bytesBase64);assert(f);const normalized={...f,headers:f.responseHeaders};const r=await wire.simulation(normalized,prepared);assert(r.success&&r.canonicalFinalBytesAndEffects);positiveFrames++;
  for(const mutate of [x=>x.status=503,x=>x.requestBase64=disabled(x.requestBase64),x=>x.prepared.digest+='bad',x=>x.prepared.bytesBase64='invalid-bcs']){
   const changed={...structuredClone(normalized),prepared:structuredClone(prepared)};mutate(changed);await assert.rejects(()=>wire.simulation(changed,changed.prepared));mutants++;
  }
 }
 for(const c of native.records){const f=structuredClone(native.frames[c.actualWireIndex]);assert(f);const baseCase=base.cases.find(r=>r.kind===c.kind);const want=await audit.expected(baseCase.approval.prepared,c.variant.name);for(const k of Object.keys(want))assert.deepEqual(c.variant[k],want[k]);
  const r=await wire.simulation(f,want,{allowFailure:true});assert.equal(r.error.status,c.expectedError.status);assert.equal(r.error.message,c.expectedError.message);negativeFrames++;
  for(const mutate of [x=>x.status=503,x=>x.requestBase64=disabled(x.requestBase64),x=>x.prepared.digest+='bad',x=>x.prepared.bytesBase64='invalid-bcs']){
   const changed={...structuredClone(f),prepared:structuredClone(want)};mutate(changed);await assert.rejects(()=>wire.simulation(changed,changed.prepared,{allowFailure:true}));mutants++;
  }
 }
 assert.equal(canonicalVariants,27);assert.equal(positiveFrames,3);assert.equal(negativeFrames,15);assert.equal(mutants,72);
 const files=[__filename,sourceFile,baseFile,nativeFile,demoFile,lineage.qualificationFile,require.resolve('./lib/C117-non-nft-validity-audit.cjs'),require.resolve('./lib/C114-nft-validity-variants-v2.cjs'),require.resolve('./lib/C114-nft-wire-contract-v3.cjs'),require.resolve('./lib/C117-real-non-nft-validity-ui.cjs')];
 const p={passed:true,observedAt:new Date().toISOString(),preparedOnly:true,completeFiveSourceInversesHeld:true,currentProductSource:current,
  independentlyCanonicalNonNftValidityVariants:27,expectedActualUiPositiveCases:12,expectedActualUiTimestampErrors:12,expectedActualUiEpoch0Errors:3,
  actualHistoricalNonNftPositiveCanonicalFrames:3,actualHistoricalNonNftNegativeFrames:15,actualHistoricalWireMutationsRefused:72,
  originalC110FullGasAndLifecycleAndNativeAuditHeld:true,originalC116RuntimeAnd524022TargetAnd300SecondGateHeld:true,
  qualifiedVariants:qualified,networkRequests:0,profilesOpened:0,privateKeysRead:0,signatures:0,executeRequests:0,nftBusinessInputs:0,
  actualCurrentValidityUiAccepted:false,fullNonNftAuthorizationAccepted:false,parentCompletion:false,inputsSha256:Object.fromEntries(files.map(f=>[f,sha(f)]))};
 fs.writeFileSync(output,JSON.stringify(p,null,2)+'\n',{flag:'wx',mode:0o600});console.log(JSON.stringify({passed:true,preparedOnly:true,variants:27,historicalActualFrames:18,wireMutants:72,actualUiAccepted:false}));
})().catch(e=>{console.error(JSON.stringify({passed:false,errorType:e.name,message:String(e.message).slice(0,800)}));process.exitCode=1});
