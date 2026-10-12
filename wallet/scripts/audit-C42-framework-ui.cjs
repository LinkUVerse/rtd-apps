// Current two-role UI witness, original raw captures and explicitly fresh typed markers.
const fs = require('node:fs'), path = require('node:path'), crypto = require('node:crypto'), assert = require('node:assert/strict'), cp = require('node:child_process');
const { GrpcTypes, RtdGrpcClient } = require('rtd-typescript/grpc'), { bcs } = require('rtd-typescript/bcs');
const { toBase64, toBase58 } = require('rtd-typescript/utils'), { blake2b } = require('@noble/hashes/blake2.js');
const read = f => JSON.parse(fs.readFileSync(f)), hash = bytes => crypto.createHash('sha256').update(bytes).digest('hex'), sha = f => hash(fs.readFileSync(f));
const typed = (n, bytes) => toBase58(blake2b(Buffer.concat([Buffer.from(n + '::'), Buffer.from(bytes)]), { dkLen: 32 }));
function frame(encoded, T, response) {
  const raw = Buffer.from(encoded, 'base64'); assert(raw.length >= 5 && raw[0] === 0);
  const end = raw.readUInt32BE(1) + 5; assert(end <= raw.length);
  if (response) {
    assert(raw[end] === 128 && end + 5 + raw.readUInt32BE(end + 1) === raw.length);
    assert(/(?:^|\r\n)grpc-status:\s*0\r\n/.test(raw.subarray(end + 5).toString('ascii')));
  } else assert.equal(end, raw.length);
  return T.fromBinary(raw.subarray(5, end));
}
(async () => {
  const [recipientFile, senderFile, output] = process.argv.slice(2); assert(output && !fs.existsSync(output));
  const logs = path.resolve(__dirname, '../migrationToGRpcOrGraphQLDoc/workLog');
  const nativeFile = path.join(logs, '20261007-C42-framework-post-transfer-production-02.json'), native = read(nativeFile);
  const buildFile = path.join(logs, '20261007-default-generation-positive-C42-build-01.json'), build = read(buildFile);
  const originalFetch = globalThis.fetch, supplementalFrames = []; let report = {}, stage = 'original UI evidence';
  try {
    assert(native.passed && build.passed);
    assert.deepEqual(require('./build-reviewed-generation-production-extension.cjs').productSource(), build.sourceAfter);
    const results = [];
    for (const [role, file] of [['recipient', recipientFile], ['sender', senderFile]]) {
      const p = read(file); assert(p.passed && p.role === role && p.browserTeardownComplete);
      assert.equal(p.checks.length, 10); assert(p.checks.every(r => r.passed));
      assert(p.simulations === 0 && p.signatures === 0 && p.executeRequests === 0 && p.originalProfilesOpened === 0 && p.certificateChanges === 0);
      assert.deepEqual(p.blocked, []); assert.deepEqual(p.afterJournal, p.beforeJournal);
      assert.equal(Object.keys(p.beforeJournal).length, 3); assert(Object.values(p.beforeJournal).every(v => Array.isArray(v) && v.length === 0));
      assert(p.fixture.endsWith('/current-framework-' + role + '-C42-20261007-03'));
      assert(!cp.execFileSync('ps', ['-Ao', 'command='], { encoding: 'utf8' }).split('\n').some(s => s.includes('Google Chrome') && s.includes('--user-data-dir=' + p.profile)));
      for (const [f, h] of Object.entries(p.inputsSha256)) assert.equal(sha(f), h);
      assert.deepEqual(p.source, build.sourceAfter); assert.equal(p.workerSource.workerSha256, build.artifacts['background.js']);
      for (const r of p.uiSource.loadedBundles) assert.equal(r.loadedSha256, build.artifacts[r.file]);
      assert(p.uiSource.matchesDisk); assert.equal(p.originalDigest, native.originalDigest);
      assert.equal(p.kioskId, native.kioskId); assert.equal(p.capId, native.originalCapId);
      for (const key of ['listSnapshot', 'detailsSnapshot']) {
        const s = p[key], parts = JSON.parse(s.authority.assetSnapshotKey);
        assert.equal(parts[0], s.authority.readSessionKey); assert.equal(JSON.parse(parts[0])[0], s.authority.bindingKey);
        assert.equal(JSON.parse(s.authority.bindingKey)[5], native.h0); assert.equal(JSON.parse(s.authority.bindingKey)[6], native.generation);
        assert.equal(parts[2], s.checkpoint); assert.equal(parts[3], s.digest); assert(BigInt(s.checkpoint) >= BigInt(native.originalCheckpoint));
        assert.equal(s.dependencies.length, 10); assert.deepEqual(parts[4], s.dependencies);
        assert.equal(parts[5].coverage.snapshotCheckpoint, s.checkpoint); assert.equal(parts[5].coverage.snapshotCheckpointDigest, s.digest);
      }
      assert(!p.traffic.some(r => /\/(SimulateTransaction|ExecuteTransaction|VerifySignature)$/.test(new URL(r.url).pathname)));
      const graph = [], transients = []; let rpc = 0, canonicalObjects = 0;
      for (const r of p.frames) {
        assert.equal(hash(Buffer.from(r.requestBase64, 'base64')), r.requestSha256);
        assert.equal(hash(Buffer.from(r.responseBase64, 'base64')), r.responseSha256);
        const u = new URL(r.url); assert.equal(u.hostname, '127.0.0.1');
        if (r.status !== 200) { assert.equal(r.status, 503); transients.push(r); continue; }
        if (u.port === '41954' && u.pathname === '/graphql') {
          const q = JSON.parse(Buffer.from(r.requestBase64, 'base64')), d = JSON.parse(Buffer.from(r.responseBase64, 'base64'));
          assert(!d.errors);
          if (d.data.walletGenesis) assert.equal(d.data.walletGenesis.digest, native.h0);
          else { assert.deepEqual(Object.keys(d.data), ['checkpoint']); assert.equal(d.data.checkpoint.digest, native.h0); }
          graph.push({ phase: r.phase, request: q, data: d.data });
        } else if (u.pathname.endsWith('/account/graphql')) {
          const d = JSON.parse(Buffer.from(r.responseBase64, 'base64')); assert(!d.errors);
        } else {
          const method = u.pathname.split('/').pop(); assert(['GetServiceInfo', 'GetObject', 'GetCheckpoint'].includes(method));
          frame(r.requestBase64, GrpcTypes[method + 'Request'], false);
          const response = frame(r.responseBase64, GrpcTypes[method + 'Response'], true); rpc++;
          if (method === 'GetServiceInfo') assert.equal(response.chainId, native.h0);
          if (method === 'GetObject' && response.object?.bcs?.value) {
            const o = response.object, parsed = bcs.Object.parse(o.bcs.value);
            assert.equal(toBase64(bcs.Object.serialize(parsed).toBytes()), toBase64(o.bcs.value));
            assert.equal(typed('Object', o.bcs.value), o.digest); canonicalObjects++;
          }
        }
      }
      const matching = graph.filter(r => r.data.walletSnapshot?.sequenceNumber === Number(p.listSnapshot.checkpoint) && r.data.walletSnapshot.digest === p.listSnapshot.digest);
      assert(matching.length > 0);
      const collection = matching.find(r => r.request.variables?.owner === p.owner && r.request.variables?.filter === null && r.data.walletSnapshot.query.address?.objects);
      assert(collection); const objects = collection.data.walletSnapshot.query.address.objects; assert.equal(objects.pageInfo.hasNextPage, false);
      if (role === 'recipient') {
        assert.equal(p.owner, native.recipient); assert.equal(objects.nodes.length, 7);
        const nft = objects.nodes.find(n => n.address === p.nft); assert(nft && nft.digest === native.currentNft.digest);
        assert.equal(nft.owner.__typename, 'AddressOwner'); assert.equal(nft.owner.address.address, p.owner);
        assert.equal(nft.previousTransaction.digest, native.originalDigest); assert(p.cardHref.includes(p.nft));
      } else {
        assert.equal(p.owner, native.sender); assert(objects.nodes.some(n => n.address === native.originalCapId));
        assert(/Kiosk 中暂无资产|Kiosk is empty/.test(p.detailsText)); assert(p.cardHref.includes(native.kioskId));
        const empty = matching.find(r => r.request.variables?.parent === native.kioskId);
        assert(empty); assert.deepEqual(empty.data.walletSnapshot.query.address.dynamicFields.nodes, []);
        assert.equal(empty.data.walletSnapshot.query.address.dynamicFields.pageInfo.hasNextPage, false);
      }
      assert(p.captureErrors.every(r => r.closing === true));
      results.push({ role, owner: p.owner, checkpoint: p.listSnapshot.checkpoint, digest: p.listSnapshot.digest,
        originalFramesVerified: p.frames.length, successfulRpcFramesVerified: rpc, successfulGraphqlFramesVerified: graph.length,
        canonicalObjectFramesVerified: canonicalObjects, transient503Responses: transients, closingCaptureErrors: p.captureErrors,
        normalRelockWholeJournalVerified: true, ownedChromeAbsent: true, originalBackgroundCapturesComplete: false });
    }
    stage = 'fresh independent typed UI markers';
    globalThis.fetch = async (input, init) => {
      const url = new URL(input instanceof Request ? input.url : String(input)); assert.equal(url.origin, 'http://127.0.0.1:41750');
      assert(/\/(GetServiceInfo|GetCheckpoint)$/.test(url.pathname));
      const response = await originalFetch(input, { ...init, credentials: 'omit', redirect: 'error' });
      supplementalFrames.push({ url: url.href, status: response.status, requestBase64: Buffer.from(init?.body ?? []).toString('base64'), responseBase64: Buffer.from(await response.clone().arrayBuffer()).toString('base64') });
      return response;
    };
    const client = new RtdGrpcClient({ network: 'localnet', baseUrl: 'http://127.0.0.1:41750', format: 'binary', fetch: globalThis.fetch, mvr: { url: '' } });
    assert.equal((await client.ledgerService.getServiceInfo({}, { timeout: 20000 })).response.chainId, native.h0);
    for (const r of results) {
      const c = (await client.ledgerService.getCheckpoint({ checkpointId: { oneofKind: 'sequenceNumber', sequenceNumber: BigInt(r.checkpoint) },
        readMask: { paths: ['sequence_number', 'digest', 'summary', 'contents'] } }, { timeout: 20000 })).response.checkpoint;
      assert.equal(c.digest, r.digest); assert.equal(typed('CheckpointSummary', c.summary.bcs.value), r.digest);
      assert.equal(typed('CheckpointContents', c.contents.bcs.value), c.contents.digest); assert.equal(c.summary.contentDigest, c.contents.digest);
    }
    assert.equal((await client.ledgerService.getServiceInfo({}, { timeout: 20000 })).response.chainId, native.h0);
    for (const r of supplementalFrames) { assert.equal(r.status, 200); const method = new URL(r.url).pathname.split('/').pop(); frame(r.requestBase64, GrpcTypes[method + 'Request'], false); frame(r.responseBase64, GrpcTypes[method + 'Response'], true); }
    report = { passed: true, observedAt: new Date().toISOString(), source: build.sourceAfter, h0: native.h0, originalDigest: native.originalDigest,
      roles: results, actualCurrentUiChecks: 20, currentC42FrameworkUiAccepted: true, freshTypedSnapshotMarkers: 2, supplementalFrames,
      simulations: 0, signatures: 0, executeRequests: 0, originalProfilesOpened: 0, certificateChanges: 0,
      archive503RootCauseResolved: false, sustainedAvailabilityAccepted: false, namesCurrentAccepted: false, parentTX08Complete: false,
      inputsSha256: Object.fromEntries([__filename, path.resolve(recipientFile), path.resolve(senderFile), nativeFile, buildFile].map(f => [f, sha(f)])),
      scope: 'Current C42 two new normal controlled UI roles20 checks, loaded bundle/worker identities, raw complete captured responses including explicit503s, actual recipient7 and original received NFT/details/direct link/list refresh, sender originalcap/empty Kiosk/list refresh, exact three empty journals and normal relock/owned Chrome absent. Four fresh native frames independently verify both UI typed markers. Closing body cancellations retained, background capture and sustained transport not accepted; no all-entry/TX08/name/ordinary TLS completion.' };
  } catch (error) { report = { passed: false, stage, observedAt: new Date().toISOString(), errorType: error.name, message: String(error.message).slice(0, 600), supplementalFrames }; process.exitCode = 1; }
  finally {
    globalThis.fetch = originalFetch; fs.writeFileSync(output, JSON.stringify(report, null, 2) + '\n', { flag: 'wx', mode: 0o600 });
    console.log(JSON.stringify({ passed: report.passed, stage: report.stage, message: report.message, checks: report.actualCurrentUiChecks, supplementalFrames: supplementalFrames.length }));
  }
})().catch(error => { console.error(JSON.stringify({ passed: false, message: String(error.message).slice(0, 300) })); process.exitCode = 1; });
