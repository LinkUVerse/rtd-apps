// Independently bind actual original entities, browser events, production bytes and private entry calls.
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),assert=require('node:assert/strict');
const {parse}=require('graphql'),{GrpcTypes}=require('rtd-typescript/grpc');
const {SourceMapConsumer}=require(path.resolve(__dirname,'../../../node_modules/.pnpm/source-map@0.6.1/node_modules/source-map'));
const hash=bytes=>crypto.createHash('sha256').update(bytes).digest('hex');
const read=file=>JSON.parse(fs.readFileSync(file));
const bytes=value=>{assert.equal(typeof value,'string');const data=Buffer.from(value,'base64');assert.equal(data.toString('base64'),value);return data;};
const bag=rows=>{const out={};for(const row of rows){const key=JSON.stringify([row.stage,row.url,row.method]);out[key]=(out[key]??0)+1;}return out;};
const queryNames=new Set(['WalletGenesisIdentity','WalletSchemaCapabilities','WalletSnapshotAdmission','WalletHistoryCoverage','WalletSnapshotPin','WalletSnapshotRevalidate','WalletSnapshotRead']);
// BEGIN inherited complete entity correlation
function capture(p, events, network) {
  assert(p.passed && p.allOriginalHttpResponseBodiesCaptured);
  assert(p.captureScopeIncludesTeardown && p.normalOwnBrowserAndDemoClosed);
  assert.deepEqual(p.cleanupFailures, []);
  assert.deepEqual(p.captureErrors, []);
  assert.equal(p.unknownPositiveBodyGaps, 0);
  assert(p.completeCaptureRecords.length > 0);
  assert.deepEqual(bag(p.traffic), bag(p.completeCaptureRecords));
  assert.equal(p.frames.length, p.completeCaptureRecords.filter(row=>row.kind!=='static-readonly').length);
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
    const frame=p.frames.find(value=>value.captureId===row.id);
    if(row.kind!=='static-readonly'){assert(frame);for(const field of ['stage','url','status','headers','requestBase64','responseBase64'])assert.deepEqual(frame[field],row[field]);}
    if (row.kind === 'graphql-readonly') {
      const request = JSON.parse(bytes(row.requestBase64));
      const definitions = parse(request.query).definitions;
      const operations = definitions.filter(value => value.kind === 'OperationDefinition');
      assert.equal(operations.length, 1);
      assert.equal(operations[0].operation, 'query');
      assert(queryNames.has(operations[0].name?.value));
    }
    if (new URL(row.url).pathname.endsWith('/GetTransaction')) {
      const request=GrpcTypes.GetTransactionRequest.fromBinary(require('./C88-post-write-bytes.cjs').grpcBody(row.requestBase64,false));assert.equal(request.digest,p.originalApprovedTransaction.digest);
    }
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

// END inherited complete entity correlation
function privateEntries(p,build){
 assert.equal(p.currentLiveAcceptanceCase,'C149-new-5-MIST');assert(p.distinctFromOriginalC137);assert.equal(p.oldC137CreatorRerun,false);
 const script=fs.readFileSync(path.join(build.output,'background.js')),worker=p.workerSource;
 assert(worker.matchesDisk);assert.deepEqual(bytes(worker.actualSourceBase64),script);assert.equal(worker.workerSha256,hash(script));
 for(const source of [p.uiSource,p.dappCompetition.source]){assert(source.matchesDisk&&source.loadedBundles.length>=2);for(const row of source.loadedBundles){assert.equal(row.file,path.basename(row.file));const disk=fs.readFileSync(path.join(build.output,row.file));assert(row.matchesDisk);assert.deepEqual(bytes(row.actualSourceBase64),disk);assert.equal(row.loadedSha256,hash(disk));}}
 const binding=p.signerObservation,modules=['accounts/ImportedAccount','accounts/MnemonicAccount','accounts/zklogin/ZkLoginAccount'];assert(p.directPrivateSignDataObserved);assert.equal(binding.workerSha256,hash(script));assert.equal(binding.sourceEdited,false);assert.equal(binding.accountFunctionsReplaced,false);assert.equal(binding.methodsInvokedByObserver,0);assert.deepEqual(binding.locations.map(row=>row.module),modules);
 const map=fs.readFileSync(path.join(build.output,'background.js.map'));assert.equal(binding.mapSha256,hash(map));const consumer=new SourceMapConsumer(JSON.parse(map));
 for(const row of binding.locations){const location=row.actualLocation,position=consumer.originalPositionFor({line:location.lineNumber+1,column:location.columnNumber});assert.equal(position.source,row.source);assert.equal(position.line,row.originalLine);assert.equal(location.lineNumber,row.start.lineNumber);assert.equal(location.lineNumber,row.end.lineNumber);assert(row.start.columnNumber<=location.columnNumber&&location.columnNumber<row.end.columnNumber);const producer=consumer.sourceContentFor(row.source);assert.equal(producer,fs.readFileSync(row.file,'utf8'));assert.equal(hash(producer),row.producerSha256);}
 assert(p.signerSnapshots.length>=4);assert.deepEqual(p.signerSnapshots[0],binding.initial);let previous=-Infinity;
 for(const [i,row]of p.signerSnapshots.entries()){assert(row.observed);assert.equal(row.targetId,binding.targetId);assert.equal(row.sourceSha256,hash(script));assert.deepEqual(Object.keys(row.counts).sort(),[...modules].sort());assert.equal(row.counts[modules[0]],i===0?0:1);assert.equal(row.counts[modules[1]],0);assert.equal(row.counts[modules[2]],0);const at=Date.parse(row.observedAt);assert(Number.isFinite(at)&&at>=previous);previous=at;}
 assert.equal(p.signerSnapshots[1].label,'original real private signature held');assert.equal(p.signerSnapshots[2].label,'after all four real live competitors');assert.equal(p.signerSnapshots.at(-1).label,'all live actions and normal relock before observer removal');assert.deepEqual(p.actualPrivateSignDataCalls,p.signerSnapshots.at(-1).counts);
 assert.equal(p.signerCleanup.ownBreakpointsRemoved,3);assert.equal(p.signerCleanup.ownMemoryStateRemoved,true);assert.equal(p.signerCleanup.sourceEdited,false);
}
function correlate(p,build,events,network){capture(p,events,network);privateEntries(p,build);assert.equal(p.executeRequests,0);for(const row of p.completeCaptureRecords){assert(!/ExecuteTransaction|faucet/.test(row.url));if(row.kind==='grpc-validation'){assert(row.browserDeliveryCompleted);assert.equal(new URL(row.url).origin,'http://127.0.0.1:41750');const method=new URL(row.url).pathname.split('/').pop();assert(['SimulateTransaction','VerifySignature'].includes(method));const body=bytes(row.requestBase64);assert(body[0]===0&&body.readUInt32BE(1)+5===body.length);const request=GrpcTypes[method+'Request'].fromBinary(body.subarray(5));if(method==='SimulateTransaction')assert.equal(request.checks,GrpcTypes.SimulateTransactionRequest_TransactionChecks.ENABLED);}}}
function validate(p,build){
 const dir=path.resolve(p.captureDirectory),names=fs.readdirSync(dir).sort();assert.equal(names.length,p.captureFileCount);
 const events=names.filter(name=>/^d{6}-[0-9a-f-]+.json$/.test(name)).map(name=>read(path.join(dir,name))),network=read(path.join(dir,'browser-network-observation.json'));
 assert.deepEqual(p.completeCaptureRecords,read(path.join(dir,'all-original-capture-records.json')));assert.deepEqual(read(path.join(dir,'signer-observation.json')),{observation:p.signerObservation,snapshots:p.signerSnapshots,cleanup:p.signerCleanup});
 correlate(p,build,events,network);let mutationsRejected=0;
 for(const mutate of [x=>x.allOriginalHttpResponseBodiesCaptured=false,x=>x.captureScopeIncludesTeardown=false,x=>x.cleanupFailures.push({stage:'failure'}),x=>x.completeCaptureRecords[0].upstreamBodyComplete=false,x=>x.completeCaptureRecords[0].responseBase64='',x=>x.completeCaptureRecords[0].fetchOptions.maxRetries=1,x=>x.routeBindings.pop(),x=>x.browserRequests[0].terminal=null,x=>x.directPrivateSignDataObserved=false,x=>x.signerSnapshots[0].counts['accounts/ImportedAccount']=1,x=>x.signerSnapshots.at(-1).counts['accounts/ImportedAccount']=2,x=>x.signerCleanup.ownMemoryStateRemoved=false,x=>x.workerSource.actualSourceBase64='',x=>x.oldC137CreatorRerun=true]){const changed=structuredClone(p);mutate(changed);assert.throws(()=>correlate(changed,build,events,network));mutationsRejected++;}
 return{mutationsRejected,capturedOriginalEntities:p.completeCaptureRecords.length,intermediateEvents:events.length,actualPrivateCalls:p.actualPrivateSignDataCalls,allOriginalEntitiesAndTeardownAccepted:true};
}
module.exports={validate,correlate,capture,privateEntries};
