// Actual immutable production map plus six historical complete approvals; CDP is mocked only.
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),vm=require('node:vm'),assert=require('node:assert/strict');
const wallet=path.resolve(__dirname,'..'),logs=path.join(wallet,'migrationToGRpcOrGraphQLDoc/workLog');
const read=f=>JSON.parse(fs.readFileSync(f,'utf8')),sha=f=>crypto.createHash('sha256').update(fs.readFileSync(f)).digest('hex');
const environment=require('./lib/C113-current-nft-environment.cjs');
const variants=require('./lib/C114-nft-parameter-variants.cjs');
const hookFile=require.resolve('./lib/C114-current-ui-nft-parameter-fault.cjs'),makeHook=require(hookFile);
const lineage=require('./lib/C109-product-source-lineage.cjs');
function record(file,value){const fd=fs.openSync(file,'wx',0o600);try{fs.writeFileSync(fd,JSON.stringify(value,null,2)+'\n');fs.fsyncSync(fd)}finally{fs.closeSync(fd)}}
function mockContext(build,expected,changedScript=false){
 const events=new Map(),calls=[],state={parameter:null,parameterContext:null,detached:false};
 const cdp={on:(n,cb)=>events.set(n,cb),detach:async()=>{state.detached=true},send:async(method,arg)=>{
  calls.push({method});
  if(method==='Debugger.enable'){for(const f of Object.keys(build.artifacts).filter(f=>f.endsWith('.js')))events.get('Debugger.scriptParsed')({url:environment.actualOrigin+'/'+f,scriptId:f});return {}}
  if(method==='Debugger.getScriptSource')return {scriptSource:fs.readFileSync(path.join(build.output,arg.scriptId),'utf8')+(changedScript?'\n// wrong source':'')};
  if(method==='Debugger.setBreakpoint')return {breakpointId:'qualified-mock-only',actualLocation:arg.location};
  if(method==='Debugger.evaluateOnCallFrame'){assert.equal(arg.callFrameId,'qualification-only-frame');assert(state.parameterContext);return {result:{value:JSON.parse(JSON.stringify(vm.runInNewContext(arg.expression,state.parameterContext)))}}}
  if(method==='Debugger.resume'){events.get('Debugger.resumed')?.();return {}}
  return {};
 }};
 return {context:{newCDPSession:async()=>cdp},page:{url:()=>environment.actualOrigin+'/ui.html'},state,calls};
}
(async()=>{
 const [output]=process.argv.slice(2);assert(output&&!fs.existsSync(output));
 const proofFile=path.join(logs,'20261008-C114-nft-parameter-tool-prepared-01.json'),proof=read(proofFile);
 const archiveFile=path.join(logs,'20261008-C114-before-implementation-archive-01.json'),archive=read(archiveFile);
 const oldFile=path.join(logs,'20261007-C48-nft-execution-browser-01.json'),oldAuditFile=path.join(logs,'20261007-C48-nft-execution-browser-independent-02.json');
 const old=read(oldFile),oldAudit=read(oldAuditFile),build=read(environment.buildFile),checks=[];
 let activeHook,phase='complete original inverse',report;
 try{
  assert(proof.passed&&proof.preparedOnly&&archive.passed&&archive.files.length===23&&old.passed&&oldAudit.passed);
  for(const q of [proof,archive,oldAudit])for(const[f,h]of Object.entries(q.inputsSha256))assert.equal(sha(f),h);
  let text=fs.readFileSync(hookFile,'utf8');assert.equal(sha(hookFile),proof.candidateSha256);
  for(const d of [...proof.deltas].reverse()){assert.equal(text.split(d.toText).length-1,d.count);text=text.split(d.toText).join(d.fromText)}
  assert.equal(text,fs.readFileSync(proof.old,'utf8'));checks.push({name:'whole original loaded-source breakpoint clone and cleanup inverse',passed:true});
  const source=lineage.validate(read(lineage.qualificationFile).originalSource,environment.buildFile);assert.deepEqual(source,build.sourceAfter);environment.validateOrigin();
  assert.deepEqual(old.previews.map(r=>r.label),['direct','framework-ordinary','framework-listed','personal','originbyte-existing-target','originbyte-new-target']);
  const oracle=read(path.join(logs,'20261008-C93-recovered-native-independent-01.json'));
  const options={otherSender:oracle.addresses.sponsor,sponsor:oracle.addresses.sponsor,
   sponsorCoin:{objectId:'0x'+'7'.repeat(64),version:'1',digest:old.previews[0].approval.prepared.simulation.Transaction.transaction.gasData?.payment?.[0]?.digest??old.previews[0].transaction.gasData.payment[0].digest}};
  const fixtureOnly=true;
  for(const row of old.previews){
   phase=row.label+' exact canonical variant and current source-map qualification';
   const prepared=row.approval.prepared,originalBytes=prepared.bytesBase64,originalJson=JSON.stringify(prepared);
   const changed=await variants.build(prepared,options);assert.equal(changed.length,8);
   for(const variant of changed){
    variants.assertOnlyDeclaredChange(prepared,variant,options);
    const bad={...variant,bytesBase64:changed.find(x=>x.name!==variant.name).bytesBase64};assert.throws(()=>variants.assertOnlyDeclaredChange(prepared,bad,options));
    const mock=mockContext(build,prepared);activeHook=await makeHook(mock.context,mock.page,build.output);
    const source=activeHook.evidence;mock.state.parameterContext={[source.generatedParameter]:prepared};
    const pause={hitBreakpoints:['qualified-mock-only'],callFrames:[{callFrameId:'qualification-only-frame',location:source.actualLocation}]};
    await assert.rejects(activeHook.inject({...pause,hitBreakpoints:['different']},prepared,variant.bytesBase64));
    const result=await activeHook.inject(pause,prepared,variant.bytesBase64);
    assert(result.injectedOnlyClonedParameterBytes);assert.equal(result.after.bytesBase64,variant.bytesBase64);assert.equal(result.after.digest,prepared.digest);
    assert.equal(prepared.bytesBase64,originalBytes);assert.equal(JSON.stringify(prepared),originalJson);
    assert.notEqual(mock.state.parameterContext[source.generatedParameter],prepared);
    await activeHook.close();activeHook=undefined;assert(mock.state.detached);
    checks.push({name:row.label+'/'+variant.name,passed:true,controlledCanonicalBytesOnly:fixtureOnly,mockedCdpOnly:true});
   }
  }
  const wrong=mockContext(build,old.previews[0].approval.prepared,true);
  await assert.rejects(makeHook(wrong.context,wrong.page,build.output));assert(wrong.state.detached);checks.push({name:'different loaded script rejected and CDP detached',passed:true,mockedCdpOnly:true});
  const files=[path.join(logs,'20261008-C114-nft-parameter-tool-qualified-01.json'),__filename,hookFile,require.resolve('./lib/C114-nft-parameter-variants.cjs'),proofFile,archiveFile,oldFile,oldAuditFile,
   environment.buildFile,lineage.qualificationFile,path.join(logs,'20261008-C93-recovered-native-independent-01.json'),
   path.join(logs,'20261008-C114-complete-internal-nft-authorization-design.md'),...environment.pins];
  report={passed:true,observedAt:new Date().toISOString(),preparedOnly:true,source,checks,checkCount:checks.length,
   completeOriginalSourceInverseHeld:true,actualCurrentImmutableNftMapHeld:true,
   historicalSixApprovalsCanonicalVariantsQualified:48,allFourRoutesBothFrameworkFormsBothOriginByteRecipientAbisHeld:true,
   cdpMockedOnly:true,sponsorCoinSyntheticQualificationOnly:true,actualLoadedBrowserBreakpointAccepted:false,
   actualCurrentInternalNftFormsAccepted:false,actualSponsoredExecutionAccepted:false,
   profilesOpened:0,networkRequests:0,signatures:0,executeRequests:0,newContainers:0,signals:0,parentCompletion:false,
   inputsSha256:Object.fromEntries(files.map(f=>[f,sha(f)]))};
 }catch(error){process.exitCode=1;report={passed:false,observedAt:new Date().toISOString(),preparedOnly:true,phase,errorType:error.name,message:String(error.message).slice(0,900),checks,profilesOpened:0,networkRequests:0,parentCompletion:false}}
 finally{if(activeHook)await activeHook.close();record(output,report);console.log(JSON.stringify({passed:report.passed,phase,checks:checks.length,profilesOpened:0,actualCurrentNftAccepted:false,message:report.message}))}
})();
