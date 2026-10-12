// Complete original internal entities and true private-entry counters; original cold correlation contract retained by inverse.
const fs = require('node:fs'), path = require('node:path'), crypto = require('node:crypto');
const assert = require('./C158-bounded-strict-assert.cjs');
const { parse } = require('graphql');
const { SourceMapConsumer } = require(path.resolve(__dirname, '../../../node_modules/.pnpm/source-map@0.6.1/node_modules/source-map'));
const read = file => JSON.parse(fs.readFileSync(file)), sha = file => crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
const modules = ['accounts/ImportedAccount', 'accounts/MnemonicAccount', 'accounts/zklogin/ZkLoginAccount'];
const queryNames = new Set(['WalletGenesisIdentity', 'WalletSchemaCapabilities', 'WalletSnapshotAdmission', 'WalletHistoryCoverage', 'WalletSnapshotPin', 'WalletSnapshotRevalidate', 'WalletSnapshotRead', 'WalletAccountHistory']);
const hash = value => crypto.createHash('sha256').update(value).digest('hex');
const bytes = value => { assert.equal(typeof value, 'string'); const b=Buffer.from(value,'base64'); assert.equal(b.toString('base64'),value); return b; };
const bag = rows => { const result={}; for(const row of rows){ const key=JSON.stringify([row.stage,row.url,row.method]); result[key]=(result[key]??0)+1; } return result; };
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
  for (const kind of ['coin', 'stake', 'withdraw']) assert(p.signerSnapshots.some(row => row.label === 'after ' + kind + ' complete internal final gas and new authorization'));
  assert.equal(p.signerSnapshots.at(-1).label, 'all internal actions and normal relock before observer removal');
  assert.equal(p.signerCleanup.ownBreakpointsRemoved, 3);
  assert.equal(p.signerCleanup.ownMemoryStateRemoved, true);
  assert.equal(p.signerCleanup.sourceEdited, false);
  assert.equal(p.signerCleanupError, undefined);
  assert(p.normalOwnBrowserAndDemoClosed && p.captureScopeIncludesTeardown);
}

