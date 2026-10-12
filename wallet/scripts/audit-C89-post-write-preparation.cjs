// Independent exact adapter deltas; retain all current full object/history/byte contracts.
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),assert=require('node:assert/strict');
const cp=require('node:child_process'),wallet=path.resolve(__dirname,'..'),root=path.resolve(wallet,'../..');
const logs=path.join(wallet,'migrationToGRpcOrGraphQLDoc/workLog'),ld=path.join(root,'link-u-smart-contract/all-in-one-deploy/localDeploy');
const [output]=process.argv.slice(2);assert(output&&!fs.existsSync(output));
const read=f=>JSON.parse(fs.readFileSync(f,'utf8')),sha=f=>crypto.createHash('sha256').update(fs.readFileSync(f)).digest('hex');
const files=[__filename],load=name=>{const f=path.join(logs,name);files.push(f);const p=read(f);assert(p.passed);for(const [f,h]of Object.entries(p.inputsSha256??{}))assert.equal(sha(f),h);return p;};
let result;
try{
 load('20261008-C89-completed-preparation-independent-01.json');
 const old=load('20261008-C85-full-post-write-preparation-independent-01.json');
 const full=load('20261008-C88-full-summary-preparation-independent-01.json');
 assert.equal(full.originalPostWriteContracts,51);assert.equal(full.qualificationChecks,29);
 const delta=(from,to,replacements)=>{files.push(from,to);let text=fs.readFileSync(to,'utf8');
  for(const [before,after]of replacements){assert.equal(text.split(before).length,2);text=text.replace(before,after);}assert.equal(text,fs.readFileSync(from,'utf8'));};
 const probe=path.join(__dirname,'probe-C89-post-write-indexed.cjs');
 delta(path.join(__dirname,'probe-C85-post-write-indexed.cjs'),probe,[['from wallet_C89_publisher_current_ownership import capture','from wallet_C83_publisher_current_ownership import capture']]);
 const readinessTool=path.join(ld,'inspect_wallet_C89_nft_post_write_readiness.py');
 delta(path.join(ld,'inspect_wallet_C83_nft_post_write_readiness.py'),readinessTool,[['from wallet_C89_publisher_fixture_ownership import capture, holder, require_original_fixture_authority','from wallet_C83_publisher_fixture_ownership import capture, holder, require_original_fixture_authority']]);
 const auditor=path.join(__dirname,'audit-C89-full-post-write-indexed.cjs');
 delta(path.join(__dirname,'audit-C88-full-post-write-indexed.cjs'),auditor,[
  ['20261008-C89-full-post-write-preparation-independent-01.json','20261008-C85-full-post-write-preparation-independent-01.json'],
  ['probe-C89-post-write-indexed.cjs','probe-C85-post-write-indexed.cjs'],
  ['from wallet_C89_publisher_current_ownership import capture','from wallet_C83_publisher_current_ownership import capture']]);
 const readiness=load('20261008-C89-nft-post-write-readiness-01.json');
 const preflight=load('20261008-C89-full-post-write-preflight-01.json');
 assert(!readiness.infrastructureReadyForProductionProbe);assert.equal(preflight.mode,'uncovered-preflight-denied');
 assert.equal(preflight.sessionsCreated,0);assert.equal(preflight.requests,0);assert.deepEqual(preflight.frames,[]);
 assert(!preflight.postWriteIndexAccepted&&!preflight.completeSupportedAccountWindowAccepted&&!preflight.parentCompletion);
 const oldParser=require('./lib/C85-post-write-bytes.cjs'),fullParser=require('./lib/C88-post-write-bytes.cjs');
 for(const key of Object.keys(oldParser))if(key!=='checkpoint')assert.equal(fullParser[key],oldParser[key]);
 const privateIntent=path.join(readiness.fixture,'intent.json');files.push(privateIntent);const pins=read(privateIntent).protectedOriginalsSha256;
 assert.equal(Object.keys(pins).length,1015);for(const [f,h]of Object.entries(pins))assert.equal(sha(f),h);
 const syntax=[probe,auditor,__filename];for(const f of syntax)cp.execFileSync(process.execPath,['--check',f],{encoding:'utf8',timeout:30000});
 result={passed:true,observedAt:new Date().toISOString(),preparedOnly:true,originalContractsHeld:51,fullSummaryQualificationHeld:29,
  productionProbeSingleOwnershipDelta:true,readinessSingleFixtureOwnershipDelta:true,fullAuditorThreeSourceAndOwnershipDeltas:true,
  originalThirteenObjectsFiveCapsThreeCompleteSupportedHistoriesAndSixDetailsHeld:true,
  originalOtherParsersHeld:true,currentUncoveredPreflightDeniedBeforeAnyIo:true,productReaderSourcesHeld:true,protectedFilesHeld:1015,
  installed:false,postWriteIndexAccepted:false,completeSupportedAccountWindowAccepted:false,chromeAccepted:false,parentCompletion:false,
  networkRequests:0,signatures:0,executeRequests:0,signals:0,newContainers:0,
  inputsSha256:Object.fromEntries([...new Set(files)].map(f=>[f,sha(f)])),
  scope:'Independent exact source inverse for C89 ownership-only readiness and full production probe plus qualified C88 full auditor source/evidence selector delta. Reuses held original51 contracts and29 full-summary qualification with source pins verified unchanged,not rerun or new business acceptance. Actual current new readiness still uncovered and new probe denies before any session/IO; all full13/5/3/6 contracts and other parser functions unchanged.'};
}catch(error){result={passed:false,observedAt:new Date().toISOString(),errorType:error.name,message:String(error.message).slice(0,700)};process.exitCode=1;}
fs.writeFileSync(output,JSON.stringify(result,null,2)+'\n',{flag:'wx',mode:0o600});
console.log(JSON.stringify({passed:result.passed,originalContractsHeld:result.originalContractsHeld,fullSummaryQualificationHeld:result.fullSummaryQualificationHeld,errorType:result.errorType,message:result.message}));
