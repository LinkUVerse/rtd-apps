// Independently correlate the complete original cold capture and private entries.
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const cp = require('node:child_process');
const assert = require('node:assert/strict');
const { parse } = require('graphql');
const { SourceMapConsumer } = require(path.resolve(__dirname, '../../node_modules/.pnpm/source-map@0.6.1/node_modules/source-map'));
const expected = require('./test-C138-current-non-nft-pending-creator.cjs');
const { read, sha, record, op, profile, h0 } = expected;
const { businessAudit } = require('./lib/C144-cold-business-correlation.cjs');
const logs = path.resolve(__dirname, '../migrationToGRpcOrGraphQLDoc/workLog');
const modules = ['accounts/ImportedAccount', 'accounts/MnemonicAccount', 'accounts/zklogin/ZkLoginAccount'];
const queryNames = new Set(['WalletGenesisIdentity', 'WalletSchemaCapabilities', 'WalletSnapshotAdmission', 'WalletHistoryCoverage', 'WalletSnapshotPin', 'WalletSnapshotRevalidate', 'WalletSnapshotRead']);
const hash = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
const bytes = value => {
  assert.equal(typeof value, 'string');
  const result = Buffer.from(value, 'base64');
  assert.equal(result.toString('base64'), value);
  return result;
};
const bag = rows => {
  const result = {};
  for (const row of rows) {
    const key = JSON.stringify([row.stage, row.url, row.method]);
    result[key] = (result[key] ?? 0) + 1;
  }
  return result;
};

