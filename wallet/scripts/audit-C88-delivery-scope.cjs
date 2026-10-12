// Changed-tool/document scope and fresh retained publication evidence; no product mutation.
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const assert=require('node:assert/strict'),cp=require('node:child_process');
const wallet=path.resolve(__dirname,'..'),root=path.resolve(wallet,'../..');
const docs=path.join(wallet,'migrationToGRpcOrGraphQLDoc'),logs=path.join(docs,'workLog');
const [output]=process.argv.slice(2);assert(output&&!fs.existsSync(output));
const read=f=>JSON.parse(fs.readFileSync(f,'utf8'));
const sha=f=>crypto.createHash('sha256').update(fs.readFileSync(f)).digest('hex');
const files=[__filename],load=name=>{const f=path.join(logs,name);files.push(f);const p=read(f);assert(p.passed);for(const [f,h]of Object.entries(p.inputsSha256??{}))assert.equal(sha(f),h);return p;};
let result;
try{
 const prepared=load('20261008-C88-full-summary-preparation-independent-01.json');
 assert.equal(prepared.qualificationChecks,29);assert.equal(prepared.originalPostWriteContracts,51);
 const readiness=load('20261008-C83-nft-post-write-readiness-05.json');
 const observation=load('20261008-C87-current-publication-observation-05.json'),ledger=observation.ledger;
 const delta=(Date.parse(observation.observedAt)-Date.parse(readiness.observedAt))/1000;
 assert(delta>=0&&delta<300);
 assert.equal(readiness.publishedHi,ledger.publishedHi);assert.equal(readiness.pendingHi,ledger.pendingHi);
 assert.equal(ledger.preparedHigh-ledger.preparedLow+1,ledger.preparedRows);
 assert.equal(ledger.preparedLow,ledger.publishedHi+1);assert(ledger.preparedHigh<ledger.pendingHi);
 assert(ledger.readOnly);assert.equal(ledger.publicationLockCount,1);
 const heights=[...Object.values(readiness.durable.hbase),...Object.values(readiness.durable.sql),...Object.values(readiness.durable.rocks)];
 assert.equal(heights.length,41);assert(heights.every(h=>h===ledger.publishedHi));
 assert.equal(readiness.durable.display.checkpointHi,ledger.publishedHi);
 assert.equal(readiness.effectiveAssetWindow.commonHi,ledger.publishedHi);
 assert.equal(readiness.accountCoverage.checkpointHi,ledger.publishedHi);
 assert(Object.values(readiness.coverageGates).every(v=>v===false));assert(!readiness.infrastructureReadyForProductionProbe);
 assert.equal(readiness.currentWalletContainers,29);assert.equal(readiness.healthyChecks,14);
 assert.equal(observation.signals,0);assert.equal(observation.databaseWrites,0);assert(observation.obsoleteObserverAbsent);
 const archived=[...read(path.join(logs,'20261008-C88-doc-archive-01.json')).files,
   ...read(path.join(logs,'20261008-C88-aligned-plan-archive-01.json')).files];
 const old=read(path.join(logs,'20261008-C87-delivery-scope-checks-01.json'));
 for(const row of archived){assert.equal(sha(row.snapshot),row.sha256);assert.equal(old.inputsSha256[row.original],row.sha256);files.push(row.snapshot);}
 const taskFile=path.join(docs,'Task.md'),task=fs.readFileSync(taskFile,'utf8');
 const parents=[...task.matchAll(/^- \[([ x])\] `([^`]+)`/gm)];
 assert.equal(parents.length,98);assert.equal(parents.filter(m=>m[1]==='x').length,84);
 const pending=parents.filter(m=>m[1]===' ').map(m=>m[2]);assert.equal(pending.length,14);
 for(const n of [1,2,3,4])assert(task.includes('- [x] S88-'+n+'：'));
 assert(task.includes('- [ ] S88-5：'));
 const refresh=load('20261008-current-parent-descriptions-refresh-01.json');
 assert.deepEqual([...refresh.updatedParents].sort(),[...pending].sort());
 assert.equal(sha(refresh.oldTaskSnapshot),refresh.oldTaskSha256);files.push(refresh.oldTaskSnapshot);
 const documents=[taskFile,path.join(docs,'totalProgress.md'),path.join(logs,'current-state.md'),
   path.join(logs,'20261008-C88-full-summary-design.md'),path.join(logs,'20261008-remaining-parent-acceptance-order.md'),
   path.join(docs,'07-落地批次与验收清单.md'),path.join(root,'rtd-archive-service/docs/wallet/06-落地批次与验收清单.md')];
 let localLinks=0;
 for(const f of documents){files.push(f);for(const match of fs.readFileSync(f,'utf8').matchAll(/\]\(([^)]+)\)/g)){
   const target=match[1].split('#')[0];if(!target||/^(http|codex:|mailto:)/.test(target))continue;
   assert(fs.existsSync(path.resolve(path.dirname(f),target)),f+': '+target);localLinks++;
 }}
 assert.equal(fs.readFileSync(documents[5],'utf8').split('\n').slice(5).join('\n'),fs.readFileSync(documents[6],'utf8').split('\n').slice(5).join('\n'));
 const product=require('./build-reviewed-generation-production-extension.cjs').productSource();
 assert.equal(product.files,1120);assert.equal(product.sha256,'a03cb96c62e2ae6d7908a8506fc1411a0e92aa1a0cb27b69f49783659ab12521');
 const intent=path.join(readiness.fixture,'intent.json'),pins=read(intent).protectedOriginalsSha256;files.push(intent);
 assert.equal(Object.keys(pins).length,1015);for(const [f,h]of Object.entries(pins))assert.equal(sha(f),h);
 const startedFile=path.join(logs,'20261007-C51-ordinary-chrome-started-01.json'),started=read(startedFile);files.push(startedFile);
 assert.equal(cp.execFileSync('ps',['-p',String(started.browserPid),'-o','lstart='],{encoding:'utf8'}).trim(),started.browserBirth);
 assert.equal(crypto.createHash('sha256').update(cp.execFileSync('ps',['-ww','-p',String(started.browserPid),'-o','command='],{encoding:'utf8'}).trim()).digest('hex'),started.commandSha256);
 const syntax=['lib/C88-full-summary.cjs','lib/C88-post-write-bytes.cjs','qualify-C88-full-summary.cjs',
   'audit-C88-full-post-write-indexed.cjs','audit-C88-full-summary-preparation.cjs','audit-C88-delivery-scope.cjs'];
 for(const name of syntax){const f=path.join(__dirname,name);files.push(f);cp.execFileSync(process.execPath,['--check',f],{encoding:'utf8',timeout:30000});}
 for(const repo of ['rtd-apps','rtd-archive-service','link-u-smart-contract'])cp.execFileSync('git',['diff','--check'],{cwd:path.join(root,repo),encoding:'utf8',timeout:30000});
 result={passed:true,observedAt:new Date().toISOString(),parentTasks:98,completedParents:84,remainingParents:14,
   completedC88Subtasks:4,qualificationChecks:29,originalContracts:51,syntaxFiles:syntax.length,localLinksChecked:localLinks,
   pairedBodiesAligned:true,oldPinnedFiveDocumentsHeld:true,currentParentDescriptions:14,productSource:product,
   protectedFilesHeld:1015,originalRuntimeAtObserved29And14:true,ordinaryChromeExactProcessHeld:true,
   sourceAndEightDebugAtReadinessHeld:readiness.sourceAndEightDebugAuthorityHeld,
   currentObservedPublished:ledger.publishedHi,currentObservedPending:ledger.pendingHi,
   observedPreparedRows:ledger.preparedRows,observedPreparedHigh:ledger.preparedHigh,
   all41AtObservedFormalLimit:true,additionalWalletNetworkRequests:0,browserUiReads:0,browserInputs:0,
   signatures:0,executeRequests:0,signals:0,newContainers:0,parentAcceptance:false,
   inputsSha256:Object.fromEntries([...new Set(files)].map(f=>[f,sha(f)])),
   scope:'Changed C88 tools and aligned technical documents only:6 syntax checks,3 repository whitespace checks,all local links,98 unchanged parents,four C88 subcontracts,14 refreshed current parent descriptions,prior five pinned document snapshots,actual1120 product and1015 protected files. Retained readiness05/observation05 within5min reconstruct41 formal-limit and complete prepared tail; original ordinary Chrome process identity held without reading password/terms/account page. Prepared counts and tool qualifications are not formal current positive/index/window/Chrome/parent acceptance.'};
}catch(error){result={passed:false,observedAt:new Date().toISOString(),errorType:error.name,message:String(error.message).slice(0,700)};process.exitCode=1;}
fs.writeFileSync(output,JSON.stringify(result,null,2)+'\n',{flag:'wx',mode:0o600});
console.log(JSON.stringify({passed:result.passed,completedParents:result.completedParents,remainingParents:result.remainingParents,localLinksChecked:result.localLinksChecked,syntaxFiles:result.syntaxFiles,errorType:result.errorType,message:result.message}));
