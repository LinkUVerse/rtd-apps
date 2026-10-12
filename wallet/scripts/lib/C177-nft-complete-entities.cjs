// Copyright (c) LinkU Labs, Inc.
// SPDX-License-Identifier: Apache-2.0
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),assert=require('./C158-bounded-strict-assert.cjs');
const {SourceMapConsumer}=require(path.resolve(__dirname,'../../../node_modules/.pnpm/source-map@0.6.1/node_modules/source-map'));
const hash=b=>crypto.createHash('sha256').update(b).digest('hex'),bytes=s=>Buffer.from(s,'base64'),read=f=>JSON.parse(fs.readFileSync(f));const modules=['accounts/ImportedAccount','accounts/MnemonicAccount','accounts/zklogin/ZkLoginAccount'];
function sourcesAndCounters(p, build) {
  const script = fs.readFileSync(path.join(build.output, 'background.js'));
  const worker = p.workerSource;
  assert(worker.matchesDisk);
  assert.deepEqual(bytes(worker.actualSourceBase64), script);
  assert.equal(worker.workerSha256, hash(script));
  assert.equal(worker.diskSha256, hash(script));
  for (const source of [p.uiSource]) {
    assert(source.matchesDisk && source.loadedBundles.length >= 2);
    assert(source.loadedBundles.some(row => row.file === 'ui.js'));
    assert(source.loadedBundles.some(row => row.file !== 'ui.js'));
    for (const row of source.loadedBundles) {
      assert.equal(row.file, path.basename(row.file));
      const disk = fs.readFileSync(path.join(build.output, row.file));
      assert(row.matchesDisk);
      assert.deepEqual(bytes(row.actualSourceBase64), disk);
      assert.equal(row.loadedSha256, hash(disk));
      assert.equal(row.diskSha256, hash(disk));
    }
  }
  const binding = p.signerObservation;
  assert(p.directPrivateSignDataObserved);
  assert.equal(p.signatures, 0);
  assert.equal(binding.workerSha256, hash(script));
  assert.equal(binding.sourceEdited, false);
  assert.equal(binding.accountFunctionsReplaced, false);
  assert.equal(binding.methodsInvokedByObserver, 0);
  assert.equal(binding.workerUrl, 'chrome-extension://allmppilngnjjikoeinlmjpfpdemkdal/background.js');
  assert.deepEqual(binding.locations.map(row => row.module), modules);
  const map = fs.readFileSync(path.join(build.output, 'background.js.map'));
  assert.equal(binding.mapSha256, hash(map));
  const consumer = new SourceMapConsumer(JSON.parse(map));
  for (const row of binding.locations) {
    const location = row.actualLocation;
    const original = consumer.originalPositionFor({ line: location.lineNumber + 1, column: location.columnNumber });
    assert.equal(original.source, row.source);
    assert.equal(original.line, row.originalLine);
    assert.equal(location.lineNumber, row.start.lineNumber);
    assert.equal(location.lineNumber, row.end.lineNumber);
    assert(row.start.columnNumber <= location.columnNumber && location.columnNumber < row.end.columnNumber);
    const producer = consumer.sourceContentFor(row.source);
    assert.equal(producer, fs.readFileSync(row.file, 'utf8'));
    assert.equal(hash(producer), row.producerSha256);
    assert(producer.split('\n')[row.originalLine - 1].trim().startsWith(row.module.includes('zklogin') ? 'throw new Error' : 'const keyPair = await'));
  }
  assert(p.signerSnapshots.length >= 5);
  assert.deepEqual(p.signerSnapshots[0], binding.initial);
  let previous = -Infinity;
  for (const row of p.signerSnapshots) {
    assert(row.observed);
    assert.equal(row.targetId, binding.targetId);
    assert.equal(row.sourceSha256, hash(script));
    assert.deepEqual(Object.keys(row.counts).sort(), [...modules].sort());
    assert(Object.values(row.counts).every(value => value === 0));
    const current = Date.parse(row.observedAt);
    assert(Number.isFinite(current) && current >= previous);
    previous = current;
  }
  for(const item of p.forms)assert(p.signerSnapshots.some(row=>row.label.startsWith(item.name+'/')));
  assert.equal(p.signerSnapshots.at(-1).label, 'all unsigned NFT cases and normal relock');
  assert.equal(p.signerCleanup.ownBreakpointsRemoved, 3);
  assert.equal(p.signerCleanup.ownMemoryStateRemoved, true);
  assert.equal(p.signerCleanup.sourceEdited, false);
  assert.equal(p.signerCleanupError, undefined);
  assert(p.normalOwnBrowserAndDemoClosed && p.captureScopeIncludesTeardown);
}

