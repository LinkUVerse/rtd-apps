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
async function main() {
  const [browserFile, output] = process.argv.slice(2); assert(output && !fs.existsSync(output));
  const p = read(browserFile), gateway = require('./lib/C109-current-core-gateway-ownership.cjs');
  const lineage = require('./lib/C109-product-source-lineage.cjs'), q = read(lineage.qualificationFile);
  const buildFile = path.join(logs, '20261008-default-generation-positive-C109-build-01.json'), build = read(buildFile);
  const frames = [], counts = {}, observedOrigins = new Set(), negativeNativeReads = [];
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
    assert(Array.isArray(p.networkFrames) && p.networkFrames.length > 0);
    for (const e of p.captureErrors) {
      const failure = p.failedRequests.find(f => f.role === e.role && f.requestId === e.requestId && f.requestBase64 === e.requestBase64);
      assert(failure?.errorText === 'net::ERR_ABORTED' && e.failureText === 'net::ERR_ABORTED' && !e.headersMissing);
      assert(['/graphql', '/account/graphql'].includes(new URL(e.url).pathname) || /\/(GetObject|GetServiceInfo|GetCheckpoint|GetAvailableRange|GetTransaction)$/.test(e.url));
    }
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
    for (const wire of [...p.networkFrames, ...p.frames]) {
      const u = new URL(wire.url); assert(expected.has(u.origin)); assert.equal(wire.status, 200);
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
    for (const port of ['42011', '42012', '42013']) assert([...observedOrigins].some(u => new URL(u).port === port));
    assert(!cp.execFileSync('ps', ['-Ao', 'command='], { encoding: 'utf8' }).split('\n')
      .some(c => c.includes('Google Chrome') && c.includes('--user-data-dir=' + path.join(read(Object.keys(p.inputsSha256).find(f => f.endsWith('20261008-C109-current-internal-gas-chrome-02.json'))).fixture, 'profile'))));
    assert.deepEqual(gateway.capture(), p.gatewayAuthority);
    result = { passed: true, observedAt: new Date().toISOString(), source: p.source, h0,
      currentBuildActualCoreReadPagesAccepted: true, actualReadPages: names, actualWalletStandardConnectDisconnectAccepted: true,
      fullCurrentSourceAndRuntimeHeld: true, originalConsumerFramesIndependentlyAccepted: p.frames.length,
      originalNetworkFramesIndependentlyAccepted: p.networkFrames.length, allRetainedNetworkAndConsumerFramesAccountedFor: true,
      originalCapturedBodyCancellationsRetained: p.captureErrors.length,
      responseMethods: counts, negativeNativeReads, frames,
      wholeREL02Accepted: false, parentAcceptance: false, auditSimulations: 0, auditSignatures: 0,
      auditExecuteRequests: 0, sustainedAvailabilityAccepted: false,
      scope: 'Only current build actual twelve readonly core pages and Wallet Standard connection/reload/disconnection. Complete original browser/worker network and page consumer bodies/trailers, separately retained native cancellations, source/runtime, cache facts and same empty journal audited. No NFT/name, business Execute, ordinary Chrome, TLS/permission or whole REL02 acceptance.' };
  } catch (e) { result = { passed: false, observedAt: new Date().toISOString(), stage, errorType: e.name,
    message: String(e.message).slice(0,1000), frames, responseMethods: counts, negativeNativeReads, parentAcceptance: false }; process.exitCode = 1; }
  Object.assign(result, { inputsSha256: Object.fromEntries([__filename, path.resolve(browserFile), buildFile,
    lineage.qualificationFile, gateway.startedFile, path.join(__dirname, 'lib/C109-current-core-gateway-ownership.cjs')].map(f => [f, sha(f)])) });
  fs.writeFileSync(output, JSON.stringify(result, null, 2) + '\n', { flag: 'wx', mode: 0o600 });
  console.log(JSON.stringify({ passed: result.passed, stage: result.stage, frames: frames.length, message: result.message }));
}
main().catch(e => { console.error(JSON.stringify({ passed: false, errorType: e.name, message: String(e.message).slice(0,500) })); process.exitCode = 1; });