function capture(p, events, network) {
  assert.equal(events.length, p.captureFileCount - 3);
  assert(p.fullInternalCaptureAccepted && p.allOriginalHttpBodiesCaptured);
  assert(p.captureScopeIncludesTeardown && p.normalOwnBrowserAndDemoClosed);
  assert.deepEqual(p.cleanupFailures, []);
  assert.deepEqual(p.captureErrors, []);
  assert.equal(p.unknownPositiveBodyGaps, 0);
  assert(p.completeCaptureRecords.length > 0);
  assert.deepEqual(bag(p.traffic), bag(p.completeCaptureRecords));
  assert.equal(p.frames.length, p.completeCaptureRecords.length);
  const grouped = new Map();
  for (const receipt of events) {
    assert.equal(receipt.event, receipt.row.events.at(-1).event);
    const rows = grouped.get(receipt.row.id) ?? [];
    rows.push(receipt);
    grouped.set(receipt.row.id, rows);
  }
  assert.equal(grouped.size, p.completeCaptureRecords.length);
  for (let i = 0; i < p.completeCaptureRecords.length; i++) {
    const row = p.completeCaptureRecords[i];
    const saved = grouped.get(row.id);
    assert(saved && saved.length === row.events.length);
    assert.deepEqual(saved.at(-1).row, row);
    assert(row.upstreamFetchAttempted && row.upstreamBodyComplete && row.responseDisposed);
    assert.equal(row.originalRequestOverrides, false);
    assert.equal(row.fetchOptions.maxRedirects, 0);
    assert.equal(row.fetchOptions.maxRetries, 0);
    assert(row.fetchOptions.timeout > 0 && row.fetchOptions.timeout <= 25000);
    assert.equal(row.bodyRepresentation, 'complete identity entity');
    assert.equal(row.encodedWireBytesCaptured, false);
    const body = bytes(row.responseBase64);
    assert.equal(body.length, row.responseBytes);
    assert.equal(hash(body), row.responseSha256);
    bytes(row.requestBase64);
    assert(['identity', ''].includes(String(row.headers['content-encoding'] ?? 'identity').toLowerCase()));
    if (row.headers['content-length'] !== undefined) assert.equal(body.length, Number(row.headers['content-length']));
    assert(Array.isArray(row.headersArray) && Array.isArray(row.requestHeadersArray));
    assert.equal(row.events.at(-1).event, 'capture settled');
    const retained = row.events.findIndex(value => value.event === 'complete upstream entity persisted');
    assert(retained >= 0);
    if (row.browserDeliveryAttempted) assert(row.events.findIndex(value => value.event === 'browser delivery attempted') > retained);
    assert(row.deliveryObservationRequired);
    assert.equal(row.browserDeliveryCompletionMeans, 'route.fulfill resolved and requestfinished observed; not application acceptance');
    if (row.browserDeliveryCompleted) {
      assert(row.passed && row.routeFulfillResolved && row.browserDeliveryAttempted);
      assert(row.browserRequestOutcome.observed && row.browserRequestOutcome.status === 'finished');
    } else {
      assert(!row.passed);
      assert(row.browserRequestOutcome?.observed && row.browserRequestOutcome.status === 'failed');
    }
    for (let j = 0; j < saved.length; j++) {
      const intermediate = saved[j].row;
      assert.deepEqual(intermediate.events, row.events.slice(0, j + 1));
      if (j) assert(row.events[j].monotonic >= row.events[j - 1].monotonic);
      for (const field of ['id', 'stage', 'url', 'method', 'requestBase64', 'requestHeadersArray', 'fetchOptions']) assert.deepEqual(intermediate[field], row[field]);
      if (intermediate.upstreamBodyComplete) for (const field of ['bodyRepresentation', 'responseBase64', 'responseSha256', 'responseBytes']) assert.equal(intermediate[field], row[field]);
    }
    const frame = p.frames[i];
    assert.equal(frame.captureId, row.id);
    for (const field of ['stage', 'url', 'status', 'headers', 'headersArray', 'requestHeadersArray', 'requestBase64', 'responseBase64', 'responseSha256', 'responseBytes', 'browserRequestOutcome', 'browserDeliveryCompleted']) assert.deepEqual(frame[field], row[field]);
    if (row.kind === 'graphql-readonly') {
      const request = JSON.parse(bytes(row.requestBase64));
      const definitions = parse(request.query).definitions;
      const operations = definitions.filter(value => value.kind === 'OperationDefinition');
      assert.equal(operations.length, 1);
      assert.equal(operations[0].operation, 'query');
      assert(queryNames.has(operations[0].name?.value));
    }
    assert(!new URL(row.url).pathname.endsWith('/GetTransaction'));
  }
  assert.deepEqual(network.requests, p.browserRequests);
  assert.deepEqual(network.responses, p.browserResponses);
  assert.deepEqual(network.routeBindings, p.routeBindings);
  assert(p.browserRequests.length > 0 && p.browserResponses.length > 0);
  assert.equal(new Set(p.browserRequests.map(row => row.id)).size, p.browserRequests.length);
  assert.equal(p.routeBindings.length, p.completeCaptureRecords.length);
  assert.equal(new Set(p.routeBindings.map(row => row.captureId)).size, p.completeCaptureRecords.length);
  for (const row of p.browserRequests) assert(['finished', 'failed'].includes(row.terminal));
  for (const binding of p.routeBindings) {
    const request = p.browserRequests.find(row => row.id === binding.requestId);
    const row = p.completeCaptureRecords.find(row => row.id === binding.captureId);
    assert(request && row);
    for (const field of ['url', 'method', 'requestBase64']) assert.equal(request[field], row[field]);
  }
  for (const response of p.browserResponses) {
    const request = p.browserRequests.find(row => row.id === response.requestId);
    assert(request);
    const binding = p.routeBindings.find(row => row.requestId === response.requestId);
    const candidates = p.completeCaptureRecords.filter(row => row.url === response.url && row.method === response.method && row.status === response.status && row.requestBase64 === request.requestBase64);
    assert(candidates.length > 0);
    if (binding) assert(candidates.some(row => row.id === binding.captureId));
    else assert(response.fromServiceWorker && response.bodyBase64 !== undefined);
    if (response.bodyBase64 !== undefined) {
      const body = bytes(response.bodyBase64);
      assert.equal(body.length, response.bodyBytes);
      assert.equal(hash(body), response.bodySha256);
      assert(candidates.some(row => row.responseBase64 === response.bodyBase64));
    } else assert(response.bodyReadError && binding && request.terminal === 'failed');
  }
}


