// Independent original UI frames and supplementary fresh readonly native evidence.
const fs = require('node:fs'), path = require('node:path'), crypto = require('node:crypto');
const assert = require('node:assert/strict'), cp = require('node:child_process');
const { GrpcTypes, RtdGrpcClient } = require('rtd-typescript/grpc');
const { bcs } = require('rtd-typescript/bcs');
const { Transaction } = require('rtd-typescript/transactions');
const { verifyTransactionSignature } = require('rtd-typescript/verify');
const { toBase64, toBase58 } = require('rtd-typescript/utils');
const { blake2b } = require('@noble/hashes/blake2.js');
const read = f => JSON.parse(fs.readFileSync(f));
const hash = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
const sha = f => hash(fs.readFileSync(f));
const typed = (name, bytes) => toBase58(blake2b(Buffer.concat([Buffer.from(name + '::'), Buffer.from(bytes)]), { dkLen: 32 }));
function frame(encoded, T, response, allowMissing = false) {
  const raw = Buffer.from(encoded, 'base64'); let offset = 0, data = null, status = null;
  assert(raw.length >= 5 && raw.length <= 8 * 1024 * 1024);
  while (offset < raw.length) {
    assert(offset + 5 <= raw.length);
    const flag = raw[offset], end = offset + 5 + raw.readUInt32BE(offset + 1); assert(end <= raw.length);
    if (flag === 0) { assert(data === null && status === null); data = T.fromBinary(raw.subarray(offset + 5, end)); }
    else {
      assert(response && flag === 128 && status === null && end === raw.length);
      const match = raw.subarray(offset + 5, end).toString('ascii').match(/(?:^|\r\n)grpc-status:\s*(\d+)\r\n/);
      assert(match); status = Number(match[1]);
    }
    offset = end;
  }
  if (response) assert((status === 0 && data !== null) || (allowMissing && status === 5 && data === null));
  else assert(data !== null && status === null);
  return { data, status };
}
function object(raw) {
  assert(raw.bcs?.value);
  const parsed = bcs.Object.parse(raw.bcs.value);
  assert.equal(toBase64(bcs.Object.serialize(parsed).toBytes()), toBase64(raw.bcs.value));
  assert.equal(typed('Object', raw.bcs.value), raw.digest);
  assert.equal(parsed.previousTransaction, raw.previousTransaction);
  if (parsed.data.Move) assert.equal(parsed.data.Move.version, String(raw.version));
  else { assert(parsed.data.Package); assert.equal(parsed.data.Package.version, String(raw.version)); }
  return parsed;
}
(async () => {
  const [proofFile, output] = process.argv.slice(2);
  assert(output && !fs.existsSync(output));
  const p = read(proofFile), logs = path.resolve(__dirname, '../migrationToGRpcOrGraphQLDoc/workLog');
  const buildFile = path.join(logs, '20261007-default-generation-positive-C42-build-01.json'), build = read(buildFile);
  const originalFetch = globalThis.fetch, supplementalFrames = [];
  let stage = 'original frames', report = {};
  try {
    assert(p.passed && build.passed && p.checks.length === 16 && p.checks.every(c => c.passed));
    assert(p.simulations === 0 && p.signatures === 0 && p.executeRequests === 0 && p.originalProfilesOpened === 0 && p.certificateChanges === 0);
    assert.deepEqual(p.blocked, []); assert(p.refusals.length > 0);
    for (const [f, h] of Object.entries(p.inputsSha256)) assert.equal(sha(f), h);
    assert.deepEqual(p.source, build.sourceAfter);
    assert.deepEqual(require('./build-reviewed-generation-production-extension.cjs').productSource(), build.sourceAfter);
    for (const [f, h] of Object.entries(build.artifacts)) assert.equal(sha(path.join(build.output, f)), h);
    assert.equal(p.workerSource.workerSha256, build.artifacts['background.js']);
    assert(p.uiSource.matchesDisk); for (const r of p.uiSource.loadedBundles) assert.equal(r.loadedSha256, build.artifacts[r.file]);
    assert.deepEqual(p.afterJournal, p.beforeJournal); assert.equal(Object.keys(p.beforeJournal).length, 3);
    assert(Object.values(p.beforeJournal).every(v => Array.isArray(v) && v.length === 0));
    assert(!cp.execFileSync('ps', ['-Ao', 'command='], { encoding: 'utf8' }).split('\n').some(s => s.includes('Google Chrome') && s.includes('--user-data-dir=' + p.profile)));
    const admission = p.assetAdmissionBefore.proof, h0 = JSON.parse(admission.bindingKey)[5];
    assert.equal(h0, 'BkuLHhdtnoK7yLxo2eQuvcjHtdyipE7MMyxgTJiyHGg4');
    assert.equal(admission.checkpoint, '283000'); assert.equal(admission.dependencies.length, 10);
    const originalRpc = [], account = [], transients = [];
    for (const r of p.frames) {
      assert.equal(hash(Buffer.from(r.requestBase64, 'base64')), r.requestSha256);
      assert.equal(hash(Buffer.from(r.responseBase64, 'base64')), r.responseSha256);
      const u = new URL(r.url);
      assert(['127.0.0.1', 'localhost'].includes(u.hostname));
      if (r.status !== 200) {
        assert(r.status === 503 && u.pathname.endsWith('/GetServiceInfo') && u.port === '41955' && r.phase === 'initial');
        assert.equal(r.responseBase64, ''); transients.push(r); continue;
      }
      if (u.pathname === '/account/graphql') {
        assert.equal(u.port, '41956');
        const request = readJson(r.requestBase64), response = readJson(r.responseBase64);
        assert(!response.errors); assert.equal(request.variables.chain, h0);
        for (const v of Object.values(response.data)) assert.equal(v.chainId, h0);
        account.push({ ...r, request, response }); continue;
      }
      const method = u.pathname.split('/').pop(); assert(['GetServiceInfo', 'GetObject', 'GetCheckpoint'].includes(method));
      assert(['41750', '41955'].includes(u.port));
      const req = frame(r.requestBase64, GrpcTypes[method + 'Request'], false).data;
      const res = frame(r.responseBase64, GrpcTypes[method + 'Response'], true).data;
      if (method === 'GetServiceInfo') assert.equal(res.chainId, h0);
      originalRpc.push({ ...r, method, request: req, response: res });
    }
    assert.equal(p.frames.length, 51); assert.equal(originalRpc.length, 42); assert.equal(account.length, 8); assert.equal(transients.length, 1);
    assert.equal(p.captureErrors.length, 3);
    assert.deepEqual(p.captureErrors.map(r => r.phase), ['empty-supported-window', 'history-observed', 'account-transport-refused']);
    assert(p.captureErrors.every(r => r.url === 'http://127.0.0.1:41750/rtd.rpc.v2.LedgerService/GetObject' && r.message.includes('No data found for resource')));
    let canonicalObjects = 0;
    for (const r of originalRpc.filter(r => r.method === 'GetObject')) if (r.response.object?.bcs?.value) { object(r.response.object); canonicalObjects++; }
    const nft = originalRpc.find(r => r.method === 'GetObject' && r.request.objectId === p.nft && r.response.object?.bcs?.value);
    assert(nft); assert.equal(nft.response.object.digest, p.assetAdmissionBefore.object.digest);
    assert.equal(toBase64(nft.response.object.bcs.value), p.assetAdmissionBefore.object.bcsBase64);
    assert.deepEqual(object(nft.response.object).owner, { AddressOwner: p.owner, $kind: 'AddressOwner' });
    const coverages = account.filter(r => r.response.data.accountHistoryCoverage);
    assert.equal(coverages.length, 6);
    for (const r of coverages) {
      const c = r.response.data.accountHistoryCoverage;
      assert.equal(c.checkpointLo, 0); assert.equal(c.checkpointHi, 283000);
      assert.equal(c.checkpointDigest, admission.digest); assert.equal(c.allAccountActivityCertified, false);
    }
    const histories = account.filter(r => r.response.data.accountHistory);
    assert.equal(histories.length, 2);
    for (const r of histories) {
      const c = r.response.data.accountHistory;
      assert.equal(c.address, r.request.variables.address); assert.equal(c.checkpointLo, 0); assert.equal(c.checkpointHi, 283000);
      assert(c.registrationComplete === false && c.allAccountActivityCertified === false && c.allAccountTransfersCertified === false);
      assert(c.completeForRegisteredKiosks && c.completeForDiscoveredOwnerTokens && c.completeForDiscoveredCapabilities);
      assert(c.hasNextPage === false && c.nextCursor === null && c.totalTransactions === c.transactions.length);
    }
    const empty = histories.find(r => r.phase === 'empty-supported-window').response.data.accountHistory;
    const history = histories.find(r => r.phase === 'history-observed').response.data.accountHistory;
    assert.equal(empty.totalTransactions, 0); assert.equal(history.totalTransactions, 4); assert.equal(history.address, p.historyTarget);
    const trace = p.inputTrace.filter(r => r.phase === 'history-observed' && r.input?.value === p.historyTarget);
    assert(trace.length > 1);
    assert(!p.inputTrace.some(r => r.phase === 'history-observed' && r.at >= trace[0].at && r.input?.value !== p.historyTarget));
    assert.equal(new Set(trace.map(r => JSON.stringify(r.keys))).size, 1);
    const authorities = trace.flatMap(r => r.authorities);
    assert.equal(new Set(authorities.map(r => r.bindingKey)).size, 1);
    assert.equal(new Set(authorities.map(r => r.readSessionKey)).size, 1);
    const keys = [...new Set(authorities.filter(r => r.state === 'configured' && r.hasFullnodeSession).map(r => r.assetSnapshotKey))];
    assert.equal(keys.length, 2);
    for (const key of keys) {
      const parts = JSON.parse(key); assert.equal(parts[0], authorities[0].readSessionKey);
      assert.equal(parts[2], admission.checkpoint); assert.equal(parts[3], admission.digest);
      assert.deepEqual(parts[4], admission.dependencies);
      assert.equal(parts[5].coverage.genesisDigest, h0);
    }
    const byCase = Object.fromEntries(p.cases.map(c => [c.name, c])); assert.equal(p.cases.length, 5);
    assert(/该地址是一个对象|This is an object address/.test(byCase.object.text));
    assert(/历史窗口内未见受支持的活动|No supported activity/.test(byCase['empty-supported-window'].text));
    assert(/内存在受支持的历史活动|Observed activity/.test(byCase['history-observed'].text));
    for (const name of ['invalid', 'account-transport-refused']) assert(!/该地址是一个对象|历史窗口内未见受支持的活动|内存在受支持的历史活动/.test(byCase[name].text));
    stage = 'supplementary fresh native reads';
    globalThis.fetch = async (input, init) => {
      const u = new URL(input instanceof Request ? input.url : String(input));
      assert.equal(u.origin, 'http://127.0.0.1:41750');
      assert(/\/(GetServiceInfo|GetObject|GetTransaction|GetCheckpoint)$/.test(u.pathname));
      const response = await originalFetch(input, { ...init, credentials: 'omit', redirect: 'error' });
      const req = Buffer.from(init?.body ?? []), res = Buffer.from(await response.clone().arrayBuffer());
      const headers = Object.fromEntries(['content-type', 'content-length', 'grpc-status', 'grpc-message', 'grpc-status-details-bin', 'x-rtd-chain-id', 'x-rtd-checkpoint-height'].map(name => [name, response.headers.get(name)]));
      supplementalFrames.push({ url: u.href, status: response.status, responseHeaders: headers, requestBase64: req.toString('base64'), responseBase64: res.toString('base64'), requestSha256: hash(req), responseSha256: hash(res) });
      return response;
    };
    const client = new RtdGrpcClient({ network: 'localnet', baseUrl: 'http://127.0.0.1:41750', format: 'binary', fetch: globalThis.fetch, mvr: { url: '' } });
    assert.equal((await client.ledgerService.getServiceInfo({}, { timeout: 20000 })).response.chainId, h0);
    const checkpoint = (await client.ledgerService.getCheckpoint({ checkpointId: { oneofKind: 'sequenceNumber', sequenceNumber: 283000n }, readMask: { paths: ['sequence_number', 'digest', 'summary', 'contents'] } }, { timeout: 20000 })).response.checkpoint;
    assert.equal(checkpoint.digest, admission.digest); assert.equal(String(checkpoint.sequenceNumber), '283000');
    assert.equal(typed('CheckpointSummary', checkpoint.summary.bcs.value), admission.digest);
    assert.equal(typed('CheckpointContents', checkpoint.contents.bcs.value), checkpoint.contents.digest);
    assert.equal(checkpoint.summary.contentDigest, checkpoint.contents.digest);
    const nativeHistory = [];
    for (const row of history.transactions) {
      const t = (await client.ledgerService.getTransaction({ digest: row.digest, readMask: { paths: ['digest', 'transaction', 'effects', 'signatures', 'checkpoint'] } }, { timeout: 20000 })).response.transaction;
      assert.equal(t.digest, row.digest); assert.equal(String(t.checkpoint), String(row.checkpoint));
      assert.equal(toBase64(t.transaction.bcs.value), row.transaction.transactionBcs);
      assert.equal(toBase64(t.effects.bcs.value), row.transaction.effects.effectsBcs);
      const data = bcs.TransactionData.parse(t.transaction.bcs.value), effects = bcs.TransactionEffects.parse(t.effects.bcs.value);
      assert.equal(toBase64(bcs.TransactionData.serialize(data).toBytes()), row.transaction.transactionBcs);
      assert.equal(toBase64(bcs.TransactionEffects.serialize(effects).toBytes()), row.transaction.effects.effectsBcs);
      assert.equal(await Transaction.from(t.transaction.bcs.value).getDigest(), row.digest);
      assert.equal(effects[effects.$kind].transactionDigest, row.digest);
      assert.equal(typed('TransactionEffects', t.effects.bcs.value), row.transaction.effects.effectsDigest);
      assert.equal(Transaction.from(t.transaction.bcs.value).getData().sender, row.sender);
      assert.equal(t.signatures.length, 1);
      assert.equal((await verifyTransactionSignature(t.transaction.bcs.value, toBase64(t.signatures[0].bcs.value))).toRtdAddress(), row.sender);
      nativeHistory.push({ digest: row.digest, checkpoint: String(t.checkpoint), canonicalTransactionEffectsAndSignatureVerified: true });
    }
    const negativeObjects = [];
    for (const id of ['0x' + '9'.repeat(64), p.historyTarget, '0x' + '8'.repeat(64)]) {
      const count = supplementalFrames.length;
      await client.ledgerService.getObject({ objectId: id }, { timeout: 20000 }).then(() => assert.fail('expected native missing object')).catch(error => { if (error.name === 'AssertionError') throw error; });
      assert.equal(supplementalFrames.length, count + 1);
      const row = supplementalFrames.at(-1); assert.equal(row.status, 200);
      assert.equal(frame(row.requestBase64, GrpcTypes.GetObjectRequest, false).data.objectId, id);
      assert.equal(row.responseBase64, ''); assert.equal(row.responseHeaders['grpc-status'], '5');
      assert.equal(row.responseHeaders['content-length'], '0'); assert.equal(row.responseHeaders['x-rtd-chain-id'], h0);
      assert(decodeURIComponent(row.responseHeaders['grpc-message']).includes(id));
      negativeObjects.push({ objectId: id, freshGrpcStatus: 5, statusInInitialHeaders: true, bodyBytes: 0, replacesOriginalCapture: false });
    }
    assert.equal((await client.ledgerService.getServiceInfo({}, { timeout: 20000 })).response.chainId, h0);
    for (const r of supplementalFrames) {
      assert.equal(r.status, 200); const method = new URL(r.url).pathname.split('/').pop();
      frame(r.requestBase64, GrpcTypes[method + 'Request'], false);
      if (method === 'GetObject' && r.responseBase64 === '') assert.equal(r.responseHeaders['grpc-status'], '5');
      else frame(r.responseBase64, GrpcTypes[method + 'Response'], true);
    }
    report = { passed: true, observedAt: new Date().toISOString(), source: p.source, h0,
      currentC42UiAndWorkerVerified: true, originalUiChecks: 16, originalCapturedFramesVerified: 51,
      originalSuccessfulRpcFramesVerified: 42, originalAccountGraphqlFramesVerified: 8, originalCanonicalObjectFrames: canonicalObjects,
      originalCaptureErrors: p.captureErrors, originalNegativeObjectRawFramesComplete: false,
      originalArchiveTransientResponses: transients, archive503RootCauseResolved: false,
      assetSnapshotKeys: 2, distinctCheckpointHeights: 1, checkpoint: '283000', checkpointDigest: admission.digest,
      sameSessionInputAndComponentKeyPreserved: true, typedFreshCheckpointVerified: true,
      freshNativeHistory: nativeHistory, freshSupplementaryMissingObjects: negativeObjects, supplementalFrames,
      exactEmptyThreeStoresPreserved: true, normalRelockAndOwnedChromeAbsent: true,
      simulations: 0, signatures: 0, executeRequests: 0, originalProfilesOpened: 0, certificateChanges: 0,
      parentRpc23Complete: false, ordinaryChromeTlsAccepted: false,
      inputsSha256: Object.fromEntries([__filename, path.resolve(proofFile), buildFile].map(f => [f, sha(f)])),
      scope: 'Independent original current C42 five visible warning cases, 16 checks, all 51 captured SHA/HTTP frames (42 RPC status0, 8 GraphQL, 1 initial archive503), real input retained through two admitted keys at one checkpoint and stable component/session identity, whole journals and relock. Fresh native four canonical history transactions/effects/signatures, typed checkpoint and three actual missing5 supplement the evidence; they do not replace the three original capture errors. No full RPC23/ordinary Chrome TLS, zero new simulations/signatures/dispatch.' };
  } catch (error) {
    report = { passed: false, observedAt: new Date().toISOString(), stage, errorType: error.name, message: String(error.message).slice(0, 800), supplementalFrames, simulations: 0, signatures: 0, executeRequests: 0 };
    process.exitCode = 1;
  } finally {
    globalThis.fetch = originalFetch;
    fs.writeFileSync(output, JSON.stringify(report, null, 2) + '\n', { flag: 'wx', mode: 0o600 });
    console.log(JSON.stringify({ passed: report.passed, stage: report.passed ? 'complete' : stage, message: report.message, originalFrames: report.originalCapturedFramesVerified, supplementalFrames: supplementalFrames.length, executeRequests: 0 }));
  }
})().catch(error => { console.error(JSON.stringify({ passed: false, errorType: error.name, message: String(error.message).slice(0, 300) })); process.exitCode = 1; });
function readJson(encoded) { return JSON.parse(Buffer.from(encoded, 'base64')); }
