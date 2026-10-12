// Full C53 scope: thirteen objects, fixed archive versions, six original details, three histories.
const fs = require('node:fs'), path = require('node:path'), crypto = require('node:crypto');
const assert = require('node:assert/strict'), { GrpcTypes } = require('rtd-typescript/grpc');
const parser = require('./lib/C88-post-write-bytes.cjs'), contract = require('./lib/C53-post-write-contract.cjs');
const read = f => JSON.parse(fs.readFileSync(f, 'utf8'));
const sha = f => crypto.createHash('sha256').update(fs.readFileSync(f)).digest('hex');
function main() {
  const [input, output] = process.argv.slice(2); assert(input && output && !fs.existsSync(output));
  let result;
  try {
    const p = read(input); assert(p.passed && p.mode === 'covered-post-write-read');
    assert(p.postWriteIndexAccepted && p.completeSupportedAccountWindowAccepted);
    assert(!p.completeAccountHistoryAccepted && !p.chromeAccepted && !p.parentCompletion);
    assert.equal(p.targetCheckpoint, 524022);
    for (const name of ['profilesOpened', 'simulations', 'signatures', 'executeRequests', 'containersCreated', 'serviceActions'])
      assert.equal(p[name], 0);
    assert.equal(p.requests, p.frames.length);
    for (const [f, h] of Object.entries(p.inputsSha256)) assert.equal(sha(f), h);
    const logs = path.resolve(__dirname, '../migrationToGRpcOrGraphQLDoc/workLog');
    const files = [__filename, path.resolve(input), path.join(__dirname, 'lib/C88-post-write-bytes.cjs'), path.join(__dirname, 'lib/C88-full-summary.cjs'),
      path.join(__dirname, 'audit-C84-nft-post-write-positive.cjs'), path.join(__dirname, 'lib/C53-post-write-contract.cjs')];
    const load = name => { const f = path.join(logs, name); files.push(f); const value = read(f); assert(value.passed);
      for (const [name, hash] of Object.entries(value.inputsSha256)) assert.equal(sha(name), hash); return value; };
    const preparation = load('20261008-C89-full-post-write-preparation-independent-01.json');
    load('20261008-C85-history-checkpoint-byte-qualification-02.json');
    load('20261008-C88-full-summary-qualification-01.json');
    load('20261008-C84-positive-byte-parsers-01.json');
    const original = load('20261007-C48-nft-execution-browser-independent-02.json');
    const browser = load('20261007-C48-nft-execution-browser-01.json');
    const oracle = load('20261007-C43-nonempty-kiosk-native-independent-01.json');
    const probe = path.join(__dirname, 'probe-C89-post-write-indexed.cjs');
    assert.equal(p.inputsSha256[probe], preparation.inputsSha256[probe]);
    assert.equal(p.h0, original.h0); assert.equal(p.h0, oracle.h0); assert.equal(p.h0, browser.h0);
    assert.equal(p.generation, original.generation); assert.equal(original.originalExecutions, 6);
    const readinessFile = Object.keys(p.inputsSha256).find(f => /nft-post-write-readiness-[0-9]+\.json$/.test(f));
    assert(readinessFile); const readiness = read(readinessFile);
    assert(readiness.passed && readiness.infrastructureReadyForProductionProbe);
    assert.equal(readiness.targetCheckpoint, 524022); assert.equal(readiness.h0, p.h0);
    assert.equal(readiness.currentWalletContainers, 29); assert.equal(readiness.healthyChecks, 14);
    assert.deepEqual(Object.keys(readiness.coverageGates).sort(), ['committedPublication', 'hbase14', 'sql23', 'rocks4', 'display', 'declaredAndNativeAssetWindow', 'accountHistoryWindow'].sort());
    assert(Object.values(readiness.coverageGates).every(v => v === true));
    const allowed = new Set(['http://127.0.0.1:41750', 'http://127.0.0.1:41954', 'http://127.0.0.1:41955', 'http://127.0.0.1:41956']);
    const stages = ['same-S post-write inventories', 'fresh native and exact archive versions',
      'original six digest details', 'complete three-owner account histories'];
    for (const frame of p.frames) {
      const u = new URL(frame.url); assert(allowed.has(u.origin)); assert(stages.includes(frame.stage));
      assert(['/graphql', '/account/graphql'].includes(u.pathname) ||
        /\/(GetServiceInfo|GetObject|GetTransaction|GetCheckpoint|GetAvailableRange)$/.test(u.pathname));
      if (u.pathname.endsWith('/GetServiceInfo')) {
        assert.equal(frame.status, 200);
        const service = GrpcTypes.GetServiceInfoResponse.fromBinary(parser.grpcBody(frame.responseBase64, true));
        assert.equal(service.chainId, p.h0);
      }
    }
    const items = contract.inventory(oracle, original, p.owners);
    const expectedCaps = Object.entries(p.owners).flatMap(([role, owner]) => owner.kiosks.map(k => ({
      role, owner: owner.address, objectId: k.kind === 'framework' ? k.ownerCap.objectId : k.ownerTokenId,
    })));
    assert.deepEqual(p.caps, expectedCaps); assert.equal(p.caps.length, 5);
    const ids = [...items.map(i => i.objectId), ...p.caps.map(c => c.objectId)];
    assert.equal(ids.length, 13); assert.equal(new Set(ids).size, 13);
    const versionFrames = p.frames.filter(f => f.stage === 'fresh native and exact archive versions');
    const nativeFrames = versionFrames.filter(f => new URL(f.url).port === '41750' && f.url.endsWith('/GetObject'));
    assert.equal(nativeFrames.length, 13); const native = parser.nativeObjects(nativeFrames, ids);
    assert.equal(p.freshNativeAndArchivedObjects.length, 13);
    for (const claimed of p.freshNativeAndArchivedObjects) {
      const value = native.get(claimed.objectId); assert(value);
      for (const name of ['objectId', 'version', 'digest', 'type', 'previousTransaction']) assert.equal(claimed[name], value[name]);
      assert.deepEqual(claimed.owner, value.owner);
      assert.equal(claimed.objectBcsBase64, value.objectBcs.toString('base64'));
      assert.equal(claimed.contentBase64, value.content.toString('base64'));
    }
    for (const transferred of original.currentTransferredNFTs) {
      const value = native.get(transferred.objectId);
      assert.equal(value.objectBcs.toString('base64'), transferred.objectBcsBase64);
      assert.equal(value.version, transferred.version); assert.equal(value.digest, transferred.digest);
      assert.deepEqual(value.owner, transferred.owner); assert.equal(value.previousTransaction, transferred.previousTransaction);
    }
    for (const cap of p.caps) assert.deepEqual(native.get(cap.objectId).owner, { $kind: 'AddressOwner', AddressOwner: cap.owner });
    assert(BigInt(p.snapshot.checkpoint) >= 524022n); assert.equal(p.snapshot.dependencies.length, 10);
    const graphql = parser.snapshotObjects(p.frames.filter(f => f.stage === stages[0]), p.snapshot, p.h0, native);
    const archive = parser.exactArchiveObjects(versionFrames.filter(f => new URL(f.url).port === '41955'), native);
    const checkpoint = parser.checkpoint(versionFrames.filter(f => new URL(f.url).port === '41955'), p.snapshot);
    const details = parser.originalDetails(p.frames.filter(f => f.stage === stages[2]), original, browser);
    assert.equal(p.originalDigestDetails.length, 6);
    for (const dispatch of original.sixFirstDispatches) {
      const detail = p.originalDigestDetails.find(r => r.digest === dispatch.digest); assert(detail?.originalBytesMatch);
      assert.equal(detail.transactionBase64, browser.previews.find(r => r.approval.prepared.digest === dispatch.digest).approval.prepared.bytesBase64);
    }
    contract.histories(oracle, original, p.histories);
    const histories = {};
    for (const role of ['source', 'existingTarget', 'newTarget']) {
      const address = oracle.addresses[role], dispatched = original.sixFirstDispatches.filter(d => role === 'source' || d.recipient === address);
      histories[role] = parser.historyPages(p.frames.filter(f => f.stage === stages[3]), p.histories[role], p.h0,
        address, dispatched, original, browser);
      assert.equal(histories[role].originalDispatchesVerified, role === 'source' ? 6 : role === 'existingTarget' ? 5 : 1);
    }
    const intentFile = path.join(readiness.fixture, 'intent.json'); files.push(intentFile);
    const pins = read(intentFile).protectedOriginalsSha256; assert.equal(Object.keys(pins).length, 1015);
    for (const [f, h] of Object.entries(pins)) assert.equal(sha(f), h);
    assert.deepEqual(require('./build-reviewed-generation-production-extension.cjs').productSource(), p.source);
    assert.deepEqual(p.source, original.source);
    // Re-read the actual qualified ownership projection without launching or modifying a service.
    const cp = require('node:child_process'), root = path.resolve(__dirname, '../../..');
    const ownership = cp.execFileSync(path.join(root, 'rtd-archive-service/localDeploy/data/publisher-venv/bin/python'),
      ['-c', 'import sys,json,hashlib;sys.path.insert(0,sys.argv[1]);from wallet_C89_publisher_current_ownership import capture;c=capture();print(hashlib.sha256(json.dumps(c,sort_keys=True).encode()).hexdigest())',
        path.join(root, 'link-u-smart-contract/all-in-one-deploy/localDeploy')], {encoding:'utf8', timeout:60000}).trim();
    assert.equal(ownership, p.runtimeCaptureSha256);

    result = { passed: true, observedAt: new Date().toISOString(), h0: p.h0, targetCheckpoint: 524022,
      nativeObjects: native.size, exactArchive: archive, originalTransferredNFTs: 6, fiveCaps: p.caps.length,
      actualGraphql: graphql, actualCheckpoint: checkpoint, originalDetails: details, actualHistories: histories,
      protectedOriginalFilesHeld: 1015, productSourceHeld: true, postWriteIndexAccepted: true,
      completeSupportedAccountWindowAccepted: true, completeAccountHistoryAccepted: false,
      chromeAccepted: false, parentCompletion: false, additionalWalletNetworkRequests: 0, freshReadonlyOwnershipCapture: true, signatures: 0, executeRequests: 0,
      inputsSha256: Object.fromEntries(files.map(f => [f, sha(f)])),
      scope: 'Independent retained full current production raw frames: thirteen native canonical objects and exact requested archive versions, eight NFT and five caps at one pinned asset S, canonical full ten-field outer summary with every protobuf metadata field matched and canonical contents; opaque protocol payload compared exactly, quorum signature not reverified, original six detail bytes, all rows and complete pages of three separately pinned supported histories with exact original six/five/one dispatches. False global account certification is preserved. Chrome, relock, journal recovery and other parent requirements remain separate.' };
  } catch (error) { result = { passed: false, observedAt: new Date().toISOString(), errorType: error.name,
    message: String(error.message).slice(0, 700), postWriteIndexAccepted: false, parentCompletion: false }; process.exitCode = 1; }
  fs.writeFileSync(output, JSON.stringify(result, null, 2) + '\n', { flag: 'wx', mode: 0o600 });
  console.log(JSON.stringify({ passed: result.passed, postWriteIndexAccepted: result.postWriteIndexAccepted,
    errorType: result.errorType, message: result.message }));
}
if (require.main === module) main();