function correlate(p,build,events,network){sourcesAndCounters(p,build);const browser={...p,frames:p.frames.filter(f=>f.channel==='browser')};require('./C173-original-entity-and-browser-copy-correlation.cjs').capture(browser,events,network);assert.deepEqual(p.actualPrivateSignDataCalls,Object.fromEntries(modules.map(k=>[k,0])));}
function validate(p,build){const dir=path.resolve(p.captureDirectory),names=fs.readdirSync(dir);assert.equal(names.length,p.captureFileCount);const events=names.filter(n=>/^\d{6}-[0-9a-f-]+\.json$/.test(n)).sort().map(n=>read(path.join(dir,n))),network=read(path.join(dir,'browser-network-observation.json'));assert.deepEqual(p.completeCaptureRecords,read(path.join(dir,'all-original-capture-records.json')));correlate(p,build,events,network);let rejected=0;for(const mutate of [x=>x.allOriginalHttpResponseBodiesCaptured=false,x=>x.completeCaptureRecords[0].upstreamBodyComplete=false,x=>x.completeCaptureRecords[0].fetchOptions.maxRetries=1,x=>x.completeCaptureRecords.find(r=>r.responseBytes>0).responseBase64='',x=>x.routeBindings.pop(),x=>x.browserRequests[0].terminal=null,x=>x.signerSnapshots.at(-1).counts[modules[0]]=1,x=>x.signerSnapshots[0].counts[modules[1]]=1,x=>x.signerObservation.accountFunctionsReplaced=true,x=>x.signerCleanup.ownMemoryStateRemoved=false,x=>x.workerSource.actualSourceBase64='',x=>x.captureScopeIncludesTeardown=false]){const changed=structuredClone(p);mutate(changed);assert.throws(()=>correlate(changed,build,events,network));rejected++;if(global.gc)global.gc();}const gapIndex=p.browserResponses.findIndex(r=>r.bodyBase64===undefined&&p.browserRequests.find(q=>q.id===r.requestId)?.terminal==='finished');if(gapIndex>=0){for(const mutate of [r=>{r.headersArray.find(h=>h.name.toLowerCase()==='content-length').value='-1';},r=>{r.fromServiceWorker=true;},r=>{delete r.bodyReadError;},r=>{r.headersArray.find(h=>h.name.toLowerCase()==='content-type').value='application/incorrect';}]){const changed=structuredClone(p),net=structuredClone(network);mutate(changed.browserResponses[gapIndex]);net.responses=structuredClone(changed.browserResponses);assert.throws(()=>correlate(changed,build,events,net));rejected++;global.gc?.();}}const duplicateBrowserCopiesNotRead=p.browserResponses.filter(r=>r.bodyBase64===undefined&&p.browserRequests.find(q=>q.id===r.requestId)?.terminal==='finished').map(r=>({requestId:r.requestId,url:r.url,browserDuplicateBodyRead:false,originalIdentityEntityCapturedAndDeliveryFinished:true}));return{duplicateBrowserCopiesNotRead,allOriginalEntitiesAndTeardownAccepted:true,capturedOriginalEntities:p.completeCaptureRecords.length,intermediateEvents:events.length,allThreeActualPrivateMethodsZero:true,mutationsRejected:rejected};}
module.exports={validate,correlate,sourcesAndCounters};
