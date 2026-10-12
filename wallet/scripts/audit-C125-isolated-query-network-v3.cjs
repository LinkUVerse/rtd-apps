// Decode captured identities and TLS results independently without making a query.
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),assert=require('node:assert/strict');
const {GrpcTypes}=require('rtd-typescript/grpc'),{toBase58}=require('rtd-typescript/utils');
const wallet=path.resolve(__dirname,'..'),logs=path.join(wallet,'migrationToGRpcOrGraphQLDoc/workLog');
const read=f=>JSON.parse(fs.readFileSync(f)),sha=f=>crypto.createHash('sha256').update(fs.readFileSync(f)).digest('hex');
const [input,output]=process.argv.slice(2);assert(output&&!fs.existsSync(output));
const proof=read(input);assert(proof.passed&&!proof.businessAccepted&&proof.originalTlsAndMethodsHeld&&proof.originalFullScopeHeld);
for(const[f,h]of Object.entries(proof.inputsSha256))assert.equal(sha(f),h);
const prefixFile=path.join(logs,'20261008-C119-exact-query-prefix-qualified-01.json'),prefix=read(prefixFile);
assert(prefix.passed&&prefix.completeOriginalAndCandidateVisibilityEqual&&!prefix.cachedPositiveFacts);
assert.equal(prefix.isolatedNegativeContracts.damagedAuthorityRefusals,21);assert.equal(prefix.liveOutOfRangeAndTypeRefusals,6);
for(const[f,h]of Object.entries(prefix.inputsSha256))assert.equal(sha(f),h);
const native=proof.frames.filter(f=>f.url.endsWith('/rtd.rpc.v2.LedgerService/GetServiceInfo'));assert.equal(native.length,2);
const decoded=[];
for(const f of native){assert.equal(f.status,200);const b=Buffer.from(f.responseBase64,'base64');assert.equal(b[0],0);const end=5+b.readUInt32BE(1);assert.equal(b[end],128);assert.equal(end+5+b.readUInt32BE(end+1),b.length);assert(/(?:^|\r\n)grpc-status:\s*0\r\n/.test(b.subarray(end+5).toString()));const info=GrpcTypes.GetServiceInfoResponse.fromBinary(b.subarray(5,end));const raw=Buffer.from(require('rtd-typescript/utils').fromBase58(info.chainId));assert.equal(raw.length,32);assert.equal(toBase58(raw),'BkuLHhdtnoK7yLxo2eQuvcjHtdyipE7MMyxgTJiyHGg4');decoded.push({url:f.url,chainId:info.chainId,checkpointHeight:String(info.checkpointHeight)})}
assert.equal(decoded.filter(f=>f.url.startsWith('http://127.0.0.1:42012/archive/')).length,1);
const graphql=proof.frames.filter(f=>f.url==='http://127.0.0.1:42011/graphql');assert.equal(graphql.length,1);
assert.equal(graphql[0].status,200);const gql=JSON.parse(Buffer.from(graphql[0].responseBase64,'base64'));assert(!gql.errors);assert.equal(gql.data.checkpoint.digest,decoded[0].chainId);
assert.equal(proof.negative.length,9);assert.deepEqual(proof.negative.map(r=>r.status),[403,403,403,403,404,404,404,403,403]);
assert.equal(proof.negative.filter(r=>r.path.endsWith('/ExecuteTransaction')&&r.status===404).length,1);
assert.equal(proof.tlsFrames.length,4);assert.equal(proof.tlsFrames[0].status,200);assert.equal(JSON.parse(Buffer.from(proof.tlsFrames[0].bodyBase64,'base64')).data.checkpoint.digest,decoded[0].chainId);assert.equal(proof.tlsFrames[1].status,400);assert.equal(proof.tlsFrames[2].errorCode,'ERR_TLS_CERT_ALTNAME_INVALID');assert(proof.tlsFrames[3].refused);
const matrixFile=path.join(logs,'20261009-C125-non-nft-signing-tools-source-prepared-03.json'),matrix=read(matrixFile);assert(matrix.passed&&matrix.preparedOnly);for(const[f,h]of Object.entries(matrix.inputsSha256))assert.equal(sha(f),h);
for(const row of [...matrix.completeSourceInverses,matrix.qualificationCompleteSourceInverse]){let text=fs.readFileSync(row.new,'utf8');for(const d of [...row.deltas].reverse()){assert.equal(text.split(d.toText).length-1,d.count);text=text.split(d.toText).join(d.fromText)}assert.equal(text,fs.readFileSync(row.old,'utf8'))}
assert.equal(matrix.normalPreviewAndSigningWaitMilliseconds,90000);assert.equal(matrix.resultLeaseMilliseconds,30000);assert.equal(matrix.normalSigningCases,12);assert.equal(matrix.normalSimulationFrames,39);assert.equal(matrix.normalNativeSignatureFrames,12);assert(!matrix.diagnosticPortWrappersUsed&&!matrix.diagnosticStageBreakpointsUsed);
const lineage=require('./lib/C124-product-source-lineage-v2.cjs'),q=read(lineage.qualificationFile),source=lineage.validate(q.originalSource,q.buildFile);
const files=[__filename,path.resolve(input),prefixFile,matrixFile,lineage.qualificationFile,q.buildFile];
fs.writeFileSync(output,JSON.stringify({passed:true,observedAt:new Date().toISOString(),currentProductSource:source,actualIdentityFramesDecoded:3,actualTlsContracts:4,actualNegativeOriginsAndMethods:9,blockedExecutePathProbes:1,forwardedNativeExecuteRequests:0,executeRequestsCountScope:'One ExecuteTransaction URL was rejected by the exact ingress 404 location; no native execution was forwarded',completeCurrentMatrixSourceInverses:5,normalSigningWaitMilliseconds:90000,resultLeaseMilliseconds:30000,diagnosticWrappersUsed:false,businessAccepted:false,actualCurrentSigningAccepted:false,fullNonNftPhaseAccepted:false,parentCompletion:false,auditNetworkRequests:0,auditSignatures:0,nftBusinessRequests:0,inputsSha256:Object.fromEntries(files.map(f=>[f,sha(f)]))},null,2)+'\n',{flag:'wx',mode:0o600});
console.log(JSON.stringify({passed:true,identityFrames:3,tls:4,negative:9,originalSigningWaitMs:90000,originalLeaseMs:30000}));
