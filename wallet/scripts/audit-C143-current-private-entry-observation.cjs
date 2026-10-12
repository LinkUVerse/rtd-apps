// Independently review actual empty-production worker bindings and separate fixture counts.
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),assert=require('node:assert/strict'),cp=require('node:child_process');
const {SourceMapConsumer}=require(path.resolve(__dirname,'../../node_modules/.pnpm/source-map@0.6.1/node_modules/source-map'));
const logs=path.resolve(__dirname,'../migrationToGRpcOrGraphQLDoc/workLog');
const op=path.join(require('node:os').homedir(),'.local/state/rtd-wallet-migration/dev-20261006-03/current-C143-direct-counter-empty-20261009-01');
const read=file=>JSON.parse(fs.readFileSync(file)),sha=file=>crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
const modules=['accounts/ImportedAccount','accounts/MnemonicAccount','accounts/zklogin/ZkLoginAccount'];

function check(record,binding,snapshots,fixture,sourceSha){
 assert.equal(record.passed,true);for(const key of ['currentThreePrivateEntriesActuallyBound','actualCurrentSourceAndMapHeld','allOwnObserverStateNormallyRemoved'])assert.equal(record[key],true);
 for(const key of ['actualColdPendingAccepted','fullNonNftM5Accepted','parentCompletion'])assert.equal(record[key],false);
 for(const key of ['originalProfilesOpened','accountsImported','walletPrivateMethodsInvoked','signatures','executeRequests','nftBusinessRequests','actualFixturePausedEvents'])assert.equal(record[key],0);
 assert.deepEqual(record.actualSeparateNoCryptoFixtureCounts,[0,1,3]);
 assert.equal(binding.workerSha256,sourceSha);assert.equal(binding.sourceEdited,false);assert.equal(binding.accountFunctionsReplaced,false);assert.equal(binding.methodsInvokedByObserver,0);
 assert.deepEqual(binding.locations.map(value=>value.module),modules);assert.equal(binding.locations.length,3);
 assert(binding.locations.every(value=>value.actualLocation.scriptId===binding.locations[0].actualLocation.scriptId));
 for(const row of [binding.initial,...snapshots.snapshots]){
  assert.equal(row.observed,true);assert.equal(row.targetId,binding.targetId);assert.equal(row.sourceSha256,sourceSha);
  assert.deepEqual(Object.keys(row.counts).sort(),[...modules].sort());assert(Object.values(row.counts).every(value=>Number.isSafeInteger(value)&&value===0));
 }
 assert.deepEqual(record.emptyProductionObservedCounts,snapshots.snapshots);assert.equal(snapshots.snapshots.length,2);
 for(const row of [snapshots.cleanupBeforeReattach,snapshots.cleanup]){assert.equal(row.ownBreakpointsRemoved,3);assert.equal(row.ownMemoryStateRemoved,true);assert.equal(row.sourceEdited,false);}
 assert.equal(fixture.fixtureOnly,true);assert.equal(fixture.walletMethodsInvoked,0);assert.equal(fixture.pausedEvents,0);assert.deepEqual(fixture.fixtureSnapshots,[0,1,3]);
 assert(record.traffic.every(row=>row.blocked===true));
}

