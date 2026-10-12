// Independent original consumer frames, current loaded build, readonly page/cache facts.
const fs = require('node:fs'), path = require('node:path'), crypto = require('node:crypto');
const assert = require('node:assert/strict'), cp = require('node:child_process');
const { GrpcTypes } = require('rtd-typescript/grpc');
const wallet = path.resolve(__dirname, '..'), logs = path.join(wallet, 'migrationToGRpcOrGraphQLDoc/workLog');
const read = f => JSON.parse(fs.readFileSync(f)), sha = f => crypto.createHash('sha256').update(fs.readFileSync(f)).digest('hex');
const h0 = 'BkuLHhdtnoK7yLxo2eQuvcjHtdyipE7MMyxgTJiyHGg4';
function protobuf(wire) {
  const bytes = Buffer.from(wire.responseBase64, 'base64'), request = Buffer.from(wire.requestBase64, 'base64');
  assert(request.length >= 5 && request[0] === 0 && request.readUInt32BE(1) + 5 === request.length);
  let at = 0, value, trailer;
  while (at < bytes.length) {
    assert(at + 5 <= bytes.length); const flag = bytes[at], length = bytes.readUInt32BE(at + 1);
    assert(at + 5 + length <= bytes.length);
    if (flag === 0) { assert(!value && !trailer); value = bytes.subarray(at + 5, at + 5 + length); }
    else { assert.equal(flag, 128); assert(!trailer); trailer = bytes.subarray(at + 5, at + 5 + length).toString(); }
    at += 5 + length;
  }
  assert(trailer); const status = /(?:^|\r\n)grpc-status:\s*(\d+)\r\n/.exec(trailer); assert(status);
  const method = new URL(wire.url).pathname.split('/').at(-1);
  assert(GrpcTypes[method + 'Request'] && GrpcTypes[method + 'Response']);
  return { method, status: Number(status[1]), request: GrpcTypes[method + 'Request'].fromBinary(request.subarray(5)),
    response: value ? GrpcTypes[method + 'Response'].fromBinary(value) : undefined };
}
function negativeFrames(browser, diagnostic) {
  assert(diagnostic.passed && diagnostic.readOnly && diagnostic.exactOwnContainerAndOriginalRuntimeHeld);
  assert(diagnostic.serviceSignals === 0 && diagnostic.parentCompletion === false && diagnostic.sustainedAvailabilityAccepted === false);
  assert.equal(diagnostic.negativeResponseCount, 3); assert.equal(diagnostic.retainedNegatives.length, 3);
  for (const [f, h] of Object.entries(diagnostic.inputsSha256)) assert.equal(sha(f), h);
  const logCounts = new Map(), records = new Map();
  for (const row of diagnostic.matchingEndpointTimeoutLogs) {
    const match = row.line.match(/^(\d{4}\/\d{2}\/\d{2} \d{2}:\d{2}:\d{2}).*upstream timed out .*while connecting to upstream,.*request: "POST \/graphql HTTP\/1\.1", upstream: "https:\/\/192\.168\.65\.254:41981\/graphql", host: "127\.0\.0\.1:42011"$/);
    assert(match); const second = match[1].replaceAll('/', '-').replace(' ', 'T') + '+00:00';
    assert.equal(second, row.second); logCounts.set(second, (logCounts.get(second) ?? 0) + 1);
  }
  for (const row of diagnostic.retainedNegatives) {
    assert(Number.isSafeInteger(row.index) && !records.has(row.index));
    const wire = browser.frames[row.index]; assert.deepEqual(wire, row.frame);
    assert(row.negativeOnly && row.correlatedUpstreamConnectTimeout);
    assert.equal(wire.status, 504); assert.equal(wire.url, 'http://127.0.0.1:42011/graphql');
    assert.equal(wire.phase, 'normal read admission');
    const request = JSON.parse(Buffer.from(wire.requestBase64, 'base64'));
    assert.deepEqual(Object.keys(request).sort(), ['query','variables']); assert.deepEqual(request.variables, {});
    assert(/^query WalletSnapshot(?:Admission|Pin)\b/.test(request.query) && !/\bmutation\b/.test(request.query));
    const body = Buffer.from(wire.responseBase64, 'base64');
    assert.equal(String(body.length), wire.headers['content-length']); assert.equal(wire.headers['content-type'], 'text/html');
    assert.equal(wire.headers['access-control-allow-origin'], browser.gatewayAuthority.origin);
    assert(body.toString().startsWith('<html>\r\n<head><title>504 Gateway Time-out</title>'));
    const second = new Date(wire.headers.date).toISOString().replace('.000Z', '+00:00');
    assert.equal(second, row.second); assert((logCounts.get(second) ?? 0) > 0);
    logCounts.set(second, logCounts.get(second) - 1); records.set(row.index, row);
  }
  assert.equal(browser.frames.filter(f => f.status !== 200).length, records.size);
  return records;
}
async function main() {
  const [browserFile, output] = process.argv.slice(2); assert(output && !fs.existsSync(output));
  const p = read(browserFile), gateway = require('./lib/C108-current-core-gateway-ownership-v2.cjs');
  const lineage = require('./lib/C102-product-source-lineage-v2.cjs'), q = read(lineage.qualificationFile);
  const buildFile = path.join(logs, '20261008-default-generation-positive-C102-build-03.json'), build = read(buildFile);
  const frames = [], counts = {}, observedOrigins = new Set(), negativeNativeReads = [], retainedHttpNegatives = [];
  const diagnosticFile = path.join(logs, '20261008-C108-core-http-negatives-01.json'), diagnostic = read(diagnosticFile);
  let stage = 'current build and full original runtime', result;
  try {
    assert(p.passed && p.currentBuildActualCoreReadPagesAccepted && !p.parentAcceptance && !p.wholeREL02Accepted);
    assert(p.normallyRelocked && p.ownProfileClosed && p.profilesOpened === 1 && p.originalProfilesOpened === 0);
    assert.equal(p.credentialExported, false); assert.equal(p.certificateChanges, 0);
    assert.equal(p.executeRequests + p.signatures + p.simulations + p.faucetRequests, 0);
    assert.deepEqual(p.blocked, []); assert.deepEqual(p.errors, []); assert.equal(p.h0, h0);
    assert.deepEqual(p.initialJournal, p.finalJournal); assert(Object.values(p.initialJournal).every(a => a.length === 0));
    for (const [f, h] of Object.entries(p.inputsSha256)) assert.equal(sha(f), h);
    assert.deepEqual(lineage.validate(q.originalSource, buildFile), p.source);
    assert.deepEqual(gateway.capture(), p.gatewayAuthority);
    assert.equal(p.workerSource.workerSha256, build.artifacts['background.js']);
    for (const row of p.uiSource.loadedBundles) assert.equal(row.loadedSha256, build.artifacts[row.file]);
    const names = ['tokens', 'staking portfolio', 'validator selection', 'original stake detail', 'history',
      ...['/', '/network', '/auto-lock', '/language', '/theme', '/more-options'].map(m => 'settings ' + m), 'apps list'];
    assert.deepEqual(p.pages.map(v => v.name), names);
    assert(p.dappConnected.actualDiscovery && p.dappConnected.visibleApproval && p.dappConnected.reloadAuthorizationHeld);
    assert.equal(p.dappConnected.authorizedOwner, p.owner); assert.equal(p.dappConnected.secondConnectPopups, 0);
    assert(p.dappDisconnected.authorizationEmpty);
    assert(p.flushes.length >= p.pages.length * 2);
    for (const flush of p.flushes) { assert.equal(flush.pending, 0); assert.deepEqual(flush.failures, []); }
    const negative = negativeFrames(p, diagnostic);
    assert.equal(diagnostic.ownContainerId, read(gateway.startedFile).containerId);
    stage = 'actual successful cache facts and independently retained consumer bodies';
    const query = (name, key) => p.pages.find(v => v.name === name).facts.queries.find(q => q.key[0] === key && q.status === 'success');
    const balance = query('tokens', 'wallet-balances'), stake = query('original stake detail', 'wallet-staking');
    const history = query('history', 'wallet-account-history'); assert(balance && stake && history);
    assert(balance.data.snapshot && Number(balance.data.snapshot.checkpoint) >= 524022);
    assert(balance.data.value.length > 0);
    for (const b of balance.data.value) {
      assert(/^(0|[1-9]\d*)$/.test(b.balance)); assert.equal(BigInt(b.balance), BigInt(b.coinBalance) + BigInt(b.addressBalance));
    }
    assert(stake.data.value.positions.some(s => s.objectId === p.stakeId));
    const historyValue = history.data.value ?? history.data; assert.equal(historyValue.address, p.owner);
    assert(historyValue.transactions.length > 0 && historyValue.checkpointHi >= 524022);
    assert.equal(historyValue.transactions.length, historyValue.totalTransactions);
    const expected = new Set(['http://127.0.0.1:41750', 'http://127.0.0.1:42011',
      'http://127.0.0.1:42012', 'http://127.0.0.1:42013', 'http://127.0.0.1:41718']);
    for (const [index, wire] of p.frames.entries()) {
      const u = new URL(wire.url); assert(expected.has(u.origin));
      if (wire.status !== 200) { assert(negative.has(index)); retainedHttpNegatives.push(negative.get(index)); continue; }
      assert.equal(wire.status, 200);
      observedOrigins.add(u.origin); counts[u.port + u.pathname] = (counts[u.port + u.pathname] ?? 0) + 1;
      assert(!/\/(ExecuteTransaction|VerifySignature|SimulateTransaction)$/.test(u.pathname));
      if (u.pathname.endsWith('/graphql')) {
        const request = JSON.parse(Buffer.from(wire.requestBase64, 'base64'));
        const response = JSON.parse(Buffer.from(wire.responseBase64, 'base64'));
        assert.equal(request.jsonrpc, undefined); assert(typeof request.query === 'string' && request.query.trim());
        assert(!response.errors?.length && response.data);
        if (response.data.walletGenesis) assert.equal(response.data.walletGenesis.digest, h0);
        if (response.data.accountHistoryCoverage) assert.equal(response.data.accountHistoryCoverage.chainId, h0);
        if (response.data.walletSnapshot) assert(response.data.walletSnapshot.sequenceNumber >= 524022);
        frames.push({ type: u.port === '42013' ? 'account' : 'graphql', url: wire.url, exactBodyAccepted: true });
      } else if (u.pathname.includes('/rtd.rpc.v2.')) {
        const decoded = protobuf(wire);
        if (decoded.status !== 0) {
          assert.equal(decoded.status, 5); assert.equal(u.port, '41750'); assert.equal(decoded.method, 'GetCheckpoint');
          assert.equal(decoded.request.checkpointId?.oneofKind, 'sequenceNumber');
          assert.equal(decoded.request.checkpointId.sequenceNumber, 0n);
          negativeNativeReads.push({ url: wire.url, status: decoded.status, requestedGenesis: true });
        } else {
          assert(decoded.response);
          if (decoded.method === 'GetServiceInfo') assert.equal(decoded.response.chainId, h0);
          if (decoded.method === 'GetBalance') assert.equal(decoded.request.owner, p.owner);
          if (decoded.method === 'ListOwnedObjects') assert.equal(decoded.request.owner, p.owner);
        }
        frames.push({ type: 'grpc', url: wire.url, method: decoded.method, status: decoded.status, exactBodyAndTrailerAccepted: true });
      }
    }
    assert.equal(retainedHttpNegatives.length, 3); assert.equal(frames.length + retainedHttpNegatives.length, p.frames.length);
    for (const port of ['42011', '42012', '42013']) assert([...observedOrigins].some(u => new URL(u).port === port));
    assert(!cp.execFileSync('ps', ['-Ao', 'command='], { encoding: 'utf8' }).split('\n')
      .some(c => c.includes('Google Chrome') && c.includes('--user-data-dir=' + path.join(read(Object.keys(p.inputsSha256).find(f => f.endsWith('20261008-C108-current-internal-gas-chrome-02.json'))).fixture, 'profile'))));
    assert.deepEqual(gateway.capture(), p.gatewayAuthority);
    result = { passed: true, observedAt: new Date().toISOString(), source: p.source, h0,
      currentBuildActualCoreReadPagesAccepted: true, actualReadPages: names, actualWalletStandardConnectDisconnectAccepted: true,
      fullCurrentSourceAndRuntimeHeld: true, originalConsumerFramesIndependentlyAccepted: frames.length,
      responseMethods: counts, negativeNativeReads, frames, retainedHttpNegatives,
      retainedHttpNegativeFramesAcceptedAsFailures: retainedHttpNegatives.length, allRetainedConsumerFramesAccountedFor: true,
      wholeREL02Accepted: false, parentAcceptance: false, auditSimulations: 0, auditSignatures: 0,
      auditExecuteRequests: 0, sustainedAvailabilityAccepted: false,
      scope: 'Only current build actual twelve readonly core pages and Wallet Standard connection/reload/disconnection. All 141 successful original consumer bodies/trailers and three separately correlated 504 failure bodies accounted for; failures are never GraphQL data. Source/runtime, cache facts and same empty journal audited. No NFT/name, business Execute, ordinary Chrome, TLS/permission or whole REL02 acceptance.' };
  } catch (e) { result = { passed: false, observedAt: new Date().toISOString(), stage, errorType: e.name,
    message: String(e.message).slice(0,1000), frames, responseMethods: counts, negativeNativeReads, parentAcceptance: false }; process.exitCode = 1; }
  Object.assign(result, { inputsSha256: Object.fromEntries([__filename, path.resolve(browserFile), buildFile,
    lineage.qualificationFile, gateway.startedFile, diagnosticFile, path.join(__dirname, 'lib/C108-current-core-gateway-ownership-v2.cjs')].map(f => [f, sha(f)])) });
  fs.writeFileSync(output, JSON.stringify(result, null, 2) + '\n', { flag: 'wx', mode: 0o600 });
  console.log(JSON.stringify({ passed: result.passed, stage: result.stage, frames: frames.length, message: result.message }));
}
main().catch(e => { console.error(JSON.stringify({ passed: false, errorType: e.name, message: String(e.message).slice(0,500) })); process.exitCode = 1; });
