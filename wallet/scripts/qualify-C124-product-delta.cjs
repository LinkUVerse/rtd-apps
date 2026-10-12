// Full original-source inverse for one bounded readonly retry and appended SDK regression cases.
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),assert=require('node:assert/strict');
const wallet=path.resolve(__dirname,'..'),root=path.resolve(wallet,'../..'),logs=path.join(wallet,'migrationToGRpcOrGraphQLDoc/workLog');
const sha=f=>crypto.createHash('sha256').update(fs.readFileSync(f)).digest('hex'),read=f=>JSON.parse(fs.readFileSync(f));
const exactly=(s,a,b)=>{assert.equal(s.split(a).length,2);return s.replace(a,b)};
function auditDelta(){
 const file=path.join(logs,'20261009-C124-before-implementation-01.json'),baseline=read(file);assert(baseline.passed&&baseline.preparedOnly&&baseline.source.files===1122);
 for(const[f,h]of Object.entries(baseline.inputsSha256))assert.equal(sha(f),h);for(const row of baseline.rows)assert.equal(sha(row.snapshot),row.sha256);for(const row of baseline.officialSources)assert.equal(sha(row.snapshot),row.sha256);
 const manifest=read(baseline.productManifest),current=require('./qualify-C109-product-delta.cjs').currentManifest();
 const changed=Object.keys(manifest).filter(f=>current.rows[f]!==manifest[f]).sort(),added=Object.keys(current.rows).filter(f=>!(f in manifest)).sort(),deleted=Object.keys(manifest).filter(f=>!(f in current.rows)).sort();
 assert.deepEqual(changed,['rtd-apps/wallet/src/shared/rpc/transaction-move-admission.test.ts','rtd-apps/wallet/src/shared/rpc/transaction-move-admission.ts']);assert.deepEqual(added,[]);assert.deepEqual(deleted,[]);
 const original=baseline.rows.find(r=>r.original.endsWith('/transaction-move-admission.ts')),test=baseline.rows.find(r=>r.original.endsWith('/transaction-move-admission.test.ts'));let inverse=fs.readFileSync(original.original,'utf8');
 inverse=exactly(inverse,'import { WalletNativeReadWindowChangedError } from "./identity";\n','');
 const old=`    const report = await probeDeploymentCapabilities(session, {
      fetch,
      signal,
      timeoutMs,
      declaration: release.state === "reviewed" ? release.input : undefined,
    });`;
 const next=`    const completedFetch = fetch;
    const probe = () =>
      probeDeploymentCapabilities(session, {
        fetch,
        signal,
        timeoutMs,
        declaration: release.state === "reviewed" ? release.input : undefined,
      });
    const report = await probe().catch((error: unknown) => {
      if (!(error instanceof WalletNativeReadWindowChangedError)) throw error;
      // Discard the entire invalidated observation. Only fully ended read work
      // may restart once, under this same ticket and original total deadline.
      completedFetch.assertCompleted();
      fence();
      fetch = createCapabilityFetch(
        session,
        signal,
        options.fetch ?? globalThis.fetch,
        lifetime,
      );
      return probe();
    });`;
 inverse=exactly(inverse,next,old);assert.equal(inverse,fs.readFileSync(original.snapshot,'utf8'));
 const t=fs.readFileSync(test.original,'utf8'),marker='// C124: actual SDK frames change only service-window responses; no probe result mocks.';assert.equal(t.split(marker).length,2);assert.equal(t.split(marker)[0].trimEnd(),fs.readFileSync(test.snapshot,'utf8').trimEnd());
 const inputs=[__filename,file,baseline.productManifest,...baseline.rows.map(r=>r.snapshot),...baseline.officialSources.map(r=>r.snapshot),...changed.map(f=>path.join(root,f))];
 return {passed:true,preparedOnly:true,exactProductDeltaAccepted:true,originalSource:baseline.source,currentSource:current.source,changed,added,deleted,unchangedOriginalProductFiles:1120,completeOriginalProductionInverseAccepted:true,allOriginalTestCasesHeld:true,maximumReadonlyProbeAttempts:2,originalNativeWindowAssertionsHeld:true,originalTicketAndTotalDeadlineHeld:true,signOrExecuteRetries:0,inputsSha256:Object.fromEntries(inputs.map(f=>[f,sha(f)])),actualCompleteUiAccepted:false,parentCompletion:false};
}
module.exports={auditDelta,sha,read};
if(require.main===module){const [output]=process.argv.slice(2);assert(output&&!fs.existsSync(output));let result;try{result={...auditDelta(),observedAt:new Date().toISOString()}}catch(e){result={passed:false,errorType:e.name,message:String(e.message).slice(0,2000)};process.exitCode=1}fs.writeFileSync(output,JSON.stringify(result,null,2)+'\n',{flag:'wx',mode:0o600});console.log(JSON.stringify({passed:result.passed,source:result.currentSource,message:result.message}))}