function sourcesAndCounters(p, build) {
  const script = fs.readFileSync(path.join(build.output, 'background.js'));
  const worker = p.workerSource.after ?? p.workerSource.before;
  assert(worker.matchesDisk);
  assert.deepEqual(bytes(worker.actualSourceBase64), script);
  assert.equal(worker.workerSha256, hash(script));
  assert.equal(worker.diskSha256, hash(script));
  for (const source of [p.uiSource, p.secondPopupSource]) {
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
  assert.equal(p.newSignatures, 0);
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
  assert(p.signerSnapshots.length >= 6);
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
  for (const kind of ['coin', 'stake', 'withdraw']) assert(p.signerSnapshots.some(row => row.label === 'after ' + kind + ' durable refusal'));
  assert.equal(p.signerSnapshots.at(-1).label, 'all actual operations and normal teardown before observer removal');
  assert.equal(p.signerCleanup.ownBreakpointsRemoved, 3);
  assert.equal(p.signerCleanup.ownMemoryStateRemoved, true);
  assert.equal(p.signerCleanup.sourceEdited, false);
  assert.equal(p.signerCleanupError, undefined);
  assert.equal(p.signerObservationInterval, 'before initial UI through all actual operations and normal control teardown; own observer removed before normal browser close');
}

function capture(p, events, network) {
  assert(p.allRequiredColdAcceptanceObserved && p.allOriginalHttpBodiesCaptured);
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
    if (new URL(row.url).pathname.endsWith('/GetTransaction')) {
      const lookup = require('./audit-C138-current-non-nft-pending-creator.cjs').decode(frame);
      assert(lookup.notFound);
      assert.equal(lookup.request.digest, p.digest);
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

async function audit(p, creator, qualified, build, events, network) {
  const business = await businessAudit(p, creator, qualified);
  sourcesAndCounters(p, build);
  capture(p, events, network);
  return business;
}

async function main() {
  const [file, creatorFile, creatorAuditFile, out] = process.argv.slice(2);
  assert(out && !fs.existsSync(out));
  let result;
  try {
    const p = read(file), creator = read(creatorFile), qualified = read(creatorAuditFile);
    await require('./audit-C138-current-non-nft-pending-creator.cjs').audit(creator);
    for (const [f, h] of Object.entries(qualified.inputsSha256)) assert.equal(sha(f), h);
    const buildFile = path.join(logs, '20261009-default-generation-positive-C136-build-01.json'), build = read(buildFile);
    const dir = path.resolve(p.captureDirectory);
    assert.equal(dir, path.join(path.dirname(path.resolve(file)), path.basename(file, '.json') + '-complete-capture'));
    const names = fs.readdirSync(dir).sort();
    assert.equal(names.length, p.captureFileCount);
    const eventFiles = names.filter(name => /^\d{6}-[0-9a-f-]+\.json$/.test(name)).map(name => path.join(dir, name));
    const events = eventFiles.map(read);
    assert.deepEqual(p.completeCaptureRecords, read(path.join(dir, 'all-original-capture-records.json')));
    const observation = read(path.join(dir, 'signer-observation.json'));
    assert.deepEqual(observation, { observation: p.signerObservation, snapshots: p.signerSnapshots, cleanup: p.signerCleanup });
    const network = read(path.join(dir, 'browser-network-observation.json'));
    const accepted = await audit(p, creator, qualified, build, events, network);
    let refused = 0;
    const mutations = [x => x.newSignatures = null, x => x.newSignatures = 1, x => x.captureScopeIncludesTeardown = false,
      x => x.unknownPositiveBodyGaps = 1, x => x.cleanupFailures.push({ stage: 'failed teardown' }), x => x.signerSnapshots[0].observed = false,
      x => x.signerSnapshots.at(-1).counts[modules[0]] = 1, x => x.signerObservation.sourceEdited = true, x => x.signerCleanup.ownMemoryStateRemoved = false,
      x => x.completeCaptureRecords[0].upstreamBodyComplete = false, x => x.completeCaptureRecords[0].responseBase64 = '',
      x => x.completeCaptureRecords[0].fetchOptions.maxRetries = 1, x => x.completeCaptureRecords[0].fetchOptions.maxRedirects = 1,
      x => x.completeCaptureRecords[0].browserDeliveryCompleted = !x.completeCaptureRecords[0].browserDeliveryCompleted,
      x => x.browserRequests[0].terminal = null, x => x.routeBindings.pop(), x => x.browserResponses[0].status = 999,
      x => x.normalRelock = false, x => x.normalReject = false, x => x.finalJournal['pending-scopes-v2'] = [],
      x => x.cipherAfter.sha256 = '0'.repeat(64), x => x.creatorRerun = true, x => x.journalSeeded = true];
    for (const mutate of mutations) {
      const changed = structuredClone(p); mutate(changed);
      await assert.rejects(() => audit(changed, creator, qualified, build, events, network)); refused++;
    }
    const changedEvents = structuredClone(events);
    changedEvents.find(row => row.event === 'complete upstream entity persisted').row.responseBase64 = '';
    await assert.rejects(() => audit(p, creator, qualified, build, changedEvents, network)); refused++;
    const lineage = require('./lib/C136-product-source-lineage.cjs'), q = read(lineage.qualificationFile);
    assert.deepEqual(lineage.validate(q.originalSource, q.buildFile), p.source);
    assert.deepEqual(require('./lib/C148-current-core-gateway-ownership.cjs').capture(), p.currentGatewayAuthority);
    assert(!fs.existsSync(path.join(profile, 'SingletonLock')) && !fs.existsSync(path.join(profile, 'SingletonSocket')));
    const processIds = cp.spawnSync('pgrep', ['-f', profile], { encoding: 'utf8' }).stdout.trim().split('\n').filter(value => /^\d+$/.test(value) && Number(value) !== process.pid && Number(value) !== process.ppid);
    for (const pid of processIds) assert(!/Google Chrome for Testing(?: Helper)?\s*$/.test(cp.spawnSync('ps', ['-p', pid, '-o', 'comm='], { encoding: 'utf8' }).stdout));
    const files = [__filename, require.resolve('./lib/C144-cold-business-correlation.cjs'), path.resolve(file), path.resolve(creatorFile), path.resolve(creatorAuditFile), buildFile, ...names.map(name => path.join(dir, name))];
    result = { passed: true, observedAt: new Date().toISOString(), source: p.source, h0, operation: op, profile, digest: p.digest,
      actualCurrentNonNftColdDurableAccepted: true, actualCurrentCoinStakeWithdrawAndDappRefusalsAccepted: true,
      actualThreeJournalStoresAndCipherRetained: true, actualFullInitialUiWorkerAndPopupBytesAccepted: true,
      actualThreePrivateEntryCallsObserved: 0, directPrivateSignDataObserved: true, privateObservationEndsBeforeNormalBrowserClose: true,
      allOriginalHttpBodiesCaptured: true, allIntermediateEntitiesIndependentlyVerified: true, captureScopeIncludesTeardown: true,
      actualBrowserResponseCoverageCorrelated: true, allOwnBrowserAndDemoNormallyClosed: true,
      capturedOriginalEntities: p.completeCaptureRecords.length, savedIntermediateEvents: events.length,
      capturedRecoveryBodies: accepted.capturedRecoveryBodies, missingRecoveryBodies: 0, unknownPositiveBodyGaps: 0,
      allOriginalFixedDigestLookupsActuallyNotFound: true,
      artifactMutationRefusals: refused, newSimulations: 0, newNativeVerifications: 0, newSignatures: 0, newExecuteRequests: 0,
      creatorRerun: false, journalSeeded: false, nftBusinessRequests: 0, ordinaryChromeAccepted: false,
      fullNonNftM5Accepted: false, parentCompletion: false,
      inputsSha256: { ...p.inputsSha256, ...qualified.inputsSha256, ...Object.fromEntries(files.map(f => [f, sha(f)])) } };
  } catch (error) {
    result = { passed: false, observedAt: new Date().toISOString(), errorType: error.name,
      message: String(error.message).slice(0, 1600), stack: String(error.stack).slice(0, 2000), parentCompletion: false };
    process.exitCode = 1;
  }
  record(path.resolve(out), result);
  console.log(JSON.stringify({ passed: result.passed, completeCold: result.actualCurrentNonNftColdDurableAccepted, mutations: result.artifactMutationRefusals }));
}

module.exports = { audit, sourcesAndCounters, capture };
if (require.main === module) main().catch(error => { console.error(JSON.stringify({ passed: false, preflight: true, errorType: error.name })); process.exitCode = 1; });
