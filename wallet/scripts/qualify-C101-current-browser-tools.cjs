// Actual accepted API prerequisite and isolated admission counterexamples; no browser or network.
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),assert=require('node:assert/strict'),cp=require('node:child_process');
const logs=path.resolve(__dirname,'../migrationToGRpcOrGraphQLDoc/workLog'),sha=f=>crypto.createHash('sha256').update(fs.readFileSync(f)).digest('hex'),read=f=>JSON.parse(fs.readFileSync(f));
const [output]=process.argv.slice(2);assert(output&&!fs.existsSync(output));
const apiFile=path.join(logs,'20261008-C100-full-post-write-positive-01.json'),independentFile=path.join(logs,'20261008-C100-full-post-write-independent-01.json');
const files=[__filename,apiFile,independentFile,path.join(__dirname,'lib/C101-current-browser-prerequisites.cjs')];let result;
try{
 const api=read(apiFile),independent=read(independentFile),{validate}=require('./lib/C101-current-browser-prerequisites.cjs');
 assert(validate(api,independent,apiFile));let checks=1;const clone=v=>JSON.parse(JSON.stringify(v));
 const mutations=[
  p=>p.passed=false,p=>p.mode='uncovered-preflight-denied',p=>p.targetCheckpoint=424677,
  p=>p.caps.pop(),p=>p.freshNativeAndArchivedObjects.pop(),p=>p.originalDigestDetails.pop(),
  p=>p.completeSupportedAccountWindowAccepted=false,p=>p.completeAccountHistoryAccepted=true,
  p=>p.chromeAccepted=true,p=>p.parentCompletion=true,
  p=>p.histories.source.transactions.pop(),p=>p.histories.source.coverage.allAccountActivityCertified=true,
  p=>p.histories.existingTarget.coverage.registrationComplete=true,p=>p.histories.newTarget.checkpointHi=524021,
 ];
 for(const change of mutations){const p=clone(api);change(p);assert.throws(()=>validate(p,independent,apiFile));checks++;}
 const corrupt=clone(independent);corrupt.inputsSha256[apiFile]='0'.repeat(64);assert.throws(()=>validate(api,corrupt,apiFile));checks++;
 const syntax=['test-C101-current-three-owner-browser.cjs','audit-C101-current-three-owner-browser.cjs','lib/C101-current-browser-prerequisites.cjs','qualify-C101-current-browser-tools.cjs'];
 for(const name of syntax){const f=path.join(__dirname,name);files.push(f);cp.execFileSync(process.execPath,['--check',f],{timeout:30000});}
 const source=fs.readFileSync(path.join(__dirname,syntax[0]),'utf8');
 assert(source.indexOf('validate(api,independent')<source.indexOf('fs.mkdirSync(owned'));
 for(const text of ['await native(\'fresh native before\')','await native(\'fresh native after\')',"for(role of ['source','existingTarget','newTarget'])","assert.equal(Object.keys(intent.protectedOriginalsSha256).length,1015)","resultOwner.finalJournal,resultOwner.initialJournal","resultOwner.encryptedAfter,resultOwner.encryptedBefore","lock-account-button","context.close()","ExecuteTransaction|SimulateTransaction|VerifySignature","historicalVerifiedText"])
  assert(source.includes(text),text);
 assert(!source.includes('.signTransaction(')&&!source.includes('.signData(')&&!source.includes('ignoreHTTPSErrors'));
 result={passed:true,observedAt:new Date().toISOString(),preparedOnly:true,admissionChecks:checks,syntaxFiles:syntax.length,
  currentCompleteApiBaselineHeld:true,thirteenNativeObjectsBeforeAndAfterRequired:true,allThreeProfilesFiveKiosksEightNftSixReceiptsRequired:true,
  currentProductionWorkerAndUiSourceRequired:true,actualArchiveButtonReadsRequired:true,executeSimulateAndVerifyInterceptRequired:true,
  actualCurrentBrowserExecuted:false,profilesOpened:0,networkRequests:0,signatures:0,executeRequests:0,parentCompletion:false,
  inputsSha256:Object.fromEntries([...new Set(files)].map(f=>[f,sha(f)]))};
}catch(error){result={passed:false,observedAt:new Date().toISOString(),errorType:error.name,message:String(error.message).slice(0,700)};process.exitCode=1;}
fs.writeFileSync(output,JSON.stringify(result,null,2)+'\n',{flag:'wx',mode:0o600});console.log(JSON.stringify({passed:result.passed,checks:result.admissionChecks,errorType:result.errorType,message:result.message}));