function correlate(p,build,events,network){
  assert(p.passed && p.fullInternalCaptureAccepted); assert.equal(p.signatures,0); assert.equal(p.executeRequests,0);
  sourcesAndCounters(p,build); capture(p,events,network);
}
function validate(p,build){
  const dir=path.resolve(p.captureDirectory), names=fs.readdirSync(dir).sort();
  assert.equal(names.length,p.captureFileCount);
  assert.deepEqual(names.filter(n=>!/^\d{6}-[0-9a-f-]+\.json$/.test(n)),['all-original-capture-records.json','browser-network-observation.json','signer-observation.json']);
  for(const name of names) assert.equal(sha(path.join(dir,name)),p.inputsSha256[path.join(dir,name)]);
  const events=names.filter(n=>/^\d{6}-[0-9a-f-]+\.json$/.test(n)).map(n=>read(path.join(dir,n)));
  assert.deepEqual(p.completeCaptureRecords,read(path.join(dir,'all-original-capture-records.json')));
  assert.deepEqual(read(path.join(dir,'signer-observation.json')),{observation:p.signerObservation,snapshots:p.signerSnapshots,cleanup:p.signerCleanup});
  const network=read(path.join(dir,'browser-network-observation.json')); correlate(p,build,events,network);
  const mutations=[x=>x.fullInternalCaptureAccepted=false,x=>x.captureFileCount++,x=>x.signatures=1,x=>x.executeRequests=1,x=>x.captureScopeIncludesTeardown=false,
    x=>x.unknownPositiveBodyGaps=1,x=>x.cleanupFailures.push({stage:'failed teardown'}),x=>x.signerSnapshots[0].observed=false,
    x=>x.signerSnapshots.at(-1).counts[modules[0]]=1,x=>x.signerObservation.sourceEdited=true,x=>x.signerCleanup.ownMemoryStateRemoved=false,
    x=>x.completeCaptureRecords[0].upstreamBodyComplete=false,x=>x.completeCaptureRecords.find(r=>r.responseBytes>0).responseBase64='',
    x=>x.completeCaptureRecords[0].fetchOptions.maxRetries=1,x=>x.completeCaptureRecords[0].fetchOptions.maxRedirects=1,
    x=>x.browserRequests[0].terminal=null,x=>x.routeBindings.pop(),x=>x.browserResponses[0].status=999,x=>x.normalOwnBrowserAndDemoClosed=false];
  let refused=0;
  for(const mutate of mutations){const changed=structuredClone(p);mutate(changed);assert.notDeepEqual(changed,p);assert.throws(()=>correlate(changed,build,events,network));refused++;global.gc?.();}
  const changedEvents=structuredClone(events);changedEvents.find(r=>r.event==='complete upstream entity persisted'&&r.row.responseBytes>0).row.responseBase64='';
  assert.notDeepEqual(changedEvents,events);assert.throws(()=>correlate(p,build,changedEvents,network));refused++;global.gc?.();
  return {fullCurrentInternalCaptureAccepted:true,actualFullInitialUiAndWorkerBytesAccepted:true,allOriginalInternalHttpEntitiesAccepted:true,
    actualThreePrivateEntryCallsObserved:0,directPrivateSignDataObserved:true,allIntermediateEntitiesIndependentlyVerified:true,
    actualBrowserResponseCoverageCorrelated:true,captureScopeIncludesTeardown:true,allOwnBrowserNormallyClosed:true,
    capturedOriginalEntities:p.completeCaptureRecords.length,savedIntermediateEvents:events.length,unknownPositiveBodyGaps:0,artifactMutationRefusals:refused};
}
module.exports={validate,correlate};
