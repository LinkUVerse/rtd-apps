// Independently decode the actual production refusal frames without any network or writes.
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),assert=require('node:assert/strict');
const read=f=>JSON.parse(fs.readFileSync(f)),sha=f=>crypto.createHash('sha256').update(fs.readFileSync(f)).digest('hex');
const [proofFile,output]=process.argv.slice(2);assert(output&&!fs.existsSync(output));const p=read(proofFile);let result;
try{
 assert(p.passed&&p.targetCheckpoint===524022&&!p.postWriteIndexAccepted&&!p.trialReady);
 assert.deepEqual(p.denials,[{service:'assets',reason:'coverage'},{service:'account-history',reason:'coverage'}]);
 assert.equal(p.frames.length,2);assert.equal(p.signatures+p.simulations+p.executeRequests+p.profilesOpened,0);
 for(const [f,h]of Object.entries(p.inputsSha256))assert.equal(sha(f),h);
 const [assets,history]=p.frames.map(r=>{assert.equal(r.status,200);const req=JSON.parse(Buffer.from(r.requestBase64,'base64')),res=JSON.parse(Buffer.from(r.responseBase64,'base64'));assert(res.data&&!res.errors);return{wire:r,req,data:res.data};});
 assert.equal(assets.wire.url,'http://127.0.0.1:41954/graphql');assert.equal(assets.data.walletGenesis.digest,p.h0);
 assert.match(assets.req.query,/WalletSnapshotAdmission/);assert(assets.data.serviceConfig&&assets.data.walletDisplayService);
 const head=Number(assets.data.walletHead.sequenceNumber);assert(Number.isSafeInteger(head)&&head<p.targetCheckpoint);
 assert.equal(history.wire.url,'http://127.0.0.1:41956/account/graphql');assert.equal(history.req.variables.chain,p.h0);
 const coverage=history.data.accountHistoryCoverage;assert.equal(coverage.chainId,p.h0);assert(Number.isSafeInteger(coverage.checkpointHi)&&coverage.checkpointHi<p.targetCheckpoint);
 const nativeFile=Object.keys(p.inputsSha256).find(f=>f.endsWith('/20261007-C48-nft-execution-browser-independent-02.json'));assert(nativeFile);const native=read(nativeFile);
 assert(native.passed&&native.originalExecutions===6&&native.maximumExecutionCheckpoint===String(p.targetCheckpoint));
 assert.equal(native.auditExecutions+native.auditSignatures+native.auditSimulations,0);assert(native.normalRelockChromeAbsent&&native.journalsRetained);
 assert.deepEqual(require('./build-reviewed-generation-production-extension.cjs').productSource(),p.productSource);
 result={passed:true,observedAt:new Date().toISOString(),h0:p.h0,generation:p.generation,targetCheckpoint:p.targetCheckpoint,actualAssetHead:head,actualAccountUpper:coverage.checkpointHi,actualRawFrames:2,productionCoverageRefusalVerified:true,sixNativeTerminalSuccessesRemain:true,postWriteIndexAccepted:false,additionalNetworkRequests:0,additionalSignatures:0,additionalExecutions:0,inputsSha256:Object.fromEntries([__filename,path.resolve(proofFile),nativeFile].map(f=>[f,sha(f)])),scope:'Original two actual200 coverage frames have same H0 and both heads below524022; current production readers denied with coverage. Six separately audited native success/effects/journals retained. No empty-page substitution, gate reduction, replay, additional network or full indexed acceptance.'};
}catch(e){result={passed:false,observedAt:new Date().toISOString(),errorType:e.name,message:String(e.message).slice(0,1000)};process.exitCode=1;}
fs.writeFileSync(output,JSON.stringify(result,null,2)+'\n',{flag:'wx',mode:0o600});console.log(JSON.stringify({passed:result.passed,message:result.message,head:result.actualAssetHead,account:result.actualAccountUpper}));