function main(output){
 assert.equal(output,path.join(logs,'20261009-C143-current-private-entry-observation-independent-01.json'));assert(!fs.existsSync(output));
 const proof=path.join(logs,'20261009-C143-current-private-entry-observation-01.json'),record=read(proof);
 assert.equal(sha(proof),sha(path.join(op,'evidence.json')));for(const [file,value]of Object.entries(record.inputsSha256))assert.equal(sha(file),value);
 const build=read(path.join(logs,'20261009-default-generation-positive-C136-build-01.json')),script=fs.readFileSync(path.join(build.output,'background.js'),'utf8'),map=fs.readFileSync(path.join(build.output,'background.js.map'));
 const consumer=new SourceMapConsumer(JSON.parse(map));
 const binding=read(path.join(op,'production-entry-binding.json')),snapshots=read(path.join(op,'production-entry-snapshots.json')),fixture=read(path.join(op,'actual-no-crypto-fixture.json'));
 const loaded=read(path.join(op,'actual-worker-source.json')),bytes=loaded.after??loaded.before;
 assert(bytes.matchesDisk);assert.equal(Buffer.from(bytes.actualSourceBase64,'base64').toString('utf8'),script);
 const sourceSha=crypto.createHash('sha256').update(script).digest('hex');assert.equal(bytes.workerSha256,sourceSha);assert.equal(bytes.diskSha256,sourceSha);
 assert.equal(binding.mapSha256,crypto.createHash('sha256').update(map).digest('hex'));
 for(const value of binding.locations){
  const location=value.actualLocation,original=consumer.originalPositionFor({line:location.lineNumber+1,column:location.columnNumber});
  assert.equal(original.source,value.source);assert.equal(original.line,value.originalLine);
  assert.equal(location.lineNumber,value.start.lineNumber);assert.equal(location.lineNumber,value.end.lineNumber);
  assert(value.start.columnNumber<=location.columnNumber&&location.columnNumber<value.end.columnNumber);
  const text=consumer.sourceContentFor(value.source);assert.equal(text,fs.readFileSync(value.file,'utf8'));
  assert.equal(crypto.createHash('sha256').update(text).digest('hex'),value.producerSha256);
  assert(text.split('\n')[value.originalLine-1].trim().startsWith(value.module.includes('zklogin')?'throw new Error':'const keyPair = await'));
 }
 check(record,binding,snapshots,fixture,sourceSha);let rejected=0;
 const reject=(r,b=binding,s=snapshots,f=fixture)=>{assert.throws(()=>check(r,b,s,f,sourceSha));rejected++;};
 for(const [key,value]of [['passed',false],['currentThreePrivateEntriesActuallyBound',false],['actualCurrentSourceAndMapHeld',false],['allOwnObserverStateNormallyRemoved',false],
  ['actualColdPendingAccepted',true],['fullNonNftM5Accepted',true],['parentCompletion',true],['originalProfilesOpened',1],['accountsImported',1],['walletPrivateMethodsInvoked',1],
  ['signatures',1],['executeRequests',1],['nftBusinessRequests',1],['actualFixturePausedEvents',1],['actualSeparateNoCryptoFixtureCounts',[0,0,0]]])reject({...record,[key]:value});
 for(const [key,value]of [['sourceEdited',true],['accountFunctionsReplaced',true],['methodsInvokedByObserver',1],['workerSha256','wrong']])reject(record,{...binding,[key]:value});
 let changed=structuredClone(binding);changed.locations.pop();reject(record,changed);
 changed=structuredClone(snapshots);changed.snapshots[0].observed=false;reject(record,binding,changed);
 changed=structuredClone(snapshots);changed.snapshots[0].counts[modules[0]]=1;reject(record,binding,changed);
 reject(record,binding,snapshots,{...fixture,fixtureSnapshots:[0,1,2]});reject(record,binding,snapshots,{...fixture,fixtureOnly:false});
 const matches=cp.spawnSync('pgrep',['-f',path.join(op,'profile')],{encoding:'utf8'}).stdout.trim().split('\n').filter(value=>/^\d+$/.test(value)&&Number(value)!==process.pid&&Number(value)!==process.ppid);
 for(const id of matches){const comm=cp.spawnSync('ps',['-p',id,'-o','comm='],{encoding:'utf8'}).stdout;assert(!/Google Chrome for Testing(?: Helper)?\s*$/.test(comm));}
 assert(!fs.existsSync(path.join(op,'profile','SingletonLock'))&&!fs.existsSync(path.join(op,'profile','SingletonSocket')));
 const files=[__filename,proof,path.join(op,'evidence.json'),path.join(op,'actual-worker-source.json'),path.join(op,'production-entry-binding.json'),path.join(op,'production-entry-snapshots.json'),path.join(op,'actual-no-crypto-fixture.json'),path.join(build.output,'background.js'),path.join(build.output,'background.js.map'),path.join(logs,'20261009-C143-non-nft-cold-observation-design.md')];
 const result={passed:true,observedAt:new Date().toISOString(),actualThreeCurrentPrivateEntryLocationsAndSourcesVerified:true,actualEmptyProductionCounterSnapshotsVerified:true,
  actualSeparateNoCryptoFixtureCountsVerified:true,actualFixtureCalls:3,actualFixturePausedEvents:0,scopeMutantsRejected:rejected,
  actualWorkerBytesEqualCurrentProduct:true,ownBrowserAbsentAndProfileNormallyClosed:true,originalProfilesOpened:0,accountsImported:0,walletPrivateMethodsInvoked:0,
  signatures:0,executeRequests:0,nftBusinessRequests:0,actualColdPendingAccepted:false,fullNonNftM5Accepted:false,parentCompletion:false,
  scope:'Empty current production worker registration/zero snapshots and separate no-crypto actual CDP counting only. No original pending/cold or wallet business acceptance.',
  inputsSha256:Object.fromEntries(files.map(file=>[file,sha(file)]))};
 fs.writeFileSync(output,JSON.stringify(result,null,2)+'\n',{flag:'wx',mode:0o600});console.log(JSON.stringify({passed:true,actualEntryLocations:3,scopeMutantsRejected:rejected,fullColdAccepted:false}));
}

if(require.main===module)main(path.resolve(process.argv[2]??''));
